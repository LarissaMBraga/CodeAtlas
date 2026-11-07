
import { useEffect, useState } from "react";
import type { RepositoryAnalysis } from "@/lib/github/repository-types";
import type { DependenciesAnalysisData } from "./dependencies-analysis-types";

export type RepositorySourceFile = {
  path: string;
  sha: string;
  size: number;
};

export type RepositoryFileAnalysis = {
  totalSourceFiles: number;
  maxFiles: number;
  truncated: boolean;
};

export type RepositoryLanguage = {
  name: string;
  bytes: number;
  percentage: number;
  fileCount: number;
};

export type RepositoryLanguageAnalysis = {
  available: boolean;
  totalBytes: number;
  totalFiles: number;
};

type RepositoryAnalysisResult = {
  repository: RepositoryAnalysis | null;
  files: RepositorySourceFile[];
  analysis: RepositoryFileAnalysis | null;
  languages: RepositoryLanguage[];
  languageAnalysis: RepositoryLanguageAnalysis | null;
  dependenciesAnalysis: DependenciesAnalysisData | null;
  isLoading: boolean;
  error: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to load repository information.";
}

async function fetchRepositoryAnalysis(
  owner: string,
  repo: string
) {
  const response = await fetch("/api/github/repository", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositoryUrl: `https://github.com/${owner}/${repo}`,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || "Unable to retrieve repository information."
    );
  }

  return result;
}

export function useRepositoryAnalysisData(
  owner: string,
  repo: string
): RepositoryAnalysisResult {
  const [repository, setRepository] =
    useState<RepositoryAnalysis | null>(null);
  const [files, setFiles] = useState<RepositorySourceFile[]>([]);
  const [analysis, setAnalysis] =
    useState<RepositoryFileAnalysis | null>(null);
  const [languages, setLanguages] = useState<RepositoryLanguage[]>([]);
  const [languageAnalysis, setLanguageAnalysis] =
    useState<RepositoryLanguageAnalysis | null>(null);
  const [dependenciesAnalysis, setDependenciesAnalysis] =
    useState<DependenciesAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const result = await fetchRepositoryAnalysis(owner, repo);

        if (controller.signal.aborted) {
          return;
        }

        setRepository(result.repository);
        setFiles(result.files || []);
        setAnalysis(result.analysis || null);
        setLanguages(result.languages || []);
        setLanguageAnalysis(result.languageAnalysis || null);
        setDependenciesAnalysis(result.dependenciesAnalysis || null);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [owner, repo]);

  return {
    repository,
    files,
    analysis,
    languages,
    languageAnalysis,
    dependenciesAnalysis,
    isLoading,
    error,
  };
}
