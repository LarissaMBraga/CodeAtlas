
import { NextResponse } from "next/server";
import path from "node:path";

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
];

const IGNORED_DIRECTORIES = [
  "node_modules/",
  ".next/",
  "dist/",
  "build/",
  "coverage/",
  "vendor/",
];

const MAX_ANALYSIS_FILES = 80;
const BATCH_SIZE = 10;

type GitHubTreeFile = {
  path: string;
  sha: string;
  size?: number;
  type: string;
};

type AnalyzedFile = {
  path: string;
  content: string;
};

type GitHubPublicRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
};

function isSourceFile(filePath: string) {
  const normalizedPath = filePath.replace(/\\/g, "/");

  return (
    SOURCE_EXTENSIONS.some((extension) =>
      normalizedPath.endsWith(extension)
    ) &&
    !IGNORED_DIRECTORIES.some((directory) =>
      normalizedPath.includes(directory)
    )
  );
}

function extractImports(content: string) {
  const imports = new Set<string>();

  const staticImportRegex =
    /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;

  const dynamicImportRegex =
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const match of content.matchAll(staticImportRegex)) {
    imports.add(match[1]);
  }

  for (const match of content.matchAll(dynamicImportRegex)) {
    imports.add(match[1]);
  }

  return [...imports];
}

function resolveImport(
  importerPath: string,
  importPath: string,
  availableFiles: Set<string>
) {
  if (!importPath.startsWith(".") && !importPath.startsWith("@/")) {
    return null;
  }

  const basePath = importPath.startsWith("@/")
    ? `src/${importPath.slice(2)}`
    : path.posix.join(path.posix.dirname(importerPath), importPath);

  const normalizedBase = path.posix.normalize(basePath);

  const candidates = [
    normalizedBase,
    ...SOURCE_EXTENSIONS.map(
      (extension) => `${normalizedBase}${extension}`
    ),
    ...SOURCE_EXTENSIONS.map((extension) =>
      path.posix.join(normalizedBase, `index${extension}`)
    ),
  ];

  return candidates.find((candidate) => availableFiles.has(candidate)) ?? null;
}

function isReactComponent(file: AnalyzedFile) {
  const isReactFile = /\.(tsx|jsx)$/.test(file.path);
  const hasJsx = /<[A-Z][A-Za-z0-9.]*(?:\s|\/?>)/.test(file.content);
  const hasComponentExport =
    /export\s+(?:default\s+)?(?:function|const|class)\s+[A-Z]/.test(
      file.content
    ) || /export\s+default\s+function\s+[A-Z]/.test(file.content);

  return isReactFile && hasJsx && hasComponentExport;
}

async function fetchSourceFile(
  owner: string,
  repo: string,
  branch: string,
  file: GitHubTreeFile
): Promise<AnalyzedFile | null> {
  const branchPath = branch
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const filePath = file.path
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const response = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branchPath}/${filePath}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return null;
  }

  return {
    path: file.path,
    content: await response.text(),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username || !/^[a-zA-Z0-9-]+$/.test(username)) {
      return NextResponse.json(
        { error: "A valid GitHub username is required." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=public&sort=updated&per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to retrieve public repositories from GitHub." },
        { status: response.status }
      );
    }

    const data: GitHubPublicRepository[] = await response.json();

    const repositories = data.map((repository) => ({
      id: repository.id,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      url: repository.html_url,
      language: repository.language,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      defaultBranch: repository.default_branch,
      updatedAt: repository.updated_at,
    }));

    return NextResponse.json({
      username,
      repositories,
    });
  } catch (error) {
    console.error("GitHub repositories error:", error);

    return NextResponse.json(
      { error: "Unable to load public repositories." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repositoryUrl = body.repositoryUrl;

    if (typeof repositoryUrl !== "string") {
      return NextResponse.json(
        { error: "A valid GitHub repository URL is required." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(repositoryUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid repository URL." },
        { status: 400 }
      );
    }

    if (
      !["github.com", "www.github.com"].includes(parsedUrl.hostname) ||
      parsedUrl.protocol !== "https:"
    ) {
      return NextResponse.json(
        { error: "Only GitHub repository URLs are supported." },
        { status: 400 }
      );
    }

    const segments = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    if (
      segments.length !== 2 ||
      !/^[a-zA-Z0-9-]+$/.test(segments[0]) ||
      !/^[a-zA-Z0-9._-]+$/.test(segments[1])
    ) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL." },
        { status: 400 }
      );
    }

    const [owner, repo] = segments;

    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const repositoryResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers, cache: "no-store" }
    );

    if (!repositoryResponse.ok) {
      return NextResponse.json(
        { error: "Unable to retrieve repository information from GitHub." },
        { status: repositoryResponse.status }
      );
    }

    const repositoryData = await repositoryResponse.json();
    const branch = repositoryData.default_branch;

    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { headers, cache: "no-store" }
    );

    if (!treeResponse.ok) {
      return NextResponse.json(
        { error: "Unable to retrieve the repository file structure." },
        { status: treeResponse.status }
      );
    }

    const treeData = await treeResponse.json();

    const sourceFiles = (treeData.tree as GitHubTreeFile[]).filter(
      (file) => file.type === "blob" && isSourceFile(file.path)
    );

    const selectedFiles = sourceFiles.slice(0, MAX_ANALYSIS_FILES);
    const analyzedFiles: AnalyzedFile[] = [];

    for (let index = 0; index < selectedFiles.length; index += BATCH_SIZE) {
      const batch = selectedFiles.slice(index, index + BATCH_SIZE);

      const results = await Promise.all(
        batch.map((file) =>
          fetchSourceFile(owner, repo, branch, file).catch(() => null)
        )
      );

      analyzedFiles.push(
        ...results.filter(
          (file): file is AnalyzedFile => file !== null
        )
      );
    }

    const availableFiles = new Set(
      analyzedFiles.map((file) => file.path)
    );

    const nodes = analyzedFiles.map((file) => ({
      id: file.path,
      label: path.posix.basename(file.path),
      path: file.path,
      type: isReactComponent(file) ? "component" : "module",
    }));

    const edges = analyzedFiles.flatMap((file) => {
      const imports = extractImports(file.content);

      return imports
        .map((importPath) =>
          resolveImport(file.path, importPath, availableFiles)
        )
        .filter((target): target is string => target !== null)
        .map((target) => ({
          id: `${file.path}->${target}`,
          source: file.path,
          target,
        }));
    });

    const componentCount = nodes.filter(
      (node) => node.type === "component"
    ).length;

    return NextResponse.json({
      repository: {
        owner,
        name: repo,
        branch,
      },
      nodes,
      edges,
      summary: {
        totalFiles: sourceFiles.length,
        analyzedFiles: analyzedFiles.length,
        totalComponents: componentCount,
        totalModules: nodes.length - componentCount,
        totalConnections: edges.length,
        truncated: sourceFiles.length > MAX_ANALYSIS_FILES,
        maxFiles: MAX_ANALYSIS_FILES,
      },
    });
  } catch (error) {
    console.error("Repository architecture analysis error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred during architecture analysis." },
      { status: 500 }
    );
  }
}
