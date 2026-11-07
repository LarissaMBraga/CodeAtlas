export type SecuritySeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type SecurityConfidence =
  | "high"
  | "medium"
  | "low";

export type SecurityCategory =
  | "sast"
  | "dependencies"
  | "secrets"
  | "configuration"
  | "supply-chain"
  | "authentication";

export type SecurityReference = {
  id: string;
  type: "CWE" | "CVE" | "GHSA" | "OWASP" | "OTHER";
  url: string | null;
};

export type SecurityEvidence = {
  type: "code" | "dependency" | "configuration" | "secret";
  content: string;
  startLine: number | null;
  endLine: number | null;
};

export type SecurityFinding = {
  id: string;
  ruleId: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  confidence: SecurityConfidence;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  file: string | null;
  line: number | null;
  evidence: SecurityEvidence | null;
  references: SecurityReference[];
  dependency: {
    name: string;
    version: string;
    fixedVersion: string | null;
    direct: boolean;
  } | null;
};

export type SecurityCategorySummary = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
};

export type SecurityCoverageItem = {
  category: SecurityCategory;
  available: boolean;
  analyzedFiles: number;
  skippedFiles: number;
  findings: number;
  limitations: string[];
};

export type SecurityCoverage = {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  truncated: boolean;
  categories: SecurityCoverageItem[];
  limitations: string[];
};

export type SecuritySummary = {
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  infoFindings: number;
  categories: Record<SecurityCategory, SecurityCategorySummary>;
};

export type SecurityAnalysisData = {
  repository: {
    owner: string;
    name: string;
    branch: string;
  };
  scan: {
    completedAt: string;
    durationMs: number;
    version: string;
  };
  summary: SecuritySummary;
  findings: SecurityFinding[];
  coverage: SecurityCoverage;
};