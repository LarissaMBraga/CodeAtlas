
import { NextResponse } from "next/server";

const MAX_ANALYSIS_FILES = 80;
const BATCH_SIZE = 10;

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

type GitHubRepository = {
  default_branch: string;
};

type GitHubTreeItem = {
  path: string;
  type: string;
  sha: string;
  size?: number;
};

type ArchitectureNode = {
  id: string;
  label: string;
  path: string;
  type: "component" | "module";
};

type ArchitectureEdge = {
  id: string;
  source: string;
  target: string;
};

function isSourceFile(path: string) {
  const normalizedPath = path.toLowerCase();

  return (
    SOURCE_EXTENSIONS.some((extension) =>
      normalizedPath.endsWith(extension)
    ) &&
    !IGNORED_DIRECTORIES.some((directory) =>
      normalizedPath.includes(directory)
    )
  );
}

function getExtension(path: string) {
  const match = path.match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function getImportPaths(content: string) {
  const imports = new Set<string>();

  const patterns = [
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) {
        imports.add(match[1]);
      }
    }
  }

  return [...imports];
}

function resolveImport(
  importPath: string,
  sourcePath: string,
  availableFiles: Set<string>
) {
  if (!importPath.startsWith(".") && !importPath.startsWith("@/")) {
    return null;
  }

  let basePath: string;

  if (importPath.startsWith("@/")) {
    basePath = `src/${importPath.slice(2)}`;
  } else {
    const sourceDirectory = sourcePath.split("/").slice(0, -1).join("/");
    const segments = `${sourceDirectory}/${importPath}`.split("/");
    const normalizedSegments: string[] = [];

    for (const segment of segments) {
      if (!segment || segment === ".") {
        continue;
      }

      if (segment === "..") {
        normalizedSegments.pop();
      } else {
        normalizedSegments.push(segment);
      }
    }

    basePath = normalizedSegments.join("/");
  }

  const extension = getExtension(basePath);

  const candidates = extension
    ? [basePath]
    : [
        ...SOURCE_EXTENSIONS.map((item) => `${basePath}${item}`),
        ...SOURCE_EXTENSIONS.map((item) => `${basePath}/index${item}`),
      ];

  return candidates.find((candidate) => availableFiles.has(candidate)) ?? null;
}

function detectNodeType(
  path: string,
  content: string
): "component" | "module" {
  const extension = getExtension(path);

  if (extension !== ".tsx" && extension !== ".jsx") {
    return "module";
  }

  const hasJsx = /<[A-Za-z][^>]*>/.test(content);
  const hasExportedComponent =
    /export\s+(?:default\s+)?(?:function|const|class)\s+[A-Z]/.test(
      content
    ) ||
    /export\s*\{\s*[A-Z]/.test(content);

  return hasJsx && hasExportedComponent ? "component" : "module";
}

async function fetchGitHubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "CodeAtlas",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed (${response.status}).`
    );
  }

  return response.json() as Promise<T>;
}

async function fetchSourceFile(
  owner: string,
  repository: string,
  branch: string,
  path: string
) {
  const url = `https://raw.githubusercontent.com/${owner}/${repository}/${encodeURIComponent(branch)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "CodeAtlas",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.text();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repositoryUrl = body.repositoryUrl;

    if (typeof repositoryUrl !== "string") {
      return NextResponse.json(
        { error: "A valid repository URL is required." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(repositoryUrl);
    } catch {
      return NextResponse.json(
        { error: "The repository URL is invalid." },
        { status: 400 }
      );
    }

    if (
      parsedUrl.hostname !== "github.com" &&
      parsedUrl.hostname !== "www.github.com"
    ) {
      return NextResponse.json(
        { error: "Only GitHub repositories are supported." },
        { status: 400 }
      );
    }

    const segments = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    if (segments.length < 2) {
      return NextResponse.json(
        { error: "The repository URL must include an owner and repository name." },
        { status: 400 }
      );
    }

    const owner = segments[0];
    const repository = segments[1].replace(/\.git$/, "");

    const repositoryData = await fetchGitHubJson<GitHubRepository>(
      `https://api.github.com/repos/${owner}/${repository}`
    );

    const branch = repositoryData.default_branch;

    const treeData = await fetchGitHubJson<{
      tree: GitHubTreeItem[];
      truncated: boolean;
    }>(
      `https://api.github.com/repos/${owner}/${repository}/git/trees/${encodeURIComponent(
        branch
      )}?recursive=1`
    );

    const sourceFiles = treeData.tree
      .filter((item) => item.type === "blob" && isSourceFile(item.path))
      .slice(0, MAX_ANALYSIS_FILES);

    const availableFiles = new Set(
      sourceFiles.map((file) => file.path)
    );

    const contents = new Map<string, string>();

    for (let index = 0; index < sourceFiles.length; index += BATCH_SIZE) {
      const batch = sourceFiles.slice(index, index + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (file) => ({
          path: file.path,
          content: await fetchSourceFile(
            owner,
            repository,
            branch,
            file.path
          ),
        }))
      );

      for (const result of results) {
        if (result.content !== null) {
          contents.set(result.path, result.content);
        }
      }
    }

    const nodes: ArchitectureNode[] = [];
    const edges: ArchitectureEdge[] = [];
    const edgeIds = new Set<string>();

    for (const [path, content] of contents) {
      const nodeType = detectNodeType(path, content);

      nodes.push({
        id: path,
        label: path.split("/").pop() ?? path,
        path,
        type: nodeType,
      });

      const imports = getImportPaths(content);

      for (const importPath of imports) {
        const target = resolveImport(
          importPath,
          path,
          availableFiles
        );

        if (!target || !contents.has(target)) {
          continue;
        }

        const edgeId = `${path}->${target}`;

        if (edgeIds.has(edgeId)) {
          continue;
        }

        edgeIds.add(edgeId);

        edges.push({
          id: edgeId,
          source: path,
          target,
        });
      }
    }

    const totalComponents = nodes.filter(
      (node) => node.type === "component"
    ).length;

    return NextResponse.json({
      repository: {
        owner,
        name: repository,
        branch,
      },
      nodes,
      edges,
      summary: {
        totalFiles: sourceFiles.length,
        analyzedFiles: nodes.length,
        totalComponents,
        totalModules: nodes.length - totalComponents,
        totalConnections: edges.length,
        truncated:
          treeData.truncated ||
          treeData.tree.filter(
            (item) => item.type === "blob" && isSourceFile(item.path)
          ).length > MAX_ANALYSIS_FILES,
        maxFiles: MAX_ANALYSIS_FILES,
      },
    });
  } catch (error) {
    console.error("Architecture analysis error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze repository architecture.",
      },
      { status: 500 }
    );
  }
}
