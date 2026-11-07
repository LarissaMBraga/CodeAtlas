import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
} from "lucide-react";
import type {
  FileTreeProps,
  TreeNode,
} from "./code-explorer-types";

type FileTreeItemProps = {
  node: TreeNode;
  depth: number;
} & Pick<
  FileTreeProps,
  | "expandedFolders"
  | "selectedPath"
  | "onToggle"
  | "onSelect"
>;

export default function FileTreeItem({
  node,
  depth,
  expandedFolders,
  selectedPath,
  onToggle,
  onSelect,
}: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;

  const buttonStyle = isSelected
    ? "bg-[#9b7bff]/15 text-[#d5c7ff]"
    : "text-[#a8a5b3] hover:bg-white/[0.04] hover:text-white";

  function handleClick() {
    if (node.type === "folder") {
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
        title={node.path}
        className={`flex w-full min-w-0 items-center gap-2 rounded-md py-2 pr-2 text-left text-xs transition ${buttonStyle}`}
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

        <span className="min-w-0 truncate">
          {node.name}
        </span>
      </button>

      {node.type === "folder" &&
        isExpanded &&
        node.children.length > 0 && (
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
        )}
    </div>
  );
}