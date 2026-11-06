import type {
  SourceFile,
  TreeNode,
} from "./code-explorer-types";

export function buildFileTree(
  files: SourceFile[]
): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let currentLevel = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath
        ? `${currentPath}/${part}`
        : part;

      const isFile = index === parts.length - 1;

      let node = currentLevel.find(
        (item) => item.name === part
      );

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

  sortTreeNodes(root);

  return root;
}

function sortTreeNodes(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });

  nodes.forEach((node) => {
    sortTreeNodes(node.children);
  });
}

export function getLanguage(path: string) {
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