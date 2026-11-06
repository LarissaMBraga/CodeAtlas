
import {
  detectLanguageFromPath,
  prefetch,
  process as parseSource,
  type ProcessResult,
} from "@xberg-io/tree-sitter-language-pack";
import { getLanguageByPath } from "./language-config";

const MAX_SOURCE_BYTES = 1024 * 1024;
const PARSE_TIMEOUT_MS = 3000;

const SPECIALIZED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const DATA_EXTRACTION_LANGUAGES = new Set([
  "JSON",
  "YAML",
  "TOML",
  "INI",
  "XML",
]);

const prefetchedLanguages = new Set<string>();

export type TreeSitterAnalysis = {
  language: string;
  displayName: string;
  result: ProcessResult;
};

export function analyzeWithTreeSitter(
  filePath: string,
  source: string
): TreeSitterAnalysis | null {
  const extension = filePath.match(/\.[^./\\]+$/)?.[0].toLowerCase();

  if (extension && SPECIALIZED_EXTENSIONS.has(extension)) {
    return null;
  }

  const definition = getLanguageByPath(filePath);

  if (!definition) {
    return null;
  }

  const language = detectLanguageFromPath(filePath);

  if (!language) {
    return null;
  }

  const sourceBytes = Buffer.byteLength(source, "utf8");

  if (sourceBytes > MAX_SOURCE_BYTES) {
    throw new Error(
      `Source file exceeds the Tree-sitter limit of ${MAX_SOURCE_BYTES} bytes.`
    );
  }

  if (!prefetchedLanguages.has(language)) {
    prefetch([language]);
    prefetchedLanguages.add(language);
  }

  const result = parseSource(source, {
    language,
    structure: true,
    imports: true,
    exports: true,
    comments: true,
    docstrings: true,
    symbols: true,
    diagnostics: true,
    dataExtraction: DATA_EXTRACTION_LANGUAGES.has(definition.name),
    maxSourceBytes: MAX_SOURCE_BYTES,
    parseTimeoutMs: PARSE_TIMEOUT_MS,
  });

  return {
    language,
    displayName: definition.name,
    result,
  };
}

export function getPrefetchedLanguages(): string[] {
  return Array.from(prefetchedLanguages).sort();
}
