
import { NextResponse } from "next/server";
import { collectSecurityFiles } from "@/lib/security/github-files";
import { analyzeSecrets } from "@/lib/security/secrets-analyzer";
import { analyzeSast } from "@/lib/security/sast-analyzer";
import { analyzeConfiguration } from "@/lib/security/configuration-analyzer";
import { analyzeDependencies } from "@/lib/security/dependencies-analyzer";
import type {
  SecurityAnalysisData,
  SecurityCategory,
  SecurityCategorySummary,
  SecurityFinding,
} from "@/lib/security/types";

export const maxDuration = 60;

const SCANNER_VERSION = "1.0.0";

function createEmptyCategorySummary(): SecurityCategorySummary {
  return {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
}

function createEmptyCategorySummaries(): Record<
  SecurityCategory,
  SecurityCategorySummary
> {
  return {
    sast: createEmptyCategorySummary(),
    dependencies: createEmptyCategorySummary(),
    secrets: createEmptyCategorySummary(),
    configuration: createEmptyCategorySummary(),
    "supply-chain": createEmptyCategorySummary(),
    authentication: createEmptyCategorySummary(),
  };
}

function buildSummary(findings: SecurityFinding[]) {
  const categories = createEmptyCategorySummaries();

  for (const finding of findings) {
    const category = categories[finding.category];

    category.total++;
    category[finding.severity]++;
  }

  return {
    totalFindings: findings.length,
    criticalFindings: findings.filter(
      (finding) => finding.severity === "critical",
    ).length,
    highFindings: findings.filter(
      (finding) => finding.severity === "high",
    ).length,
    mediumFindings: findings.filter(
      (finding) => finding.severity === "medium",
    ).length,
    lowFindings: findings.filter(
      (finding) => finding.severity === "low",
    ).length,
    infoFindings: findings.filter(
      (finding) => finding.severity === "info",
    ).length,
    categories,
  };
}

function countFilesByKind(
  files: Array<{ kind: string }>,
  kinds: string[],
): number {
  return files.filter((file) => kinds.includes(file.kind)).length;
}

function getCategoryFindings(
  findings: SecurityFinding[],
  category: SecurityCategory,
): number {
  return findings.filter(
    (finding) => finding.category === category,
  ).length;
}

function validateIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 255 &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !value.includes("..") &&
    !/[\s]/.test(value)
  );
}

function validateBranch(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 255 &&
    !value.startsWith("-") &&
    !value.includes("..") &&
    !value.includes("~") &&
    !value.includes("^") &&
    !value.includes(":") &&
    !value.includes("?") &&
    !value.includes("*") &&
    !value.includes("[") &&
    !value.includes("\\") &&
    !value.endsWith("/") &&
    !value.endsWith(".") &&
    !value.includes("@{")
  );
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    let body: {
      owner?: unknown;
      repo?: unknown;
      branch?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const { owner, repo, branch } = body;

    if (
      !validateIdentifier(owner) ||
      !validateIdentifier(repo) ||
      !validateBranch(branch)
    ) {
      return NextResponse.json(
        {
          error: "A valid owner, repository and branch are required.",
        },
        { status: 400 },
      );
    }

    const collection = await collectSecurityFiles(
      owner,
      repo,
      branch,
    );

    const [
      dependencyResult,
    ] = await Promise.all([
      analyzeDependencies(collection.files),
    ]);

    const sastFindings = analyzeSast(collection.files);
    const secretFindings = analyzeSecrets(collection.files);
    const configurationFindings = analyzeConfiguration(
      collection.files,
    );

    const findings = [
      ...sastFindings,
      ...secretFindings,
      ...configurationFindings,
      ...dependencyResult.findings,
    ];

    const sourceFiles = countFilesByKind(
      collection.files,
      ["source"],
    );

    const environmentFiles = countFilesByKind(
      collection.files,
      ["environment"],
    );

    const configurationFiles = countFilesByKind(
      collection.files,
      ["configuration"],
    );

    const workflowFiles = countFilesByKind(
      collection.files,
      ["workflow"],
    );

    const secretAnalyzedFiles = collection.files.length;

    const coverageLimitations = [
      ...collection.limitations,
      ...dependencyResult.limitations,
    ];

    const categories = [
      {
        category: "sast" as const,
        available: sourceFiles > 0,
        analyzedFiles: sourceFiles,
        skippedFiles: 0,
        findings: getCategoryFindings(findings, "sast"),
        limitations: sourceFiles
          ? []
          : ["Nenhum arquivo de código-fonte compatível foi encontrado."],
      },
      {
        category: "dependencies" as const,
        available: dependencyResult.available,
        analyzedFiles: dependencyResult.analyzedFiles,
        skippedFiles: dependencyResult.skippedFiles,
        findings: getCategoryFindings(findings, "dependencies"),
        limitations: dependencyResult.limitations,
      },
      {
        category: "secrets" as const,
        available: secretAnalyzedFiles > 0,
        analyzedFiles: secretAnalyzedFiles,
        skippedFiles: 0,
        findings: getCategoryFindings(findings, "secrets"),
        limitations: secretAnalyzedFiles
          ? []
          : ["Nenhum arquivo foi disponibilizado para análise de secrets."],
      },
      {
        category: "configuration" as const,
        available:
          configurationFiles > 0 ||
          workflowFiles > 0 ||
          environmentFiles > 0,
        analyzedFiles:
          configurationFiles +
          workflowFiles +
          environmentFiles,
        skippedFiles: 0,
        findings: getCategoryFindings(findings, "configuration"),
        limitations:
          configurationFiles + workflowFiles + environmentFiles
            ? []
            : ["Nenhum arquivo de configuração compatível foi encontrado."],
      },
      {
        category: "supply-chain" as const,
        available: workflowFiles > 0,
        analyzedFiles: workflowFiles,
        skippedFiles: 0,
        findings: getCategoryFindings(findings, "supply-chain"),
        limitations: [
          "A análise de workflows reutiliza verificações de configuração. Ainda não há um analisador completo de supply chain.",
        ],
      },
      {
        category: "authentication" as const,
        available: false,
        analyzedFiles: 0,
        skippedFiles: 0,
        findings: getCategoryFindings(findings, "authentication"),
        limitations: [
          "O analisador específico de autenticação e autorização ainda não foi implementado.",
        ],
      },
    ];

    const unavailableCategories = categories
      .filter((category) => !category.available)
      .map((category) => category.category);

    if (unavailableCategories.length) {
      coverageLimitations.push(
        `Categorias sem cobertura disponível nesta execução: ${unavailableCategories.join(", ")}.`,
      );
    }

    const data: SecurityAnalysisData = {
      repository: {
        owner,
        name: repo,
        branch,
      },
      scan: {
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        version: SCANNER_VERSION,
      },
      summary: buildSummary(findings),
      findings,
      coverage: {
        totalFiles: collection.totalFiles,
        analyzedFiles: collection.analyzedFiles,
        skippedFiles: collection.skippedFiles,
        failedFiles: collection.failedFiles,
        truncated: collection.truncated,
        categories,
        limitations: [...new Set(coverageLimitations)],
      },
    };

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (
      message.includes("GitHub API rate limit") ||
      message.includes("permission error")
    ) {
      return NextResponse.json(
        {
          error:
            "GitHub API rate limit or permission error. Try again later or check the GitHub App permissions.",
        },
        { status: 429 },
      );
    }

    if (message.includes("Repository or branch not found")) {
      return NextResponse.json(
        { error: "Repository or branch not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Unable to complete security analysis." },
      { status: 500 },
    );
  }
}
