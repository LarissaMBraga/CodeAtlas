export type LanguageDefinition = {
  name: string;
  extensions: string[];
  category: "programming" | "markup" | "data" | "query" | "config";
};

export const LANGUAGE_DEFINITIONS: LanguageDefinition[] = [
  {
    name: "TypeScript",
    extensions: [".ts", ".tsx", ".mts", ".cts"],
    category: "programming",
  },
  {
    name: "JavaScript",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
    category: "programming",
  },
  {
    name: "Python",
    extensions: [".py", ".pyw", ".pyi"],
    category: "programming",
  },
  {
    name: "Java",
    extensions: [".java"],
    category: "programming",
  },
  {
    name: "C",
    extensions: [".c", ".h"],
    category: "programming",
  },
  {
    name: "C++",
    extensions: [".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx"],
    category: "programming",
  },
  {
    name: "C#",
    extensions: [".cs"],
    category: "programming",
  },
  {
    name: "Go",
    extensions: [".go"],
    category: "programming",
  },
  {
    name: "Rust",
    extensions: [".rs"],
    category: "programming",
  },
  {
    name: "Ruby",
    extensions: [".rb", ".rake"],
    category: "programming",
  },
  {
    name: "PHP",
    extensions: [".php"],
    category: "programming",
  },
  {
    name: "Swift",
    extensions: [".swift"],
    category: "programming",
  },
  {
    name: "Kotlin",
    extensions: [".kt", ".kts"],
    category: "programming",
  },
  {
    name: "Dart",
    extensions: [".dart"],
    category: "programming",
  },
  {
    name: "Scala",
    extensions: [".scala", ".sc"],
    category: "programming",
  },
  {
    name: "R",
    extensions: [".r", ".R"],
    category: "programming",
  },
  {
    name: "Lua",
    extensions: [".lua"],
    category: "programming",
  },
  {
    name: "Perl",
    extensions: [".pl", ".pm"],
    category: "programming",
  },
  {
    name: "Haskell",
    extensions: [".hs", ".lhs"],
    category: "programming",
  },
  {
    name: "Elixir",
    extensions: [".ex", ".exs"],
    category: "programming",
  },
  {
    name: "Clojure",
    extensions: [".clj", ".cljs", ".cljc", ".edn"],
    category: "programming",
  },
  {
    name: "F#",
    extensions: [".fs", ".fsi", ".fsx"],
    category: "programming",
  },
  {
    name: "OCaml",
    extensions: [".ml", ".mli"],
    category: "programming",
  },
  {
    name: "Erlang",
    extensions: [".erl", ".hrl"],
    category: "programming",
  },
  {
    name: "Objective-C",
    extensions: [".m", ".mm"],
    category: "programming",
  },
  {
    name: "Shell",
    extensions: [".sh", ".bash"],
    category: "programming",
  },
  {
    name: "PowerShell",
    extensions: [".ps1", ".psm1", ".psd1"],
    category: "programming",
  },
  {
    name: "Groovy",
    extensions: [".groovy", ".gradle"],
    category: "programming",
  },
  {
    name: "Julia",
    extensions: [".jl"],
    category: "programming",
  },
  {
    name: "Assembly",
    extensions: [".asm", ".s"],
    category: "programming",
  },
  {
    name: "Fortran",
    extensions: [".f", ".for", ".f90", ".f95", ".f03", ".f08"],
    category: "programming",
  },
  {
    name: "COBOL",
    extensions: [".cob", ".cbl"],
    category: "programming",
  },
  {
    name: "Prolog",
    extensions: [".plg"],
    category: "programming",
  },
  {
    name: "Solidity",
    extensions: [".sol"],
    category: "programming",
  },
  {
    name: "V",
    extensions: [".v"],
    category: "programming",
  },
  {
    name: "Verilog",
    extensions: [".v", ".vh"],
    category: "programming",
  },
  {
    name: "SystemVerilog",
    extensions: [".sv", ".svh"],
    category: "programming",
  },
  {
    name: "HTML",
    extensions: [".html", ".htm"],
    category: "markup",
  },
  {
    name: "CSS",
    extensions: [".css"],
    category: "markup",
  },
  {
    name: "SCSS",
    extensions: [".scss"],
    category: "markup",
  },
  {
    name: "Sass",
    extensions: [".sass"],
    category: "markup",
  },
  {
    name: "Less",
    extensions: [".less"],
    category: "markup",
  },
  {
    name: "Vue",
    extensions: [".vue"],
    category: "markup",
  },
  {
    name: "Svelte",
    extensions: [".svelte"],
    category: "markup",
  },
  {
    name: "Astro",
    extensions: [".astro"],
    category: "markup",
  },
  {
    name: "XML",
    extensions: [".xml"],
    category: "markup",
  },
  {
    name: "SVG",
    extensions: [".svg"],
    category: "markup",
  },
  {
    name: "JSON",
    extensions: [".json", ".jsonc"],
    category: "data",
  },
  {
    name: "YAML",
    extensions: [".yaml", ".yml"],
    category: "data",
  },
  {
    name: "TOML",
    extensions: [".toml"],
    category: "config",
  },
  {
    name: "INI",
    extensions: [".ini", ".cfg"],
    category: "config",
  },
  {
    name: "SQL",
    extensions: [".sql"],
    category: "query",
  },
  {
    name: "GraphQL",
    extensions: [".graphql", ".gql"],
    category: "query",
  },
  {
    name: "Protocol Buffers",
    extensions: [".proto"],
    category: "data",
  },
  {
    name: "Markdown",
    extensions: [".md", ".markdown"],
    category: "markup",
  },
  {
    name: "Dockerfile",
    extensions: ["Dockerfile"],
    category: "config",
  },
  {
    name: "Makefile",
    extensions: ["Makefile", ".mk"],
    category: "config",
  },
];

const extensionMap = new Map<string, LanguageDefinition>();

for (const language of LANGUAGE_DEFINITIONS) {
  for (const extension of language.extensions) {
    extensionMap.set(extension.toLowerCase(), language);
  }
}

export function getLanguageByPath(
  filePath: string
): LanguageDefinition | undefined {
  const fileName = filePath.split(/[\\/]/).pop()?.toLowerCase();

  if (!fileName) return undefined;

  if (fileName === "dockerfile") {
    return LANGUAGE_DEFINITIONS.find(
      (language) => language.name === "Dockerfile"
    );
  }

  if (fileName === "makefile") {
    return LANGUAGE_DEFINITIONS.find(
      (language) => language.name === "Makefile"
    );
  }

  const lastDot = fileName.lastIndexOf(".");

  if (lastDot === -1) return undefined;

  return extensionMap.get(fileName.slice(lastDot));
}

export function getSupportedExtensions(): string[] {
  return Array.from(extensionMap.keys()).sort();
}

export function getSupportedLanguages(): string[] {
  return Array.from(
    new Set(LANGUAGE_DEFINITIONS.map((language) => language.name))
  ).sort();
}