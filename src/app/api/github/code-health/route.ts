import { NextResponse } from "next/server";
import ts from "typescript";
import { githubApiFetch } from "@/lib/github/app-auth";
import { isRateLimitResponse } from "@/lib/github/rate-limit";
import type { StructureItem } from "@xberg-io/tree-sitter-language-pack";
import { analyzeWithTreeSitter } from "@/lib/code-health/tree-sitter-analyzer";
import { detectLanguageFromPath } from "@xberg-io/tree-sitter-language-pack";
import { getLanguageByPath } from "@/lib/code-health/language-config";
import type {
  CodeHealthData,
  FileMetric,
  FunctionMetric,
  Issue,
} from "@/lib/code-health/types";

const MAX_FILES = 500;
const MAX_FILE_SIZE = 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const CONCURRENCY = 5;

const SPECIALIZED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
  ".git",
]);

const IGNORED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "composer.lock",
  "cargo.lock",
  "poetry.lock",
  "pipfile.lock",
  "gemfile.lock",
]);

type SourceFile = {
  path: string;
  sha: string;
  size: number;
};

type AnalyzedFile = {
  path: string;
  content: string;
  size: number;
  lines: number;
  complexity: number;
  functions: FunctionMetric[];
  issues: Issue[];
};

type AnalysisRequest = {
  owner: string;
  repo: string;
  ref: string;
};

type FileSelection = {
  allFiles: SourceFile[];
  selectedFiles: SourceFile[];
  ignoredDirectoryFiles: number;
  unsupportedFiles: number;
  emptyFiles: number;
  oversizedFiles: number;
  fileLimitExceeded: number;
  totalSizeLimitExceeded: number;
};

type RepositoryTree = {
  treeData: Record<string, unknown>;
  treeItems: unknown[];
};

type FileAnalysisResult = {
  analyzedFiles: AnalyzedFile[];
  fetchFailedFiles: number;
  analyzedBytes: number;
};

function getExtension(path: string) {
  const name = path.split("/").pop() || "";
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function isSupportedPath(path: string) {
  const fileName = path.split("/").pop()?.toLowerCase() ?? "";

  if (IGNORED_FILES.has(fileName)) {
    return false;
  }

  const language = getLanguageByPath(path);

  if (!language) {
    return false;
  }

  if (SPECIALIZED_EXTENSIONS.has(getExtension(path))) {
    return true;
  }

  return detectLanguageFromPath(path) !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTestFile(path: string) {
  const normalizedPath = path.replace(/\\/g, "/");
  const fileName = normalizedPath.split("/").pop() ?? "";

  return (
    /(^|\/)__tests__\//i.test(normalizedPath) ||
    /\.(test|spec)\.[^.]+$/i.test(fileName) ||
    /^test_[^.]+\.[^.]+$/i.test(fileName) ||
    /_(test|spec)\.[^.]+$/i.test(fileName) ||
    /^Test[^.]+\.[^.]+$/.test(fileName) ||
    /^[^.]+Test\.[^.]+$/.test(fileName)
  );
}

function getTestTargetName(path: string) {
  const fileName = path.replace(/\\/g, "/").split("/").pop() ?? "";
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");

  return withoutExtension
    .replace(/^(test_|Test)/, "")
    .replace(/\.(test|spec)$/i, "")
    .replace(/_(test|spec)$/i, "")
    .replace(/Test$/, "")
    .toLowerCase();
}

function isIgnoredPath(path: string) {
  return path.split("/").some((part) => IGNORED_DIRECTORIES.has(part));
}

function getLine(sourceFile: ts.SourceFile, node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile)
  ).line + 1;
}

function getNodeName(node: ts.Node) {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  ) {
    if (node.name && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
  }

  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name.text;
  }

  return "Anonymous function";
}

function getFunctionBody(node: ts.Node) {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  ) {
    return node.body;
  }

  return undefined;
}

function countLines(content: string) {
  return content.length === 0 ? 0 : content.split(/\r?\n/).length;
}

function getCodeSnippet(content: string, line: number) {
  if (!content || line < 1) {
    return undefined;
  }

  const lines = content.split(/\r?\n/);

  if (line > lines.length) {
    return undefined;
  }

  const targetIndex = line - 1;
  const startIndex = Math.max(0, targetIndex - 2);
  const endIndex = Math.min(lines.length, targetIndex + 3);

  return {
    startLine: startIndex + 1,
    lines: lines.slice(startIndex, endIndex),
  };
}

