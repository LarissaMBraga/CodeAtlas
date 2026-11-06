
import { NextResponse } from "next/server";
import ts from "typescript";

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

const MAX_FILES = 100;
const MAX_FILE_SIZE = 300 * 1024;
const MAX_TOTAL_SIZE = 5 * 1024 * 1024;
const CONCURRENCY = 8;

const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
  ".git",
]);

type SourceFile = {
  path: string;
  sha: string;
  size: number;
};

type Issue = {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  file: string;
  line: number;
  recommendation: string;
};

type FunctionMetric = {
  name: string;
  file: string;
  line: number;
  complexity: number;
  lines: number;
};

type FileMetric = {
  path: string;
  lines: number;
  size: number;
  complexity: number;
  functions: number;
  score: number;
  issues: number;
};

type AnalysisResult = {
  healthScore: number;
  summary: {
    analyzedFiles: number;
    skippedFiles: number;
    totalFiles: number;
    totalLines: number;
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  metrics: {
    averageComplexity: number;
    totalFunctions: number;
    complexFunctions: number;
    longFunctions: number;
    largeFiles: number;
    duplicationBlocks: number;
    filesWithTests: number;
    testFiles: number;
    todoCount: number;
    fixmeCount: number;
    consoleCount: number;
    anyCount: number;
    catchBlocks: number;
    emptyCatchBlocks: number;
    unhandledPromiseSignals: number;
  };
  issues: Issue[];
  functions: FunctionMetric[];
  files: FileMetric[];
  coverage: {
    supportedLanguages: string[];
    unsupportedFiles: number;
    oversizedFiles: number;
    truncated: boolean;
    analyzedBytes: number;
  };
  categories: Record<string, number>;
};

type AnalyzedFile = {
  path: string;
  content: string;
  size: number;
  sourceFile: ts.SourceFile;
  lines: number;
  complexity: number;
  functions: FunctionMetric[];
  issues: Issue[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getExtension(path: string) {
  const name = path.split("/").pop() || "";
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
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
  let functionCount = 0;

  function visit(node: ts.Node) {
    const body = getFunctionBody(node);

    if (body) {
      functionCount += 1;

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
      fileComplexity += complexity;

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
    }

    if (ts.isCatchClause(node)) {
      if (
        !node.block.statements.length ||
        node.block.statements.every((statement) =>
          ts.isEmptyStatement(statement)
        )
      ) {
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
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "log" &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "console"
    ) {
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

    if (node.kind === ts.SyntaxKind.AnyKeyword) {
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

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["setTimeout", "setInterval"].includes(node.expression.text)
    ) {
      const callback = node.arguments[0];

      if (
        callback &&
        (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
      ) {
        const callbackText = callback.getText(sourceFile);

        if (callbackText.includes("console.log")) {
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
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const commentPatterns = [
    { pattern: /\bTODO\b/gi, title: "TODO comment", category: "code-smell" },
    { pattern: /\bFIXME\b/gi, title: "FIXME comment", category: "code-smell" },
    { pattern: /\bHACK\b/gi, title: "HACK comment", category: "code-smell" },
  ];

  for (const item of commentPatterns) {
    let match: RegExpExecArray | null;

    while ((match = item.pattern.exec(content)) !== null) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;

      addIssue(
        issues,
        path,
        line,
        item.category,
        item.title === "FIXME comment" ? "medium" : "low",
        item.title,
        `A ${item.title.split(" ")[0]} marker was found.`,
        "Review the note and resolve it or document why it remains."
      );
    }
  }

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
    sourceFile,
    lines,
    complexity: fileComplexity,
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
  const url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`
  );

  url.searchParams.set("ref", ref);

  const response = await fetch(url, {
    headers: GITHUB_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) return null;

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

  async function worker() {
    while (true) {
      const current = index;
      index += 1;

      if (current >= items.length) return;

      results[current] = await mapper(items[current]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker()
    )
  );

  return results;
}

function findDuplicatedBlocks(files: AnalyzedFile[]) {
  const occurrences = new Map<
    string,
    { file: string; line: number }[]
  >();

  const blockSize = 6;

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);

    for (
      let index = 0;
      index <= lines.length - blockSize;
      index += 1
    ) {
      const block = lines
        .slice(index, index + blockSize)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");

      if (block.length < 100) continue;

      const locations = occurrences.get(block) || [];
      locations.push({ file: file.path, line: index + 1 });
      occurrences.set(block, locations);
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

    if (locations.length > 1 && uniqueFiles.size > 1) {
      duplicates.push({ block, locations });
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

function calculateHealthScore(issues: Issue[]) {
  const deductions = {
    critical: 15,
    high: 7,
    medium: 3,
    low: 1,
    info: 0,
  };

  const score = 100 - issues.reduce(
    (total, issue) => total + deductions[issue.severity],
    0
  );

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

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

    const repositoryResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        headers: GITHUB_HEADERS,
        cache: "no-store",
      }
    );

    if (repositoryResponse.status === 404) {
      return NextResponse.json(
        { error: "Repository not found or inaccessible." },
        { status: 404 }
      );
    }

    if (
      repositoryResponse.status === 403 ||
      repositoryResponse.status === 429
    ) {
      return NextResponse.json(
        { error: "GitHub API rate limit reached. Please try again later." },
        { status: 429 }
      );
    }

    if (!repositoryResponse.ok) {
      return NextResponse.json(
        { error: "Unable to retrieve repository information." },
        { status: 502 }
      );
    }

    const treeResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      {
        headers: GITHUB_HEADERS,
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
        { error: "Unable to retrieve repository files." },
        { status: 502 }
      );
    }

    const treeData = await treeResponse.json();

    const allFiles: SourceFile[] = (treeData.tree || [])
      .filter(
        (item: unknown): item is {
          path: string;
          type: string;
          sha: string;
          size?: number;
        } =>
          isRecord(item) &&
          item.type === "blob" &&
          typeof item.path === "string" &&
          typeof item.sha === "string" &&
          SUPPORTED_EXTENSIONS.has(getExtension(item.path)) &&
          !isIgnoredPath(item.path)
      )
      .map((item: SourceFile) => ({
        path: item.path,
        sha: item.sha,
        size: item.size || 0,
      }));

    const eligibleFiles = allFiles.filter(
      (file) => file.size > 0 && file.size <= MAX_FILE_SIZE
    );

    const selectedFiles = eligibleFiles.slice(0, MAX_FILES);

    const oversizedFiles = allFiles.filter(
      (file) => file.size > MAX_FILE_SIZE
    ).length;

    let analyzedBytes = 0;

    const contents = await mapWithConcurrency(
      selectedFiles,
      CONCURRENCY,
      async (file) => {
        if (analyzedBytes + file.size > MAX_TOTAL_SIZE) {
          return null;
        }

        analyzedBytes += file.size;

        return {
          file,
          content: await fetchGitHubFile(
            owner,
            repo,
            file.path,
            ref
          ),
        };
      }
    );

    const analyzedFiles = contents
      .filter(
        (item): item is {
          file: SourceFile;
          content: string;
        } => item !== null && item.content !== null
      )
      .map((item) =>
        analyzeFile(
          item.file.path,
          item.content,
          item.file.size
        )
      );

    const issues = analyzedFiles.flatMap(
      (file) => file.issues
    );

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

    const functions = analyzedFiles.flatMap(
      (file) => file.functions
    );

    const totalLines = analyzedFiles.reduce(
      (sum, file) => sum + file.lines,
      0
    );

    const totalComplexity = functions.reduce(
      (sum, item) => sum + item.complexity,
      0
    );

    const categories: Record<string, number> = {};

    for (const issue of issues) {
      categories[issue.category] =
        (categories[issue.category] || 0) + 1;
    }

    const issueCounts = {
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

    const testFiles = analyzedFiles.filter((file) =>
      /\.(test|spec)\.[cm]?[jt]sx?$/.test(file.path)
    ).length;

    const filesWithTests = analyzedFiles.filter((file) => {
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

    const fileMetrics: FileMetric[] = analyzedFiles.map(
      (file) => ({
        path: file.path,
        lines: file.lines,
        size: file.size,
        complexity: file.complexity,
        functions: file.functions.length,
        score: getFileScore(file.issues),
        issues: file.issues.length,
      })
    );

    const result: AnalysisResult = {
      healthScore: calculateHealthScore(issues),
      summary: {
        analyzedFiles: analyzedFiles.length,
        skippedFiles: allFiles.length - analyzedFiles.length,
        totalFiles: allFiles.length,
        totalLines,
        totalIssues: issues.length,
        criticalIssues: issueCounts.critical,
        highIssues: issueCounts.high,
        mediumIssues: issueCounts.medium,
        lowIssues: issueCounts.low,
      },
      metrics: {
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
        filesWithTests,
        testFiles,
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
            sum + (file.content.match(/\bcatch\b/g) || []).length,
          0
        ),
        emptyCatchBlocks: issues.filter(
          (item) => item.title === "Empty catch block"
        ).length,
        unhandledPromiseSignals: analyzedFiles.reduce(
          (sum, file) =>
            sum + (file.content.match(/\.then\s*\(/g) || []).length,
          0
        ),
      },
      issues,
      functions: functions.sort(
        (a, b) => b.complexity - a.complexity
      ),
      files: fileMetrics.sort(
        (a, b) => a.score - b.score
      ),
      coverage: {
        supportedLanguages: [
          "JavaScript",
          "TypeScript",
          "JSX",
          "TSX",
        ],
        unsupportedFiles: (treeData.tree || []).filter(
          (item: unknown) =>
            isRecord(item) &&
            item.type === "blob" &&
            typeof item.path === "string" &&
            !isIgnoredPath(item.path) &&
            !SUPPORTED_EXTENSIONS.has(getExtension(item.path))
        ).length,
        oversizedFiles,
        truncated:
          treeData.truncated === true ||
          allFiles.length > MAX_FILES ||
          analyzedFiles.length < selectedFiles.length,
        analyzedBytes,
      },
      categories,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error: "An unexpected error occurred during code health analysis.",
      },
      { status: 500 }
    );
  }
}
