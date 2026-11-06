
"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Code2,
  FileCode2,
  Gauge,
  GitBranch,
  HardDrive,
  Info,
  ShieldAlert,
  Sparkles,
  TestTube2,
  Zap,
} from "lucide-react";

type Severity = "critical" | "high" | "medium" | "low" | "info";

type Issue = {
  id: string;
  category: string;
  severity: Severity;
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

type CodeHealthData = {
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

type CodeHealthAnalysisProps = {
  data: CodeHealthData;
};

const severityStyles: Record<Severity, string> = {
  critical: "border-red-500/20 bg-red-500/10 text-red-400",
  high: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  low: "border-sky-500/20 bg-sky-500/10 text-sky-400",
  info: "border-[#9b7bff]/20 bg-[#9b7bff]/10 text-[#b7a1ff]",
};

const severityOrder: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Healthy";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs attention";
  return "Critical";
}

function getScoreColor(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-[#b7a1ff]";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export default function CodeHealthAnalysis({
  data,
}: CodeHealthAnalysisProps) {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAllIssues, setShowAllIssues] = useState(false);

  const filteredIssues = useMemo(() => {
    return data.issues.filter((issue) => {
      const matchesSeverity =
        severityFilter === "all" || issue.severity === severityFilter;

      const matchesCategory =
        categoryFilter === "all" || issue.category === categoryFilter;

      return matchesSeverity && matchesCategory;
    });
  }, [data.issues, severityFilter, categoryFilter]);

  const visibleIssues = showAllIssues
    ? filteredIssues
    : filteredIssues.slice(0, 8);

  const categories = Object.keys(data.categories).sort();

  const severityCounts = [
    {
      label: "Critical",
      value: data.summary.criticalIssues,
      severity: "critical" as Severity,
    },
    {
      label: "High",
      value: data.summary.highIssues,
      severity: "high" as Severity,
    },
    {
      label: "Medium",
      value: data.summary.mediumIssues,
      severity: "medium" as Severity,
    },
    {
      label: "Low",
      value: data.summary.lowIssues,
      severity: "low" as Severity,
    },
  ];

  const metrics = [
    {
      label: "Functions analyzed",
      value: data.metrics.totalFunctions,
      description: `${data.metrics.complexFunctions} highly complex`,
      icon: Code2,
    },
    {
      label: "Average complexity",
      value: data.metrics.averageComplexity,
      description: "Per analyzed function",
      icon: Activity,
    },
    {
      label: "Long functions",
      value: data.metrics.longFunctions,
      description: "More than 50 lines",
      icon: Zap,
    },
    {
      label: "Large files",
      value: data.metrics.largeFiles,
      description: "More than 300 lines",
      icon: FileCode2,
    },
    {
      label: "Potential duplicates",
      value: data.metrics.duplicationBlocks,
      description: "Detected code blocks",
      icon: GitBranch,
    },
    {
      label: "Test files",
      value: data.metrics.testFiles,
      description: `${data.metrics.filesWithTests} source files with matching tests`,
      icon: TestTube2,
    },
  ];

  const coverageDetails = [
    {
      label: "Supported source files",
      value: data.coverage.supportedFiles,
    },
    {
      label: "Ignored directory files",
      value: data.coverage.ignoredDirectoryFiles,
    },
    {
      label: "Unsupported extensions",
      value: data.coverage.unsupportedFiles,
    },
    {
      label: "Empty files",
      value: data.coverage.emptyFiles,
    },
    {
      label: "Oversized files",
      value: data.coverage.oversizedFiles,
    },
    {
      label: "File limit exceeded",
      value: data.coverage.fileLimitExceeded,
    },
    {
      label: "Total size limit exceeded",
      value: data.coverage.totalSizeLimitExceeded,
    },
    {
      label: "GitHub fetch failures",
      value: data.coverage.fetchFailedFiles,
    },
  ];

  return (
    <section id="code-health" className="scroll-mt-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">
          Code Health
        </h2>
        <p className="mt-1 text-xs text-[#777483]">
          Static analysis of code quality, maintainability and potential issues.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
        <article className="rounded-xl border border-[#252530] bg-[#111117] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#92919f]">Overall health score</p>
              <p className="mt-1 text-[11px] text-[#777483]">
                Heuristic analysis score
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
              <Gauge size={19} className="text-[#b7a1ff]" />
            </div>
          </div>

          <div className="mt-7 flex items-center gap-6">
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-[8px] border-[#252530]">
              <div
                className="absolute inset-[-8px] rounded-full border-[8px] border-transparent"
                style={{
                  borderTopColor:
                    data.healthScore >= 85
                      ? "#34d399"
                      : data.healthScore >= 50
                        ? "#b7a1ff"
                        : "#f87171",
                  transform: `rotate(${data.healthScore * 3.6}deg)`,
                  clipPath: "inset(0 0 0 0)",
                }}
              />
              <div className="text-center">
                <p className={`text-3xl font-bold ${getScoreColor(data.healthScore)}`}>
                  {data.healthScore}
                </p>
                <p className="text-[10px] text-[#777483]">out of 100</p>
              </div>
            </div>

            <div className="min-w-0">
              <p className={`text-lg font-semibold ${getScoreColor(data.healthScore)}`}>
                {getScoreLabel(data.healthScore)}
              </p>
              <p className="mt-2 text-xs leading-5 text-[#92919f]">
                Based on detected issues and their assigned severity.
                This score is an internal heuristic, not an industry-standard
                quality certification.
              </p>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
              <p className="text-[11px] text-[#777483]">Analyzed files</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {data.summary.analyzedFiles}
              </p>
            </div>
            <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
              <p className="text-[11px] text-[#777483]">Total issues</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {data.summary.totalIssues}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-[#252530] bg-[#111117] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Issue severity
              </h3>
              <p className="mt-1 text-xs text-[#777483]">
                Distribution of detected issues
              </p>
            </div>
            <ShieldAlert size={19} className="text-[#a98cff]" />
          </div>

          <div className="mt-7 space-y-5">
            {severityCounts.map((item) => {
              const percentage = data.summary.totalIssues
                ? (item.value / data.summary.totalIssues) * 100
                : 0;

              return (
                <div key={item.severity}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-[#c8c4d2]">
                      {item.label}
                    </span>
                    <span className="text-xs tabular-nums text-white">
                      {item.value}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#252530]">
                    <div
                      className={`h-full rounded-full ${
                        item.severity === "critical"
                          ? "bg-red-400"
                          : item.severity === "high"
                            ? "bg-orange-400"
                            : item.severity === "medium"
                              ? "bg-amber-400"
                              : "bg-sky-400"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-[#252530] pt-5">
            <div>
              <p className="text-[11px] text-[#777483]">Total lines</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {data.summary.totalLines.toLocaleString("en-US")}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#777483]">Analyzed functions</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {data.metrics.totalFunctions}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              key={metric.label}
              className="rounded-xl border border-[#252530] bg-[#111117] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#92919f]">{metric.label}</p>
                <Icon size={16} className="text-[#a98cff]" />
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">
                {metric.value}
              </p>
              <p className="mt-1 text-[11px] text-[#777483]">
                {metric.description}
              </p>
            </article>
          );
        })}
      </div>

      <article className="mt-5 rounded-xl border border-[#252530] bg-[#111117] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Detected issues
            </h3>
            <p className="mt-1 text-xs text-[#777483]">
              Review findings and suggested improvements.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={severityFilter}
              onChange={(event) => {
                setSeverityFilter(event.target.value);
                setShowAllIssues(false);
              }}
              className="rounded-lg border border-[#302d3b] bg-[#191720] px-3 py-2 text-xs text-[#d1cddc] outline-none focus:border-[#9b7bff]"
            >
              <option value="all">All severities</option>
              {severityOrder.map((severity) => (
                <option key={severity} value={severity}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setShowAllIssues(false);
              }}
              className="max-w-48 rounded-lg border border-[#302d3b] bg-[#191720] px-3 py-2 text-xs text-[#d1cddc] outline-none focus:border-[#9b7bff]"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {visibleIssues.length > 0 ? (
            visibleIssues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-1 text-[10px] font-medium uppercase ${severityStyles[issue.severity]}`}
                  >
                    {issue.severity}
                  </span>
                  <span className="text-[10px] text-[#777483]">
                    {issue.category.replace(/-/g, " ")}
                  </span>
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <AlertCircle
                    size={16}
                    className="mt-0.5 shrink-0 text-[#a98cff]"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-[#e8e5f0]">
                      {issue.title}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-[#92919f]">
                      {issue.description}
                    </p>
                    <p className="mt-2 break-all text-[10px] text-[#a98cff]">
                      {issue.file}:{issue.line}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-[#302d3b] bg-[#191720] px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-[#b7a1ff]" />
                    <span className="text-[10px] font-medium text-[#b7a1ff]">
                      Recommendation
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#c8c4d2]">
                    {issue.recommendation}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-[#252530] bg-[#0d0c12] px-5 py-10 text-center">
              <CheckCircle2 size={22} className="mx-auto text-emerald-400" />
              <p className="mt-3 text-xs text-[#92919f]">
                No issues match the selected filters.
              </p>
            </div>
          )}
        </div>

        {filteredIssues.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAllIssues((current) => !current)}
            className="mt-4 w-full rounded-lg border border-[#302d3b] bg-[#191720] px-4 py-3 text-xs font-medium text-[#b7a1ff] transition hover:border-[#9b7bff]/50 hover:bg-[#201c2b]"
          >
            {showAllIssues
              ? "Show fewer issues"
              : `View all ${filteredIssues.length} issues`}
          </button>
        )}
      </article>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-[#252530] bg-[#111117] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Most complex functions
              </h3>
              <p className="mt-1 text-xs text-[#777483]">
                Functions ranked by estimated complexity
              </p>
            </div>
            <Zap size={18} className="text-[#a98cff]" />
          </div>

          <div className="mt-5 space-y-3">
            {data.functions.length > 0 ? (
              data.functions.slice(0, 6).map((item) => (
                <div
                  key={`${item.file}:${item.line}:${item.name}`}
                  className="rounded-lg border border-[#252530] bg-[#0d0c12] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs font-medium text-[#e8e5f0]">
                      {item.name}
                    </p>
                    <span className="shrink-0 rounded-md border border-[#9b7bff]/20 bg-[#9b7bff]/10 px-2 py-1 text-[10px] text-[#b7a1ff]">
                      Complexity {item.complexity}
                    </span>
                  </div>
                  <p className="mt-2 break-all text-[10px] text-[#777483]">
                    {item.file}:{item.line}
                  </p>
                  <p className="mt-1 text-[10px] text-[#92919f]">
                    {item.lines} lines
                  </p>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-[#777483]">
                No functions were detected.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-[#252530] bg-[#111117] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Files to review
              </h3>
              <p className="mt-1 text-xs text-[#777483]">
                Files ranked by their detected issues
              </p>
            </div>
            <FileCode2 size={18} className="text-[#a98cff]" />
          </div>

          <div className="mt-5 space-y-3">
            {data.files.length > 0 ? (
              data.files.slice(0, 6).map((file) => (
                <div
                  key={file.path}
                  className="rounded-lg border border-[#252530] bg-[#0d0c12] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 break-all text-xs font-medium text-[#e8e5f0]">
                      {file.path}
                    </p>
                    <span
                      className={`shrink-0 text-xs font-semibold ${getScoreColor(file.score)}`}
                    >
                      {file.score}/100
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#252530]">
                    <div
                      className="h-full rounded-full bg-[#9b7bff]"
                      style={{ width: `${file.score}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#777483]">
                    <span>{file.issues} issues</span>
                    <span>{file.lines} lines</span>
                    <span>{file.functions} functions</span>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-[#777483]">
                No source files were analyzed.
              </p>
            )}
          </div>
        </article>
      </div>

      <article className="mt-5 rounded-xl border border-[#252530] bg-[#111117] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
            <TestTube2 size={18} className="text-[#b7a1ff]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Testing signals
            </h3>
            <p className="mt-1 text-xs text-[#777483]">
              Test file detection, not measured test coverage
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
            <p className="text-[11px] text-[#777483]">Detected test files</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {data.metrics.testFiles}
            </p>
          </div>
          <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
            <p className="text-[11px] text-[#777483]">
              Source files with matching tests
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {data.metrics.filesWithTests}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#302d3b] bg-[#191720] p-4">
          <Info size={15} className="mt-0.5 shrink-0 text-[#b7a1ff]" />
          <p className="text-xs leading-5 text-[#92919f]">
            CODE ATLAS identifies test files and matching source filenames.
            It does not execute tests or collect line, branch or statement
            coverage. A real coverage percentage is not available from this
            analysis.
          </p>
        </div>
      </article>

      <article className="mt-5 rounded-xl border border-[#252530] bg-[#111117] p-6">
        <div className="flex items-center gap-3">
          <HardDrive size={18} className="text-[#a98cff]" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              Analysis details
            </h3>
            <p className="mt-1 text-xs text-[#777483]">
              Scope and limitations of this scan
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
            <p className="text-[11px] text-[#777483]">Total source files</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {data.summary.totalFiles}
            </p>
          </div>
          <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
            <p className="text-[11px] text-[#777483]">Analyzed files</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {data.summary.analyzedFiles}
            </p>
          </div>
          <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
            <p className="text-[11px] text-[#777483]">Skipped source files</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {data.summary.skippedFiles}
            </p>
          </div>
          <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
            <p className="text-[11px] text-[#777483]">Analyzed data</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatBytes(data.coverage.analyzedBytes)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-[#c8c4d2]">
            File coverage breakdown
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {coverageDetails.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4"
              >
                <p className="text-[11px] text-[#777483]">
                  {item.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-[#c8c4d2]">
            Analysis limits
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
              <p className="text-[11px] text-[#777483]">
                Maximum files
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {data.coverage.maxFiles}
              </p>
            </div>
            <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
              <p className="text-[11px] text-[#777483]">
                Maximum file size
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatBytes(data.coverage.maxFileSize)}
              </p>
            </div>
            <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
              <p className="text-[11px] text-[#777483]">
                Maximum total size
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatBytes(data.coverage.maxTotalSize)}
              </p>
            </div>
            <div className="rounded-lg border border-[#252530] bg-[#0d0c12] p-4">
              <p className="text-[11px] text-[#777483]">
                Concurrent requests
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {data.coverage.concurrency}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-[#c8c4d2]">
            Supported languages
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.coverage.supportedLanguages.map((language) => (
              <span
                key={language}
                className="rounded-md border border-[#302d3b] bg-[#191720] px-3 py-2 text-[11px] text-[#c8c4d2]"
              >
                {language}
              </span>
            ))}
          </div>
        </div>

        {data.coverage.truncated && (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-amber-400"
            />
            <div>
              <p className="text-xs font-medium text-amber-300">
                Partial analysis
              </p>
              <p className="mt-1 text-xs leading-5 text-[#92919f]">
                Some supported repository files could not be included in this
                scan because of file or size limits, GitHub retrieval failures,
                or an incomplete repository tree. Results represent only the
                files successfully analyzed.
              </p>
            </div>
          </div>
        )}

        {(data.coverage.unsupportedFiles > 0 ||
          data.coverage.ignoredDirectoryFiles > 0) && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#302d3b] bg-[#191720] p-4">
            <Info size={15} className="mt-0.5 shrink-0 text-[#b7a1ff]" />
            <div className="space-y-1">
              {data.coverage.unsupportedFiles > 0 && (
                <p className="text-xs leading-5 text-[#92919f]">
                  {data.coverage.unsupportedFiles} files use unsupported
                  extensions and were excluded from the analysis.
                </p>
              )}
              {data.coverage.ignoredDirectoryFiles > 0 && (
                <p className="text-xs leading-5 text-[#92919f]">
                  {data.coverage.ignoredDirectoryFiles} files belong to ignored
                  directories such as node_modules, .next, dist and build.
                </p>
              )}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
