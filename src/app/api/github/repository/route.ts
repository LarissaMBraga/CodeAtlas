
import { NextResponse } from "next/server";
import { githubApiFetch } from "@/lib/github/app-auth";
import { isRateLimitResponse } from "@/lib/github/rate-limit";

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
const MANIFEST_CONCURRENCY = 4;

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

type GitHubRepositoryData = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
};

type GitHubTreeData = {
  tree?: GitHubTreeItem[];
  truncated?: boolean;
};

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

type RepositoryUrl = {
  owner: string;
  repository: string;
};

type SourceFileAnalysis = {
  allSourceFiles: GitHubTreeItem[];
  sourceFiles: {
    path: string;
    sha: string;
    size: number;
  }[];
};

type LanguageAnalysis = {
  languages: {
    name: string;
    bytes: number;
    percentage: number;
    fileCount: number;
  }[];
  languageAnalysis: {
    available: boolean;
    totalBytes: number;
    totalFiles: number;
  };
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

function createRateLimitResponse(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  const resetAt = response.headers.get("x-ratelimit-reset");

  return NextResponse.json(
    {
      error: "GitHub API rate limit reached. Please try again later.",
      retryAfter: retryAfter ? Number(retryAfter) : null,
      resetAt: resetAt ? Number(resetAt) : null,
    },
    {
      status: 429,
    }
  );
}

function createPermissionResponse() {
  return NextResponse.json(
    {
      error:
        "GitHub denied access to this repository. Check the GitHub App installation permissions.",
    },
    {
      status: 403,
    }
  );
}

function createRateLimitErrorResponse() {
  return NextResponse.json(
    {
      error: "GitHub API rate limit reached. Please try again later.",
    },
    { status: 429 }
  );
}

function createUnexpectedErrorResponse() {
  return NextResponse.json(
    {
      error:
        "An unexpected error occurred while retrieving the repository.",
    },
    { status: 500 }
  );
}

function parseRepositoryUrl(body: unknown): Result<RepositoryUrl> {
  if (!isRecord(body) || typeof body.repositoryUrl !== "string") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "A valid repository URL is required." },
        { status: 400 }
      ),
    };
  }

  const repositoryUrl = body.repositoryUrl
    .trim()
    .replace(/\/+$/, "");

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(repositoryUrl);
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Enter a valid GitHub repository URL." },
        { status: 400 }
      ),
    };
  }

  if (
    !["https:", "http:"].includes(parsedUrl.protocol) ||
    parsedUrl.hostname !== "github.com" ||
    parsedUrl.port ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only GitHub repository URLs are supported." },
        { status: 400 }
      ),
    };
  }

  const pathParts = parsedUrl.pathname
    .split("/")
    .filter(Boolean);

  if (
    pathParts.length !== 2 ||
    !/^[a-zA-Z0-9-]+$/.test(pathParts[0]) ||
    !/^[a-zA-Z0-9_.-]+$/.test(pathParts[1])
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Enter a valid GitHub repository URL." },
        { status: 400 }
      ),
    };
  }

  const [owner, repository] = pathParts;
  const repositoryName = repository.replace(/\.git$/i, "");

  if (!repositoryName) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Enter a valid repository name." },
        { status: 400 }
      ),
    };
  }

  return {
    ok: true,
    data: {
      owner,
      repository: repositoryName,
    },
  };
}

async function fetchRepositoryAndTree(
  owner: string,
  repository: string
): Promise<
  Result<{
    repositoryData: GitHubRepositoryData;
    treeData: GitHubTreeData;
    tree: GitHubTreeItem[];
    repositoryEndpoint: string;
  }>
> {
  const repositoryEndpoint =
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;

  const githubResponse = await githubApiFetch(repositoryEndpoint);

  if (githubResponse.status === 404) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Repository not found or not publicly accessible." },
        { status: 404 }
      ),
    };
  }

  if (await isRateLimitResponse(githubResponse)) {
    return {
      ok: false,
      response: createRateLimitResponse(githubResponse),
    };
  }

  if (githubResponse.status === 403) {
    return {
      ok: false,
      response: createPermissionResponse(),
    };
  }

  if (!githubResponse.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Unable to retrieve repository information from GitHub.",
        },
        { status: 502 }
      ),
    };
  }

  const repositoryData: GitHubRepositoryData =
    await githubResponse.json();

  const treeResponse = await githubApiFetch(
    `${repositoryEndpoint}/git/trees/${encodeURIComponent(repositoryData.default_branch)}?recursive=1`
  );

  if (await isRateLimitResponse(treeResponse)) {
    return {
      ok: false,
      response: createRateLimitResponse(treeResponse),
    };
  }

  if (treeResponse.status === 403) {
    return {
      ok: false,
      response: createPermissionResponse(),
    };
  }

  if (!treeResponse.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unable to retrieve the repository file structure." },
        { status: 502 }
      ),
    };
  }

  const treeData: GitHubTreeData = await treeResponse.json();

  return {
    ok: true,
    data: {
      repositoryData,
      treeData,
      tree: treeData.tree ?? [],
      repositoryEndpoint,
    },
  };
}