function addIssue(
  issues: Issue[],
  file: string,
  line: number,
  category: string,
  severity: Issue["severity"],
  title: string,
  description: string,
  recommendation: string
) {
  issues.push({
    id: `${file}:${line}:${category}:${title}`,
    category,
    severity,
    title,
    description,
    file,
    line,
    recommendation,
  });
}

function analyzeTypeScriptComments(
  sourceFile: ts.SourceFile,
  path: string,
  issues: Issue[]
) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    path.endsWith(".tsx") || path.endsWith(".jsx")
      ? ts.LanguageVariant.JSX
      : ts.LanguageVariant.Standard,
    sourceFile.text
  );

  const markerPattern = /\b(TODO|FIXME|HACK)\b/gi;

  let token = scanner.scan();

  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      const commentText = scanner.getTokenText();
      const commentStart = scanner.getTokenPos();

      let match: RegExpExecArray | null;

      markerPattern.lastIndex = 0;

      while ((match = markerPattern.exec(commentText)) !== null) {
        const line =
          sourceFile.getLineAndCharacterOfPosition(
            commentStart + match.index
          ).line + 1;

        const marker = match[1].toUpperCase();

        addIssue(
          issues,
          path,
          line,
          "code-smell",
          marker === "FIXME" ? "medium" : "low",
          `${marker} comment`,
          `A ${marker} marker was found.`,
          "Review the note and resolve it or document why it remains."
        );
      }
    }

    token = scanner.scan();
  }
}

function calculateFunctionComplexity(node: ts.Node) {
  let complexity = 1;

  function visit(current: ts.Node) {
    if (
      current !== node &&
      (
        ts.isFunctionDeclaration(current) ||
        ts.isFunctionExpression(current) ||
        ts.isArrowFunction(current) ||
        ts.isMethodDeclaration(current)
      )
    ) {
      return;
    }

    if (
      ts.isIfStatement(current) ||
      ts.isForStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isForOfStatement(current) ||
      ts.isWhileStatement(current) ||
      ts.isDoStatement(current) ||
      ts.isCatchClause(current) ||
      ts.isConditionalExpression(current) ||
      ts.isCaseClause(current)
    ) {
      complexity += 1;
    }

    if (
      ts.isBinaryExpression(current) &&
      [
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ].includes(current.operatorToken.kind)
    ) {
      complexity += 1;
    }

    ts.forEachChild(current, visit);
  }

  visit(node);
  return complexity;
}

function analyzeFunctionNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  path: string,
  content: string,
  functions: FunctionMetric[],
  issues: Issue[]
) {
  const body = getFunctionBody(node);

  if (!body) {
    return 0;
  }

  const complexity = calculateFunctionComplexity(node);
  const functionLines = countLines(
    content.slice(body.getStart(sourceFile), body.end)
  );

  const metric: FunctionMetric = {
    name: getNodeName(node),
    file: path,
    line: getLine(sourceFile, node),
    complexity,
    lines: functionLines,
  };

  functions.push(metric);

  if (complexity > 10) {
    addIssue(
      issues,
      path,
      metric.line,
      "complexity",
      "high",
      "High function complexity",
      `${metric.name} has a complexity score of ${complexity}.`,
      "Break the function into smaller units and simplify conditional branches."
    );
  } else if (complexity > 5) {
    addIssue(
      issues,
      path,
      metric.line,
      "complexity",
      "medium",
      "Moderate function complexity",
      `${metric.name} has a complexity score of ${complexity}.`,
      "Consider extracting conditional logic into smaller functions."
    );
  }

  if (functionLines > 100) {
    addIssue(
      issues,
      path,
      metric.line,
      "maintainability",
      "high",
      "Very long function",
      `${metric.name} contains ${functionLines} lines.`,
      "Split the function into smaller, focused responsibilities."
    );
  } else if (functionLines > 50) {
    addIssue(
      issues,
      path,
      metric.line,
      "maintainability",
      "medium",
      "Long function",
      `${metric.name} contains ${functionLines} lines.`,
      "Consider extracting reusable logic into smaller functions."
    );
  }

  return complexity;
}

