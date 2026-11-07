
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  FileCode2,
  Filter,
  GitBranch,
  KeyRound,
  LoaderCircle,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import type {
  SecurityAnalysisData,
  SecurityCategory,
  SecurityFinding,
  SecuritySeverity,
} from "@/lib/security/types";

type SecurityAnalysisProps = {
  owner: string;
  repo: string;
  branch: string;
};

type SeverityFilter = SecuritySeverity | "all";
type CategoryFilter = SecurityCategory | "all";

const SEVERITY_CONFIG: Record<
  SecuritySeverity,
  {
    label: string;
    color: string;
    background: string;
    border: string;
  }
> = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    background: "bg-red-500/10",
    border: "border-red-500/20",
  },
  high: {
    label: "High",
    color: "text-orange-400",
    background: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  medium: {
    label: "Medium",
    color: "text-yellow-300",
    background: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  low: {
    label: "Low",
    color: "text-blue-300",
    background: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  info: {
    label: "Info",
    color: "text-[#a9a5b5]",
    background: "bg-[#a9a5b5]/10",
    border: "border-[#a9a5b5]/20",
  },
};

const CATEGORY_CONFIG: Record<
  SecurityCategory,
  {
    label: string;
    description: string;
    icon: typeof ShieldCheck;
  }
> = {
  sast: {
    label: "Code Security",
    description: "Static analysis of source code",
    icon: FileCode2,
  },
  dependencies: {
    label: "Dependencies",
    description: "Known vulnerabilities in packages",
    icon: Package,
  },
  secrets: {
    label: "Secrets",
    description: "Exposed credentials and tokens",
    icon: KeyRound,
  },
  configuration: {
    label: "Configuration",
    description: "Insecure application configurations",
    icon: ShieldAlert,
  },
  "supply-chain": {
    label: "Supply Chain",
    description: "Build and workflow security",
    icon: GitBranch,
  },
  authentication: {
    label: "Authentication",
    description: "Authentication and token validation",
    icon: ShieldX,
  },
};

const SEVERITY_ORDER: SecuritySeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SeverityBadge({
  severity,
}: {
  severity: SecuritySeverity;
}) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${config.color} ${config.background} ${config.border}`}
    >
      {config.label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  description,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  description: string;
  color: string;
  icon: typeof ShieldAlert;
}) {
  return (
    <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[#92919f]">
          {label}
        </span>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[#191720] ${color}`}
        >
          <Icon size={16} />
        </div>
      </div>

      <p className={`mt-3 text-2xl font-semibold ${color}`}>
        {value}
      </p>

      <p className="mt-1 text-[11px] text-[#777483]">
        {description}
      </p>
    </div>
  );
}