function analyzeSourceFiles(tree: GitHubTreeItem[]): SourceFileAnalysis {
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

  return {
    allSourceFiles,
    sourceFiles,
  };
}

async function analyzeLanguages(
  repositoryEndpoint: string,
  allSourceFiles: GitHubTreeItem[]
): Promise<Result<LanguageAnalysis>> {
  const languagesResponse = await githubApiFetch(
    `${repositoryEndpoint}/languages`
  );

  if (await isRateLimitResponse(languagesResponse)) {
    return {
      ok: false,
      response: createRateLimitResponse(languagesResponse),
    };
  }

  if (languagesResponse.status === 403) {
    return {
      ok: false,
      response: createPermissionResponse(),
    };
  }

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

  return {
    ok: true,
    data: {
      languages,
      languageAnalysis: {
        available: languageAnalysisAvailable,
        totalBytes: totalLanguageBytes,
        totalFiles: allSourceFiles.length,
      },
    },
  };
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
  allPaths: Set<string>
): Promise<PackageManifestAnalysis | null> {
  const response = await githubApiFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/blobs/${encodeURIComponent(manifest.sha)}`
  );

  if (await isRateLimitResponse(response)) {
    throw new Error("GITHUB_RATE_LIMIT");
  }

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
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "GITHUB_RATE_LIMIT"
    ) {
      throw error;
    }

    return null;
  }
}

async function fetchManifests(
  owner: string,
  repository: string,
  manifests: GitHubTreeItem[],
  allPaths: Set<string>
) {
  const results: (PackageManifestAnalysis | null)[] = [];

  for (
    let index = 0;
    index < manifests.length;
    index += MANIFEST_CONCURRENCY
  ) {
    const batch = manifests.slice(
      index,
      index + MANIFEST_CONCURRENCY
    );

    const batchResults = await Promise.all(
      batch.map((manifest) =>
        fetchPackageManifest(
          owner,
          repository,
          manifest,
          allPaths
        )
      )
    );

    results.push(...batchResults);
  }

  return results;
}

async function analyzeDependencies(
  owner: string,
  repository: string,
  tree: GitHubTreeItem[],
  treeData: GitHubTreeData
) {
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

  const manifestResults = await fetchManifests(
    owner,
    repository,
    selectedManifests,
    allPaths
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

  return {
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
}

function createRepositoryResponse(
  repositoryData: GitHubRepositoryData,
  treeData: GitHubTreeData,
  sourceAnalysis: SourceFileAnalysis,
  languageAnalysis: LanguageAnalysis,
  dependenciesAnalysis: Awaited<
    ReturnType<typeof analyzeDependencies>
  >
) {
  return NextResponse.json({
    repository: {
      id: repositoryData.id,
      name: repositoryData.name,
      fullName: repositoryData.full_name,
      description: repositoryData.description,
      url: repositoryData.html_url,
      language: repositoryData.language,
      stars: repositoryData.stargazers_count,
      forks: repositoryData.forks_count,
      defaultBranch: repositoryData.default_branch,
      isPrivate: repositoryData.private,
      owner: {
        username: repositoryData.owner.login,
        avatarUrl: repositoryData.owner.avatar_url,
      },
    },
    files: sourceAnalysis.sourceFiles,
    languages: languageAnalysis.languages,
    languageAnalysis: languageAnalysis.languageAnalysis,
    dependenciesAnalysis,
    analysis: {
      totalSourceFiles: sourceAnalysis.sourceFiles.length,
      maxFiles: MAX_FILES,
      truncated:
        Boolean(treeData.truncated) ||
        sourceAnalysis.allSourceFiles.length > MAX_FILES,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsedRepository = parseRepositoryUrl(body);

    if (!parsedRepository.ok) {
      return parsedRepository.response;
    }

    const { owner, repository } = parsedRepository.data;

    const repositoryResult = await fetchRepositoryAndTree(
      owner,
      repository
    );

    if (!repositoryResult.ok) {
      return repositoryResult.response;
    }

    const {
      repositoryData,
      treeData,
      tree,
    } = repositoryResult.data;

    const sourceAnalysis = analyzeSourceFiles(tree);

    const languageResult = await analyzeLanguages(
      repositoryResult.data.repositoryEndpoint,
      sourceAnalysis.allSourceFiles
    );

    if (!languageResult.ok) {
      return languageResult.response;
    }

    const dependenciesAnalysis = await analyzeDependencies(
      owner,
      repository,
      tree,
      treeData
    );

    return createRepositoryResponse(
      repositoryData,
      treeData,
      sourceAnalysis,
      languageResult.data,
      dependenciesAnalysis
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "GITHUB_RATE_LIMIT"
    ) {
      return createRateLimitErrorResponse();
    }

    return createUnexpectedErrorResponse();
  }
}
