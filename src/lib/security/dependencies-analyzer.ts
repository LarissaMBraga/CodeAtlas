
import type { SecurityConfidence, SecurityFinding, SecuritySeverity } from "./types";
import type { SecurityRepositoryFile } from "./github-files";

type LockedDependency = {
  name: string;
  version: string;
  direct: boolean;
  file: string;
};

type OsvVulnerability = {
  id?: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  severity?: Array<{
    type?: string;
    score?: string;
  }>;
  database_specific?: {
    severity?: string;
    cwe_ids?: string[];
  };
  references?: Array<{
    type?: string;
    url?: string;
  }>;
  affected?: Array<{
    package?: {
      name?: string;
      ecosystem?: string;
    };
    ranges?: Array<{
      events?: Array<{
        introduced?: string;
        fixed?: string;
        last_affected?: string;
      }>;
    }>;
    versions?: string[];
  }>;
};

type OsvBatchResult = {
  vulns?: Array<{ id?: string }>;
};

type OsvBatchResponse = {
  results?: OsvBatchResult[];
};

export type DependencyAnalysisResult = {
  findings: SecurityFinding[];
  available: boolean;
  analyzedFiles: number;
  analyzedDependencies: number;
  vulnerableDependencies: number;
  skippedFiles: number;
  limitations: string[];
};

const OSV_API_URL = "https://api.osv.dev/v1";
const MAX_DEPENDENCIES = 2000;
const BATCH_SIZE = 100;
const DETAIL_CONCURRENCY = 8;

function normalizeVersion(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const version = value.trim().replace(/^[=v\s]+/, "");

  if (
    !version ||
    version === "*" ||
    version.toLowerCase() === "latest" ||
    version.includes(" ") ||
    version.startsWith("^") ||
    version.startsWith("~") ||
    version.startsWith(">") ||
    version.startsWith("<")
  ) {
    return null;
  }

  return version;
}

function isValidPackageName(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 214 &&
    !value.includes("\\") &&
    !value.includes("\0")
  );
}

function getNpmPackageName(packagePath: string): string | null {
  const marker = "node_modules/";

  const index = packagePath.lastIndexOf(marker);

  if (index === -1) {
    return null;
  }

  const name = packagePath.slice(index + marker.length);

  if (!name) {
    return null;
  }

  if (name.startsWith("@")) {
    const segments = name.split("/");

    if (segments.length < 2) {
      return null;
    }

    return `${segments[0]}/${segments[1]}`;
  }

  return name.split("/")[0] || null;
}

function parseNpmLockfile(
  file: SecurityRepositoryFile,
): LockedDependency[] {
  let parsed: {
    lockfileVersion?: number;
    packages?: Record<
      string,
      {
        name?: string;
        version?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
      }
    >;
    dependencies?: Record<
      string,
      {
        version?: string;
        dependencies?: Record<string, unknown>;
      }
    >;
  };

  try {
    parsed = JSON.parse(file.content);
  } catch {
    return [];
  }

  const dependencies = new Map<string, LockedDependency>();
  const root = parsed.packages?.[""];

  const directNames = new Set([
    ...Object.keys(root?.dependencies ?? {}),
    ...Object.keys(root?.devDependencies ?? {}),
    ...Object.keys(root?.optionalDependencies ?? {}),
  ]);

  if (parsed.packages) {
    for (const [packagePath, entry] of Object.entries(parsed.packages)) {
      if (!packagePath || !entry?.version) {
        continue;
      }

      const name = entry.name || getNpmPackageName(packagePath);
      const version = normalizeVersion(entry.version);

      if (
        !name ||
        !version ||
        !isValidPackageName(name)
      ) {
        continue;
      }

      const isDirect = directNames.has(name) &&
        packagePath === `node_modules/${name}`;

      dependencies.set(`${name}@${version}`, {
        name,
        version,
        direct: isDirect,
        file: file.path,
      });
    }
  } else if (parsed.dependencies) {
    const visit = (
      entries: Record<string, {
        version?: string;
        dependencies?: Record<string, unknown>;
      }>,
      direct: boolean,
    ) => {
      for (const [name, entry] of Object.entries(entries)) {
        const version = normalizeVersion(entry?.version);

        if (version && isValidPackageName(name)) {
          const key = `${name}@${version}`;
          const existing = dependencies.get(key);

          dependencies.set(key, {
            name,
            version,
            direct: direct || existing?.direct === true,
            file: file.path,
          });
        }

        if (entry?.dependencies && typeof entry.dependencies === "object") {
          visit(
            entry.dependencies as Record<string, {
              version?: string;
              dependencies?: Record<string, unknown>;
            }>,
            false,
          );
        }
      }
    };

    visit(parsed.dependencies, true);
  }

  return Array.from(dependencies.values());
}

