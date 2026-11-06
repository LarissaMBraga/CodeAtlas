
import {
  Package,
  Boxes,
  Code2,
  Users,
  Puzzle,
  FileJson,
  AlertCircle,
} from "lucide-react";

type Dependency = {
  name: string;
  version: string;
};

type DependencyCategory = {
  production: Dependency[];
  development: Dependency[];
  peer: Dependency[];
  optional: Dependency[];
};

type PackageManifest = {
  path: string;
  name: string;
  version: string | null;
  dependencies: DependencyCategory;
  totalDependencies: number;
};

type DependenciesAnalysisData = {
  available: boolean;
  manifests: PackageManifest[];
  manifestCount: number;
  totalDependencies: number;
  truncated: boolean;
};

type Props = {
  analysis: DependenciesAnalysisData | null;
};

const categories = [
  {
    id: "production",
    label: "Production",
    description: "Required to run the application",
    icon: Package,
    color: "text-[#b7a1ff]",
    background: "bg-[#9b7bff]/10",
    border: "border-[#9b7bff]/20",
  },
  {
    id: "development",
    label: "Development",
    description: "Used during development",
    icon: Code2,
    color: "text-sky-300",
    background: "bg-sky-400/10",
    border: "border-sky-400/20",
  },
  {
    id: "peer",
    label: "Peer",
    description: "Expected from the consuming project",
    icon: Users,
    color: "text-emerald-300",
    background: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    id: "optional",
    label: "Optional",
    description: "Installed when supported",
    icon: Puzzle,
    color: "text-amber-300",
    background: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
] as const;

export default function DependenciesAnalysis({ analysis }: Props) {
  if (!analysis?.available || analysis.manifests.length === 0) {
    return (
      <div className="rounded-xl border border-[#252530] bg-[#111117] p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#302d3b] bg-[#191720]">
            <Package size={17} className="text-[#a98cff]" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              Dependencies
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#92919f]">
              No supported package.json manifest was found in this repository.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const categoryTotals = categories.map((category) => ({
    ...category,
    count: analysis.manifests.reduce(
      (total, manifest) =>
        total + manifest.dependencies[category.id].length,
      0
    ),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            Dependencies Analysis
          </h2>
          <p className="mt-1 text-xs text-[#777483]">
            Packages declared in the repository manifests.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[#252530] bg-[#111117] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#92919f]">
                Total dependencies
              </p>
              <Boxes size={16} className="text-[#a98cff]" />
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums text-white">
              {analysis.totalDependencies}
            </p>
          </article>

          {categoryTotals.map((category) => {
            const Icon = category.icon;

            return (
              <article
                key={category.id}
                className="rounded-xl border border-[#252530] bg-[#111117] p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[#92919f]">
                    {category.label}
                  </p>
                  <Icon size={16} className={category.color} />
                </div>
                <p className="mt-4 text-2xl font-semibold tabular-nums text-white">
                  {category.count}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      {analysis.truncated && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 text-amber-300"
          />
          <p className="text-xs leading-5 text-amber-300">
            This repository contains more package manifests than the analysis
            limit. Only the first 10 manifests were processed.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Package manifests
            </h3>
            <p className="mt-1 text-xs text-[#777483]">
              {analysis.manifestCount} manifest
              {analysis.manifestCount !== 1 ? "s" : ""} analyzed
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[#302d3b] bg-[#191720] px-3 py-2">
            <FileJson size={14} className="text-[#a98cff]" />
            <span className="text-xs text-[#e8e5f0]">
              package.json
            </span>
          </div>
        </div>

        {analysis.manifests.map((manifest) => (
          <article
            key={manifest.path}
            className="min-w-0 overflow-hidden rounded-xl border border-[#252530] bg-[#111117]"
          >
            <div className="flex flex-col gap-2 border-b border-[#252530] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h4 className="break-words text-sm font-semibold text-white">
                  {manifest.name}
                </h4>
                <p className="mt-1 break-all text-[11px] text-[#777483]">
                  {manifest.path}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {manifest.version && (
                  <span className="rounded-md border border-[#302d3b] bg-[#191720] px-2 py-1 text-[10px] text-[#c7c3d1]">
                    v{manifest.version}
                  </span>
                )}
                <span className="rounded-md border border-[#9b7bff]/20 bg-[#9b7bff]/10 px-2 py-1 text-[10px] text-[#c6b5ff]">
                  {manifest.totalDependencies} packages
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const dependencies =
                  manifest.dependencies[category.id];

                return (
                  <div
                    key={category.id}
                    className="min-w-0 overflow-hidden rounded-lg border border-[#252530] bg-[#0d0c12]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[#252530] px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${category.background}`}
                        >
                          <Icon size={14} className={category.color} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#e8e5f0]">
                            {category.label}
                          </p>
                          <p className="text-[10px] text-[#777483]">
                            {category.description}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-xs tabular-nums text-[#92919f]">
                        {dependencies.length}
                      </span>
                    </div>

                    {dependencies.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-color:#51466f_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#51466f] [&::-webkit-scrollbar-track]:bg-transparent">
                        {dependencies.map((dependency, index) => (
                          <div
                            key={dependency.name}
                            className={`flex min-w-0 items-center justify-between gap-3 px-4 py-3 ${
                              index !== dependencies.length - 1
                                ? "border-b border-[#252530]"
                                : ""
                            }`}
                          >
                            <span className="min-w-0 break-all text-xs text-[#d1cddc]">
                              {dependency.name}
                            </span>
                            <span className="shrink-0 rounded-md bg-[#191720] px-2 py-1 text-[10px] text-[#92919f]">
                              {dependency.version}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-5 text-center text-xs text-[#777483]">
                        No dependencies in this category.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
