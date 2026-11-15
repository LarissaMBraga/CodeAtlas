
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  GitBranch,
  Globe,
  LoaderCircle,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import ImpactAnalysis from "@/app/(dashboard)/repositories/[owner]/[repo]/ImpactAnalysis";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  private: boolean;
  updated_at: string;
  owner?: {
    login: string;
  };
}

interface RepositoryResponse {
  repositories?: GitHubRepository[];
  repository?: GitHubRepository;
  error?: string;
  message?: string;
}

export default function ImpactAnalysisPage() {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepository, setSelectedRepository] =
    useState<GitHubRepository | null>(null);

  const [username, setUsername] = useState("");
  const [search, setSearch] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRepositories() {
      setLoading(true);
      setError("");

      try {
        const supabase = createSupabaseBrowserClient();

        if (!supabase) {
          throw new Error("Unable to connect to your account.");
        }

        const { data, error: identityError } =
          await supabase.auth.getUserIdentities();

        if (identityError) {
          throw new Error("Unable to retrieve your GitHub account.");
        }

        const githubIdentity = data.identities?.find(
          (identity) => identity.provider === "github",
        );

        if (!githubIdentity) {
          throw new Error(
            "Connect your GitHub account to view your repositories.",
          );
        }

        const identityData = githubIdentity.identity_data as
          | Record<string, unknown>
          | undefined;

        const githubUsername =
          (identityData?.user_name as string | undefined) ||
          (identityData?.login as string | undefined) ||
          (identityData?.preferred_username as string | undefined);

        if (!githubUsername) {
          throw new Error("Unable to identify your GitHub username.");
        }

        if (!active) return;

        setUsername(githubUsername);

        const response = await fetch(
          `/api/github/impact-repositories?username=${encodeURIComponent(
            githubUsername,
          )}`,
        );

        const result = (await response.json()) as RepositoryResponse;

        if (!response.ok) {
          throw new Error(
            result.error ||
              result.message ||
              "Unable to retrieve your repositories.",
          );
        }

        if (!active) return;

        setRepositories(
          (result.repositories || []).filter(
            (repository) => !repository.private,
          ),
        );
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRepositories();

    return () => {
      active = false;
    };
  }, []);

  const filteredRepositories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return repositories
      .filter((repository) => {
        if (!normalizedSearch) return true;

        return (
          repository.name.toLowerCase().includes(normalizedSearch) ||
          repository.full_name.toLowerCase().includes(normalizedSearch) ||
          repository.description?.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => {
        const dateA = Date.parse(a.updated_at || "");
        const dateB = Date.parse(b.updated_at || "");

        const validA = Number.isFinite(dateA);
        const validB = Number.isFinite(dateB);

        if (!validA && !validB) return 0;
        if (!validA) return 1;
        if (!validB) return -1;

        return dateB - dateA;
      });
  }, [repositories, search]);

  async function handleExternalRepository() {
    if (!repositoryUrl.trim()) {
      setError("Enter a GitHub repository URL.");
      return;
    }

    setValidatingUrl(true);
    setError("");

    try {
      const response = await fetch("/api/github/impact-repositories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryUrl: repositoryUrl.trim(),
        }),
      });

      const result = (await response.json()) as RepositoryResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "Unable to access this repository.",
        );
      }

      const repository = result.repository;

      if (!repository) {
        throw new Error("The repository information could not be retrieved.");
      }

      if (repository.private) {
        throw new Error("Only public repositories are supported.");
      }

      setSelectedRepository(repository);
      setRepositoryUrl("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred.",
      );
    } finally {
      setValidatingUrl(false);
    }
  }

  function handleSelectRepository(repository: GitHubRepository) {
    setError("");
    setSelectedRepository(repository);
  }

  function handleBack() {
    setSelectedRepository(null);
    setError("");
  }

  if (selectedRepository) {
    const owner =
      selectedRepository.owner?.login ||
      selectedRepository.full_name.split("/")[0];

    return (
      <main className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={handleBack}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#92919f] transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to repositories
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#493b70] bg-[#211a35]">
                  <Activity size={18} className="text-[#b7a1ff]" />
                </div>

                <span className="text-sm font-medium text-[#b7a1ff]">
                  Impact Analysis
                </span>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {selectedRepository.name}
              </h1>

              <p className="mt-2 text-sm text-[#92919f]">
                {selectedRepository.full_name}
              </p>
            </div>

            <a
              href={selectedRepository.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#302d3b] bg-[#111117] px-4 py-2.5 text-sm text-[#c5c3cf] transition-colors hover:border-[#9b7bff]/50 hover:text-white"
            >
              <Globe size={15} />
              View repository
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-[#252530] bg-[#111117] p-4 sm:p-6">
          <ImpactAnalysis
            owner={owner}
            repo={selectedRepository.name}
            branch={selectedRepository.default_branch}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-full w-full max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
      <header className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#493b70] bg-[#211a35]">
            <Activity size={21} className="text-[#b7a1ff]" />
          </div>

          <span className="text-sm font-medium text-[#b7a1ff]">
            CODE ATLAS
          </span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Impact Analysis
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#92919f] sm:text-base">
          Understand how changes in your codebase affect other files,
          dependencies and components. Select a public repository to start
          analyzing its impact.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-[#252530] bg-[#111117] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#211a35]">
            <Globe size={17} className="text-[#b7a1ff]" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-white">
              Analyze any public repository
            </h2>

            <p className="mt-1 text-xs text-[#777483]">
              Paste a public GitHub repository URL.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Globe
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777483]"
            />

            <input
              type="url"
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleExternalRepository();
                }
              }}
              placeholder="https://github.com/owner/repository"
              className="h-12 w-full rounded-lg border border-[#302d3b] bg-[#0b0b10] pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-[#666473] focus:border-[#9b7bff] focus:ring-2 focus:ring-[#9b7bff]/10"
            />
          </div>

          <button
            type="button"
            onClick={handleExternalRepository}
            disabled={validatingUrl || !repositoryUrl.trim()}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-5 text-sm font-semibold text-white transition hover:bg-[#8966f0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {validatingUrl ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}
            Analyze repository
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <section>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <GitBranch size={17} className="text-[#b7a1ff]" />

              <span className="text-xs font-medium uppercase tracking-wider text-[#92919f]">
                GitHub repositories
              </span>
            </div>

            <h2 className="text-xl font-semibold text-white">
              Your Public Repositories
            </h2>

            <p className="mt-1 text-sm text-[#777483]">
              {username
                ? `Repositories from @${username}`
                : "Select one of your connected repositories."}
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777483]"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search repositories..."
              className="h-10 w-full rounded-lg border border-[#302d3b] bg-[#111117] pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-[#666473] focus:border-[#9b7bff]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center rounded-xl border border-[#252530] bg-[#111117]">
            <div className="flex items-center gap-3 text-sm text-[#92919f]">
              <LoaderCircle
                size={19}
                className="animate-spin text-[#b7a1ff]"
              />
              Loading your repositories...
            </div>
          </div>
        ) : filteredRepositories.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-[#252530] bg-[#111117] px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#211a35]">
              <GitBranch size={21} className="text-[#b7a1ff]" />
            </div>

            <h3 className="text-base font-medium text-white">
              {search
                ? "No repositories found"
                : "No public repositories available"}
            </h3>

            <p className="mt-2 max-w-md text-sm text-[#777483]">
              {search
                ? "Try another search term."
                : "You can still analyze any public repository by pasting its GitHub URL above."}
            </p>
          </div>
        ) : (
          <>
            <div
              dir="ltr"
              className="flex flex-row snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden pb-4 [scrollbar-color:#9b7bff_#252530] [scrollbar-width:thin]"
            >
              {filteredRepositories.map((repository) => (
                <article
                  key={repository.id}
                  className="flex w-[280px] shrink-0 snap-start flex-col rounded-xl border border-[#302d3b] bg-[#191720] p-5 transition-colors hover:border-[#594b78]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                      Public
                    </span>

                    <a
                      href={repository.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${repository.full_name} on GitHub`}
                      className="text-[#777483] transition-colors hover:text-[#b7a1ff]"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>

                  <div className="flex min-w-0 items-center gap-2.5">
                    <BookOpen
                      size={17}
                      className="shrink-0 text-[#b7a1ff]"
                    />

                    <h3 className="truncate text-sm font-semibold text-white">
                      {repository.name}
                    </h3>
                  </div>

                  <p className="mt-2 truncate text-[11px] text-[#777483]">
                    Created with CodeSandbox
                  </p>

                  <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[#92919f]">
                    {repository.description || "No description provided."}
                  </p>

                  <div className="mt-4 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[#92919f]">
                    <span className="inline-flex items-center gap-1">
                      <Star size={12} />
                      {repository.stargazers_count}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <GitBranch size={12} />
                      {repository.default_branch}
                    </span>

                    {repository.language && (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-[#9b7bff]" />
                        {repository.language}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectRepository(repository)}
                    className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-4 text-xs font-semibold text-white transition hover:bg-[#8966f0] focus:outline-none focus:ring-2 focus:ring-[#b7a1ff] focus:ring-offset-2 focus:ring-offset-[#191720]"
                  >
                    Analyze impact
                    <ArrowRight size={14} />
                  </button>
                </article>
              ))}
            </div>

            <div className="mt-1 flex items-center justify-between text-xs text-[#777483]">
              <span>
                {filteredRepositories.length}{" "}
                {filteredRepositories.length === 1
                  ? "repository"
                  : "repositories"}
              </span>

              <span className="flex items-center gap-2">
                Scroll to explore
                <ArrowRight size={13} />
              </span>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
