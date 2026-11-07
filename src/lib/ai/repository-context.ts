import "server-only";

import path from "node:path";
import ts from "typescript";

import {
  collectSecurityFiles,
  type SecurityRepositoryFile,
} from "@/lib/security/github-files";
import { sanitizeRepositoryContext } from "./context-sanitizer";

export interface RepositoryContextOptions {
  owner: string;
  repo: string;
  branch: string;
  question: string;
}

export interface RepositoryContextResult {
  context: string;
  filesIncluded: number;
  totalFilesAvailable: number;
  excludedFiles: number;
  totalRedactions: number;
  truncated: boolean;
  limitations: string[];
}

type ImportGraph = {
  imports: Map<string, Set<string>>;
  importedBy: Map<string, Set<string>>;
};

type RankedFile = {
  file: SecurityRepositoryFile;
  score: number;
};

const MAX_INITIAL_FILES = 12;
const MAX_CONTEXT_FILES = 24;
const MAX_FILE_CHARACTERS = 12_000;
const MAX_TOTAL_CONTEXT_CHARACTERS = 80_000;
const MAX_SYMBOLS_PER_FILE = 30;
const TRUNCATION_MARKER = "\n[File content truncated.]";

const SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
];

const QUERY_STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "can", "could",
  "does", "for", "from", "how", "into", "its", "please",
  "should", "that", "the", "this", "what", "when", "where",
  "which", "with", "would", "your",
  "como", "com", "qual", "quais", "que", "para", "por",
  "uma", "umas", "uns", "dos", "das", "de", "do", "da",
  "no", "na", "nos", "nas", "meu", "minha", "seu", "sua",
  "isso", "essa", "esse", "este", "esta", "onde", "quando",
  "porque", "sobre", "funciona", "funcionam", "explique",
  "explicar",
]);

function getQueryTerms(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .split(/[^\p{L}\p{N}_./-]+/u)
        .map((term) => term.trim())
        .filter(
          (term) =>
            term.length >= 3 && !QUERY_STOP_WORDS.has(term),
        ),
    ),
  ].slice(0, 25);
}

function getKindPriority(
  kind: SecurityRepositoryFile["kind"],
): number {
  switch (kind) {
    case "source":
      return 4;
    case "configuration":
      return 3;
    case "dependency":
      return 2;
    case "workflow":
      return 1;
    case "environment":
      return 0;
  }
}

function scoreFile(
  file: SecurityRepositoryFile,
  queryTerms: string[],
): number {
  const filePath = file.path.toLowerCase();
  const content = file.content.toLowerCase();

  let score = getKindPriority(file.kind);

  for (const term of queryTerms) {
    if (filePath.includes(term)) {
      score += 12;
    }

    if (content.includes(term)) {
      score += 2;
    }
  }

  return score;
}

function rankFiles(
  files: SecurityRepositoryFile[],
  question: string,
): RankedFile[] {
  const queryTerms = getQueryTerms(question);

  return files
    .filter((file) => file.kind !== "environment")
    .map((file) => ({
      file,
      score: scoreFile(file, queryTerms),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.file.path.localeCompare(b.file.path);
    });
}

function getScriptKind(filePath: string): ts.ScriptKind | null {
  const extension = path.posix.extname(filePath).toLowerCase();

  switch (extension) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
    case ".mjs":
    case ".cjs":
      return ts.ScriptKind.JS;
    case ".ts":
      return ts.ScriptKind.TS;
    default:
      return null;
  }
}

