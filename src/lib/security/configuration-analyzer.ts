import type {
  SecurityFinding,
} from "./types";

import type {
  SecurityRepositoryFile,
} from "./github-files";

type ConfigurationRule = {
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

const CONFIGURATION_RULES: ConfigurationRule[] = [
  {
    id: "CONFIG_PERMISSIVE_CORS",
    title: "Wildcard CORS origin",
    description:
      "The configuration appears to allow requests from every origin.",
    severity: "high",
    confidence: "medium",
    category: "configuration",
    pattern:
      /(?:origin|Access-Control-Allow-Origin)\s*[:=]\s*["'`]\*["'`]/gi,
    recommendation:
      "Replace wildcard origins with an explicit allowlist of trusted application domains.",
    impact:
      "An overly permissive cross-origin policy may expose application resources to untrusted websites, depending on the authentication and response configuration.",
    references: [
      {
        id: "CWE-942",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/942.html",
      },
    ],
  },
  {
    id: "CONFIG_INSECURE_COOKIE",
    title: "Cookie configured without secure protection",
    description:
      "A cookie configuration appears to omit the Secure or HttpOnly protection.",
    severity: "medium",
    confidence: "low",
    category: "configuration",
    pattern:
      /(?:httpOnly|secure)\s*:\s*false\b/gi,
    recommendation:
      "Enable HttpOnly to prevent JavaScript access to sensitive cookies and Secure to restrict transmission to HTTPS connections. Confirm the requirements of each cookie before changing its settings.",
    impact:
      "Missing cookie protections can increase exposure to session theft through cross-site scripting or insecure network connections.",
    references: [
      {
        id: "CWE-614",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/614.html",
      },
      {
        id: "CWE-1004",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/1004.html",
      },
    ],
  },
  {
    id: "CONFIG_DISABLED_TLS",
    title: "TLS certificate validation disabled",
    description:
      "The configuration explicitly disables TLS certificate verification.",
    severity: "high",
    confidence: "high",
    category: "configuration",
    pattern:
      /rejectUnauthorized\s*:\s*false\b/g,
    recommendation:
      "Enable certificate validation and configure a trusted certificate authority when custom certificates are required.",
    impact:
      "An attacker may intercept or modify communications between the application and remote services.",
    references: [
      {
        id: "CWE-295",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/295.html",
      },
    ],
  },
  {
    id: "CONFIG_DOCKER_ROOT",
    title: "Docker container may run as root",
    description:
      "The Dockerfile does not declare a non-root USER instruction.",
    severity: "medium",
    confidence: "medium",
    category: "configuration",
    pattern:
      /^\s*FROM\s+.+$/gim,
    recommendation:
      "Create or select a dedicated non-root user and declare it with the USER instruction in the Dockerfile.",
    impact:
      "A compromised process may have elevated privileges inside the container, increasing the potential impact of exploitation.",
    references: [
      {
        id: "CWE-250",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/250.html",
      },
    ],
  },
  {
    id: "CONFIG_DOCKER_PRIVILEGED",
    title: "Privileged container configuration",
    description:
      "A container configuration enables privileged mode.",
    severity: "high",
    confidence: "high",
    category: "configuration",
    pattern:
      /^\s*privileged\s*:\s*true\b/gim,
    recommendation:
      "Remove privileged mode and grant only the specific capabilities required by the container.",
    impact:
      "Privileged containers have substantially expanded access to host resources and can increase the consequences of container compromise.",
    references: [
      {
        id: "CWE-250",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/250.html",
      },
    ],
  },
  {
    id: "CONFIG_DOCKER_HOST_NETWORK",
    title: "Container uses host networking",
    description:
      "The container configuration uses the host network namespace.",
    severity: "medium",
    confidence: "medium",
    category: "configuration",
    pattern:
      /^\s*network_mode\s*:\s*["']?host["']?\s*$/gim,
    recommendation:
      "Use an isolated container network unless host networking is explicitly required and its security implications have been reviewed.",
    impact:
      "Host networking reduces network isolation between the container and the host system.",
    references: [
      {
        id: "CWE-668",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/668.html",
      },
    ],
  },
  {
    id: "CONFIG_GITHUB_WRITE_ALL",
    title: "GitHub Actions grants write-all permissions",
    description:
      "A workflow grants write access to all supported GitHub token permission scopes.",
    severity: "high",
    confidence: "high",
    category: "supply-chain",
    pattern:
      /^\s*permissions\s*:\s*write-all\s*$/gim,
    recommendation:
      "Declare the minimum required permissions individually at workflow or job level. Prefer read-only permissions when possible.",
    impact:
      "A compromised workflow or third-party action may obtain excessive access to repository resources.",
    references: [
      {
        id: "CWE-250",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/250.html",
      },
    ],
  },
  {
    id: "CONFIG_GITHUB_ACTION_UNPINNED",
    title: "GitHub Action is not pinned to a commit SHA",
    description:
      "A workflow references a GitHub Action using a mutable tag or branch instead of an immutable commit SHA.",
    severity: "medium",
    confidence: "medium",
    category: "supply-chain",
    pattern:
      /^\s*uses\s*:\s*[^@\s]+@(?:main|master|v?\d+(?:\.\d+){0,2})\s*(?:#.*)?$/gim,
    recommendation:
      "Pin third-party actions to a full 40-character commit SHA and optionally include the corresponding version as a comment.",
    impact:
      "A mutable action reference can change without modifying the workflow, allowing a compromised upstream action to affect your CI/CD pipeline.",
    references: [
      {
        id: "CWE-829",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/829.html",
      },
    ],
  },
  {
    id: "CONFIG_GITHUB_PERSIST_CREDENTIALS",
    title: "Git credentials persist after checkout",
    description:
      "The checkout action appears to retain Git credentials in the local repository configuration.",
    severity: "low",
    confidence: "medium",
    category: "supply-chain",
    pattern:
      /^\s*persist-credentials\s*:\s*true\s*$/gim,
    recommendation:
      "Set persist-credentials to false when subsequent workflow steps do not require authenticated Git operations.",
    impact:
      "Persisted credentials may be exposed to later workflow steps or scripts if those steps are compromised.",
    references: [
      {
        id: "CWE-522",
        type: "CWE",
        url: "https://cwe.mitre.org/data/definitions/522.html",
      },
    ],
  },
];

function isRelevantFile(file: SecurityRepositoryFile): boolean {
  return (
    file.kind === "configuration" ||
    file.kind === "workflow"
  );
}

function isDockerfile(filePath: string): boolean {
  return /(^|\/)dockerfile(?:\.[^/]*)?$/i.test(filePath);
}

function hasDockerUserInstruction(content: string): boolean {
  return /^\s*USER\s+(?!root(?:\s|$))\S+/im.test(content);
}

function createFinding(
  file: SecurityRepositoryFile,
  rule: ConfigurationRule,
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
      type: "configuration",
      content: line.trim().slice(0, 500),
      startLine: lineNumber,
      endLine: lineNumber,
    },
    references: rule.references,
    dependency: null,
  };
}

export function analyzeConfiguration(
  files: SecurityRepositoryFile[],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const file of files) {
    if (!isRelevantFile(file)) {
      continue;
    }

    const lines = file.content.split("\n");

    if (
      isDockerfile(file.path) &&
      !hasDockerUserInstruction(file.content)
    ) {
      const fromLine = lines.findIndex((line) =>
        /^\s*FROM\s+/i.test(line),
      );

      if (fromLine >= 0) {
        findings.push(
          createFinding(
            file,
            CONFIGURATION_RULES.find(
              (rule) => rule.id === "CONFIG_DOCKER_ROOT",
            )!,
            lines[fromLine],
            fromLine + 1,
          ),
        );
      }
    }

    for (const rule of CONFIGURATION_RULES) {
      if (rule.id === "CONFIG_DOCKER_ROOT") {
        continue;
      }

      rule.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(file.content)) !== null) {
        const lineNumber =
          file.content.slice(0, match.index).split("\n").length;

        const line = lines[lineNumber - 1] ?? "";

        findings.push(
          createFinding(
            file,
            rule,
            line,
            lineNumber,
          ),
        );

        if (match[0].length === 0) {
          rule.pattern.lastIndex += 1;
        }
      }
    }
  }

  return findings;
}