function analyzeCatchClause(
  node: ts.CatchClause,
  sourceFile: ts.SourceFile,
  path: string,
  issues: Issue[]
) {
  if (
    node.block.statements.length > 0 &&
    !node.block.statements.every((statement) =>
      ts.isEmptyStatement(statement)
    )
  ) {
    return;
  }

  addIssue(
    issues,
    path,
    getLine(sourceFile, node),
    "error-handling",
    "high",
    "Empty catch block",
    "An exception is caught without any visible handling.",
    "Handle the error, log useful context, or rethrow it."
  );
}

function analyzeConsoleCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  path: string,
  issues: Issue[]
) {
  if (
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== "log" ||
    !ts.isIdentifier(node.expression.expression) ||
    node.expression.expression.text !== "console"
  ) {
    return;
  }

  addIssue(
    issues,
    path,
    getLine(sourceFile, node),
    "code-smell",
    "low",
    "Console log statement",
    "A console.log statement was found in the source code.",
    "Remove temporary logs or replace them with an appropriate logging strategy."
  );
}

function analyzeAnyType(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  path: string,
  issues: Issue[]
) {
  if (node.kind !== ts.SyntaxKind.AnyKeyword) {
    return;
  }

  addIssue(
    issues,
    path,
    getLine(sourceFile, node),
    "best-practices",
    "low",
    "Explicit any type",
    "The any type disables useful TypeScript type checking.",
    "Replace any with a specific type, interface, or unknown where appropriate."
  );
}

function analyzeTimerCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  path: string,
  issues: Issue[]
) {
  if (
    !ts.isIdentifier(node.expression) ||
    !["setTimeout", "setInterval"].includes(node.expression.text)
  ) {
    return;
  }

  const callback = node.arguments[0];

  if (
    !callback ||
    (!ts.isArrowFunction(callback) &&
      !ts.isFunctionExpression(callback)) ||
    !callback.getText(sourceFile).includes("console.log")
  ) {
    return;
  }

  addIssue(
    issues,
    path,
    getLine(sourceFile, node),
    "code-smell",
    "low",
    "Debug logging in timer callback",
    "A timer callback contains console logging.",
    "Remove debugging output before production."
  );
}

function analyzeAstNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  path: string,
  content: string,
  functions: FunctionMetric[],
  issues: Issue[]
) {
  return (
    analyzeFunctionNode(
      node,
      sourceFile,
      path,
      content,
      functions,
      issues
    ) +
    0
  );
}

function analyzeFile(
  path: string,
  content: string,
  size: number
): AnalyzedFile {
  const sourceFile = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") || path.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS
  );

  const lines = countLines(content);
  const issues: Issue[] = [];
  const functions: FunctionMetric[] = [];
  let fileComplexity = 0;

  function visit(node: ts.Node) {
    fileComplexity += analyzeAstNode(
      node,
      sourceFile,
      path,
      content,
      functions,
      issues
    );

    if (ts.isCatchClause(node)) {
      analyzeCatchClause(node, sourceFile, path, issues);
    }

    if (ts.isCallExpression(node)) {
      analyzeConsoleCall(node, sourceFile, path, issues);
      analyzeTimerCall(node, sourceFile, path, issues);
    }

    analyzeAnyType(node, sourceFile, path, issues);

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  analyzeTypeScriptComments(sourceFile, path, issues);

  if (lines > 500) {
    addIssue(
      issues,
      path,
      1,
      "maintainability",
      "high",
      "Very large source file",
      `This file contains ${lines} lines.`,
      "Split the file into smaller modules with clear responsibilities."
    );
  } else if (lines > 300) {
    addIssue(
      issues,
      path,
      1,
      "maintainability",
      "medium",
      "Large source file",
      `This file contains ${lines} lines.`,
      "Consider separating independent responsibilities."
    );
  }

  return {
    path,
    content,
    size,
    lines,
    complexity: fileComplexity,
    functions,
    issues,
  };
}

function collectGenericFunctions(items: StructureItem[]): FunctionMetric[] {
  const functions: FunctionMetric[] = [];

  for (const item of items) {
    const kind = item.kind?.type;

    if (
      (kind === "Function" || kind === "Method") &&
      item.span
    ) {
      const startLine = item.span.startLine ?? 0;
      const endLine = item.span.endLine ?? startLine;

      functions.push({
        name: item.name ?? "Anonymous function",
        file: "",
        line: startLine + 1,
        complexity: 1,
        lines: Math.max(1, endLine - startLine + 1),
      });
    }

    if (item.children?.length) {
      functions.push(...collectGenericFunctions(item.children));
    }
  }

  return functions;
}

