import { NextResponse } from "next/server";

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
  ".html",
  ".css",
  ".scss",
];

const IGNORED_DIRECTORIES = [
  "node_modules/",
  ".next/",
  "dist/",
  "build/",
  "coverage/",
  "vendor/",
];

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
};

const MAX_FILES = 200;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("repositoryUrl" in body) ||
      typeof body.repositoryUrl !== "string"
    ) {
      return NextResponse.json(
        { error: "A valid repository URL is required." },
        { status: 400 }
      );
    }

    const repositoryUrl = body.repositoryUrl
      .trim()
      .replace(/\/+$/, "");

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(repositoryUrl);
    } catch {
      return NextResponse.json(
        { error: "Enter a valid GitHub repository URL." },
        { status: 400 }
      );
    }

    if (
      !["https:", "http:"].includes(parsedUrl.protocol) ||
      parsedUrl.hostname !== "github.com" ||
      parsedUrl.port ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return NextResponse.json(
        { error: "Only GitHub repository URLs are supported." },
        { status: 400 }
      );
    }

    const pathParts = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    if (
      pathParts.length !== 2 ||
      !/^[a-zA-Z0-9-]+$/.test(pathParts[0]) ||
      !/^[a-zA-Z0-9_.-]+$/.test(pathParts[1])
    ) {
      return NextResponse.json(
        { error: "Enter a valid GitHub repository URL." },
        { status: 400 }
      );
    }

    const [owner, repository] = pathParts;
    const repositoryName = repository.replace(/\.git$/i, "");

    if (!repositoryName) {
      return NextResponse.json(
        { error: "Enter a valid repository name." },
        { status: 400 }
      );
    }

    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const githubResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (githubResponse.status === 404) {
      return NextResponse.json(
        { error: "Repository not found or not publicly accessible." },
        { status: 404 }
      );
    }

    if (
      githubResponse.status === 403 ||
      githubResponse.status === 429
    ) {
      return NextResponse.json(
        { error: "GitHub API rate limit reached. Please try again later." },
        { status: 429 }
      );
    }

    if (!githubResponse.ok) {
      return NextResponse.json(
        { error: "Unable to retrieve repository information from GitHub." },
        { status: 502 }
      );
    }

    const data = await githubResponse.json();

    const treeResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}/git/trees/${encodeURIComponent(data.default_branch)}?recursive=1`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (
      treeResponse.status === 403 ||
      treeResponse.status === 429
    ) {
      return NextResponse.json(
        { error: "GitHub API rate limit reached. Please try again later." },
        { status: 429 }
      );
    }

    if (!treeResponse.ok) {
      return NextResponse.json(
        { error: "Unable to retrieve the repository file structure." },
        { status: 502 }
      );
    }

    const treeData = await treeResponse.json();

    const allSourceFiles = treeData.tree.filter(
      (file: { path: string; type: string }) => {
        const path = file.path.toLowerCase();

        const isSourceFile = SOURCE_EXTENSIONS.some(
          (extension) => path.endsWith(extension)
        );

        const isIgnored = IGNORED_DIRECTORIES.some(
          (directory) => path.includes(directory)
        );

        return (
          file.type === "blob" &&
          isSourceFile &&
          !isIgnored
        );
      }
    );

    const sourceFiles = allSourceFiles
      .slice(0, MAX_FILES)
      .map(
        (file: {
          path: string;
          sha: string;
          size?: number;
        }) => ({
          path: file.path,
          sha: file.sha,
          size: file.size ?? 0,
        })
      );

    const languagesResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}/languages`,
      {
        headers,
        cache: "no-store",
      }
    );

    let languageBytes: Record<string, number> = {};
    let languageAnalysisAvailable = false;

    if (languagesResponse.ok) {
      languageBytes = await languagesResponse.json();
      languageAnalysisAvailable = true;
    }

    const languageFileCounts: Record<string, number> = {};

    for (const file of allSourceFiles) {
      const extension = `.${file.path.split(".").pop()?.toLowerCase()}`;
      const language = LANGUAGE_BY_EXTENSION[extension];

      if (language) {
        languageFileCounts[language] =
          (languageFileCounts[language] ?? 0) + 1;
      }
    }

    const totalLanguageBytes = Object.values(languageBytes).reduce(
      (total, bytes) => total + bytes,
      0
    );

    const languages = Object.entries(languageBytes)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage:
          totalLanguageBytes > 0
            ? (bytes / totalLanguageBytes) * 100
            : 0,
        fileCount: languageFileCounts[name] ?? 0,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    const dependenciesAnalysis = {
      available: false,
      manifestFound: false,
      manifestPath: null as string | null,
      packageName: null as string | null,
      packageManager: null as string | null,
      totalDependencies: 0,
      productionCount: 0,
      developmentCount: 0,
      dependencies: [] as {
        name: string;
        version: string;
        type: "production" | "development";
      }[],
    };

    const packageManifest = treeData.tree.find(
      (file: { path: string; type: string }) =>
        file.path === "package.json" &&
        file.type === "blob"
    );

    if (packageManifest) {
      dependenciesAnalysis.manifestFound = true;
      dependenciesAnalysis.manifestPath = packageManifest.path;

      const manifestResponse = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repositoryName)}/git/blobs/${encodeURIComponent(packageManifest.sha)}`,
        {
          headers,
          cache: "no-store",
        }
      );

      if (manifestResponse.ok) {
        try {
          const manifestData = await manifestResponse.json();

          const packageJson = JSON.parse(
            Buffer.from(manifestData.content, "base64").toString("utf-8")
          );

          const productionDependencies =
            packageJson.dependencies &&
            typeof packageJson.dependencies === "object"
              ? packageJson.dependencies
              : {};

          const developmentDependencies =
            packageJson.devDependencies &&
            typeof packageJson.devDependencies === "object"
              ? packageJson.devDependencies
              : {};

          const production = Object.entries(productionDependencies)
            .filter((entry): entry is [string, string] =>
              typeof entry[1] === "string"
            )
            .map(([name, version]) => ({
              name,
              version,
              type: "production" as const,
            }));

          const development = Object.entries(developmentDependencies)
            .filter((entry): entry is [string, string] =>
              typeof entry[1] === "string"
            )
            .map(([name, version]) => ({
              name,
              version,
              type: "development" as const,
            }));

          const lockFiles = treeData.tree
            .filter((file: { path: string; type: string }) =>
              file.type === "blob"
            )
            .map((file: { path: string }) => file.path);

          const detectedPackageManager =
            typeof packageJson.packageManager === "string"
              ? packageJson.packageManager.split("@")[0]
              : lockFiles.includes("pnpm-lock.yaml")
                ? "pnpm"
                : lockFiles.includes("yarn.lock")
                  ? "yarn"
                  : lockFiles.includes("bun.lock") ||
                      lockFiles.includes("bun.lockb")
                    ? "bun"
                    : lockFiles.includes("package-lock.json")
                      ? "npm"
                      : null;

          dependenciesAnalysis.available = true;
          dependenciesAnalysis.packageName =
            typeof packageJson.name === "string"
              ? packageJson.name
              : null;
          dependenciesAnalysis.packageManager = detectedPackageManager;
          dependenciesAnalysis.productionCount = production.length;
          dependenciesAnalysis.developmentCount = development.length;
          dependenciesAnalysis.totalDependencies =
            production.length + development.length;
          dependenciesAnalysis.dependencies = [
            ...production,
            ...development,
          ].sort((a, b) => a.name.localeCompare(b.name));
        } catch {
          dependenciesAnalysis.available = false;
        }
      }
    }

    return NextResponse.json({
      repository: {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        url: data.html_url,
        language: data.language,
        stars: data.stargazers_count,
        forks: data.forks_count,
        defaultBranch: data.default_branch,
        isPrivate: data.private,
        owner: {
          username: data.owner.login,
          avatarUrl: data.owner.avatar_url,
        },
      },
      files: sourceFiles,
      languages,
      languageAnalysis: {
        available: languageAnalysisAvailable,
        totalBytes: totalLanguageBytes,
        totalFiles: allSourceFiles.length,
      },
      dependenciesAnalysis,
      analysis: {
        totalSourceFiles: sourceFiles.length,
        maxFiles: MAX_FILES,
        truncated:
          treeData.truncated ||
          allSourceFiles.length > MAX_FILES,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while retrieving the repository.",
      },
      { status: 500 }
    );
  }
}