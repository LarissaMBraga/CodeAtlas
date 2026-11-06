
"use client";

import { useState } from "react";
import {
  Star,
  GitFork,
  Code2,
  GitBranch,
  FileCode2,
  HardDrive,
  FolderTree,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type RepositoryOverviewProps = {
  stars: number;
  forks: number;
  language: string | null;
  defaultBranch: string;
  totalSourceFiles: number;
  maxFiles: number;
  truncated: boolean;
  files: {
    path: string;
    sha: string;
    size: number;
  }[];
};

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

export default function RepositoryOverview({
  stars,
  forks,
  language,
  defaultBranch,
  totalSourceFiles,
  maxFiles,
  truncated,
  files,
}: RepositoryOverviewProps) {
  const [showAllFiles, setShowAllFiles] = useState(false);

  const stats = [
    {
      label: "Stars",
      value: stars.toLocaleString("en-US"),
      icon: Star,
    },
    {
      label: "Forks",
      value: forks.toLocaleString("en-US"),
      icon: GitFork,
    },
    {
      label: "Primary language",
      value: language || "Not specified",
      icon: Code2,
    },
    {
      label: "Default branch",
      value: defaultBranch,
      icon: GitBranch,
    },
  ];

  const visibleFiles = showAllFiles ? files : files.slice(0, 6);

  const totalSize = files.reduce(
    (total, file) => total + file.size,
    0
  );

  return (
    <section id="overview" className="scroll-mt-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">
          Repository Overview
        </h2>
        <p className="mt-1 text-xs text-[#777483]">
          General information retrieved directly from GitHub.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className="rounded-xl border border-[#252530] bg-[#111117] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#92919f]">{stat.label}</p>
                <Icon size={16} className="text-[#a98cff]" />
              </div>

              <p className="mt-4 truncate text-xl font-semibold text-white">
                {stat.value}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-[#252530] bg-[#111117] p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
            <Sparkles size={18} className="text-[#b7a1ff]" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              Repository analysis workspace
            </h3>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-[#92919f]">
              Your repository has been connected to CODE ATLAS. The next
              analysis stages will explore its file structure, architecture,
              dependencies and code quality.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015] px-5 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <FolderTree size={25} className="shrink-0 text-[#b7a1ff]" />

              <div>
                <p className="text-sm font-medium text-[#e8e5f0]">
                  Repository structure
                </p>
                <p className="mt-1 text-xs text-[#777483]">
                  Source files retrieved from GitHub
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-[#302d3b] bg-[#191720] px-3 py-2">
                <FileCode2 size={14} className="text-[#a98cff]" />
                <span className="text-xs text-[#e8e5f0]">
                  {totalSourceFiles} files
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-[#302d3b] bg-[#191720] px-3 py-2">
                <HardDrive size={14} className="text-[#a98cff]" />
                <span className="text-xs text-[#e8e5f0]">
                  {totalSize < 1024 * 1024
                    ? `${(totalSize / 1024).toFixed(1)} KB`
                    : `${(totalSize / (1024 * 1024)).toFixed(2)} MB`}
                </span>
              </div>
            </div>
          </div>

          {truncated && (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
              <p className="text-xs leading-5 text-amber-300">
                The file list was limited to {maxFiles} files.
                Larger repositories will be processed in stages.
              </p>
            </div>
          )}

          {files.length > 0 ? (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-[#92919f]">
                  Detected source files
                </p>
                <span className="text-[10px] text-[#777483]">
                  {visibleFiles.length} of {files.length} entries
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-[#252530] bg-[#0d0c12] [scrollbar-color:#51466f_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#51466f] [&::-webkit-scrollbar-thumb:hover]:bg-[#8b75c7] [&::-webkit-scrollbar-track]:bg-transparent">
                {visibleFiles.map((file, index) => (
                  <div
                    key={file.sha + file.path}
                    className={`flex min-w-0 items-center justify-between gap-3 px-4 py-3 ${
                      index !== visibleFiles.length - 1
                        ? "border-b border-[#252530]"
                        : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileCode2
                        size={15}
                        className="shrink-0 text-[#a98cff]"
                      />
                      <span className="break-all text-xs text-[#d1cddc]">
                        {file.path}
                      </span>
                    </div>

                    <span className="shrink-0 text-[10px] tabular-nums text-[#777483]">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ))}
              </div>

              {files.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllFiles((current) => !current)}
                  aria-expanded={showAllFiles}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#302d3b] bg-[#191720] px-4 py-3 text-xs font-medium text-[#b7a1ff] transition hover:border-[#9b7bff]/50 hover:bg-[#201c2b]"
                >
                  {showAllFiles ? (
                    <>
                      Show less
                      <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      View all {files.length} files
                      <ChevronDown size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-[#252530] bg-[#0d0c12] px-5 py-8 text-center">
              <FileCode2 size={22} className="mx-auto text-[#777483]" />
              <p className="mt-3 text-xs text-[#92919f]">
                No supported source files were found in this repository.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