function collectGenericDiagnostics(
  analysis: NonNullable<ReturnType<typeof analyzeWithTreeSitter>>,
  path: string,
  issues: Issue[]
) {
  for (const diagnostic of analysis.result.diagnostics ?? []) {
    const severity: Issue["severity"] =
      diagnostic.severity === "Error"
        ? "high"
        : diagnostic.severity === "Warning"
          ? "medium"
          : "info";

    addIssue(
      issues,
      path,
      (diagnostic.span?.startLine ?? 0) + 1,
      "syntax",
      severity,
      "Syntax diagnostic",
      diagnostic.message ?? "The parser detected a syntax issue.",
      "Review the indicated location and correct the syntax if necessary."
    );
  }
}

function collectGenericComments(
  analysis: NonNullable<ReturnType<typeof analyzeWithTreeSitter>>,
  path: string,
  issues: Issue[]
) {
  const markerPattern = /\b(TODO|FIXME|HACK)\b/gi;

  for (const comment of analysis.result.comments ?? []) {
    if (!comment.text) {
      continue;
    }

    let match: RegExpExecArray | null;
    markerPattern.lastIndex = 0;

    while ((match = markerPattern.exec(comment.text)) !== null) {
      const marker = match[1].toUpperCase();

      addIssue(
        issues,
        path,
        (comment.span?.startLine ?? 0) + 1,
        "code-smell",
        marker === "FIXME" ? "medium" : "low",
        `${marker} comment`,
        `A ${marker} marker was found.`,
        "Review the note and resolve it or document why it remains."
      );
    }
  }
}

function addFileSizeIssues(
  path: string,
  lines: number,
  issues: Issue[]
) {
  if (lines > 500) {
    addIssue(
      issues,
      path,
      1,
      "maintainability",
      "high",
      "Very large source file",
      `This file contains ${lines} lines.`,
      "Split the file into smaller modules with clear responsibilities."
    );
  } else if (lines > 300) {
    addIssue(
      issues,
      path,
      1,
      "maintainability",
      "medium",
      "Large source file",
      `This file contains ${lines} lines.`,
      "Consider separating independent responsibilities."
    );
  }
}

function analyzeGenericFile(
  path: string,
  content: string,
  size: number
): AnalyzedFile | null {
  const analysis = analyzeWithTreeSitter(path, content);

  if (!analysis) {
    return null;
  }

  const issues: Issue[] = [];
  const functions = collectGenericFunctions(
    analysis.result.structure ?? []
  ).map((item) => ({
    ...item,
    file: path,
  }));

  collectGenericDiagnostics(analysis, path, issues);
  collectGenericComments(analysis, path, issues);

  const lines =
    analysis.result.metrics?.totalLines ?? countLines(content);

  addFileSizeIssues(path, lines, issues);

  return {
    path,
    content,
    size,
    lines,
    complexity: functions.reduce(
      (total, item) => total + item.complexity,
      0
    ),
    functions,
    issues,
  };
}

async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  const encodedPath = path
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const endpoint =
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` +
    `/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;

  const response = await githubApiFetch(endpoint);

  if (await isRateLimitResponse(response)) {
    throw new Error("GITHUB_RATE_LIMIT");
  }

  if (response.status === 403) {
    throw new Error("GITHUB_ACCESS_DENIED");
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("GITHUB_FILE_FETCH_FAILED");
  }

  const data: unknown = await response.json();

  if (
    !isRecord(data) ||
    data.type !== "file" ||
    typeof data.content !== "string"
  ) {
    return null;
  }

  return Buffer.from(
    data.content.replace(/\s/g, ""),
    "base64"
  ).toString("utf-8");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;
  let stopped = false;
  let failure: unknown = null;

  async function worker() {
    while (!stopped) {
      const current = index;
      index += 1;

      if (current >= items.length) {
        return;
      }

      try {
        results[current] = await mapper(items[current]);
      } catch (error) {
        stopped = true;
        failure = error;
        return;
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker()
    )
  );

  if (failure) {
    throw failure;
  }

  return results;
}