function extractModuleSpecifiers(
  file: SecurityRepositoryFile,
): string[] {
  const scriptKind = getScriptKind(file.path);

  if (scriptKind === null) {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  const specifiers = new Set<string>();

  function visit(node: ts.Node): void {
    if (
      ts.isImportDeclaration(node) ||
      ts.isExportDeclaration(node)
    ) {
      const moduleSpecifier = node.moduleSpecifier;

      if (
        moduleSpecifier &&
        ts.isStringLiteral(moduleSpecifier)
      ) {
        specifiers.add(moduleSpecifier.text);
      }
    }

    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const isDynamicImport =
        node.expression.kind === ts.SyntaxKind.ImportKeyword;

      const isRequireCall =
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require";

      if (isDynamicImport || isRequireCall) {
        specifiers.add(node.arguments[0].text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return [...specifiers];
}

function resolveImportPath(
  sourcePath: string,
  specifier: string,
  availablePaths: Set<string>,
): string | null {
  let basePath: string;

  if (specifier.startsWith("@/")) {
    basePath = path.posix.join("src", specifier.slice(2));
  } else if (specifier.startsWith("~/")) {
    basePath = path.posix.join("src", specifier.slice(2));
  } else if (
    specifier.startsWith("./") ||
    specifier.startsWith("../")
  ) {
    basePath = path.posix.join(
      path.posix.dirname(sourcePath),
      specifier,
    );
  } else if (specifier.startsWith("/")) {
    basePath = path.posix.normalize(specifier.slice(1));
  } else {
    return null;
  }

  const normalizedBase = path.posix.normalize(basePath);

  if (
    normalizedBase === ".." ||
    normalizedBase.startsWith("../") ||
    normalizedBase.startsWith("/")
  ) {
    return null;
  }

  const candidates = new Set<string>([normalizedBase]);
  const hasExtension = Boolean(
    path.posix.extname(normalizedBase),
  );

  if (!hasExtension) {
    for (const extension of SUPPORTED_EXTENSIONS) {
      candidates.add(`${normalizedBase}${extension}`);
    }

    for (const extension of SUPPORTED_EXTENSIONS) {
      candidates.add(
        path.posix.join(normalizedBase, `index${extension}`),
      );
    }
  }

  for (const candidate of candidates) {
    if (availablePaths.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildImportGraph(
  files: SecurityRepositoryFile[],
): ImportGraph {
  const availablePaths = new Set(
    files.map((file) => file.path),
  );

  const imports = new Map<string, Set<string>>();
  const importedBy = new Map<string, Set<string>>();

  for (const file of files) {
    const dependencies = new Set<string>();

    for (const specifier of extractModuleSpecifiers(file)) {
      const resolvedPath = resolveImportPath(
        file.path,
        specifier,
        availablePaths,
      );

      if (resolvedPath && resolvedPath !== file.path) {
        dependencies.add(resolvedPath);

        const dependents =
          importedBy.get(resolvedPath) ?? new Set<string>();

        dependents.add(file.path);
        importedBy.set(resolvedPath, dependents);
      }
    }

    imports.set(file.path, dependencies);
  }

  return {
    imports,
    importedBy,
  };
}

function extractDeclaredSymbols(
  file: SecurityRepositoryFile,
): string[] {
  const scriptKind = getScriptKind(file.path);

  if (scriptKind === null) {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  const symbols = new Set<string>();

  function addName(
    name: ts.BindingName | ts.PropertyName | undefined,
  ): void {
    if (name && ts.isIdentifier(name)) {
      symbols.add(name.text);
    }
  }

  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      addName(statement.name);
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        addName(declaration.name);
      }
    }
  }

  return [...symbols]
    .filter((symbol) => symbol.length >= 4)
    .slice(0, MAX_SYMBOLS_PER_FILE);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFilesReferencingSymbols(
  sourceFiles: SecurityRepositoryFile[],
  candidates: SecurityRepositoryFile[],
): Map<string, number> {
  const scores = new Map<string, number>();

  const symbols = [
    ...new Set(sourceFiles.flatMap(extractDeclaredSymbols)),
  ].slice(0, 60);

  if (symbols.length === 0) {
    return scores;
  }

  for (const candidate of candidates) {
    let matches = 0;

    for (const symbol of symbols) {
      const pattern = new RegExp(
        `\\b${escapeRegExp(symbol)}\\b`,
      );

      if (pattern.test(candidate.content)) {
        matches += 1;
      }

      if (matches >= 5) {
        break;
      }
    }

    if (matches > 0) {
      scores.set(candidate.path, matches * 5);
    }
  }

  return scores;
}

function selectRelevantFiles(
  files: SecurityRepositoryFile[],
  question: string,
): {
  files: SecurityRepositoryFile[];
  graph: ImportGraph;
} {
  const eligibleFiles = files.filter(
    (file) => file.kind !== "environment",
  );

  const rankedFiles = rankFiles(eligibleFiles, question);
  const graph = buildImportGraph(eligibleFiles);

  const relevantFiles = rankedFiles.filter(
    ({ file, score }) => score > getKindPriority(file.kind),
  );

  const initialCandidates =
    relevantFiles.length > 0 ? relevantFiles : rankedFiles;

  const initialFiles = initialCandidates
    .slice(0, MAX_INITIAL_FILES)
    .map(({ file }) => file);

  const initialPaths = new Set(
    initialFiles.map((file) => file.path),
  );

  const fileByPath = new Map(
    eligibleFiles.map((file) => [file.path, file]),
  );

  const expansionScores = new Map<string, number>();

  function addRelatedFile(filePath: string, bonus: number): void {
    if (
      initialPaths.has(filePath) ||
      !fileByPath.has(filePath)
    ) {
      return;
    }

    expansionScores.set(
      filePath,
      Math.max(expansionScores.get(filePath) ?? 0, bonus),
    );
  }

  for (const file of initialFiles) {
    for (const importedPath of graph.imports.get(file.path) ?? []) {
      addRelatedFile(importedPath, 30);

      for (const secondLevelPath of graph.imports.get(importedPath) ?? []) {
        addRelatedFile(secondLevelPath, 12);
      }
    }

    for (const dependentPath of graph.importedBy.get(file.path) ?? []) {
      addRelatedFile(dependentPath, 24);

      for (const dependentOfDependent of graph.importedBy.get(
        dependentPath,
      ) ?? []) {
        addRelatedFile(dependentOfDependent, 10);
      }
    }
  }

  const referenceScores = findFilesReferencingSymbols(
    initialFiles,
    eligibleFiles.filter(
      (file) => !initialPaths.has(file.path),
    ),
  );

  for (const [filePath, bonus] of referenceScores) {
    addRelatedFile(filePath, bonus);
  }

  const rankedByPath = new Map(
    rankedFiles.map(({ file, score }) => [file.path, score]),
  );

  const expandedFiles = [...expansionScores.entries()]
    .map(([filePath, relationshipScore]) => ({
      file: fileByPath.get(filePath)!,
      score:
        (rankedByPath.get(filePath) ?? 0) + relationshipScore,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.file.path.localeCompare(b.file.path);
    })
    .map(({ file }) => file);

  return {
    files: [
      ...initialFiles,
      ...expandedFiles.slice(
        0,
        MAX_CONTEXT_FILES - initialFiles.length,
      ),
    ],
    graph,
  };
}

function getRelationshipDescription(
  filePath: string,
  graph: ImportGraph,
  selectedPaths: Set<string>,
): string[] {
  const imports = [...(graph.imports.get(filePath) ?? [])]
    .filter((relatedPath) => selectedPaths.has(relatedPath))
    .slice(0, 8);

  const importedBy = [
    ...(graph.importedBy.get(filePath) ?? []),
  ]
    .filter((relatedPath) => selectedPaths.has(relatedPath))
    .slice(0, 8);

  const descriptions: string[] = [];

  if (imports.length > 0) {
    descriptions.push(`Imports: ${imports.join(", ")}`);
  }

  if (importedBy.length > 0) {
    descriptions.push(`Imported by: ${importedBy.join(", ")}`);
  }

  return descriptions;
}

export async function buildRepositoryContext(
  options: RepositoryContextOptions,
): Promise<RepositoryContextResult> {
  const question = options.question.trim();

  if (!question) {
    throw new Error(
      "A question is required to investigate the repository.",
    );
  }

  const collection = await collectSecurityFiles(
    options.owner,
    options.repo,
    options.branch,
  );

  const selection = selectRelevantFiles(
    collection.files,
    question,
  );

  const selectedFiles = selection.files;
  const selectedPaths = new Set(
    selectedFiles.map((file) => file.path),
  );

  const sanitized = sanitizeRepositoryContext(selectedFiles);

  const contextParts: string[] = [];
  const limitations = [...collection.limitations];

  let totalCharacters = 0;
  let contextTruncated = false;

  const eligibleFileCount = collection.files.filter(
    (file) => file.kind !== "environment",
  ).length;

  if (eligibleFileCount > selectedFiles.length) {
    contextTruncated = true;
    limitations.push(
      `The investigation selected ${selectedFiles.length} relevant files and related dependencies from ${eligibleFileCount} collected non-environment files. Other files were not included in this request.`,
    );
  }

  for (const file of sanitized.files) {
    const originalFile = selectedFiles.find(
      (item) => item.path === file.path,
    );

    const relationshipDescriptions = getRelationshipDescription(
      file.path,
      selection.graph,
      selectedPaths,
    );

    const header = [
      `File: ${JSON.stringify(file.path)}`,
      `Type: ${originalFile?.kind ?? "source"}`,
      `Redactions: ${file.redactions}`,
      ...relationshipDescriptions,
      "Content:",
    ].join("\n");

    const footer = "\n--- END FILE ---";
    const separator = contextParts.length > 0 ? "\n\n" : "";

    const availableCharacters =
      MAX_TOTAL_CONTEXT_CHARACTERS -
      totalCharacters -
      separator.length -
      header.length -
      footer.length;

    if (availableCharacters <= 0) {
      contextTruncated = true;
      break;
    }

    const contentLimit = Math.min(
      MAX_FILE_CHARACTERS,
      availableCharacters,
    );

    const contentWasTruncated =
      file.content.length > contentLimit;

    const safeContentLimit = contentWasTruncated
      ? contentLimit - TRUNCATION_MARKER.length
      : contentLimit;

    if (safeContentLimit < 0) {
      contextTruncated = true;
      break;
    }

    const content = contentWasTruncated
      ? `${file.content.slice(0, safeContentLimit)}${TRUNCATION_MARKER}`
      : file.content;

    const part = `${header}\n${content}${footer}`;

    if (
      totalCharacters + separator.length + part.length >
      MAX_TOTAL_CONTEXT_CHARACTERS
    ) {
      contextTruncated = true;
      break;
    }

    contextParts.push(part);
    totalCharacters += separator.length + part.length;

    if (contentWasTruncated) {
      contextTruncated = true;
    }
  }

  if (contextParts.length < sanitized.files.length) {
    contextTruncated = true;
  }

  if (sanitized.excludedFiles.length > 0) {
    limitations.push(
      `${sanitized.excludedFiles.length} environment files were excluded from the AI context.`,
    );
  }

  if (sanitized.totalRedactions > 0) {
    limitations.push(
      `${sanitized.totalRedactions} potential secrets were masked before sending the context to the AI provider.`,
    );
  }

  if (contextTruncated) {
    limitations.push(
      "The repository context was shortened to fit the AI investigation limits.",
    );
  }

  return {
    context: contextParts.join("\n\n"),
    filesIncluded: contextParts.length,
    totalFilesAvailable: collection.totalFiles,
    excludedFiles: sanitized.excludedFiles.length,
    totalRedactions: sanitized.totalRedactions,
    truncated: collection.truncated || contextTruncated,
    limitations: [...new Set(limitations)],
  };
}