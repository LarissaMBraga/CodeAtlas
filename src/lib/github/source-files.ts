export const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
];

export const IGNORED_DIRECTORIES = [
  "node_modules/",
  ".next/",
  "dist/",
  "build/",
  "coverage/",
  "vendor/",
];

type SourceFileOptions = {
  normalizeSlashes?: boolean;
  caseInsensitive?: boolean;
};

export function isSourceFile(
  filePath: string,
  options: SourceFileOptions = {}
) {
  const normalizedPath = options.normalizeSlashes
    ? filePath.replace(/\\/g, "/")
    : filePath;

  const comparablePath = options.caseInsensitive
    ? normalizedPath.toLowerCase()
    : normalizedPath;

  return (
    SOURCE_EXTENSIONS.some((extension) =>
      comparablePath.endsWith(extension)
    ) &&
    !IGNORED_DIRECTORIES.some((directory) =>
      comparablePath.includes(directory)
    )
  );
}