function FindingCard({
  finding,
}: {
  finding: SecurityFinding;
}) {
  const [expanded, setExpanded] = useState(false);
  const severity = SEVERITY_CONFIG[finding.severity];
  const category = CATEGORY_CONFIG[finding.category];

  return (
    <div className="overflow-hidden rounded-xl border border-[#252530] bg-[#111117] transition-colors hover:border-[#383444]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${severity.background} ${severity.color}`}
        >
          <AlertTriangle size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <span className="text-[10px] text-[#777483]">
              {category.label}
            </span>
            <span className="rounded border border-[#302d3b] px-1.5 py-0.5 text-[9px] font-medium text-[#a9a5b5]">
              {finding.confidence} confidence
            </span>
          </div>

          <h4 className="mt-2 text-sm font-medium leading-5 text-[#e8e6ef]">
            {finding.title}
          </h4>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#777483]">
            {finding.file && (
              <span className="flex min-w-0 items-center gap-1">
                <FileCode2 size={11} />
                <span className="truncate">{finding.file}</span>
                {finding.line !== null && (
                  <span>:{finding.line}</span>
                )}
              </span>
            )}

            <span>{finding.ruleId}</span>
          </div>
        </div>

        <div className="mt-1 shrink-0 text-[#777483]">
          {expanded ? (
            <ChevronUp size={17} />
          ) : (
            <ChevronDown size={17} />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#252530] px-4 pb-4 pt-4">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#92919f]">
                Description
              </p>
              <p className="mt-1.5 text-xs leading-5 text-[#c3c0cc]">
                {finding.description}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#92919f]">
                Potential impact
              </p>
              <p className="mt-1.5 text-xs leading-5 text-[#c3c0cc]">
                {finding.impact}
              </p>
            </div>

            <div className="rounded-lg border border-[#a98cff]/15 bg-[#a98cff]/5 p-3">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={13}
                  className="text-[#b7a1ff]"
                />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#b7a1ff]">
                  Recommended action
                </p>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#d0c8e4]">
                {finding.recommendation}
              </p>
            </div>

            {finding.evidence && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#92919f]">
                  Evidence
                </p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-[#252530] bg-[#0b0b10] p-3 font-mono text-[11px] leading-5 text-[#c3c0cc]">
                  {finding.evidence.content}
                </pre>
                {finding.evidence.startLine !== null && (
                  <p className="mt-1 text-[10px] text-[#777483]">
                    Line {finding.evidence.startLine}
                    {finding.evidence.endLine !== null &&
                      finding.evidence.endLine !== finding.evidence.startLine &&
                      `–${finding.evidence.endLine}`}
                  </p>
                )}
              </div>
            )}

            {finding.dependency && (
              <div className="rounded-lg border border-[#252530] bg-[#0d0d13] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#92919f]">
                  Affected dependency
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[#e8e6ef]">
                    {finding.dependency.name}
                  </span>
                  <span className="text-[#777483]">
                    {finding.dependency.version}
                  </span>
                  <span className="rounded border border-[#302d3b] px-1.5 py-0.5 text-[9px] text-[#92919f]">
                    {finding.dependency.direct ? "Direct" : "Transitive"}
                  </span>
                </div>
                {finding.dependency.fixedVersion && (
                  <p className="mt-2 text-[11px] text-emerald-300">
                    Fixed version: {finding.dependency.fixedVersion}
                  </p>
                )}
              </div>
            )}

            {finding.references.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#92919f]">
                  References
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {finding.references.map((reference) => (
                    <a
                      key={`${reference.type}-${reference.id}`}
                      href={reference.url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-[#302d3b] px-2 py-1 text-[10px] text-[#b7a1ff] transition-colors hover:border-[#a98cff]/50 hover:bg-[#a98cff]/5"
                    >
                      {reference.id}
                      {reference.url && (
                        <ExternalLink size={10} />
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SecurityAnalysis({
  owner,
  repo,
  branch,
}: SecurityAnalysisProps) {
  const [data, setData] = useState<SecurityAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] =
    useState<SeverityFilter>("all");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github/security", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          repo,
          branch,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to complete security analysis.",
        );
      }

      setData(result as SecurityAnalysisData);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "An unexpected error occurred during security analysis.",
      );
    } finally {
      setLoading(false);
    }
  }, [owner, repo, branch]);

  useEffect(() => {
  void Promise.resolve().then(() => runAnalysis());
}, [runAnalysis]);

  const filteredFindings = useMemo(() => {
    if (!data) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();

    return [...data.findings]
      .filter((finding) => {
        const matchesSeverity =
          severityFilter === "all" ||
          finding.severity === severityFilter;

        const matchesCategory =
          categoryFilter === "all" ||
          finding.category === categoryFilter;

        const matchesSearch =
          !query ||
          [
            finding.title,
            finding.description,
            finding.file ?? "",
            finding.ruleId,
            finding.dependency?.name ?? "",
            ...finding.references.map((reference) => reference.id),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        return (
          matchesSeverity &&
          matchesCategory &&
          matchesSearch
        );
      })
      .sort((a, b) => {
        return (
          SEVERITY_ORDER.indexOf(a.severity) -
          SEVERITY_ORDER.indexOf(b.severity)
        );
      });
  }, [data, severityFilter, categoryFilter, searchQuery]);

  const hasCriticalFindings =
    (data?.summary.criticalFindings ?? 0) > 0;

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-[#252530] bg-[#111117] px-6 py-16">
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#a98cff]/20 bg-[#a98cff]/10">
            <ShieldCheck
              size={22}
              className="text-[#b7a1ff]"
            />
          </div>
          <LoaderCircle
            size={19}
            className="mt-5 animate-spin text-[#a98cff]"
          />
          <h3 className="mt-4 text-sm font-semibold text-[#e8e6ef]">
            Analyzing repository security
          </h3>
          <p className="mt-2 text-xs leading-5 text-[#92919f]">
            Scanning source code, dependencies, secrets and configuration.
            This may take a moment.
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-[#111117] px-6 py-12">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <AlertCircle size={21} />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-[#e8e6ef]">
            Security analysis failed
          </h3>
          <p className="mt-2 text-xs leading-5 text-[#92919f]">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void runAnalysis()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#a98cff]/30 bg-[#a98cff]/10 px-4 py-2 text-xs font-medium text-[#c7b7ff] transition-colors hover:bg-[#a98cff]/15"
          >
            <RefreshCw size={13} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#a98cff]/20 bg-[#a98cff]/10">
              <ShieldCheck
                size={18}
                className="text-[#b7a1ff]"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e8e6ef]">
                Security Analysis
              </h2>
              <p className="text-[11px] text-[#777483]">
                Repository security assessment
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void runAnalysis()}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#302d3b] bg-[#191720] px-3 py-2 text-xs font-medium text-[#c3c0cc] transition-colors hover:border-[#a98cff]/40 hover:text-[#d8ccff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Scanning..." : "Run analysis"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[#252530] bg-[#111117] px-3 py-2.5 text-[10px] text-[#92919f]">
        <span className="flex items-center gap-1.5">
          <GitBranch size={12} />
          <span className="text-[#c3c0cc]">{owner}/{repo}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[#777483]">Branch</span>
          <span className="text-[#c3c0cc]">{branch}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock3 size={12} />
          {formatDuration(data.scan.durationMs)}
        </span>
        <span>
          Scanned {formatDate(data.scan.completedAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Total findings"
          value={data.summary.totalFindings}
          description="Issues detected"
          color="text-[#d8ccff]"
          icon={ShieldAlert}
        />
        <MetricCard
          label="Critical"
          value={data.summary.criticalFindings}
          description="Immediate attention"
          color="text-red-400"
          icon={ShieldX}
        />
        <MetricCard
          label="High"
          value={data.summary.highFindings}
          description="High priority issues"
          color="text-orange-400"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Analyzed files"
          value={data.coverage.analyzedFiles}
          description={`${data.coverage.skippedFiles} skipped`}
          color="text-[#b7a1ff]"
          icon={FileCode2}
        />
      </div>

      {hasCriticalFindings && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-4">
          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0 text-red-400"
          />
          <div>
            <p className="text-xs font-semibold text-red-300">
              Critical security findings detected
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#c3a9a9]">
              This scan found critical issues that should be reviewed
              and prioritized before deployment.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-[#252530] bg-[#111117] p-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-[#e8e6ef]">
              Security categories
            </h3>
            <p className="mt-1 text-[11px] text-[#777483]">
              Findings and coverage by analysis type
            </p>
          </div>
          <span className="text-[10px] text-[#777483]">
            Scanner v{data.scan.version}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {data.coverage.categories.map((item) => {
            const config = CATEGORY_CONFIG[item.category];
            const Icon = config.icon;

            return (
              <div
                key={item.category}
                className="rounded-lg border border-[#252530] bg-[#0d0d13] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#191720] text-[#b7a1ff]">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[#dedbe6]">
                        {config.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#777483]">
                        {item.analyzedFiles} files analyzed
                      </p>
                    </div>
                  </div>

                  {item.available ? (
                    <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-1 text-[9px] font-medium text-emerald-300">
                      Available
                    </span>
                  ) : (
                    <span className="rounded-md border border-[#302d3b] bg-[#191720] px-1.5 py-1 text-[9px] font-medium text-[#92919f]">
                      Unavailable
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[#e8e6ef]">
                      {item.findings}
                    </p>
                    <p className="text-[10px] text-[#777483]">
                      Findings
                    </p>
                  </div>
                  <p className="text-[10px] text-[#777483]">
                    {item.skippedFiles} skipped
                  </p>
                </div>

                {item.limitations.length > 0 && (
                  <div className="mt-3 border-t border-[#252530] pt-2">
                    {item.limitations.map((limitation) => (
                      <p
                        key={limitation}
                        className="text-[10px] leading-4 text-[#8d8999]"
                      >
                        {limitation}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[#252530] bg-[#111117] p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-[#e8e6ef]">
              Security findings
            </h3>
            <p className="mt-1 text-[11px] text-[#777483]">
              Review detected issues and recommended actions
            </p>
          </div>

          <span className="text-[11px] text-[#92919f]">
            {filteredFindings.length} of {data.findings.length} findings
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_170px_170px]">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#777483]"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search findings..."
              className="h-9 w-full rounded-lg border border-[#302d3b] bg-[#0d0d13] pl-9 pr-3 text-xs text-[#e8e6ef] outline-none placeholder:text-[#686574] focus:border-[#a98cff]/50"
            />
          </div>

          <div className="relative">
            <Filter
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#777483]"
            />
            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(event.target.value as SeverityFilter)
              }
              className="h-9 w-full appearance-none rounded-lg border border-[#302d3b] bg-[#0d0d13] pl-9 pr-8 text-xs text-[#c3c0cc] outline-none focus:border-[#a98cff]/50"
            >
              <option value="all">All severities</option>
              {SEVERITY_ORDER.map((severity) => (
                <option key={severity} value={severity}>
                  {SEVERITY_CONFIG[severity].label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#777483]"
            />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as CategoryFilter)
              }
              className="h-9 w-full appearance-none rounded-lg border border-[#302d3b] bg-[#0d0d13] px-3 pr-8 text-xs text-[#c3c0cc] outline-none focus:border-[#a98cff]/50"
            >
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#777483]"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {filteredFindings.length > 0 ? (
            filteredFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-[#302d3b] px-4 py-10 text-center">
              {data.findings.length === 0 ? (
                <>
                  <CheckCircle2
                    size={23}
                    className="mx-auto text-emerald-400"
                  />
                  <p className="mt-3 text-xs font-medium text-[#dedbe6]">
                    No findings detected
                  </p>
                  <p className="mt-1 text-[11px] text-[#777483]">
                    No issues were detected by the currently enabled
                    security rules.
                  </p>
                </>
              ) : (
                <>
                  <Search
                    size={21}
                    className="mx-auto text-[#777483]"
                  />
                  <p className="mt-3 text-xs font-medium text-[#dedbe6]">
                    No matching findings
                  </p>
                  <p className="mt-1 text-[11px] text-[#777483]">
                    Try changing your search or filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSeverityFilter("all");
                      setCategoryFilter("all");
                    }}
                    className="mt-3 text-[11px] font-medium text-[#b7a1ff] hover:text-[#d0c3ff]"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[#252530] bg-[#111117] p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-[#b7a1ff]" />
          <h3 className="text-sm font-semibold text-[#e8e6ef]">
            Scan coverage and limitations
          </h3>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Repository files",
              value: data.coverage.totalFiles,
            },
            {
              label: "Analyzed",
              value: data.coverage.analyzedFiles,
            },
            {
              label: "Skipped",
              value: data.coverage.skippedFiles,
            },
            {
              label: "Failed",
              value: data.coverage.failedFiles,
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-[#252530] bg-[#0d0d13] p-3"
            >
              <p className="text-lg font-semibold text-[#dedbe6]">
                {metric.value}
              </p>
              <p className="mt-1 text-[10px] text-[#777483]">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        {data.coverage.truncated && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
            <AlertTriangle
              size={14}
              className="mt-0.5 shrink-0 text-yellow-300"
            />
            <p className="text-[11px] leading-5 text-yellow-100/80">
              The repository scan was truncated because the file
              collection limit was reached. Not all repository files
              were analyzed.
            </p>
          </div>
        )}

        {data.coverage.limitations.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#92919f]">
              Known limitations
            </p>
            <ul className="mt-2 space-y-2">
              {data.coverage.limitations.map((limitation) => (
                <li
                  key={limitation}
                  className="flex items-start gap-2 text-[11px] leading-5 text-[#92919f]"
                >
                  <AlertCircle
                    size={12}
                    className="mt-1 shrink-0 text-[#a98cff]"
                  />
                  {limitation}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 border-t border-[#252530] pt-3 text-[10px] leading-5 text-[#777483]">
          This is a static security analysis. Findings depend on the
          supported rules, file types and dependency ecosystems.
          The scan does not replace manual review, dynamic testing
          or a complete security audit.
        </p>
      </section>
    </div>
  );
}
