
"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Code2,
  ExternalLink,
  GitBranch,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Link2,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchRepository } from "@/lib/github/repository-client";
import type { GitHubRepository } from "@/lib/github/repository-types";
import type { RepositoryAnalysis } from "@/lib/github/repository-types";
import type { CodeHealthData } from "@/lib/code-health/types";
import CodeHealthAnalysis from "@/components/CodeHealthAnalysis";

type GitHubIdentityData = {
  user_name?: string;
  login?: string;
  preferred_username?: string;
};

type RepositoryTarget = {
  owner: string;
  repo: string;
  ref: string;
  fullName: string;
  url: string;
};

async function fetchGitHubRepositories(): Promise<{
  username: string;
  repositories: GitHubRepository[];
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUserIdentities();

  if (error) throw error;

  const identity = data.identities.find(
    (item) => item.provider === "github"
  );

  if (!identity) {
    return { username: "", repositories: [] };
  }

  const identityData = (identity.identity_data ??
    {}) as GitHubIdentityData;

  const username =
    identityData.user_name ||
    identityData.login ||
    identityData.preferred_username;

  if (!username) {
    throw new Error("Unable to identify your GitHub username.");
  }

  const response = await fetch(
    `/api/github/repositories?username=${encodeURIComponent(username)}`,
    { cache: "no-store" }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || "Unable to load GitHub repositories."
    );
  }

  return {
    username,
    repositories: result.repositories,
  };
}

function getRepositoryTarget(
  fullName: string,
  ref: string,
  url: string
): RepositoryTarget {
  const parts = fullName.split("/");

  if (
    parts.length !== 2 ||
    !/^[a-zA-Z0-9-]+$/.test(parts[0]) ||
    !/^[a-zA-Z0-9_.-]+$/.test(parts[1])
  ) {
    throw new Error("Invalid GitHub repository information.");
  }

  return {
    owner: parts[0],
    repo: parts[1],
    ref,
    fullName,
    url,
  };
}

