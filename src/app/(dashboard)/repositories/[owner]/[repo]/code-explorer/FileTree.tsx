import type { FileTreeProps } from "./code-explorer-types";
import FileTreeItem from "./FileTreeItem";

export default function FileTree({
  nodes,
  depth = 0,
  expandedFolders,
  selectedPath,
  onToggle,
  onSelect,
}: FileTreeProps) {
  return (
    <>
      {nodes.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          depth={depth}
          expandedFolders={expandedFolders}
          selectedPath={selectedPath}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}