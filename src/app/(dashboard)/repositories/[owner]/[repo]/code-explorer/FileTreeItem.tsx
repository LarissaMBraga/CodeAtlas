
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
} from "lucide-react";

type SourceFile = {
  path: string;
  sha: string;
  size: number;
};

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  file?: SourceFile;
  children?: TreeNode[];
};

type FileTreeProps = {
  node: TreeNode;
  depth: number;
  expandedFolders: Set<string>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (file: SourceFile) => void;
};

function TreeItemIcon({
  node,
  isExpanded,
}: {
  node: TreeNode;
  isExpanded: boolean;
}) {
  if (node.type === "folder") {
    return isExpanded ? (
      <FolderOpen size={14} className="text-[#b7a1ff]" />
    ) : (
      <Folder size={14} className="text-[#a98cff]" />
    );
  }

  return <FileCode2 size={14} className="text-[#92919f]" />;
}

function TreeItemChevron({
  isFolder,
  isExpanded,
}: {
  isFolder: boolean;
  isExpanded: boolean;
}) {
  if (!isFolder) {
    return <span className="w-3 shrink-0" />;
  }

  return isExpanded ? (
    <ChevronDown size={12} className="shrink-0 text-[#777483]" />
  ) : (
    <ChevronRight size={12} className="shrink-0 text-[#777483]" />
  );
}

function TreeItemChildren({
  node,
  depth,
  expandedFolders,
  selectedPath,
  onToggle,
  onSelect,
}: FileTreeProps) {
  if (
    node.type !== "folder" ||
    !expandedFolders.has(node.path) ||
    !node.children?.length
  ) {
    return null;
  }

  return (
    <div>
      {node.children.map((child) => (
        <FileTreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          expandedFolders={expandedFolders}
          selectedPath={selectedPath}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default function FileTreeItem({
  node,
  depth,
  expandedFolders,
  selectedPath,
  onToggle,
  onSelect,
}: FileTreeProps) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;

  const buttonStyle = isSelected
    ? "bg-[#a98cff]/10 text-[#d5c8ff]"
    : "text-[#a5a3b1] hover:bg-white/[0.04] hover:text-white";

  function handleClick() {
    if (isFolder) {
      onToggle(node.path);
      return;
    }

    if (node.file) {
      onSelect(node.file);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-xs transition-colors ${buttonStyle}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        title={node.path}
      >
        <TreeItemChevron
          isFolder={isFolder}
          isExpanded={isExpanded}
        />

        <TreeItemIcon node={node} isExpanded={isExpanded} />

        <span className="min-w-0 truncate">{node.name}</span>
      </button>

      <TreeItemChildren
        node={node}
        depth={depth}
        expandedFolders={expandedFolders}
        selectedPath={selectedPath}
        onToggle={onToggle}
        onSelect={onSelect}
      />
    </div>
  );
}
