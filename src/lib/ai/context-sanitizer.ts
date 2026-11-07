export interface RepositoryContextFile {
  path: string;
  content: string;
}

export interface SanitizedContextFile {
  path: string;
  content: string;
  redactions: number;
}

export interface ContextSanitizationResult {
  files: SanitizedContextFile[];
  excludedFiles: string[];
  totalRedactions: number;
}

const SECRET_ASSIGNMENT_NAMES =
  String.raw`(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key|refresh[_-]?token)`;

const QUOTED_SECRET_ASSIGNMENT = new RegExp(
  String.raw`(\b${SECRET_ASSIGNMENT_NAMES}\b\s*[:=]\s*)(["'\x60])([^"'\x60\r\n]{8,})\2`,
  "gi",
);

const UNQUOTED_SECRET_ASSIGNMENT = new RegExp(
  String.raw`(\b${SECRET_ASSIGNMENT_NAMES}\b\s*[:=]\s*)([^\s"' \x60,;}\]]{8,})`,
  "gi",
);

const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{20,255})\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /(\bBearer\s+)[A-Za-z0-9._~+/-]{12,}=*/gi,
];

const PLACEHOLDERS = [
  "your_api_key",
  "your-api-key",
  "your_secret",
  "your-secret",
  "replace_me",
  "replace-me",
  "changeme",
  "change_me",
  "example",
  "placeholder",
  "dummy",
  "test",
  "xxxx",
  "12345678",
];

function isEnvironmentFile(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const fileName = normalizedPath.split("/").pop() ?? "";

  return /^\.env(?:\.|$)/i.test(fileName);
}

function isLikelyPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    PLACEHOLDERS.some((placeholder) =>
      normalized.includes(placeholder),
    ) || /^x+$/i.test(value)
  );
}

function replaceAndCount(
  content: string,
  pattern: RegExp,
  replacement: string | ((...args: string[]) => string),
): { content: string; count: number } {
  let count = 0;

  const sanitized = content.replace(
    pattern,
    (...args: string[]) => {
      count += 1;

      if (typeof replacement === "function") {
        return replacement(...args);
      }

      return replacement;
    },
  );

  return {
    content: sanitized,
    count,
  };
}

function sanitizeContent(
  content: string,
): { content: string; redactions: number } {
  let sanitized = content;
  let redactions = 0;

  const quotedAssignments = sanitized.replace(
    QUOTED_SECRET_ASSIGNMENT,
    (match, assignment: string, quote: string, value: string) => {
      if (isLikelyPlaceholder(value)) {
        return match;
      }

      redactions += 1;

      return `${assignment}${quote}[REDACTED]${quote}`;
    },
  );

  sanitized = quotedAssignments;

  const unquotedAssignments = sanitized.replace(
    UNQUOTED_SECRET_ASSIGNMENT,
    (match, assignment: string, value: string) => {
      if (isLikelyPlaceholder(value)) {
        return match;
      }

      redactions += 1;

      return `${assignment}[REDACTED]`;
    },
  );

  sanitized = unquotedAssignments;

  for (const pattern of SECRET_PATTERNS) {
    const result = replaceAndCount(
      sanitized,
      pattern,
      (...args: string[]) => {

        if (pattern.source.startsWith("(\\bBearer")) {
          return `${args[1]}[REDACTED]`;
        }

        return `[REDACTED]`;
      },
    );

    sanitized = result.content;
    redactions += result.count;
  }

  return {
    content: sanitized,
    redactions,
  };
}

export function sanitizeRepositoryContext(
  files: RepositoryContextFile[],
): ContextSanitizationResult {
  const sanitizedFiles: SanitizedContextFile[] = [];
  const excludedFiles: string[] = [];
  let totalRedactions = 0;

  for (const file of files) {
    if (isEnvironmentFile(file.path)) {
      excludedFiles.push(file.path);
      continue;
    }

    const result = sanitizeContent(file.content);

    sanitizedFiles.push({
      path: file.path,
      content: result.content,
      redactions: result.redactions,
    });

    totalRedactions += result.redactions;
  }

  return {
    files: sanitizedFiles,
    excludedFiles,
    totalRedactions,
  };
}