function findDuplicatedBlocks(files: AnalyzedFile[]) {
  const occurrences = new Map<
    string,
    { file: string; line: number }[]
  >();

  const blockSize = 8;
  const minimumCharacters = 120;

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    const seenBlocks = new Set<string>();

    for (
      let index = 0;
      index <= lines.length - blockSize;
    ) {
      const blockLines = lines
        .slice(index, index + blockSize)
        .map((line) => line.trim())
        .filter(Boolean);

      if (blockLines.length < blockSize) {
        index += 1;
        continue;
      }

      const block = blockLines.join("\n");

      if (
        block.length < minimumCharacters ||
        seenBlocks.has(block)
      ) {
        index += 1;
        continue;
      }

      const locations = occurrences.get(block) || [];

      locations.push({
        file: file.path,
        line: index + 1,
      });

      occurrences.set(block, locations);
      seenBlocks.add(block);

      index += blockSize;
    }
  }

  const duplicates: {
    block: string;
    locations: { file: string; line: number }[];
  }[] = [];

  for (const [block, locations] of occurrences) {
    const uniqueFiles = new Set(
      locations.map((location) => location.file)
    );

    if (uniqueFiles.size > 1) {
      duplicates.push({
        block,
        locations,
      });
    }
  }

  return duplicates;
}

function getFileScore(issues: Issue[]) {
  const deductions = {
    critical: 20,
    high: 10,
    medium: 5,
    low: 2,
    info: 0,
  };

  return Math.max(
    0,
    100 - issues.reduce(
      (score, issue) => score + deductions[issue.severity],
      0
    )
  );
}

