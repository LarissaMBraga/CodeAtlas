export type SourceFile = {
  path: string;
  sha: string;
  size: number;
};

export type FileContent = {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
};

export type TreeNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children: TreeNode[];
  file?: SourceFile;
};

export type FileTreeProps = {
  nodes: TreeNode[];
  depth?: number;
  expandedFolders: Set<string>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (file: SourceFile) => void;
};

export type CodeExplorerProps = {
  owner: string;
  repo: string;
  defaultBranch: string;
  files: SourceFile[];
};