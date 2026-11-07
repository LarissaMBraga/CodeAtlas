
import { NextResponse } from "next/server";
import { githubApiFetch } from "@/lib/github/app-auth";
import { isRateLimitResponse } from "@/lib/github/rate-limit";
import {
  isSourceFile,
  SOURCE_EXTENSIONS,
} from "@/lib/github/source-files";

const MAX_ANALYSIS_FILES = 80;
const BATCH_SIZE = 10;

type GitHubRepository = {
  default_branch: string;
  private: boolean;
};

type GitHubTreeItem = {
  path: string;
  type: string;
  sha: string;
  size?: number;
};

type GitHubBlob = {
  content?: string;
  encoding?: string;
};

type GitHubTree = {
  tree: GitHubTreeItem[];
  truncated: boolean;
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

type ParsedRepository = {
  owner: string;
  repository: string;
};

type ArchitectureGraph = {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  totalComponents: number;
};

function parseRepositoryUrl(value: unknown): ParsedRepository | NextResponse {
  if (typeof value !== "string") {
    return NextResponse.json(
      { error: "A valid repository URL is required." },
      { status: 400 }
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    return NextResponse.json(
      { error: "The repository URL is invalid." },
      { status: 400 }
    );
  }

  const isGitHubUrl =
    ["https:", "http:"].includes(parsedUrl.protocol) &&
    ["github.com", "www.github.com"].includes(parsedUrl.hostname) &&
    !parsedUrl.port &&
    !parsedUrl.username &&
    !parsedUrl.password;

  if (!isGitHubUrl) {
    return NextResponse.json(
      { error: "Only GitHub repositories are supported." },
      { status: 400 }
    );
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const [owner, repositoryName] = segments;

  if (
    segments.length !== 2 ||
    !/^[a-zA-Z0-9-]+$/.test(owner) ||
    !/^[a-zA-Z0-9_.-]+$/.test(repositoryName)
  ) {
    return NextResponse.json(
      {
        error:
          "The repository URL must include a valid owner and repository name.",
      },
      { status: 400 }
    );
  }

  const repository = repositoryName.replace(/\.git$/i, "");

  if (!repository) {
    return NextResponse.json(
      { error: "The repository name is invalid." },
      { status: 400 }
    );
  }

  return { owner, repository };
}

async function fetchGitHubJson<T>(endpoint: string): Promise<T> {
  const response = await githubApiFetch(endpoint);

  if (await isRateLimitResponse(response)) {
    throw new Error("GITHUB_RATE_LIMIT");
  }

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

async function fetchRepositoryTree(
  owner: string,
  repository: string
) {
  const endpoint =
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;

  const repositoryData = await fetchGitHubJson<GitHubRepository>(
    endpoint
  );

  const treeData = await fetchGitHubJson<GitHubTree>(
    `${endpoint}/git/trees/${encodeURIComponent(repositoryData.default_branch)}?recursive=1`
  );

  return {
    branch: repositoryData.default_branch,
    isPrivate: repositoryData.private,
    treeData,
  };
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

async function fetchSourceFile(
  owner: string,
  repository: string,
  path: string,
  branch: string,
  sha: string,
  isPrivate: boolean
) {
  if (!isPrivate) {
    const encodedBranch = branch
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const encodedPath = path
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/${encodedBranch}/${encodedPath}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    return response.ok ? response.text() : null;
  }

  const response = await githubApiFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/blobs/${encodeURIComponent(sha)}`
  );

  if (await isRateLimitResponse(response)) {
    throw new Error("GITHUB_RATE_LIMIT");
  }

  if (!response.ok) {
    return null;
  }

  const blob: GitHubBlob = await response.json();

  if (
    typeof blob.content !== "string" ||
    blob.encoding !== "base64"
  ) {
    return null;
  }

  return Buffer.from(
    blob.content.replace(/\s/g, ""),
    "base64"
  ).toString("utf-8");
}

async function fetchSourceContents(
  owner: string,
  repository: string,
  branch: string,
  isPrivate: boolean,
  sourceFiles: GitHubTreeItem[]
) {
  const contents = new Map<string, string>();

  for (let index = 0; index < sourceFiles.length; index += BATCH_SIZE) {
    const batch = sourceFiles.slice(index, index + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (file) => ({
        path: file.path,
        content: await fetchSourceFile(
          owner,
          repository,
          file.path,
          branch,
          file.sha,
          isPrivate
        ),
      }))
    );

    for (const result of results) {
      if (result.content !== null) {
        contents.set(result.path, result.content);
      }
    }
  }

  return contents;
}

function buildArchitectureGraph(
  contents: Map<string, string>,
  availableFiles: Set<string>
): ArchitectureGraph {
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

  return { nodes, edges, totalComponents };
}

function createArchitectureResponse(
  owner: string,
  repository: string,
  branch: string,
  treeData: GitHubTree,
  allSourceFiles: GitHubTreeItem[],
  sourceFiles: GitHubTreeItem[],
  graph: ArchitectureGraph
) {
  const { nodes, edges, totalComponents } = graph;

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
        allSourceFiles.length > MAX_ANALYSIS_FILES,
      maxFiles: MAX_ANALYSIS_FILES,
    },
  });
}

function createErrorResponse(error: unknown) {
  if (
    error instanceof Error &&
    error.message === "GITHUB_RATE_LIMIT"
  ) {
    return NextResponse.json(
      {
        error: "GitHub API rate limit reached. Please try again later.",
      },
      { status: 429 }
    );
  }

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

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const parsedRepository = parseRepositoryUrl(
      typeof body === "object" && body !== null && "repositoryUrl" in body
        ? body.repositoryUrl
        : undefined
    );

    if (parsedRepository instanceof NextResponse) {
      return parsedRepository;
    }

    const { owner, repository } = parsedRepository;

    const { branch, isPrivate, treeData } =
      await fetchRepositoryTree(owner, repository);

    const allSourceFiles = treeData.tree.filter(
      (item) =>
        item.type === "blob" &&
        isSourceFile(item.path, { caseInsensitive: true })
    );

    const sourceFiles = allSourceFiles.slice(
      0,
      MAX_ANALYSIS_FILES
    );

    const availableFiles = new Set(
      sourceFiles.map((file) => file.path)
    );

    const contents = await fetchSourceContents(
      owner,
      repository,
      branch,
      isPrivate,
      sourceFiles
    );

    const graph = buildArchitectureGraph(
      contents,
      availableFiles
    );

    return createArchitectureResponse(
      owner,
      repository,
      branch,
      treeData,
      allSourceFiles,
      sourceFiles,
      graph
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