function calculateHealthScore(issues: Issue[], totalLines: number) {
  const weights = {
    critical: 20,
    high: 7,
    medium: 2,
    low: 0.5,
    info: 0,
  };

  const weightedIssues = issues.reduce(
    (total, issue) => total + weights[issue.severity],
    0
  );

  const analyzedKilolines = Math.max(totalLines / 1000, 1);
  const issueDensity = weightedIssues / analyzedKilolines;

  const score = 100 * Math.exp(-issueDensity / 100);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function validateAnalysisRequest(
  body: unknown
): AnalysisRequest | NextResponse {
  if (
    !isRecord(body) ||
    typeof body.owner !== "string" ||
    typeof body.repo !== "string" ||
    typeof body.ref !== "string"
  ) {
    return NextResponse.json(
      { error: "Owner, repository and branch are required." },
      { status: 400 }
    );
  }

  const { owner, repo, ref } = body;

  if (
    !/^[a-zA-Z0-9-]+$/.test(owner) ||
    !/^[a-zA-Z0-9_.-]+$/.test(repo) ||
    !/^[a-zA-Z0-9._/-]+$/.test(ref)
  ) {
    return NextResponse.json(
      { error: "Invalid repository information." },
      { status: 400 }
    );
  }

  return { owner, repo, ref };
}

async function fetchRepositoryTree(
  owner: string,
  repo: string,
  ref: string
): Promise<RepositoryTree | NextResponse> {
  const repositoryResponse = await githubApiFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  );

  if (await isRateLimitResponse(repositoryResponse)) {
    return NextResponse.json(
      { error: "GitHub API rate limit reached. Please try again later." },
      { status: 429 }
    );
  }

  if (repositoryResponse.status === 403) {
    return NextResponse.json(
      {
        error: "GitHub denied access to this repository. Check the GitHub App installation permissions.",
      },
      { status: 403 }
    );
  }

  if (repositoryResponse.status === 404) {
    return NextResponse.json(
      { error: "Repository not found or inaccessible." },
      { status: 404 }
    );
  }

  if (!repositoryResponse.ok) {
    return NextResponse.json(
      { error: "Unable to retrieve repository information." },
      { status: 502 }
    );
  }

  const treeResponse = await githubApiFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`
  );

  if (await isRateLimitResponse(treeResponse)) {
    return NextResponse.json(
      { error: "GitHub API rate limit reached. Please try again later." },
      { status: 429 }
    );
  }

  if (treeResponse.status === 404) {
    return NextResponse.json(
      { error: "Repository branch or file tree not found." },
      { status: 404 }
    );
  }

  if (treeResponse.status === 403) {
    return NextResponse.json(
      { error: "GitHub denied access to the repository tree." },
      { status: 403 }
    );
  }

  if (!treeResponse.ok) {
    return NextResponse.json(
      { error: "Unable to retrieve repository files." },
      { status: 502 }
    );
  }

  const treeData: unknown = await treeResponse.json();

  if (!isRecord(treeData)) {
    return { treeData: {}, treeItems: [] };
  }

  return {
    treeData,
    treeItems: Array.isArray(treeData.tree) ? treeData.tree : [],
  };
}

function selectFilesForAnalysis(treeItems: unknown[]): FileSelection {
  const repositoryFiles = treeItems.filter(
    (item): item is Record<string, unknown> =>
      isRecord(item) &&
      item.type === "blob" &&
      typeof item.path === "string"
  );

  const ignoredDirectoryFiles = repositoryFiles.filter(
    (item) => isIgnoredPath(item.path as string)
  ).length;

  const nonIgnoredFiles = repositoryFiles.filter(
    (item) => !isIgnoredPath(item.path as string)
  );

  const unsupportedFiles = nonIgnoredFiles.filter(
    (item) => !isSupportedPath(item.path as string)
  ).length;

  const allFiles: SourceFile[] = nonIgnoredFiles
    .filter(
      (item) =>
        typeof item.sha === "string" &&
        isSupportedPath(item.path as string)
    )
    .map((item) => ({
      path: item.path as string,
      sha: item.sha as string,
      size:
        typeof item.size === "number" && item.size > 0
          ? item.size
          : 0,
    }));

  const emptyFiles = allFiles.filter(
    (file) => file.size === 0
  ).length;

  const oversizedFiles = allFiles.filter(
    (file) => file.size > MAX_FILE_SIZE
  ).length;

  const eligibleFiles = allFiles.filter(
    (file) => file.size > 0 && file.size <= MAX_FILE_SIZE
  );

  const selectedFiles = eligibleFiles.slice(0, MAX_FILES);

  const fileLimitExceeded = Math.max(
    0,
    eligibleFiles.length - MAX_FILES
  );

  let reservedBytes = 0;
  let totalSizeLimitExceeded = 0;

  const budgetSelectedFiles = selectedFiles.filter((file) => {
    if (reservedBytes + file.size > MAX_TOTAL_SIZE) {
      totalSizeLimitExceeded += 1;
      return false;
    }

    reservedBytes += file.size;
    return true;
  });

  return {
    allFiles,
    selectedFiles: budgetSelectedFiles,
    ignoredDirectoryFiles,
    unsupportedFiles,
    emptyFiles,
    oversizedFiles,
    fileLimitExceeded,
    totalSizeLimitExceeded,
  };
}

function analyzeFetchedContent(
  file: SourceFile,
  content: string
): AnalyzedFile {
  const extension = getExtension(file.path);

  if (SPECIALIZED_EXTENSIONS.has(extension)) {
    return analyzeFile(file.path, content, file.size);
  }

  const result = analyzeGenericFile(
    file.path,
    content,
    file.size
  );

  if (!result) {
    throw new Error(`No available analyzer for ${file.path}.`);
  }

  return result;
}

async function analyzeRepositoryFiles(
  owner: string,
  repo: string,
  ref: string,
  selectedFiles: SourceFile[]
): Promise<FileAnalysisResult> {
  const contents = await mapWithConcurrency(
    selectedFiles,
    CONCURRENCY,
    async (file) => ({
      file,
      content: await fetchGitHubFile(
        owner,
        repo,
        file.path,
        ref
      ),
    })
  );

  const successfulContents = contents.filter(
    (item): item is {
      file: SourceFile;
      content: string;
    } => item.content !== null
  );

  const analyzedBytes = successfulContents.reduce(
    (total, item) =>
      total + Buffer.byteLength(item.content, "utf-8"),
    0
  );

  return {
    analyzedFiles: successfulContents.map((item) =>
      analyzeFetchedContent(item.file, item.content)
    ),
    fetchFailedFiles: contents.length - successfulContents.length,
    analyzedBytes,
  };
}

function addDuplicateIssues(
  issues: Issue[],
  analyzedFiles: AnalyzedFile[]
) {
  const duplicates = findDuplicatedBlocks(analyzedFiles);

  for (const duplicate of duplicates) {
    for (const location of duplicate.locations) {
      addIssue(
        issues,
        location.file,
        location.line,
        "duplication",
        "medium",
        "Potential duplicated code",
        "A block of code similar to one in another file was detected.",
        "Review both blocks and consider extracting shared logic."
      );
    }
  }

  return duplicates;
}

function getIssueCounts(issues: Issue[]) {
  return {
    critical: issues.filter(
      (item) => item.severity === "critical"
    ).length,
    high: issues.filter(
      (item) => item.severity === "high"
    ).length,
    medium: issues.filter(
      (item) => item.severity === "medium"
    ).length,
    low: issues.filter(
      (item) => item.severity === "low"
    ).length,
  };
}

function getIssueCategories(issues: Issue[]) {
  const categories: Record<string, number> = {};

  for (const issue of issues) {
    categories[issue.category] =
      (categories[issue.category] || 0) + 1;
  }

  return categories;
}

function getFilesWithTests(analyzedFiles: AnalyzedFile[]) {
  return analyzedFiles.filter((file) => {
    const baseName = file.path.replace(/\.[^.]+$/, "");

    return analyzedFiles.some(
      (candidate) =>
        candidate.path !== file.path &&
        (
          candidate.path === `${baseName}.test.ts` ||
          candidate.path === `${baseName}.test.tsx` ||
          candidate.path === `${baseName}.spec.ts` ||
          candidate.path === `${baseName}.spec.tsx` ||
          candidate.path === `${baseName}.test.js` ||
          candidate.path === `${baseName}.spec.js`
        )
    );
  }).length;
}

function getFileMetrics(
  analyzedFiles: AnalyzedFile[],
  issues: Issue[]
): FileMetric[] {
  return analyzedFiles.map((file) => {
    const fileIssues = issues.filter(
      (issue) => issue.file === file.path
    );

    return {
      path: file.path,
      lines: file.lines,
      size: file.size,
      complexity: file.complexity,
      functions: file.functions.length,
      score: getFileScore(fileIssues),
      issues: fileIssues.length,
    };
  }).sort((a, b) => a.score - b.score);
}

function getQualityMetrics(
  analyzedFiles: AnalyzedFile[],
  functions: FunctionMetric[],
  issues: Issue[],
  duplicates: ReturnType<typeof findDuplicatedBlocks>,
  totalLines: number
) {
  const totalComplexity = functions.reduce(
    (sum, item) => sum + item.complexity,
    0
  );

  return {
    averageComplexity: functions.length
      ? Number(
          (totalComplexity / functions.length).toFixed(2)
        )
      : 0,
    totalFunctions: functions.length,
    complexFunctions: functions.filter(
      (item) => item.complexity > 10
    ).length,
    longFunctions: functions.filter(
      (item) => item.lines > 50
    ).length,
    largeFiles: analyzedFiles.filter(
      (file) => file.lines > 300
    ).length,
    duplicationBlocks: duplicates.length,
    filesWithTests: getFilesWithTests(analyzedFiles),
    testFiles: analyzedFiles.filter((file) =>
      isTestFile(file.path)
    ).length,
    todoCount: issues.filter(
      (item) => item.title === "TODO comment"
    ).length,
    fixmeCount: issues.filter(
      (item) => item.title === "FIXME comment"
    ).length,
    consoleCount: issues.filter(
      (item) => item.title === "Console log statement"
    ).length,
    anyCount: issues.filter(
      (item) => item.title === "Explicit any type"
    ).length,
    catchBlocks: analyzedFiles.reduce(
      (sum, file) =>
        sum +
        (SPECIALIZED_EXTENSIONS.has(getExtension(file.path))
          ? (file.content.match(/\bcatch\b/g) || []).length
          : 0),
      0
    ),
    emptyCatchBlocks: issues.filter(
      (item) => item.title === "Empty catch block"
    ).length,
    unhandledPromiseSignals: analyzedFiles.reduce(
      (sum, file) =>
        sum +
        (SPECIALIZED_EXTENSIONS.has(getExtension(file.path))
          ? (file.content.match(/\.then\s*\(/g) || []).length
          : 0),
      0
    ),
  };
}

function buildCoverageMetrics(
  treeData: Record<string, unknown>,
  selection: FileSelection,
  analyzedFiles: AnalyzedFile[],
  analysis: FileAnalysisResult
) {
  return {
    supportedLanguages: Array.from(
      new Set(
        analyzedFiles
          .map((file) => getLanguageByPath(file.path)?.name)
          .filter((language): language is string => Boolean(language))
      )
    ).sort(),
    supportedFiles: selection.allFiles.length,
    unsupportedFiles: selection.unsupportedFiles,
    ignoredDirectoryFiles: selection.ignoredDirectoryFiles,
    emptyFiles: selection.emptyFiles,
    oversizedFiles: selection.oversizedFiles,
    fileLimitExceeded: selection.fileLimitExceeded,
    totalSizeLimitExceeded: selection.totalSizeLimitExceeded,
    fetchFailedFiles: analysis.fetchFailedFiles,
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE,
    maxTotalSize: MAX_TOTAL_SIZE,
    concurrency: CONCURRENCY,
    truncated:
      treeData.truncated === true ||
      selection.oversizedFiles > 0 ||
      selection.fileLimitExceeded > 0 ||
      selection.totalSizeLimitExceeded > 0 ||
      analysis.fetchFailedFiles > 0,
    analyzedBytes: analysis.analyzedBytes,
  };
}

function buildCodeHealthResult(
  treeData: Record<string, unknown>,
  selection: FileSelection,
  analysis: FileAnalysisResult
): CodeHealthData {
  const { analyzedFiles } = analysis;
  const issues = analyzedFiles.flatMap((file) => file.issues);
  const duplicates = addDuplicateIssues(issues, analyzedFiles);
  const contentByPath = new Map(
    analyzedFiles.map((file) => [file.path, file.content])
  );
  const issuesWithSnippets = issues.map((issue) => ({
    ...issue,
    codeSnippet: getCodeSnippet(
      contentByPath.get(issue.file) ?? "",
      issue.line
    ),
  }));
  const functions = analyzedFiles.flatMap((file) => file.functions);
  const totalLines = analyzedFiles.reduce(
    (sum, file) => sum + file.lines,
    0
  );
  const issueCounts = getIssueCounts(issues);

  return {
    healthScore: calculateHealthScore(issues, totalLines),
    summary: {
      analyzedFiles: analyzedFiles.length,
      skippedFiles: selection.allFiles.length - analyzedFiles.length,
      totalFiles: selection.allFiles.length,
      totalLines,
      totalIssues: issues.length,
      criticalIssues: issueCounts.critical,
      highIssues: issueCounts.high,
      mediumIssues: issueCounts.medium,
      lowIssues: issueCounts.low,
    },
    metrics: getQualityMetrics(
      analyzedFiles,
      functions,
      issues,
      duplicates,
      totalLines
    ),
    issues: issuesWithSnippets,
    functions: functions.sort(
      (a, b) => b.complexity - a.complexity
    ),
    files: getFileMetrics(analyzedFiles, issues),
    coverage: buildCoverageMetrics(
      treeData,
      selection,
      analyzedFiles,
      analysis
    ),
    categories: getIssueCategories(issues),
  };
}

function getAnalysisErrorResponse(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "GITHUB_RATE_LIMIT") {
      return NextResponse.json(
        { error: "GitHub API rate limit reached. Please try again later." },
        { status: 429 }
      );
    }

    if (error.message === "GITHUB_ACCESS_DENIED") {
      return NextResponse.json(
        {
          error: "GitHub denied access to one or more repository files. Check the GitHub App installation permissions.",
        },
        { status: 403 }
      );
    }
  }

  return null;
}

function logAnalysisError(error: unknown) {
  const errorDetails = {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };

  console.error("[Code Health] Analysis failed:", errorDetails);

  return errorDetails;
}

export async function POST(request: Request) {
  try {
    const validation = validateAnalysisRequest(await request.json());

    if (validation instanceof NextResponse) {
      return validation;
    }

    const { owner, repo, ref } = validation;

    const repositoryTree = await fetchRepositoryTree(
      owner,
      repo,
      ref
    );

    if (repositoryTree instanceof NextResponse) {
      return repositoryTree;
    }

    const selection = selectFilesForAnalysis(
      repositoryTree.treeItems
    );

    const analysis = await analyzeRepositoryFiles(
      owner,
      repo,
      ref,
      selection.selectedFiles
    );

    const result = buildCodeHealthResult(
      repositoryTree.treeData,
      selection,
      analysis
    );

    return NextResponse.json(result);
  } catch (error) {
    const errorResponse = getAnalysisErrorResponse(error);

    if (errorResponse) {
      return errorResponse;
    }

    const errorDetails = logAnalysisError(error);

    return NextResponse.json(
      {
        error: "An unexpected error occurred during code health analysis.",
        diagnostic: {
          name: errorDetails.name,
          message: errorDetails.message,
        },
      },
      { status: 500 }
    );
  }
}