export default function CodeHealthPage() {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [username, setUsername] = useState("");
  const [search, setSearch] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [selectedRepository, setSelectedRepository] =
    useState<RepositoryTarget | null>(null);
  const [codeHealthData, setCodeHealthData] =
    useState<CodeHealthData | null>(null);

  const [isLoadingRepositories, setIsLoadingRepositories] =
    useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function loadRepositories() {
    setIsLoadingRepositories(true);
    setError("");

    try {
      const result = await fetchGitHubRepositories();
      setUsername(result.username);
      setRepositories(result.repositories);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load GitHub repositories."
      );
    } finally {
      setIsLoadingRepositories(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const result = await fetchGitHubRepositories();

        if (!active) return;

        setUsername(result.username);
        setRepositories(result.repositories);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load GitHub repositories."
          );
        }
      } finally {
        if (active) setIsLoadingRepositories(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  async function runAnalysis(target: RepositoryTarget) {
    setIsAnalyzing(true);
    setError("");
    setCodeHealthData(null);
    setSelectedRepository(target);

    try {
      const response = await fetch("/api/github/code-health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: target.owner,
          repo: target.repo,
          ref: target.ref,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to analyze repository code health."
        );
      }

      setCodeHealthData(result as CodeHealthData);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Unable to analyze repository code health."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleRepositorySelection(
    repository: GitHubRepository
  ) {
    const target = getRepositoryTarget(
      repository.fullName,
      repository.defaultBranch,
      repository.url
    );

    await runAnalysis(target);
  }

  async function handlePublicRepositorySubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedUrl = repositoryUrl.trim().replace(/\/+$/, "");
    const repositoryPattern =
      /^https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/;

    if (!repositoryPattern.test(normalizedUrl)) {
      setError("Enter a valid GitHub repository URL.");
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const repository =
        await fetchRepository<RepositoryAnalysis>(normalizedUrl);

      const target = getRepositoryTarget(
        repository.fullName,
        repository.defaultBranch,
        repository.url
      );

      await runAnalysis(target);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to retrieve the public repository."
      );
      setIsAnalyzing(false);
    }
  }

  function resetAnalysis() {
    setSelectedRepository(null);
    setCodeHealthData(null);
    setError("");
    setRepositoryUrl("");
  }

  const filteredRepositories = repositories.filter((repository) => {
    const value = search.toLowerCase();

    return (
      repository.name.toLowerCase().includes(value) ||
      repository.description?.toLowerCase().includes(value) ||
      repository.language?.toLowerCase().includes(value)
    );
  });

  if (selectedRepository) {
    return (
      <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
        <button
          type="button"
          onClick={resetAnalysis}
          disabled={isAnalyzing}
          className="mb-8 flex items-center gap-2 text-xs font-medium text-[#b7a1ff] transition hover:text-white disabled:opacity-50"
        >
          <ArrowLeft size={15} />
          Back to repositories
        </button>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#a98cff]">
              Code Quality
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Code <span className="text-gradient">Health.</span>
            </h1>

            <p className="mt-3 text-sm text-[#92919f]">
              Analysis results for {selectedRepository.fullName}
            </p>
          </div>

          <a
            href={selectedRepository.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[#b7a1ff] transition hover:text-white"
          >
            View on GitHub
            <ExternalLink size={14} />
          </a>
        </div>

        {isAnalyzing ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-[#252530] bg-[#111117]">
            <LoaderCircle
              size={30}
              className="animate-spin text-[#b7a1ff]"
            />
            <p className="mt-5 text-sm font-medium text-white">
              Analyzing repository...
            </p>
            <p className="mt-2 text-xs text-[#777483]">
              Scanning source files and evaluating code quality.
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/5 p-6"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-red-400"
              />
              <div>
                <p className="text-sm font-medium text-red-400">
                  Code Health analysis failed
                </p>
                <p className="mt-2 text-xs leading-5 text-[#aaa6b5]">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => void runAnalysis(selectedRepository)}
                  className="mt-4 text-xs font-semibold text-[#b7a1ff] hover:text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : codeHealthData ? (
          <CodeHealthAnalysis data={codeHealthData} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#a98cff]">
          <Activity size={14} />
          Code Quality
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Code <span className="text-gradient">Health.</span>
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#92919f]">
          Evaluate code quality, maintainability, complexity and potential
          issues across your public GitHub repositories.
        </p>
      </div>

      <section className="mb-8 rounded-xl border border-[#252530] bg-[#111117] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
            <Link2 size={19} className="text-[#b7a1ff]" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-white">
              Analyze a public repository
            </h2>
            <p className="mt-1 text-xs text-[#777483]">
              Paste a GitHub URL to analyze a public project from any account.
            </p>
          </div>
        </div>

        <form
          onSubmit={handlePublicRepositorySubmit}
          className="mt-6"
        >
          <label
            htmlFor="code-health-repository-url"
            className="mb-2 block text-xs font-medium text-[#c5c2d0]"
          >
            GitHub repository URL
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="code-health-repository-url"
              type="url"
              value={repositoryUrl}
              onChange={(event) => {
                setRepositoryUrl(event.target.value);
                setError("");
              }}
              placeholder="https://github.com/owner/repository"
              className="h-11 min-w-0 flex-1 rounded-lg border border-[#302d3b] bg-[#09090d] px-4 text-sm text-white outline-none transition placeholder:text-[#555260] focus:border-[#9b7bff]/60"
            />

            <button
              type="submit"
              disabled={!repositoryUrl.trim() || isAnalyzing}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-5 text-sm font-semibold text-white transition hover:bg-[#8966f0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Analyze repository
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="w-full rounded-xl border border-[#252530] bg-[#111117] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
              <BookOpen size={19} className="text-[#b7a1ff]" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">
                Your Public Repositories
              </h2>
              <p className="mt-1 text-xs text-[#777483]">
                {username
                  ? `Public projects from @${username}`
                  : "Connect GitHub to explore your public projects."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isLoadingRepositories && repositories.length > 0 && (
              <span className="rounded-full border border-[#302d3b] bg-[#191720] px-3 py-1 text-[11px] text-[#aaa7b7]">
                {repositories.length} repositories
              </span>
            )}

            <button
              type="button"
              onClick={() => void loadRepositories()}
              disabled={isLoadingRepositories}
              aria-label="Refresh repositories"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#302d3b] bg-[#191720] text-[#92919f] transition hover:border-[#9b7bff]/40 hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  isLoadingRepositories ? "animate-spin" : ""
                }
              />
            </button>
          </div>
        </div>

        {!isLoadingRepositories && repositories.length > 0 && (
          <div className="relative mt-6">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#777483]"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your repositories..."
              className="h-10 w-full rounded-lg border border-[#302d3b] bg-[#09090d] pl-9 pr-4 text-xs text-white outline-none transition placeholder:text-[#555260] focus:border-[#9b7bff]/60 sm:max-w-sm"
            />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-6">
          {isLoadingRepositories ? (
            <div className="flex min-h-[180px] items-center justify-center gap-3 text-xs text-[#92919f]">
              <LoaderCircle
                size={18}
                className="animate-spin text-[#b7a1ff]"
              />
              Loading your public repositories...
            </div>
          ) : !username ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015] px-5 text-center">
              <BookOpen size={25} className="text-[#777483]" />
              <p className="mt-3 text-sm font-medium text-[#e8e5f0]">
                GitHub account not connected
              </p>
              <p className="mt-2 max-w-md text-xs leading-5 text-[#777483]">
                Connect your GitHub account to see your public repositories.
              </p>
            </div>
          ) : repositories.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015] px-5 text-center">
              <BookOpen size={25} className="text-[#777483]" />
              <p className="mt-3 text-sm font-medium text-[#e8e5f0]">
                No public repositories found
              </p>
            </div>
          ) : filteredRepositories.length === 0 ? (
            <div className="flex min-h-[150px] items-center justify-center text-xs text-[#777483]">
              No repositories match your search.
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(155,123,255,0.35)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9b7bff]/35">
              {filteredRepositories.map((repository) => (
                <article
                  key={repository.id}
                  className="flex w-[280px] shrink-0 flex-col rounded-xl border border-[#302d3b] bg-[#191720] p-5 transition hover:border-[#594b78]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <BookOpen
                        size={17}
                        className="shrink-0 text-[#b7a1ff]"
                      />
                      <h3 className="truncate text-sm font-semibold text-white">
                        {repository.name}
                      </h3>
                    </div>

                    <a
                      href={repository.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${repository.name} on GitHub`}
                      className="shrink-0 text-[#777483] transition hover:text-white"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[#92919f]">
                    {repository.description || "No description provided."}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[#92919f]">
                    <span className="flex items-center gap-1">
                      <Star size={13} className="text-[#b7a1ff]" />
                      {repository.stars.toLocaleString("en-US")}
                    </span>

                    <span className="flex items-center gap-1">
                      <GitBranch size={13} />
                      {repository.defaultBranch}
                    </span>

                    {repository.language && (
                      <span className="flex items-center gap-1">
                        <Code2 size={13} />
                        {repository.language}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-5">
                    <button
                      type="button"
                      onClick={() =>
                        void handleRepositorySelection(repository)
                      }
                      disabled={isAnalyzing}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-4 text-xs font-semibold text-white transition hover:bg-[#8966f0] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Analyze Code Health
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {!isLoadingRepositories && repositories.length > 0 && (
          <p className="mt-2 text-[10px] text-[#656270]">
            Only public repositories are displayed. Scroll horizontally to
            explore more projects.
          </p>
        )}
      </section>

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#302d3b] bg-[#111117] p-4">
        <ShieldCheck
          size={16}
          className="mt-0.5 shrink-0 text-[#b7a1ff]"
        />
        <p className="text-xs leading-5 text-[#92919f]">
          Code Health performs static analysis. It does not execute
          repository code or run automated tests.
        </p>
      </div>
    </div>
  );
}