function parseYarnLockfile(
  file: SecurityRepositoryFile,
): LockedDependency[] {
  const dependencies = new Map<string, LockedDependency>();
  const lines = file.content.split(/\r?\n/);

  let currentNames: string[] = [];
  let currentVersion: string | null = null;

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    if (!line.startsWith(" ")) {
      currentNames = line
        .replace(/:$/, "")
        .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .map((item) => item.slice(0, item.lastIndexOf("@")))
        .filter(Boolean);

      currentVersion = null;
      continue;
    }

    const versionMatch = line.match(/^\s+version\s+["']?([^"'\s]+)["']?/);

    if (!versionMatch) {
      continue;
    }

    currentVersion = normalizeVersion(versionMatch[1]);

    if (!currentVersion) {
      continue;
    }

    for (const name of currentNames) {
      if (!isValidPackageName(name)) {
        continue;
      }

      dependencies.set(`${name}@${currentVersion}`, {
        name,
        version: currentVersion,
        direct: false,
        file: file.path,
      });
    }
  }

  return Array.from(dependencies.values());
}

function parseLockfile(
  file: SecurityRepositoryFile,
): LockedDependency[] {
  const path = file.path.toLowerCase();

  if (
    path.endsWith("package-lock.json") ||
    path.endsWith("npm-shrinkwrap.json")
  ) {
    return parseNpmLockfile(file);
  }

  if (path.endsWith("yarn.lock")) {
    return parseYarnLockfile(file);
  }

  return [];
}

function mapSeverity(
  vulnerability: OsvVulnerability,
): SecuritySeverity {
  const databaseSeverity =
    vulnerability.database_specific?.severity?.toLowerCase();

  if (databaseSeverity) {
    if (databaseSeverity === "critical") return "critical";
    if (databaseSeverity === "high") return "high";
    if (databaseSeverity === "moderate" || databaseSeverity === "medium") {
      return "medium";
    }
    if (databaseSeverity === "low") return "low";
  }

  const scores = vulnerability.severity ?? [];

  for (const severity of scores) {
    const score = Number(severity.score);

    if (!Number.isFinite(score)) {
      continue;
    }

    if (score >= 9) return "critical";
    if (score >= 7) return "high";
    if (score >= 4) return "medium";
    if (score > 0) return "low";
  }

  return "info";
}

function getFixedVersion(
  vulnerability: OsvVulnerability,
  packageName: string,
): string | null {
  const affected = vulnerability.affected ?? [];

  for (const entry of affected) {
    if (entry.package?.name !== packageName) {
      continue;
    }

    for (const range of entry.ranges ?? []) {
      for (const event of range.events ?? []) {
        const fixed = normalizeVersion(event.fixed);

        if (fixed) {
          return fixed;
        }
      }
    }
  }

  return null;
}

