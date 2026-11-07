
import type {
  SecurityFinding,
} from "./types";

import type {
  SecurityRepositoryFile,
} from "./github-files";

type SastRule = {
  id: string;
  title: string;
  description: string;
  severity: SecurityFinding["severity"];
  confidence: SecurityFinding["confidence"];
  category: SecurityFinding["category"];
  pattern: RegExp;
  recommendation: string;
  impact: string;
  references: SecurityFinding["references"];
};

const SAST_RULES: SastRule[] = [
  {
    id: "SAST_UNSAFE_INNER_HTML",
    title: "Potential unsafe HTML injection",
    description:
      "The code assigns content directly to innerHTML, which may allow cross-site scripting when the value contains untrusted input.",
    severity: "high",
    confidence: "medium",
    category: "sast",
    pattern: /\.innerHTML\s*=/g,
    recommendation:
      "Avoid assigning untrusted content to innerHTML. Prefer textContent or sanitize HTML with a well-maintained HTML sanitizer.",
    impact:
      "An attacker may execute JavaScript in another user's browser if untrusted content reaches this assignment.",
    references: [
      {
        id: "CWE-79",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/79.html",
      },
      {
        id: "OWASP-A03",
        type: "OWASP",
        url: "https://owasp.org/Top10/A03_2021-Injection/",
      },
    ],
  },
  {
    id: "SAST_DANGEROUSLY_SET_INNER_HTML",
    title: "Potential unsafe React HTML rendering",
    description:
      "React dangerouslySetInnerHTML bypasses normal text escaping and can introduce cross-site scripting when rendering untrusted HTML.",
    severity: "high",
    confidence: "medium",
    category: "sast",
    pattern: /dangerouslySetInnerHTML\s*=/g,
    recommendation:
      "Avoid rendering untrusted HTML. If HTML rendering is necessary, sanitize the content with a trusted sanitizer before passing it to dangerouslySetInnerHTML.",
    impact:
      "Malicious HTML may execute JavaScript in users' browsers and compromise their sessions or data.",
    references: [
      {
        id: "CWE-79",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/79.html",
      },
    ],
  },
  {
    id: "SAST_DOCUMENT_WRITE",
    title: "Potential unsafe document.write usage",
    description:
      "document.write can insert untrusted content into the document and may introduce cross-site scripting.",
    severity: "high",
    confidence: "medium",
    category: "sast",
    pattern: /\bdocument\s*\.\s*write(?:ln)?\s*\(/g,
    recommendation:
      "Avoid document.write. Use safe DOM APIs and ensure untrusted content is treated as text rather than executable HTML.",
    impact:
      "Untrusted content may be interpreted as HTML or JavaScript in the browser.",
    references: [
      {
        id: "CWE-79",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/79.html",
      },
    ],
  },
  {
    id: "SAST_EVAL",
    title: "Dynamic code execution with eval",
    description:
      "eval executes a string as JavaScript code. Executing untrusted or insufficiently validated input can lead to arbitrary code execution.",
    severity: "critical",
    confidence: "high",
    category: "sast",
    pattern: /\beval\s*\(/g,
    recommendation:
      "Remove eval and use explicit parsing or safer alternatives. Never execute code assembled from user-controlled input.",
    impact:
      "An attacker may execute arbitrary JavaScript with the privileges of the application.",
    references: [
      {
        id: "CWE-95",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/95.html",
      },
    ],
  },
  {
    id: "SAST_NEW_FUNCTION",
    title: "Dynamic function construction",
    description:
      "The Function constructor dynamically creates executable JavaScript code and can introduce code injection.",
    severity: "high",
    confidence: "medium",
    category: "sast",
    pattern: /\bnew\s+Function\s*\(/g,
    recommendation:
      "Avoid dynamically constructing executable functions. Replace this behavior with explicit, predefined operations.",
    impact:
      "If attacker-controlled input reaches the constructor, arbitrary JavaScript execution may become possible.",
    references: [
      {
        id: "CWE-95",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/95.html",
      },
    ],
  },
  {
    id: "SAST_COMMAND_EXECUTION",
    title: "Potential command injection",
    description:
      "A system command execution API was found. Passing untrusted input to these APIs without safe argument handling may allow command injection.",
    severity: "high",
    confidence: "medium",
    category: "sast",
    pattern:
      /\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(/g,
    recommendation:
      "Avoid constructing shell commands from external input. Prefer APIs that accept separate arguments, disable shell execution where possible, and validate inputs against strict allowlists.",
    impact:
      "An attacker may execute operating system commands with the application's permissions.",
    references: [
      {
        id: "CWE-78",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/78.html",
      },
    ],
  },
  {
    id: "SAST_SQL_STRING_CONCATENATION",
    title: "Potential SQL injection",
    description:
      "A SQL query appears to be constructed using string concatenation or interpolation. Untrusted input in the query may allow SQL injection.",
    severity: "high",
    confidence: "medium",
    category: "sast",
    pattern:
      /(?:query|execute|raw)\s*\(\s*(?:`[^`]*\$\{|["'][^"']*["']\s*\+)/gi,
    recommendation:
      "Use parameterized queries or prepared statements. Never concatenate untrusted values into SQL statements.",
    impact:
      "An attacker may manipulate database queries to access, modify, or delete unauthorized data.",
    references: [
      {
        id: "CWE-89",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/89.html",
      },
      {
        id: "OWASP-A03",
        type: "OWASP",
        url: "https://owasp.org/Top10/A03_2021-Injection/",
      },
    ],
  },
  {
    id: "SAST_PATH_TRAVERSAL",
    title: "Potential path traversal",
    description:
      "A filesystem operation appears to use a dynamically constructed path. Untrusted path segments may allow access outside the intended directory.",
    severity: "high",
    confidence: "medium",
    category: "sast",
    pattern:
      /\b(?:readFile|readFileSync|writeFile|writeFileSync|createReadStream|createWriteStream|unlink|unlinkSync)\s*\([^)\n]*(?:req\.(?:query|params|body)|request\.(?:query|params|body)|params\.|searchParams\.|userInput)/gi,
    recommendation:
      "Validate and normalize user-provided paths, resolve them against an explicitly allowed base directory, and verify that the resulting path remains inside that directory.",
    impact:
      "An attacker may read, overwrite, or delete files outside the intended application directory.",
    references: [
      {
        id: "CWE-22",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/22.html",
      },
    ],
  },
  {
    id: "SAST_DISABLED_TLS_VALIDATION",
    title: "TLS certificate validation disabled",
    description:
      "TLS certificate validation appears to be disabled. This can make HTTPS connections vulnerable to interception.",
    severity: "high",
    confidence: "high",
    category: "sast",
    pattern: /\brejectUnauthorized\s*:\s*false\b/g,
    recommendation:
      "Keep TLS certificate validation enabled. Configure a trusted certificate authority instead of disabling certificate verification.",
    impact:
      "An attacker positioned between the application and a remote service may intercept or modify supposedly secure communications.",
    references: [
      {
        id: "CWE-295",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/295.html",
      },
    ],
  },
  {
    id: "SAST_WEAK_HASH",
    title: "Potential use of weak cryptographic hash",
    description:
      "A cryptographic API appears to use MD5 or SHA-1. These algorithms are unsuitable for security-sensitive integrity or collision-resistance requirements.",
    severity: "medium",
    confidence: "medium",
    category: "sast",
    pattern:
      /(?:createHash|createHmac)\s*\(\s*["'](?:md5|sha1)["']\s*\)/gi,
    recommendation:
      "Use SHA-256 or a stronger modern hash for integrity checks. For password storage, use a dedicated password hashing algorithm such as Argon2id, scrypt, or bcrypt.",
    impact:
      "Weak hashing algorithms may allow collision attacks or undermine security guarantees when used for sensitive operations.",
    references: [
      {
        id: "CWE-328",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/328.html",
      },
    ],
  },
];

function sanitizeEvidence(line: string): string {
  return line
    .replace(
      /\b(?:gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{20,255})\b/g,
      "[REDACTED_TOKEN]",
    )
    .replace(
      /\bAKIA[0-9A-Z]{16}\b/g,
      "[REDACTED_AWS_KEY]",
    )
    .replace(
      /\b(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\b(\s*[:=]\s*)(["'`])([^"'`\r\n]{8,})(["'`])/gi,
      "$1$2$3[REDACTED]$5",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      "[REDACTED_JWT]",
    );
}

function createFinding(
  file: SecurityRepositoryFile,
  rule: SastRule,
  line: string,
  lineNumber: number,
): SecurityFinding {
  return {
    id: `${rule.id}:${file.path}:${lineNumber}`,
    ruleId: rule.id,
    category: rule.category,
    severity: rule.severity,
    confidence: rule.confidence,
    title: rule.title,
    description: rule.description,
    impact: rule.impact,
    recommendation: rule.recommendation,
    file: file.path,
    line: lineNumber,
    evidence: {
      type: "code",
      content: sanitizeEvidence(line.trim()).slice(0, 500),
      startLine: lineNumber,
      endLine: lineNumber,
    },
    references: rule.references,
    dependency: null,
  };
}

export function analyzeSast(
  files: SecurityRepositoryFile[],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  const sourceFiles = files.filter(
    (file) => file.kind === "source",
  );

  for (const file of sourceFiles) {
    const lines = file.content.split("\n");

    for (const rule of SAST_RULES) {
      for (let index = 0; index < lines.length; index += 1) {
        rule.pattern.lastIndex = 0;

        if (!rule.pattern.test(lines[index])) {
          continue;
        }

        findings.push(
          createFinding(
            file,
            rule,
            lines[index],
            index + 1,
          ),
        );
      }
    }
  }

  return findings;
}
