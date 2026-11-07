
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileCode2,
  Folder,
  FolderOpen,
  GitBranch,
  LoaderCircle,
  Search,
  ShieldAlert,
  Sparkles,
  TestTube2,
} from "lucide-react";

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

type ArchitectureSummary = {
  totalFiles: number;
  analyzedFiles: number;
  totalComponents: number;
  totalModules: number;
  totalConnections: number;
  truncated: boolean;
  maxFiles: number;
};

type ArchitectureResponse = {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  summary: ArchitectureSummary;
  error?: string;
};

type AffectedFile = {
  node: ArchitectureNode;
  depth: number;
};

type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

type RiskAssessment = {
  level: RiskLevel;
  score: number;
  description: string;
};

type FileTreeEntry = {
  name: string;
  path: string;
  type: "folder" | "file";
  children: FileTreeEntry[];
  node?: ArchitectureNode;
};

type ImpactAnalysisProps = {
  owner: string;
  repo: string;
  branch: string;
};

function buildFileTree(nodes: ArchitectureNode[]): FileTreeEntry[] {
  const root: FileTreeEntry[] = [];

  for (const node of nodes) {
    const segments = node.path.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    segments.forEach((segment, index) => {
      currentPath = currentPath
        ? `${currentPath}/${segment}`
        : segment;

      const isFile = index === segments.length - 1;

      let entry = currentLevel.find(
        (item) => item.name === segment
      );

      if (!entry) {
        entry = {
          name: segment,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: [],
          node: isFile ? node : undefined,
        };

        currentLevel.push(entry);
      }

      if (!isFile) {
        currentLevel = entry.children;
      }
    });
  }

  function sortEntries(entries: FileTreeEntry[]) {
    entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (entry.type === "folder") {
        sortEntries(entry.children);
      }
    }
  }

  sortEntries(root);

  return root;
}

function assessRisk(
  directCount: number,
  indirectCount: number
): RiskAssessment {
  const score = directCount * 2 + indirectCount;

  if (score > 15) {
    return {
      level: "Critical",
      score,
      description:
        "A large number of files depend on this file. Changes may affect several areas of the repository.",
    };
  }

  if (score > 7) {
    return {
      level: "High",
      score,
      description:
        "Multiple files depend on this file. Review the affected areas and run focused integration tests.",
    };
  }

  if (score > 3) {
    return {
      level: "Moderate",
      score,
      description:
        "Some dependent files may be affected. Review direct dependencies before making changes.",
    };
  }

  return {
    level: "Low",
    score,
    description:
      "Few or no dependent files were found in the analyzed dependency graph.",
  };
}

function getRecommendations(
  selectedFile: ArchitectureNode,
  affectedFiles: AffectedFile[]
): string[] {
  const paths = [
    selectedFile.path,
    ...affectedFiles.map((file) => file.node.path),
  ];

  const recommendations = new Set<string>();

  if (
    paths.some(
      (path) =>
        path.includes("/app/") ||
        path.includes("/pages/") ||
        path.endsWith("page.tsx") ||
        path.endsWith("page.jsx")
    )
  ) {
    recommendations.add(
      "Run tests for affected pages and verify their main user flows."
    );
  }

  if (
    paths.some(
      (path) =>
        path.includes("/components/") ||
        path.endsWith(".tsx") ||
        path.endsWith(".jsx")
    )
  ) {
    recommendations.add(
      "Test the affected components and verify their rendering and interactions."
    );
  }

  if (paths.some((path) => path.includes("/api/"))) {
    recommendations.add(
      "Run API tests and verify response formats, validation, and error handling."
    );
  }

  if (
    paths.some(
      (path) =>
        path.includes("/hooks/") ||
        path.includes("/context/") ||
        path.includes("/providers/")
    )
  ) {
    recommendations.add(
      "Verify state updates, shared context, and behavior in dependent components."
    );
  }

  if (
    paths.some(
      (path) =>
        path.includes("/lib/") ||
        path.includes("/utils/") ||
        path.includes("/services/")
    )
  ) {
    recommendations.add(
      "Run unit tests for the affected utilities, services, and business logic."
    );
  }

  if (affectedFiles.length > 0) {
    recommendations.add(
      "Review the direct dependents first, then validate the indirectly affected files."
    );
  }

  recommendations.add(
    "Run the project's type checking and linting commands before merging."
  );

  return Array.from(recommendations);
}

