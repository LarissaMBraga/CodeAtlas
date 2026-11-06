import {
  AlertTriangle,
  Boxes,
  Code2,
  FileJson,
  Package,
  PackageCheck,
  PackagePlus,
  Puzzle,
  Wrench,
} from "lucide-react";
import type {
  DependenciesAnalysisData,
  DependencyCategory,
} from "./dependencies-analysis-types";

type DependenciesAnalysisProps = {
  analysis: DependenciesAnalysisData | null;
};

const categories = [
  {
    id: "production" as const,
    label: "Production",
    description: "Runtime dependencies",
    icon: PackageCheck,
    countKey: "productionCount" as const,
  },
  {
    id: "development" as const,
    label: "Development",
    description: "Development tools",
    icon: Wrench,
    countKey: "developmentCount" as const,
  },
  {
    id: "peer" as const,
    label: "Peer",
    description: "Peer requirements",
    icon: Puzzle,
    countKey: "peerCount" as const,
  },
  {
    id: "optional" as const,
    label: "Optional",
    description: "Optional dependencies",
    icon: PackagePlus,
    countKey: "optionalCount" as const,
  },
];

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function getCategoryLabel(type: DependencyCategory) {
  return categories.find((category) => category.id === type)?.label ?? type;
}

export default function DependenciesAnalysis({
  analysis,
}: DependenciesAnalysisProps) {
  if (!analysis?.available) {
    return (
      <div className="rounded-xl border border-[#252530] bg-[#111117] p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
            <Boxes size={17} className="text-[#b7a1ff]" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              Dependencies Analysis
            </h2>
            <p className="mt-1 text-xs text-[#777483]">
              Dependency inventory across repository manifests.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[#302d3b] bg-[#0d0c12] px-5 py-10 text-center">
          <AlertTriangle size={24} className="mx-auto text-[#777483]" />
          <p className="mt-3 text-sm font-medium text-white">
            Dependency analysis unavailable
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#777483]">
            The repository dependency information could not be retrieved.
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!analysis.manifestFound || analysis.manifests.length === 0) {
    return (
      <div className="rounded-xl border border-[#252530] bg-[#111117] p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
            <Boxes size={17} className="text-[#b7a1ff]" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              Dependencies Analysis
            </h2>
            <p className="mt-1 text-xs text-[#777483]">
              Dependency inventory across repository manifests.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[#302d3b] bg-[#0d0c12] px-5 py-10 text-center">
          <FileJson size={24} className="mx-auto text-[#777483]" />
          <p className="mt-3 text-sm font-medium text-white">
            No package manifests found
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#777483]">
            No package.json files were detected in this repository.
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Total dependencies",
      value: analysis.totalDependencies,
      icon: Package,
    },
    ...categories.map((category) => ({
      label: category.label,
      value: analysis[category.countKey],
      icon: category.icon,
    })),
  ];

  return (
    <div className="rounded-xl border border-[#252530] bg-[#111117] p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
            <Boxes size={17} className="text-[#b7a1ff]" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              Dependencies Analysis
            </h2>
            <p className="mt-1 text-xs text-[#777483]">
              Dependency inventory across repository manifests.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/[0.06] px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#92919f]">
            Package manifests
          </p>
          <p className="mt-1 text-sm font-semibold text-[#c6b5ff]">
            {formatCount(analysis.manifestCount)} detected
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="min-w-0 rounded-lg border border-[#252530] bg-[#0d0c12] px-3 py-4"
            >
              <div className="flex items-center gap-1.5">
                <Icon size={13} className="shrink-0 text-[#a98cff]" />
                <p className="text-[9px] leading-4 text-[#92919f] sm:text-[10px]">
                  {stat.label}
                </p>
              </div>

              <p className="mt-2 text-xl font-semibold tabular-nums text-white">
                {formatCount(stat.value)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#e8e5f0]">
            Dependency categories
          </h3>
          <span className="text-[10px] text-[#777483]">
            {formatCount(analysis.totalDependencies)} packages
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const count = analysis[category.countKey];

            return (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-lg border border-[#252530] bg-[#0d0c12] px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
                    <Icon size={16} className="text-[#b7a1ff]" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#e8e5f0]">
                      {category.label}
                    </p>
                    <p className="mt-1 text-[10px] text-[#777483]">
                      {category.description}
                    </p>
                  </div>
                </div>

                <span className="text-sm font-semibold tabular-nums text-white">
                  {formatCount(count)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-[#e8e5f0]">
            Package manifests
          </h3>
          <span className="text-[10px] text-[#777483]">
            {analysis.manifests.length} files
          </span>
        </div>

        <div className="space-y-4">
          {analysis.manifests.map((manifest) => (
            <div
              key={manifest.path}
              className="overflow-hidden rounded-lg border border-[#252530] bg-[#0d0c12]"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-[#252530] px-4 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <FileJson
                    size={17}
                    className="mt-0.5 shrink-0 text-[#a98cff]"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {manifest.packageName || "Unnamed package"}
                    </p>
                    <p className="mt-1 break-all text-[10px] text-[#777483]">
                      {manifest.path}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {manifest.packageManager && (
                    <span className="rounded-md border border-[#302d3b] bg-[#191720] px-2 py-1 text-[10px] text-[#b7a1ff]">
                      {manifest.packageManager}
                    </span>
                  )}

                  <span className="text-[10px] text-[#92919f]">
                    {formatCount(manifest.totalDependencies)} dependencies
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-[#252530] px-4 py-3 sm:grid-cols-4">
                {categories.map((category) => (
                  <div key={category.id}>
                    <p className="text-[9px] text-[#777483]">
                      {category.label}
                    </p>
                    <p className="mt-1 text-xs font-semibold tabular-nums text-white">
                      {formatCount(manifest[category.countKey])}
                    </p>
                  </div>
                ))}
              </div>

              <div className="max-h-80 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-color:#51466f_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#51466f] [&::-webkit-scrollbar-thumb:hover]:bg-[#8b75c7] [&::-webkit-scrollbar-track]:bg-transparent">
                {manifest.dependencies.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-[#777483]">
                    No dependencies declared in this manifest.
                  </p>
                ) : (
                  <div className="divide-y divide-[#252530]">
                    {manifest.dependencies.map((dependency) => (
                      <div
                        key={`${manifest.path}-${dependency.type}-${dependency.name}`}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Code2
                            size={13}
                            className="shrink-0 text-[#777483]"
                          />
                          <span className="truncate text-xs font-medium text-[#e8e5f0]">
                            {dependency.name}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className="hidden rounded-md border border-[#302d3b] px-2 py-1 text-[9px] text-[#92919f] sm:inline">
                            {getCategoryLabel(dependency.type)}
                          </span>
                          <span className="max-w-28 truncate text-[10px] tabular-nums text-[#b7a1ff]">
                            {dependency.version}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {analysis.truncated && (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-[#8065c7]/20 bg-[#8065c7]/[0.06] px-4 py-3">
          <AlertTriangle
            size={15}
            className="mt-0.5 shrink-0 text-[#b7a1ff]"
          />
          <p className="text-[10px] leading-5 text-[#92919f]">
            The repository analysis reached a file or manifest limit.
            Some package manifests or dependencies may not be included.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-[#302d3b] bg-[#191720]/60 px-4 py-3">
        <p className="text-[10px] leading-5 text-[#777483]">
          Dependency versions represent the declared ranges in package.json,
          not necessarily the exact installed versions. Counts are aggregated
          across all detected manifests, including monorepo packages.
        </p>
      </div>
    </div>
  );
}