function getReferences(
  vulnerability: OsvVulnerability,
): SecurityFinding["references"] {
  const references: SecurityFinding["references"] = [];
  const identifiers = [
    vulnerability.id,
    ...(vulnerability.aliases ?? []),
    ...(vulnerability.database_specific?.cwe_ids ?? []),
  ].filter((value): value is string => Boolean(value));

  for (const identifier of identifiers) {
    const isCwe = identifier.startsWith("CWE-");
    const isCve = identifier.startsWith("CVE-");
    const isGhsa = identifier.startsWith("GHSA-");

    references.push({
      id: identifier,
      type: isCwe
        ? "CWE"
        : isCve
          ? "CVE"
          : isGhsa
            ? "GHSA"
            : "OTHER",
      url: isCwe
        ? `https://cwe.mitre.org/data/definitions/${identifier.slice(4)}.html`
        : isCve
          ? `https://www.cve.org/CVERecord?id=${identifier}`
          : isGhsa
            ? `https://github.com/advisories/${identifier}`
            : identifier.startsWith("OSV-")
              ? `https://osv.dev/vulnerability/${identifier}`
              : null,
    });
  }

  for (const reference of vulnerability.references ?? []) {
    if (!reference.url) {
      continue;
    }

    const alreadyIncluded = references.some(
      (item) => item.url === reference.url,
    );

    if (!alreadyIncluded) {
      references.push({
        id: reference.url,
        type: "OTHER",
        url: reference.url,
      });
    }
  }

  return references;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  callback: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const index = currentIndex++;

      if (index >= items.length) {
        return;
      }

      results[index] = await callback(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker(),
    ),
  );

  return results;
}

