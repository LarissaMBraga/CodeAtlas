
"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  FileCode2,
  Folder,
} from "lucide-react";
import FileTree from "./code-explorer/FileTree";
import CodeViewer from "./code-explorer/CodeViewer";
import {
  buildFileTree,
} from "./code-explorer/file-tree-utils";
import { useCodeExplorerFile } from "./code-explorer/useCodeExplorerFile";
import type {
  CodeExplorerProps,
  SourceFile,
} from "./code-explorer/code-explorer-types";

export default function CodeExplorer({
  owner,
  repo,
  defaultBranch,
  files,
}: CodeExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<SourceFile | null>(
    files[0] || null
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [copied, setCopied] = useState(false);

  const {
    fileContent,
    highlightedCode,
    isLoading,
    error,
  } = useCodeExplorerFile({
    owner,
    repo,
    defaultBranch,
    selectedFile,
  });

  const fileTree = useMemo(
    () => buildFileTree(files),
    [files]
  );

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

  async function copyCode() {
    if (!fileContent) {
      return;
    }

    await navigator.clipboard.writeText(fileContent.content);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#252530] bg-[#111117]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252530] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
            <Code2 size={17} className="text-[#b7a1ff]" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              Code Explorer
            </h2>

            <p className="mt-1 text-[10px] text-[#777483]">
              Browse repository source files
            </p>
          </div>
        </div>

        <span className="rounded-md border border-[#302d3b] bg-[#191720] px-3 py-2 text-[10px] text-[#92919f]">
          {files.length} source files
        </span>
      </div>

      <div className="grid min-h-[560px] min-w-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-[#252530] bg-[#0d0c12] lg:border-b-0 lg:border-r">
          <div className="flex h-11 items-center justify-between border-b border-[#252530] px-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92919f]">
              Explorer
            </span>

            <Folder size={14} className="text-[#777483]" />
          </div>

          <div className="max-h-[420px] overflow-y-auto overflow-x-hidden p-2 [scrollbar-color:#51466f_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#51466f]">
            {fileTree.length > 0 ? (
              <FileTree
                nodes={fileTree}
                expandedFolders={expandedFolders}
                selectedPath={selectedFile?.path || null}
                onToggle={toggleFolder}
                onSelect={setSelectedFile}
              />
            ) : (
              <p className="px-3 py-6 text-center text-xs text-[#777483]">
                No source files available.
              </p>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <div className="flex min-h-11 min-w-0 items-center justify-between gap-3 border-b border-[#252530] bg-[#15141c] px-4">
            <div className="flex min-w-0 items-center gap-2">
              <FileCode2
                size={14}
                className="shrink-0 text-[#a98cff]"
              />

              <span className="truncate text-xs text-[#d1cddc]">
                {selectedFile?.path || "Select a file"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void copyCode()}
              disabled={!fileContent || isLoading}
              className="flex shrink-0 items-center gap-2 rounded-md border border-[#302d3b] bg-[#191720] px-3 py-2 text-[10px] text-[#a8a5b3] transition hover:border-[#9b7bff]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? (
                <Check size={13} />
              ) : (
                <Copy size={13} />
              )}

              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <CodeViewer
            isLoading={isLoading}
            error={error}
            highlightedCode={highlightedCode}
          />

          <div className="flex min-h-9 items-center justify-between gap-3 border-t border-[#252530] bg-[#15141c] px-4">
            <span className="truncate text-[10px] text-[#777483]">
              {fileContent?.path || "No file selected"}
            </span>

            <span className="shrink-0 text-[10px] text-[#777483]">
              {fileContent
                ? `${fileContent.content.split("\n").length} lines`
                : "CODE ATLAS"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
