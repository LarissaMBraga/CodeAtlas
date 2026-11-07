
import "server-only";

import { githubApiFetch } from "@/lib/github/app-auth";

export type SecurityFileKind =
  | "source"
  | "dependency"
  | "configuration"
  | "workflow"
  | "environment";

export type SecurityRepositoryFile = {
  path: string;
  content: string;
  size: number;
  sha: string;
  kind: SecurityFileKind;
};

export type SecurityFileCollection = {
  files: SecurityRepositoryFile[];
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  truncated: boolean;
  limitations: string[];
};

type GitHubTreeEntry = {
  path: string;
  type: string;
  sha: string;
  size?: number;
};

type GitHubTreeResponse = {
  tree?: GitHubTreeEntry[];
  truncated?: boolean;
};

type GitHubBlobResponse = {
  content?: string;
  encoding?: string;
  size?: number;
};

type CandidateFile = GitHubTreeEntry & {
  kind: SecurityFileKind;
  priority: number;
};

const MAX_FILES = 600;
const MAX_SOURCE_FILE_SIZE = 1024 * 1024;
const MAX_OTHER_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 30 * 1024 * 1024;
const CONCURRENCY = 5;

const SOURCE_EXTENSIONS = new Set([
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
  ".py",
  ".pyi",
  ".go",
  ".java",
  ".kt",
  ".kts",
  ".php",
  ".rb",
  ".rs",
  ".swift",
  ".dart",
  ".cs",
  ".fs",
  ".fsx",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
  ".cc",
  ".sh",
  ".bash",
  ".ps1",
  ".sql",
  ".xml",
]);

const LOCKFILES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "poetry.lock",
  "uv.lock",
  "Pipfile.lock",
  "requirements.txt",
  "Cargo.lock",
  "Gemfile.lock",
  "composer.lock",
  "go.sum",
  "packages.lock.json",
  "gradle.lockfile",
  "mix.lock",
  "pubspec.lock",
]);

const CONFIGURATION_FILES = new Set([
  ".gitignore",
  ".dockerignore",
  ".npmrc",
  ".nvmrc",
  ".node-version",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "next.config.tsx",
  "vite.config.js",
  "vite.config.ts",
  "webpack.config.js",
  "webpack.config.ts",
  "tsconfig.json",
  "jsconfig.json",
  "vercel.json",
  "netlify.toml",
  "firebase.json",
  "supabase/config.toml",
  "terraform.tf",
  "main.tf",
  "variables.tf",
  "providers.tf",
  "serverless.yml",
  "serverless.yaml",
]);

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  "vendor",
  ".vercel",
  ".turbo",
  ".cache",
  "out",
  "target",
  "bin",
  "obj",
]);

function getExtension(filePath: string): string {
  const fileName = filePath.split("/").pop() ?? "";
  const lastDot = fileName.lastIndexOf(".");

  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

function isIgnoredPath(filePath: string): boolean {
  return filePath
    .split("/")
    .some((segment) => IGNORED_DIRECTORIES.has(segment));
}

function classifyFile(
  filePath: string,
): { kind: SecurityFileKind; priority: number } | null {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const fileName = normalizedPath.split("/").pop() ?? "";
  const lowerName = fileName.toLowerCase();
  const lowerPath = normalizedPath.toLowerCase();

  if (isIgnoredPath(normalizedPath)) {
    return null;
  }

  if (
    LOCKFILES.has(fileName) ||
    LOCKFILES.has(lowerName)
  ) {
    return { kind: "dependency", priority: 0 };
  }

  if (
    lowerPath.startsWith(".github/workflows/") &&
    /\.(yml|yaml)$/i.test(fileName)
  ) {
    return { kind: "workflow", priority: 1 };
  }

  if (
    fileName === ".env" ||
    /^\.env\.(example|sample|template|development|production|local|test)$/.test(
      lowerName,
    )
  ) {
    return { kind: "environment", priority: 1 };
  }

  if (
    CONFIGURATION_FILES.has(fileName) ||
    CONFIGURATION_FILES.has(lowerName) ||
    /\.(tf|tfvars|toml|ini|conf|config)$/i.test(fileName) ||
    /(^|\/)(k8s|kubernetes|helm|terraform|infra|infrastructure)\//i.test(
      normalizedPath,
    )
  ) {
    return { kind: "configuration", priority: 2 };
  }

  if (SOURCE_EXTENSIONS.has(getExtension(fileName))) {
    return { kind: "source", priority: 3 };
  }

  return null;
}

