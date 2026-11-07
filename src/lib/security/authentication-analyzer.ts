
import type { SecurityFinding } from "./types";
import type { SecurityRepositoryFile } from "./github-files";

const RULES = [
  {
    id: "AUTH-JWT-NONE",
    pattern: /algorithms\s*:\s*\[\s*["']none["']\s*\]/i,
    severity: "critical" as const,
    confidence: "high" as const,
    title: "JWT accepts the none algorithm",
    description:
      "The JWT verification configuration appears to accept the none algorithm, which can allow tokens without a valid cryptographic signature.",
    impact:
      "An attacker may be able to forge a token and impersonate another user if this configuration is used during token verification.",
    recommendation:
      "Reject the none algorithm and explicitly allow only the cryptographic algorithms required by the application.",
    cwe: "CWE-347",
  },
  {
    id: "AUTH-JWT-IGNORE-EXPIRATION",
    pattern: /ignoreExpiration\s*:\s*true/i,
    severity: "high" as const,
    confidence: "high" as const,
    title: "JWT expiration verification is disabled",
    description:
      "The JWT verification options appear to ignore token expiration.",
    impact:
      "Expired tokens may remain usable longer than intended, increasing the risk of unauthorized access if a token is exposed.",
    recommendation:
      "Enable expiration verification and define an appropriate token lifetime and refresh strategy.",
    cwe: "CWE-613",
  },
  {
    id: "AUTH-JWT-DECODE",
    pattern: /\b(?:jwt|jsonwebtoken)\s*\.\s*decode\s*\(/i,
    severity: "medium" as const,
    confidence: "medium" as const,
    title: "JWT is decoded without signature verification",
    description:
      "The code uses a JWT decode operation. Decoding a token does not verify its signature or establish that its claims are trustworthy.",
    impact:
      "If decoded claims are used for authorization or identity decisions without a separate verification step, an attacker may manipulate token contents.",
    recommendation:
      "Use a verified JWT validation operation before trusting claims. Treat decoded, unverified data as untrusted input.",
    cwe: "CWE-345",
  },
  {
    id: "AUTH-VERIFICATION-DISABLED",
    pattern: /(?:verify|verification|validateSignature|checkSignature)\s*:\s*false/i,
    severity: "high" as const,
    confidence: "medium" as const,
    title: "Authentication verification appears disabled",
    description:
      "A verification-related option is explicitly set to false. Review whether this disables token, certificate, or signature validation.",
    impact:
      "Disabling verification may allow forged or untrusted credentials to be accepted.",
    recommendation:
      "Keep signature and credential verification enabled. If this is test-only configuration, isolate it from production builds.",
    cwe: "CWE-347",
  },
  {
    id: "AUTH-DISABLED-FLAG",
    pattern: /\b(?:DISABLE_AUTH|AUTH_DISABLED|SKIP_AUTHENTICATION)\s*[:=]\s*(?:true|1|["']true["'])/i,
    severity: "high" as const,
    confidence: "medium" as const,
    title: "Authentication disabling flag is enabled",
    description:
      "A configuration value appears to explicitly disable authentication.",
    impact:
      "If this flag reaches a production environment, protected operations may become accessible without valid authentication.",
    recommendation:
      "Remove authentication bypass flags from production configuration and enforce authentication at the server boundary.",
    cwe: "CWE-306",
  },
] as const;

function isRelevantFile(file: SecurityRepositoryFile): boolean {
  return (
    file.kind === "source" ||
    file.kind === "configuration" ||
    file.kind === "environment"
  );
}

function sanitizeEvidence(value: string): string {
  return value
    .replace(
      /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
      "[REDACTED_TOKEN]",
    )
    .replace(
      /\bAKIA[0-9A-Z]{16}\b/g,
      "[REDACTED_AWS_KEY]",
    )
    .replace(
      /((?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*)["']?[^"'`,;\s]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      "[REDACTED_JWT]",
    )
    .slice(0, 500);
}

export function analyzeAuthentication(
  files: SecurityRepositoryFile[],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const file of files) {
    if (!isRelevantFile(file)) {
      continue;
    }

    const lines = file.content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      if (!line.trim() || /^\s*(?:\/\/|\/\*|\*|#|<!--)/.test(line)) {
        continue;
      }

      for (const rule of RULES) {
        if (!rule.pattern.test(line)) {
          continue;
        }

        findings.push({
          id: `${rule.id}-${file.path}-${index + 1}`,
          ruleId: rule.id,
          category: "authentication",
          severity: rule.severity,
          confidence: rule.confidence,
          title: rule.title,
          description: rule.description,
          impact: rule.impact,
          recommendation: rule.recommendation,
          file: file.path,
          line: index + 1,
          evidence: {
            type: "code",
            content: sanitizeEvidence(line.trim()),
            startLine: index + 1,
            endLine: index + 1,
          },
          references: [
            {
              id: rule.cwe,
              type: "CWE",
              url: `https://cwe.mitre.org/data/definitions/${rule.cwe.slice(4)}.html`,
            },
          ],
          dependency: null,
        });
      }
    }
  }

  return findings;
}
