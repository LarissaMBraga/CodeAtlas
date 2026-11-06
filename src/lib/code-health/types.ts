export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Issue = {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  file: string;
  line: number;
  recommendation: string;
};

export type FunctionMetric = {
  name: string;
  file: string;
  line: number;
  complexity: number;
  lines: number;
};

export type FileMetric = {
  path: string;
  lines: number;
  size: number;
  complexity: number;
  functions: number;
  score: number;
  issues: number;
};

export type CodeHealthData = {
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
    supportedFiles: number;
    unsupportedFiles: number;
    ignoredDirectoryFiles: number;
    emptyFiles: number;
    oversizedFiles: number;
    fileLimitExceeded: number;
    totalSizeLimitExceeded: number;
    fetchFailedFiles: number;
    maxFiles: number;
    maxFileSize: number;
    maxTotalSize: number;
    concurrency: number;
    truncated: boolean;
    analyzedBytes: number;
  };
  categories: Record<string, number>;
};