function getRiskStyles(level: RiskLevel) {
  switch (level) {
    case "Critical":
      return {
        text: "text-red-300",
        border: "border-red-500/30",
        background: "bg-red-500/10",
        icon: "text-red-400",
      };
    case "High":
      return {
        text: "text-orange-300",
        border: "border-orange-500/30",
        background: "bg-orange-500/10",
        icon: "text-orange-400",
      };
    case "Moderate":
      return {
        text: "text-yellow-300",
        border: "border-yellow-500/30",
        background: "bg-yellow-500/10",
        icon: "text-yellow-400",
      };
    default:
      return {
        text: "text-emerald-300",
        border: "border-emerald-500/30",
        background: "bg-emerald-500/10",
        icon: "text-emerald-400",
      };
  }
}

export default function ImpactAnalysis({
  owner,
  repo,
  branch,
}: ImpactAnalysisProps) {
  const [architecture, setArchitecture] =
    useState<ArchitectureResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [showAllAffected, setShowAllAffected] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadArchitecture() {
      setIsLoading(true);
      setError("");
      setArchitecture(null);
      setSelectedNodeId("");
      setSearch("");
      setExpandedFolders(new Set());

      try {
        const response = await fetch("/api/github/architecture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repositoryUrl: `https://github.com/${owner}/${repo}`,
          }),
          signal: controller.signal,
        });

        const result = (await response.json()) as ArchitectureResponse;

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to retrieve repository dependencies."
          );
        }

        setArchitecture(result);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to analyze repository impact."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadArchitecture();

    return () => {
      controller.abort();
    };
  }, [owner, repo, branch]);

  const nodes = useMemo(
    () => architecture?.nodes ?? [],
    [architecture]
  );

  const edges = useMemo(
    () => architecture?.edges ?? [],
    [architecture]
  );

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.path.localeCompare(b.path)),
    [nodes]
  );

  const filteredNodes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return sortedNodes;
    }

    return sortedNodes.filter(
      (node) =>
        node.path.toLowerCase().includes(normalizedSearch) ||
        node.label.toLowerCase().includes(normalizedSearch)
    );
  }, [search, sortedNodes]);

  const fileTree = useMemo(
    () => buildFileTree(filteredNodes),
    [filteredNodes]
  );

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const affectedFiles = useMemo(() => {
    if (!selectedNode) {
      return [];
    }

    const nodeById = new Map(
      nodes.map((node) => [node.id, node])
    );

    const incomingDependencies = new Map<string, string[]>();

    for (const edge of edges) {
      const importers = incomingDependencies.get(edge.target) ?? [];
      importers.push(edge.source);
      incomingDependencies.set(edge.target, importers);
    }

    const visited = new Set<string>([selectedNode.id]);
    const queue: Array<{ id: string; depth: number }> = [
      { id: selectedNode.id, depth: 0 },
    ];
    const affected: AffectedFile[] = [];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      const importers = incomingDependencies.get(current.id) ?? [];

      for (const importerId of importers) {
        if (visited.has(importerId)) {
          continue;
        }

        visited.add(importerId);

        const importerNode = nodeById.get(importerId);

        if (!importerNode) {
          continue;
        }

        const depth = current.depth + 1;

        affected.push({
          node: importerNode,
          depth,
        });

        queue.push({
          id: importerId,
          depth,
        });
      }
    }

    return affected.sort((a, b) => {
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }

      return a.node.path.localeCompare(b.node.path);
    });
  }, [edges, nodes, selectedNode]);

  const directDependencies = useMemo(
    () => affectedFiles.filter((file) => file.depth === 1),
    [affectedFiles]
  );

  const indirectDependencies = useMemo(
    () => affectedFiles.filter((file) => file.depth > 1),
    [affectedFiles]
  );

  const risk = useMemo(
    () =>
      assessRisk(
        directDependencies.length,
        indirectDependencies.length
      ),
    [directDependencies.length, indirectDependencies.length]
  );

  const recommendations = useMemo(() => {
    if (!selectedNode) {
      return [];
    }

    return getRecommendations(selectedNode, affectedFiles);
  }, [affectedFiles, selectedNode]);

  function toggleFolder(path: string) {
    setExpandedFolders((current) => {
      const next = new Set(current);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }

  function renderFileTree(entries: FileTreeEntry[], depth = 0) {
    return entries.map((entry) => {
      if (entry.type === "folder") {
        const isExpanded =
          search.trim().length > 0 || expandedFolders.has(entry.path);

        return (
          <div key={entry.path}>
            <button
              type="button"
              onClick={() => toggleFolder(entry.path)}
              aria-expanded={isExpanded}
              className="flex w-full items-center gap-2 rounded-md py-2 pr-2 text-left transition hover:bg-[#191720]"
              style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
              {isExpanded ? (
                <ChevronDown
                  size={13}
                  className="shrink-0 text-[#777483]"
                />
              ) : (
                <ChevronRight
                  size={13}
                  className="shrink-0 text-[#777483]"
                />
              )}

              {isExpanded ? (
                <FolderOpen
                  size={15}
                  className="shrink-0 text-[#b7a1ff]"
                />
              ) : (
                <Folder
                  size={15}
                  className="shrink-0 text-[#a98cff]"
                />
              )}

              <span className="min-w-0 truncate text-xs font-medium text-[#c7c3d1]">
                {entry.name}
              </span>
            </button>

            {isExpanded && (
              <div>
                {renderFileTree(entry.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      const node = entry.node;

      if (!node) {
        return null;
      }

      const isSelected = selectedNodeId === node.id;

      return (
        <button
          key={node.id}
          type="button"
          onClick={() => {
            setSelectedNodeId(node.id);
            setShowAllAffected(false);
          }}
          aria-pressed={isSelected}
          className={`flex w-full items-center gap-2 rounded-md py-2 pr-2 text-left transition ${
            isSelected
              ? "bg-[#8f72dc]/10 text-[#d4c7ff]"
              : "text-[#92919f] hover:bg-[#191720] hover:text-[#e8e5f0]"
          }`}
          style={{ paddingLeft: `${30 + depth * 16}px` }}
        >
          <FileCode2
            size={14}
            className={`shrink-0 ${
              isSelected ? "text-[#b7a1ff]" : "text-[#777483]"
            }`}
          />

          <span className="min-w-0 flex-1 truncate text-xs">
            {entry.name}
          </span>

          {isSelected && (
            <CheckCircle2
              size={14}
              className="shrink-0 text-[#b7a1ff]"
            />
          )}
        </button>
      );
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-[#252530] bg-[#111117]">
        <div className="flex items-center gap-3 text-sm text-[#92919f]">
          <LoaderCircle
            size={20}
            className="animate-spin text-[#b7a1ff]"
          />
          Analyzing repository dependencies...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-red-500/20 bg-[#111117] px-6 text-center">
        <AlertCircle size={26} className="text-red-400" />
        <h2 className="mt-4 text-sm font-semibold text-white">
          Unable to analyze repository impact
        </h2>
        <p className="mt-2 max-w-lg text-xs leading-5 text-[#92919f]">
          {error}
        </p>
      </div>
    );
  }

  if (!architecture || nodes.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-[#252530] bg-[#111117] px-6 text-center">
        <GitBranch size={26} className="text-[#a98cff]" />
        <h2 className="mt-4 text-sm font-semibold text-white">
          No dependency relationships found
        </h2>
        <p className="mt-2 max-w-lg text-xs leading-5 text-[#92919f]">
          CODE ATLAS could not identify enough source file relationships
          to calculate the impact of changes in this repository.
        </p>
      </div>
    );
  }

  const summary = architecture.summary;
  const riskStyles = getRiskStyles(risk.level);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#a98cff]">
            <GitBranch size={14} />
            Change Impact Analysis
          </div>

          <h2 className="text-lg font-semibold text-white">
            Understand what a change could affect
          </h2>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#92919f]">
            Select a source file to discover which other files depend on
            it, estimate the potential change risk, and identify tests
            worth running.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[#302d3b] bg-[#191720] px-3 py-2 text-xs text-[#c7c3d1]">
          <FileCode2 size={14} className="text-[#b7a1ff]" />
          {summary.analyzedFiles} files analyzed
        </div>
      </div>

      {summary.truncated && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
          <AlertTriangle
            size={17}
            className="mt-0.5 shrink-0 text-yellow-400"
          />

          <div>
            <p className="text-xs font-semibold text-yellow-200">
              Partial analysis coverage
            </p>
            <p className="mt-1 text-xs leading-5 text-[#b8aebd]">
              This repository contains {summary.totalFiles} source files,
              but the dependency graph analyzed {summary.analyzedFiles}
              {" "}files due to the current limit of {summary.maxFiles}.
              Impact results may be incomplete because some dependencies
              could not be inspected.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#777483]">
            Analyzed files
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {summary.analyzedFiles}
          </p>
          <p className="mt-1 text-[11px] text-[#777483]">
            Source files in dependency graph
          </p>
        </div>

        <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#777483]">
            Dependencies
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {summary.totalConnections}
          </p>
          <p className="mt-1 text-[11px] text-[#777483]">
            Import relationships identified
          </p>
        </div>

        <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#777483]">
            Available components
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {summary.totalComponents}
          </p>
          <p className="mt-1 text-[11px] text-[#777483]">
            Components identified in the graph
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.5fr)]">
        <div className="overflow-hidden rounded-xl border border-[#252530] bg-[#111117]">
          <div className="border-b border-[#252530] p-4">
            <h3 className="text-sm font-semibold text-white">
              Repository files
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#777483]">
              Browse folders and select the file you plan to modify.
            </p>

            <div className="relative mt-4">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777483]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search files and folders..."
                className="h-10 w-full rounded-lg border border-[#302d3b] bg-[#191720] pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-[#777483] focus:border-[#9b7bff]/60"
              />
            </div>
          </div>

          <div className="max-h-[460px] overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {fileTree.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-[#777483]">
                No files match your search.
              </p>
            ) : (
              <div className="space-y-0.5">
                {renderFileTree(fileTree)}
              </div>
            )}
          </div>

          <div className="border-t border-[#252530] px-4 py-3">
            <p className="text-[10px] text-[#777483]">
              {filteredNodes.length} files in {nodes.length} analyzed files
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          {!selectedNode ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#302d3b] bg-[#111117] px-6 text-center">
              <GitBranch size={28} className="text-[#8f72dc]" />
              <h3 className="mt-4 text-sm font-semibold text-white">
                Select a file to analyze its impact
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-5 text-[#777483]">
                Browse the repository folders and choose a file. The
                analysis will identify direct and indirect dependents,
                estimate potential risk, and suggest relevant tests.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-[#302d3b] bg-[#111117] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#302d3b] bg-[#191720]">
                    <FileCode2
                      size={17}
                      className="text-[#b7a1ff]"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[#777483]">
                      Selected source file
                    </p>
                    <p className="mt-1 break-all text-xs font-medium text-white">
                      {selectedNode.path}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 ${riskStyles.border} ${riskStyles.background}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      size={18}
                      className={riskStyles.icon}
                    />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[#92919f]">
                        Estimated change risk
                      </p>
                      <p
                        className={`mt-1 text-lg font-semibold ${riskStyles.text}`}
                      >
                        {risk.level}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-[#92919f]">
                      Impact score
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                      {risk.score}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-[#b8aebd]">
                  {risk.description}
                </p>

                <p className="mt-2 text-[10px] leading-4 text-[#777483]">
                  This is a heuristic estimate based on detected
                  dependencies, not a guarantee of runtime behavior.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
                  <div className="flex items-center gap-2 text-[#b7a1ff]">
                    <GitBranch size={15} />
                    <p className="text-xs font-medium text-[#c7c3d1]">
                      Direct impact
                    </p>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-white">
                    {directDependencies.length}
                  </p>
                  <p className="mt-1 text-[10px] text-[#777483]">
                    Files importing the selected file
                  </p>
                </div>

                <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
                  <div className="flex items-center gap-2 text-[#b7a1ff]">
                    <ArrowDown size={15} />
                    <p className="text-xs font-medium text-[#c7c3d1]">
                      Indirect impact
                    </p>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-white">
                    {indirectDependencies.length}
                  </p>
                  <p className="mt-1 text-[10px] text-[#777483]">
                    Files depending on affected files
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Affected files
                    </h3>
                    <p className="mt-1 text-[11px] text-[#777483]">
                      {affectedFiles.length} potentially affected{" "}
                      {affectedFiles.length === 1 ? "file" : "files"}
                    </p>
                  </div>

                  <span className="rounded-full border border-[#302d3b] bg-[#191720] px-2.5 py-1 text-[10px] text-[#c7c3d1]">
                    {affectedFiles.length} found
                  </span>
                </div>

                {affectedFiles.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-[#252530] bg-[#191720]/60 px-4 py-6 text-center">
                    <CheckCircle2
                      size={20}
                      className="mx-auto text-emerald-400"
                    />
                    <p className="mt-2 text-xs font-medium text-[#d4d0dc]">
                      No dependents found
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#777483]">
                      No other analyzed files were identified as depending
                      on this file.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {(
                      showAllAffected
                        ? affectedFiles
                        : affectedFiles.slice(0, 8)
                    ).map((file) => (
                      <div
                        key={file.node.id}
                        className="flex items-start gap-3 rounded-lg border border-[#252530] bg-[#191720]/60 px-3 py-3"
                      >
                        <FileCode2
                          size={14}
                          className="mt-0.5 shrink-0 text-[#a98cff]"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="break-all text-xs text-[#d4d0dc]">
                            {file.node.path}
                          </p>
                          <p className="mt-1 text-[10px] text-[#777483]">
                            {file.depth === 1
                              ? "Direct dependency"
                              : `Indirect dependency · Level ${file.depth}`}
                          </p>
                        </div>
                      </div>
                    ))}

                    {affectedFiles.length > 8 && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllAffected((current) => !current)
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#302d3b] px-3 py-2.5 text-xs text-[#b7a1ff] transition hover:border-[#8f72dc]/50 hover:bg-[#191720]"
                      >
                        {showAllAffected ? (
                          <>
                            Show fewer files
                            <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            Show all {affectedFiles.length} files
                            <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
                <div className="flex items-center gap-2">
                  <TestTube2
                    size={16}
                    className="text-[#b7a1ff]"
                  />
                  <h3 className="text-sm font-semibold text-white">
                    Recommended tests
                  </h3>
                </div>

                <p className="mt-1 text-[11px] leading-5 text-[#777483]">
                  Suggested validation based on the selected file and its
                  affected dependency paths.
                </p>

                <div className="mt-4 space-y-3">
                  {recommendations.map((recommendation, index) => (
                    <div
                      key={recommendation}
                      className="flex items-start gap-3"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#302d3b] bg-[#191720] text-[10px] text-[#b7a1ff]">
                        {index + 1}
                      </div>
                      <p className="text-xs leading-5 text-[#c7c3d1]">
                        {recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-[#302d3b] bg-[#191720]/60 p-4">
        <Sparkles
          size={16}
          className="mt-0.5 shrink-0 text-[#b7a1ff]"
        />
        <div>
          <p className="text-xs font-medium text-[#d4d0dc]">
            How this analysis works
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[#92919f]">
            CODE ATLAS follows detected import relationships to identify
            files that may depend on your selected file. Direct impact
            represents files importing it. Indirect impact represents
            files depending on those direct dependents. Results depend
            on the source files and relationships successfully analyzed.
          </p>
        </div>
      </div>
    </div>
  );
}