async function fetchVulnerabilityDetails(
  id: string,
): Promise<OsvVulnerability | null> {
  try {
    const response = await fetch(
      `${OSV_API_URL}/vulns/${encodeURIComponent(id)}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return await response.json() as OsvVulnerability;
  } catch {
    return null;
  }
}

async function queryOsvBatch(
  dependencies: LockedDependency[],
): Promise<{
  findings: SecurityFinding[];
  failedQueries: number;
}> {
  const findings: SecurityFinding[] = [];
  let failedQueries = 0;

  for (
    let offset = 0;
    offset < dependencies.length;
    offset += BATCH_SIZE
  ) {
    const batch = dependencies.slice(offset, offset + BATCH_SIZE);

    let response: Response;

    try {
      response = await fetch(`${OSV_API_URL}/querybatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          queries: batch.map((dependency) => ({
            package: {
              name: dependency.name,
              ecosystem: "npm",
            },
            version: dependency.version,
          })),
        }),
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      });
    } catch {
      failedQueries += batch.length;
      continue;
    }

    if (!response.ok) {
      failedQueries += batch.length;
      continue;
    }

    let data: OsvBatchResponse;

    try {
      data = await response.json() as OsvBatchResponse;
    } catch {
      failedQueries += batch.length;
      continue;
    }

    const results = data.results ?? [];

    for (let index = 0; index < batch.length; index++) {
      const dependency = batch[index];
      const vulnerabilityIds = [
        ...new Set(
          (results[index]?.vulns ?? [])
            .map((vulnerability) => vulnerability.id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      if (!vulnerabilityIds.length) {
        continue;
      }

      const details = await mapWithConcurrency(
        vulnerabilityIds,
        DETAIL_CONCURRENCY,
        fetchVulnerabilityDetails,
      );

      for (let detailIndex = 0; detailIndex < details.length; detailIndex++) {
        const vulnerability = details[detailIndex];

        if (!vulnerability?.id) {
          failedQueries++;
          continue;
        }

        const severity = mapSeverity(vulnerability);
        const fixedVersion = getFixedVersion(
          vulnerability,
          dependency.name,
        );

        const primaryId = vulnerability.id;

        const references = getReferences(vulnerability);

        const description =
          vulnerability.summary ||
          vulnerability.details ||
          `A versão ${dependency.version} de ${dependency.name} está associada a uma vulnerabilidade conhecida.`;

        findings.push({
          id: `dependency-${dependency.name}-${dependency.version}-${primaryId}`
            .replace(/[^a-zA-Z0-9_-]/g, "-"),
          ruleId: `OSV-${primaryId}`,
          category: "dependencies",
          severity,
          confidence: "high" satisfies SecurityConfidence,
          title: `${dependency.name} ${dependency.version}: ${description.slice(0, 140)}`,
          description,
          impact:
            "Esta versão da dependência está associada a uma vulnerabilidade registrada no banco OSV. O impacto depende das condições de exploração e do uso do componente no projeto.",
          recommendation: fixedVersion
            ? `Atualize ${dependency.name} para a versão ${fixedVersion} ou outra versão posterior comprovadamente corrigida. Revise também as dependências que exigem esta versão.`
            : `Revise o aviso ${primaryId}, avalie uma versão corrigida ou alternativa segura e confirme a aplicabilidade da vulnerabilidade ao projeto.`,
          file: dependency.file,
          line: null,
          evidence: {
            type: "dependency",
            content: `${dependency.name}@${dependency.version}`,
            startLine: null,
            endLine: null,
          },
          references,
          dependency: {
            name: dependency.name,
            version: dependency.version,
            fixedVersion,
            direct: dependency.direct,
          },
        });
      }
    }
  }

  return {
    findings,
    failedQueries,
  };
}

export async function analyzeDependencies(
  files: SecurityRepositoryFile[],
): Promise<DependencyAnalysisResult> {
  const lockfiles = files.filter((file) => {
    const path = file.path.toLowerCase();

    return (
      path.endsWith("package-lock.json") ||
      path.endsWith("npm-shrinkwrap.json") ||
      path.endsWith("yarn.lock")
    );
  });

  const unsupportedLockfiles = files.filter((file) => {
    const path = file.path.toLowerCase();

    return (
      path.endsWith("pnpm-lock.yaml") ||
      path.endsWith("bun.lock") ||
      path.endsWith("bun.lockb") ||
      path.endsWith("cargo.lock") ||
      path.endsWith("poetry.lock") ||
      path.endsWith("uv.lock") ||
      path.endsWith("pipfile.lock") ||
      path.endsWith("composer.lock") ||
      path.endsWith("go.sum") ||
      path.endsWith("gemfile.lock") ||
      path.endsWith("packages.lock.json")
    );
  });

  const limitations: string[] = [];

  if (!lockfiles.length) {
    limitations.push(
      "Nenhum lockfile npm ou Yarn compatível foi encontrado. Não é possível confirmar versões resolvidas das dependências.",
    );
  }

  if (unsupportedLockfiles.length) {
    limitations.push(
      `${unsupportedLockfiles.length} lockfile(s) de outros ecossistemas foram encontrados, mas ainda não são interpretados por este analisador.`,
    );
  }

  const dependencyMap = new Map<string, LockedDependency>();

  for (const file of lockfiles) {
    const parsed = parseLockfile(file);

    for (const dependency of parsed) {
      const key = `${dependency.name}@${dependency.version}`;
      const existing = dependencyMap.get(key);

      dependencyMap.set(key, {
        ...dependency,
        direct: dependency.direct || existing?.direct === true,
      });
    }
  }

  const allDependencies = Array.from(dependencyMap.values());
  const truncated = allDependencies.length > MAX_DEPENDENCIES;
  const dependencies = allDependencies.slice(0, MAX_DEPENDENCIES);

  if (truncated) {
    limitations.push(
      `A análise foi limitada às primeiras ${MAX_DEPENDENCIES} combinações únicas de pacote e versão.`,
    );
  }

  if (!dependencies.length) {
    return {
      findings: [],
      available: lockfiles.length > 0,
      analyzedFiles: lockfiles.length,
      analyzedDependencies: 0,
      vulnerableDependencies: 0,
      skippedFiles: unsupportedLockfiles.length,
      limitations: [
        ...limitations,
        ...(lockfiles.length
          ? ["Nenhuma dependência com versão resolvida foi extraída dos lockfiles compatíveis."]
          : []),
      ],
    };
  }

  const result = await queryOsvBatch(dependencies);

  if (result.failedQueries > 0) {
    limitations.push(
      `${result.failedQueries} consulta(s) ou detalhe(s) de vulnerabilidade não puderam ser recuperados da API OSV.`,
    );
  }

  if (lockfiles.length > 1) {
    limitations.push(
      "Foram encontrados múltiplos lockfiles. Dependências repetidas foram consolidadas por nome e versão.",
    );
  }

  const vulnerableDependencies = new Set(
    result.findings.map(
      (finding) =>
        `${finding.dependency?.name}@${finding.dependency?.version}`,
    ),
  );

  return {
    findings: result.findings,
    available: true,
    analyzedFiles: lockfiles.length,
    analyzedDependencies: dependencies.length,
    vulnerableDependencies: vulnerableDependencies.size,
    skippedFiles: unsupportedLockfiles.length,
    limitations,
  };
}
