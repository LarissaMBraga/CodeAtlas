
"use client";

import { useEffect, useMemo, useState } from "react";
import { codeToHtml } from "shiki";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  LoaderCircle,
  AlertCircle,
  Code2,
  Copy,
  Check,
} from "lucide-react";

type SourceFile = {
  path: string;
  sha: string;
  size: number;
};

type FileContent = {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
};

type TreeNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children: TreeNode[];
  file?: SourceFile;
};

type CodeExplorerProps = {
  owner: string;
  repo: string;
  defaultBranch: string;
  files: SourceFile[];
};

function buildFileTree(files: SourceFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let currentLevel = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      const isFile = index === parts.length - 1;
      let node = currentLevel.find((item) => item.name === part);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: [],
          file: isFile ? file : undefined,
        };

        currentLevel.push(node);
      }

      currentLevel = node.children;
    });
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });

    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(root);

  return root;
}

function getLanguage(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();

  const languages: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    css: "css",
    scss: "scss",
    html: "html",
    vue: "vue",
    svelte: "svelte",
    py: "python",
    java: "java",
    cs: "csharp",
    cpp: "cpp",
    c: "c",
    h: "c",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby",
    sql: "sql",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sh: "bash",
    bash: "bash",
    toml: "toml",
    env: "dotenv",
  };

  return languages[extension || ""] || "text";
}

function FileTree({
  nodes,
  depth = 0,
  expandedFolders,
  selectedPath,
  onToggle,
  onSelect,
}: {
  nodes: TreeNode[];
  depth?: number;
  expandedFolders: Set<string>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (file: SourceFile) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isExpanded = expandedFolders.has(node.path);
        const isSelected = selectedPath === node.path;

        return (
          <div key={node.path}>
            <button
              type="button"
              onClick={() => {
                if (node.type === "folder") {
                  onToggle(node.path);
                } else if (node.file) {
                  onSelect(node.file);
                }
              }}
              title={node.path}
              className={`flex w-full min-w-0 items-center gap-2 rounded-md py-2 pr-2 text-left text-xs transition ${
                isSelected
                  ? "bg-[#9b7bff]/15 text-[#d5c7ff]"
                  : "text-[#a8a5b3] hover:bg-white/[0.04] hover:text-white"
              }`}
              style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
              {node.type === "folder" ? (
                <>
                  {isExpanded ? (
                    <ChevronDown size={13} className="shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="shrink-0" />
                  )}

                  {isExpanded ? (
                    <FolderOpen
                      size={15}
                      className="shrink-0 text-[#b7a1ff]"
                    />
                  ) : (
                    <Folder
                      size={15}
                      className="shrink-0 text-[#b7a1ff]"
                    />
                  )}
                </>
              ) : (
                <>
                  <span className="w-[13px] shrink-0" />
                  <FileCode2
                    size={14}
                    className="shrink-0 text-[#a98cff]"
                  />
                </>
              )}

              <span className="min-w-0 truncate">{node.name}</span>
            </button>

            {node.type === "folder" &&
              isExpanded &&
              node.children.length > 0 && (
                <FileTree
                  nodes={node.children}
                  depth={depth + 1}
                  expandedFolders={expandedFolders}
                  selectedPath={selectedPath}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              )}
          </div>
        );
      })}
    </>
  );
}

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
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [highlightedCode, setHighlightedCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fileTree = useMemo(() => buildFileTree(files), [files]);

 useEffect(() => {
  if (!selectedFile) return;

  const file = selectedFile;
  const controller = new AbortController();

  async function loadFile() {
      setIsLoading(true);
      setError("");
      setFileContent(null);
      setHighlightedCode("");

      try {
        const response = await fetch("/api/github/file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner,
            repo,
            path: file.path,
            ref: defaultBranch,
          }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load file content.");
        }

        const language = getLanguage(result.path);

        const html = await codeToHtml(result.content, {
          lang: language,
          theme: "github-dark",
        });

        if (!controller.signal.aborted) {
          setFileContent(result);
          setHighlightedCode(html);
        }
      } catch (loadError) {
        if (
          loadError instanceof Error &&
          loadError.name !== "AbortError" &&
          !controller.signal.aborted
        ) {
          setError(loadError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadFile();

    return () => {
      controller.abort();
    };
  }, [owner, repo, defaultBranch, selectedFile]);

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
    if (!fileContent) return;

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
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="min-h-[510px] min-w-0 flex-1 overflow-auto bg-[#0d0c12] [scrollbar-color:#51466f_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#51466f]">
            {isLoading ? (
              <div className="flex min-h-[510px] items-center justify-center gap-3 text-xs text-[#92919f]">
                <LoaderCircle
                  size={18}
                  className="animate-spin text-[#b7a1ff]"
                />
                Loading source code...
              </div>
            ) : error ? (
              <div className="flex min-h-[510px] flex-col items-center justify-center px-6 text-center">
                <AlertCircle size={24} className="text-red-400" />
                <p className="mt-3 text-xs font-medium text-white">
                  Unable to load file
                </p>
                <p className="mt-2 max-w-sm text-xs leading-5 text-[#92919f]">
                  {error}
                </p>
              </div>
            ) : highlightedCode ? (
              <div className="code-explorer-content min-w-0 p-4">
                <div
                  className="min-w-max text-xs leading-6 [&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!font-mono [&_code]:!font-mono"
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
              </div>
            ) : (
              <div className="flex min-h-[510px] flex-col items-center justify-center text-center">
                <FileCode2 size={28} className="text-[#51466f]" />
                <p className="mt-3 text-xs text-[#92919f]">
                  Select a file to explore its source code.
                </p>
              </div>
            )}
          </div>

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
