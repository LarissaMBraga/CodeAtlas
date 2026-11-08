
import { createPrivateKey } from "node:crypto";

import type {
  SecurityConfidence,
  SecurityFinding,
} from "./types";

import type { SecurityRepositoryFile } from "./github-files";

type SecretRule = {
  id: string;
  title: string;
  description: string;
  severity: SecurityFinding["severity"];
  confidence: SecurityConfidence;
  pattern: RegExp;
  recommendation: string;
  references: SecurityFinding["references"];
};

const SECRET_RULES: SecretRule[] = [
  {
    id: "SECRET_GITHUB_TOKEN",
    title: "GitHub token exposed",
    description:
      "A value matching a GitHub access token pattern was found in a tracked file.",
    severity: "critical",
    confidence: "high",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{20,255})\b/g,
    recommendation:
      "Revoke the exposed token immediately, generate a replacement, and store it in a secure secret manager or environment variable.",
    references: [
      {
        id: "CWE-798",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/798.html",
      },
    ],
  },
  {
    id: "SECRET_AWS_ACCESS_KEY",
    title: "AWS access key exposed",
    description:
      "A value matching the AWS access key identifier pattern was found.",
    severity: "critical",
    confidence: "high",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    recommendation:
      "Deactivate or rotate the exposed AWS access key and use IAM roles or a secure secret manager instead.",
    references: [
      {
        id: "CWE-798",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/798.html",
      },
    ],
  },
  {
    id: "SECRET_PRIVATE_KEY",
    title: "Private key exposed",
    description:
      "A structurally valid private key was found in a tracked file.",
    severity: "critical",
    confidence: "high",
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    recommendation:
      "Remove the private key from the repository, revoke or rotate the associated credentials, and use a secure key management system.",
    references: [
      {
        id: "CWE-321",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/321.html",
      },
    ],
  },
  {
    id: "SECRET_JWT",
    title: "Possible hardcoded JWT",
    description:
      "A value matching the structure of a JSON Web Token was found in a tracked file.",
    severity: "high",
    confidence: "medium",
    pattern:
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    recommendation:
      "Verify whether the token is active. If it is, revoke it and avoid storing authentication tokens in source code.",
    references: [
      {
        id: "CWE-798",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/798.html",
      },
    ],
  },
  {
    id: "SECRET_GENERIC_ASSIGNMENT",
    title: "Possible hardcoded credential",
    description:
      "A variable with a credential-related name appears to contain a hardcoded secret.",
    severity: "high",
    confidence: "medium",
    pattern:
      /\b(?:password|passwd|secret|api[\_-]?key|access[\_-]?token|auth[\_-]?token|client[\_-]?secret)\b\s*[:=]\s*["'`]([^"'`\r\n]{8,})["'`]/gi,
    recommendation:
      "Move the credential into a secure environment variable or secret manager. Rotate it if it is a real credential.",
    references: [
      {
        id: "CWE-798",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/798.html",
      },
    ],
  },
];

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function maskSecret(value: string): string {
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}${"*".repeat(
    Math.min(value.length - 8, 16),
  )}${value.slice(-4)}`;
}

function maskLine(line: string, secret: string): string {
  if (!secret) {
    return line;
  }

  return line.replaceAll(secret, maskSecret(secret));
}

function isLikelyPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();

  const placeholders = [
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

  return placeholders.some((placeholder) =>
    normalized.includes(placeholder),
  );
}

function isCommentLine(line: string, filePath: string): boolean {
  const trimmed = line.trim();

  if (/\.(py|sh|bash|rb)$/i.test(filePath)) {
    return trimmed.startsWith("#");
  }

  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("<!--") ||
    trimmed.startsWith("/*")
  );
}

function isValidPrivateKeyBlock(
  content: string,
  startIndex: number,
): boolean {
  const remaining = content.slice(startIndex);

  const headerMatch = remaining.match(
    /^-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[ \t]*\r?\n/,
  );

  if (!headerMatch) {
    return false;
  }

  const keyType = headerMatch[1] ?? "";
  const endMarker = `-----END ${keyType}PRIVATE KEY-----`;

  const bodyStart = headerMatch[0].length;
  const endIndex = remaining.indexOf(endMarker, bodyStart);

  if (endIndex === -1) {
    return false;
  }

  const encodedBody = remaining
    .slice(bodyStart, endIndex)
    .replace(/\s/g, "");

  if (
    !encodedBody ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encodedBody)
  ) {
    return false;
  }

  const decodedBody = Buffer.from(encodedBody, "base64");

  if (
    decodedBody.length === 0 ||
    decodedBody.toString("base64") !== encodedBody
  ) {
    return false;
  }

  if (keyType === "OPENSSH ") {
    return (
      decodedBody
        .subarray(0, 15)
        .toString("utf8") === "openssh-key-v1\0" &&
      decodedBody.length > 64
    );
  }

  const privateKeyPem = remaining.slice(
    0,
    endIndex + endMarker.length,
  );

  try {
    createPrivateKey(privateKeyPem);
    return true;
  } catch {
    return false;
  }
}

function createFinding(
  file: SecurityRepositoryFile,
  rule: SecretRule,
  match: RegExpExecArray,
  line: string,
): SecurityFinding {
  const matchedValue =
    rule.id === "SECRET_GENERIC_ASSIGNMENT"
      ? match[1]
      : match[0];

  const lineNumber = getLineNumber(
    file.content,
    match.index,
  );

  return {
    id: `${rule.id}:${file.path}:${lineNumber}`,
    ruleId: rule.id,
    category: "secrets",
    severity: rule.severity,
    confidence: rule.confidence,
    title: rule.title,
    description: rule.description,
    impact:
      "An exposed credential may allow unauthorized access to services, infrastructure, accounts, or sensitive data.",
    recommendation: rule.recommendation,
    file: file.path,
    line: lineNumber,
    evidence: {
      type: "secret",
      content: maskLine(line, matchedValue),
      startLine: lineNumber,
      endLine: lineNumber,
    },
    references: rule.references,
    dependency: null,
  };
}

export function analyzeSecrets(
  files: SecurityRepositoryFile[],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");

    for (const rule of SECRET_RULES) {
      rule.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(file.content)) !== null) {
        const lineNumber = getLineNumber(
          file.content,
          match.index,
        );

        const line = lines[lineNumber - 1] ?? "";

        const matchedValue =
          rule.id === "SECRET_GENERIC_ASSIGNMENT"
            ? match[1]
            : match[0];

        if (
          isCommentLine(line, file.path) ||
          isLikelyPlaceholder(matchedValue)
        ) {
          continue;
        }

        if (
          rule.id === "SECRET_PRIVATE_KEY" &&
          !isValidPrivateKeyBlock(file.content, match.index)
        ) {
          continue;
        }

        findings.push(
          createFinding(file, rule, match, line),
        );
      }
    }
  }

  return findings;
}