function getFileSizeLimit(kind: SecurityFileKind): number {
  return kind === "source"
    ? MAX_SOURCE_FILE_SIZE
    : MAX_OTHER_FILE_SIZE;
}

async function fetchJson<T>(endpoint: string): Promise<T> {
  const response = await githubApiFetch(endpoint, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error("GitHub API rate limit or permission error.");
    }

    if (response.status === 404) {
      throw new Error("Repository or branch not found.");
    }

    throw new Error(`GitHub API request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

async function fetchBlob(
  owner: string,
  repo: string,
  entry: CandidateFile,
): Promise<SecurityRepositoryFile> {
  const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${entry.sha}`;

  const blob = await fetchJson<GitHubBlobResponse>(endpoint);

  if (!blob.content || blob.encoding !== "base64") {
    throw new Error("Unsupported GitHub blob encoding.");
  }

  const content = Buffer.from(
    blob.content.replace(/\s/g, ""),
    "base64",
  ).toString("utf8");

  return {
    path: entry.path,
    content,
    size: blob.size ?? entry.size ?? Buffer.byteLength(content, "utf8"),
    sha: entry.sha,
    kind: entry.kind,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<Array<{ success: true; value: R } | { success: false }>> {
  const results: Array<
    { success: true; value: R } | { success: false }
  > = new Array(items.length);

  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;

      if (index >= items.length) {
        return;
      }

      try {
        const value = await mapper(items[index]);
        results[index] = { success: true, value };
      } catch {
        results[index] = { success: false };
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  );

  return results;
}

export async function collectSecurityFiles(
  owner: string,
  repo: string,
  branch: string,
): Promise<SecurityFileCollection> {
  const encodedBranch = encodeURIComponent(branch);

  const treeResponse = await fetchJson<GitHubTreeResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodedBranch}?recursive=1`,
  );

  const candidates = (treeResponse.tree ?? [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => {
      const classification = classifyFile(entry.path);

      if (!classification) {
        return null;
      }

      return {
        ...entry,
        ...classification,
      };
    })
    .filter((entry): entry is CandidateFile => entry !== null)
    .sort((a, b) => a.priority - b.priority);

  const totalFiles = candidates.length;
  const selectedFiles = candidates.slice(0, MAX_FILES);

  const limitations: string[] = [];

  if (treeResponse.truncated) {
    limitations.push(
      "GitHub truncated the repository tree. Some repository files may not have been discovered.",
    );
  }

  if (totalFiles > MAX_FILES) {
    limitations.push(
      `The scan is limited to ${MAX_FILES} files. Additional eligible files were not collected.`,
    );
  }

  const sizeEligibleFiles = selectedFiles.filter(
    (entry) => (entry.size ?? 0) <= getFileSizeLimit(entry.kind),
  );

  const oversizedFiles = selectedFiles.length - sizeEligibleFiles.length;

  if (oversizedFiles > 0) {
    limitations.push(
      `${oversizedFiles} files exceeded their individual size limit and were skipped.`,
    );
  }

  const results = await mapWithConcurrency(
    sizeEligibleFiles,
    CONCURRENCY,
    (entry) => fetchBlob(owner, repo, entry),
  );

  const files: SecurityRepositoryFile[] = [];
  let totalSize = 0;
  let failedFiles = 0;
  let skippedFiles = oversizedFiles;

  for (const result of results) {
    if (!result.success) {
      failedFiles += 1;
      continue;
    }

    const file = result.value;
    const actualSize = Buffer.byteLength(file.content, "utf8");

    if (actualSize > getFileSizeLimit(file.kind)) {
      skippedFiles += 1;
      continue;
    }

    if (totalSize + actualSize > MAX_TOTAL_SIZE) {
      skippedFiles += 1;
      continue;
    }

    files.push(file);
    totalSize += actualSize;
  }

  if (failedFiles > 0) {
    limitations.push(
      `${failedFiles} files could not be retrieved from GitHub.`,
    );
  }

  if (skippedFiles > oversizedFiles) {
    limitations.push(
      "Some files were skipped because the total collection size limit was reached.",
    );
  }

  const truncated =
    Boolean(treeResponse.truncated) ||
    totalFiles > MAX_FILES ||
    skippedFiles > 0 ||
    failedFiles > 0;

  return {
    files,
    totalFiles,
    analyzedFiles: files.length,
    skippedFiles,
    failedFiles,
    truncated,
    limitations,
  };
}
