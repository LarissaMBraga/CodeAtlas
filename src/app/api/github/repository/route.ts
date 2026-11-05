
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

    const sourceFiles = treeData.tree
      .filter(
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
      )
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
      analysis: {
        totalSourceFiles: sourceFiles.length,
        maxFiles: MAX_FILES,
        truncated:
          treeData.truncated ||
          treeData.tree.filter(
            (file: { path: string; type: string }) => {
              const path = file.path.toLowerCase();

              return (
                file.type === "blob" &&
                SOURCE_EXTENSIONS.some((extension) =>
                  path.endsWith(extension)
                ) &&
                !IGNORED_DIRECTORIES.some((directory) =>
                  path.includes(directory)
                )
              );
            }
          ).length > MAX_FILES,
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
