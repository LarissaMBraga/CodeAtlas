
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
const MAX_PACKAGE_MANIFESTS = 20;

type DependencyCategory =
  | "production"
  | "development"
  | "peer"
  | "optional";

type Dependency = {
  name: string;
  version: string;
  type: DependencyCategory;
};

type PackageManifestAnalysis = {
  path: string;
  packageName: string | null;
  packageManager: string | null;
  totalDependencies: number;
  productionCount: number;
  developmentCount: number;
  peerCount: number;
  optionalCount: number;
  dependencies: Dependency[];
};

type GitHubTreeItem = {
  path: string;
  type: string;
  sha: string;
  size?: number;
};

function isIgnoredPath(path: string) {
  const normalizedPath = path.toLowerCase();

  return IGNORED_DIRECTORIES.some((directory) =>
    normalizedPath.includes(directory)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getDependencies(
  packageJson: Record<string, unknown>,
  field: string,
  type: DependencyCategory
): Dependency[] {
  const value = packageJson[field];

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value)
    .filter((entry): entry is [string, string] =>
      typeof entry[1] === "string"
    )
    .map(([name, version]) => ({
      name,
      version,
      type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getPackageManager(
  packageJson: Record<string, unknown>,
  manifestPath: string,
  allPaths: Set<string>
) {
  if (typeof packageJson.packageManager === "string") {
    return packageJson.packageManager.split("@")[0];
  }

  const directory = manifestPath.includes("/")
    ? manifestPath.slice(0, manifestPath.lastIndexOf("/") + 1)
    : "";

  const lockFiles = [
    { path: `${directory}pnpm-lock.yaml`, manager: "pnpm" },
    { path: `${directory}yarn.lock`, manager: "yarn" },
    { path: `${directory}bun.lock`, manager: "bun" },
    { path: `${directory}bun.lockb`, manager: "bun" },
    { path: `${directory}package-lock.json`, manager: "npm" },
    { path: "pnpm-lock.yaml", manager: "pnpm" },
    { path: "yarn.lock", manager: "yarn" },
    { path: "bun.lock", manager: "bun" },
    { path: "bun.lockb", manager: "bun" },
    { path: "package-lock.json", manager: "npm" },
  ];

  return (
    lockFiles.find((file) => allPaths.has(file.path))?.manager ?? null
  );
}

async function fetchPackageManifest(
  owner: string,
  repository: string,
  manifest: GitHubTreeItem,
  headers: Record<string, string>,
  allPaths: Set<string>
): Promise<PackageManifestAnalysis | null> {
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/blobs/${encodeURIComponent(manifest.sha)}`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  try {
    const blob = await response.json();

    if (typeof blob.content !== "string") {
      return null;
    }

    const decodedContent = Buffer.from(
      blob.content.replace(/\s/g, ""),
      "base64"
    ).toString("utf-8");

    const packageJson: unknown = JSON.parse(decodedContent);

    if (!isRecord(packageJson)) {
      return null;
    }

    const production = getDependencies(
      packageJson,
      "dependencies",
      "production"
    );

    const development = getDependencies(
      packageJson,
      "devDependencies",
      "development"
    );

    const peer = getDependencies(
      packageJson,
      "peerDependencies",
      "peer"
    );

    const optional = getDependencies(
      packageJson,
      "optionalDependencies",
      "optional"
    );

    const dependencies = [
      ...production,
      ...development,
      ...peer,
      ...optional,
    ].sort((a, b) => a.name.localeCompare(b.name));

    return {
      path: manifest.path,
      packageName:
        typeof packageJson.name === "string"
          ? packageJson.name
          : null,
      packageManager: getPackageManager(
        packageJson,
        manifest.path,
        allPaths
      ),
      totalDependencies: dependencies.length,
      productionCount: production.length,
      developmentCount: development.length,
      peerCount: peer.length,
      optionalCount: optional.length,
      dependencies,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (
      !isRecord(body) ||
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
    const tree: GitHubTreeItem[] = treeData.tree ?? [];

    const allSourceFiles = tree.filter((file) => {
      const path = file.path.toLowerCase();

      const isSourceFile = SOURCE_EXTENSIONS.some((extension) =>
        path.endsWith(extension)
      );

      return (
        file.type === "blob" &&
        isSourceFile &&
        !isIgnoredPath(path)
      );
    });

    const sourceFiles = allSourceFiles
      .slice(0, MAX_FILES)
      .map((file) => ({
        path: file.path,
        sha: file.sha,
        size: file.size ?? 0,
      }));

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

    const allPaths = new Set(
      tree
        .filter((file) => file.type === "blob")
        .map((file) => file.path)
    );

    const allManifests = tree.filter(
      (file) =>
        file.type === "blob" &&
        file.path.split("/").pop() === "package.json" &&
        !isIgnoredPath(file.path)
    );

    const selectedManifests = allManifests.slice(
      0,
      MAX_PACKAGE_MANIFESTS
    );

    const manifestResults = await Promise.all(
      selectedManifests.map((manifest) =>
        fetchPackageManifest(
          owner,
          repositoryName,
          manifest,
          headers,
          allPaths
        )
      )
    );

    const manifests = manifestResults
      .filter(
        (manifest): manifest is PackageManifestAnalysis =>
          manifest !== null
      )
      .sort((a, b) => a.path.localeCompare(b.path));

    const allDependencies = manifests.flatMap(
      (manifest) => manifest.dependencies
    );

    const dependenciesAnalysis = {
      available: manifests.length > 0,
      manifestFound: allManifests.length > 0,
      manifestCount: manifests.length,
      manifestPaths: manifests.map((manifest) => manifest.path),
      manifests,
      totalDependencies: allDependencies.length,
      productionCount: manifests.reduce(
        (total, manifest) => total + manifest.productionCount,
        0
      ),
      developmentCount: manifests.reduce(
        (total, manifest) => total + manifest.developmentCount,
        0
      ),
      peerCount: manifests.reduce(
        (total, manifest) => total + manifest.peerCount,
        0
      ),
      optionalCount: manifests.reduce(
        (total, manifest) => total + manifest.optionalCount,
        0
      ),
      dependencies: allDependencies,
      truncated:
        allManifests.length > MAX_PACKAGE_MANIFESTS ||
        Boolean(treeData.truncated),
    };

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
          Boolean(treeData.truncated) ||
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
