
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Code2,
  ExternalLink,
  GitBranch,
  GitFork,
  Loader2,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import SecurityAnalysis from "@/app/(dashboard)/repositories/[owner]/[repo]/SecurityAnalysis";

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stars: number;
  forks: number;
  default_branch: string;
  private: boolean;
  updated_at: string;
  owner?: {
    login?: string;
  };
};

type RepositoryResponse = {
  repositories?: GitHubRepository[];
  repository?: GitHubRepository;
  error?: string;
  message?: string;
};

function getErrorMessage(
  data: RepositoryResponse,
  fallback: string,
) {
  return data.message || data.error || fallback;
}

export default function SecurityAnalysisPage() {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepository, setSelectedRepository] =
    useState<GitHubRepository | null>(null);
  const [username, setUsername] = useState("");
  const [search, setSearch] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingRepository, setAddingRepository] = useState(false);
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");

  const loadRepositories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: identityError } =
        await supabase.auth.getUserIdentities();

      if (identityError) {
        throw new Error(
          "Unable to retrieve your GitHub connection.",
        );
      }

      const githubIdentity = data.identities?.find(
        (identity) => identity.provider === "github",
      );

      const identityData = githubIdentity?.identity_data as
        | {
            user_name?: string;
            preferred_username?: string;
            login?: string;
          }
        | undefined;

      const githubUsername =
        identityData?.user_name ||
        identityData?.preferred_username ||
        identityData?.login;

      if (!githubUsername) {
        setRepositories([]);
        setError(
          "Connect your GitHub account to list your repositories.",
        );
        return;
      }

      setUsername(githubUsername);

      const response = await fetch(
        `/api/github/impact-repositories?username=${encodeURIComponent(githubUsername)}`,
        { cache: "no-store" },
      );

      const result = (await response.json()) as RepositoryResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            "Unable to load your repositories.",
          ),
        );
      }

      setRepositories(
        (result.repositories ?? []).filter(
          (repository) => !repository.private,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading repositories.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRepositories();
  }, [loadRepositories]);

  const sortedRepositories = useMemo(
    () =>
      [...repositories].sort(
        (first, second) =>
          new Date(second.updated_at).getTime() -
          new Date(first.updated_at).getTime(),
      ),
    [repositories],
  );

  const filteredRepositories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return sortedRepositories;
    }

    return sortedRepositories.filter(
      (repository) =>
        repository.name.toLowerCase().includes(normalizedSearch) ||
        repository.full_name.toLowerCase().includes(normalizedSearch) ||
        repository.description?.toLowerCase().includes(normalizedSearch),
    );
  }, [search, sortedRepositories]);

  async function handleAddRepository() {
    const trimmedUrl = repositoryUrl.trim();

    if (!trimmedUrl) {
      setUrlError("Enter a public GitHub repository URL.");
      return;
    }

    setAddingRepository(true);
    setUrlError("");

    try {
      const response = await fetch(
        "/api/github/impact-repositories",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repositoryUrl: trimmedUrl,
          }),
        },
      );

      const result = (await response.json()) as RepositoryResponse;

      if (!response.ok || !result.repository) {
        throw new Error(
          getErrorMessage(
            result,
            "Unable to access this repository.",
          ),
        );
      }

      if (result.repository.private) {
        throw new Error(
          "Only public repositories can be analyzed.",
        );
      }

      const repository = result.repository;

      setRepositories((current) => {
        const alreadyExists = current.some(
          (item) =>
            item.full_name.toLowerCase() ===
            repository.full_name.toLowerCase(),
        );

        if (alreadyExists) {
          return current;
        }

        return [repository, ...current].sort(
          (first, second) =>
            new Date(second.updated_at).getTime() -
            new Date(first.updated_at).getTime(),
        );
      });

      setSelectedRepository(repository);
      setRepositoryUrl("");
      setSearch("");
    } catch (err) {
      setUrlError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred.",
      );
    } finally {
      setAddingRepository(false);
    }
  }

  function selectRepository(repository: GitHubRepository) {
    setSelectedRepository(repository);
    setError("");
  }

  if (selectedRepository) {
    const owner =
      selectedRepository.owner?.login ||
      selectedRepository.full_name.split("/")[0];

    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-6 py-8 lg:px-10 xl:px-12">
        <div className="flex flex-col gap-4 border-b border-[#292936] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setSelectedRepository(null)}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#343442] bg-[#191922] text-gray-300 transition hover:border-[#8b70e8] hover:text-white"
              aria-label="Back to repositories"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <ShieldCheck
                  size={17}
                  className="text-[#a78bfa]"
                />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a78bfa]">
                  Security Analysis
                </span>
              </div>

              <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">
                {selectedRepository.name}
              </h1>

              <p className="mt-1 truncate text-sm text-gray-400">
                {selectedRepository.full_name}
              </p>
            </div>
          </div>

          <a
            href={selectedRepository.html_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#343442] px-3 py-2 text-sm text-gray-300 transition hover:border-[#8b70e8] hover:text-white"
          >
            View repository
            <ExternalLink size={14} />
          </a>
        </div>

        <SecurityAnalysis
          owner={owner}
          repo={selectedRepository.name}
          branch={selectedRepository.default_branch}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 px-6 py-8 lg:px-10 xl:px-12">
      <section className="relative overflow-hidden rounded-2xl border border-[#343044] bg-gradient-to-br from-[#211b35] via-[#191922] to-[#171720] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#8b5cf6]/10 blur-3xl" />

        <div className="relative max-w-3xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7256b5]/40 bg-[#7256b5]/15 text-[#b69aff]">
            <ShieldCheck size={25} />
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b69aff]">
            Code Intelligence
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Security Analysis
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base">
            Inspect public GitHub repositories for security
            vulnerabilities, exposed secrets, risky configurations,
            authentication issues and vulnerable dependencies.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Analyze a public repository
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Paste a GitHub repository URL to analyze a project
            outside your connected account.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <GitBranch
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
            />

            <input
              type="url"
              value={repositoryUrl}
              onChange={(event) => {
                setRepositoryUrl(event.target.value);
                setUrlError("");
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !addingRepository
                ) {
                  void handleAddRepository();
                }
              }}
              placeholder="https://github.com/owner/repository"
              className="h-12 w-full rounded-xl border border-[#343442] bg-[#191922] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#9879ed] focus:ring-2 focus:ring-[#9879ed]/15"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleAddRepository()}
            disabled={addingRepository}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8b70e8] px-6 text-sm font-semibold text-white transition hover:bg-[#9b82f0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addingRepository ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <ShieldCheck size={17} />
            )}
            Analyze repository
          </button>
        </div>

        {urlError && (
          <p className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={15} />
            {urlError}
          </p>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Your public repositories
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Select a repository to run its security analysis.
            </p>

            {username && (
              <p className="mt-2 text-xs text-[#a78bfa]">
                Connected GitHub account: @{username}
              </p>
            )}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search repositories..."
              className="h-10 w-full rounded-lg border border-[#343442] bg-[#191922] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#9879ed]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 rounded-xl border border-[#292936] bg-[#191922]/60 text-sm text-gray-400">
            <Loader2
              size={19}
              className="animate-spin text-[#a78bfa]"
            />
            Loading public repositories...
          </div>
        ) : error ? (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 px-6 text-center">
            <AlertCircle
              size={22}
              className="mb-3 text-red-400"
            />

            <p className="text-sm text-gray-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadRepositories()}
              className="mt-4 rounded-lg border border-[#454052] px-4 py-2 text-sm text-gray-200 transition hover:border-[#9879ed]"
            >
              Try again
            </button>
          </div>
        ) : filteredRepositories.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-[#292936] bg-[#191922]/60 px-6 text-center">
            <Code2
              size={24}
              className="mb-3 text-gray-500"
            />

            <p className="text-sm font-medium text-gray-300">
              {search
                ? "No repositories match your search."
                : "No public repositories found."}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {search
                ? "Try another repository name."
                : "You can still analyze any public repository using its GitHub URL above."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {filteredRepositories.length}{" "}
                {filteredRepositories.length === 1
                  ? "repository"
                  : "repositories"}
              </span>

              <span>Recently updated first</span>
            </div>

            <div
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5"
              dir="ltr"
              style={{
                scrollbarColor: "#8b70e8 #252530",
                scrollbarWidth: "thin",
              }}
            >
              {filteredRepositories.map((repository) => (
                <article
                  key={repository.id}
                  className="flex w-[calc(100%-1rem)] min-w-[calc(100%-1rem)] snap-start flex-col rounded-xl border border-[#343442] bg-[#191922] p-5 transition duration-200 hover:border-[#7256b5]/70 sm:w-[calc((100%-2.5rem)/2)] sm:min-w-[calc((100%-2.5rem)/2)] xl:w-[calc((100%-2.5rem)/3)] xl:min-w-[calc((100%-2.5rem)/3)]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#454052] bg-[#252330] text-[#b69aff]">
                        <Code2 size={19} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-white">
                          {repository.name}
                        </h3>

                        <p className="truncate text-xs text-gray-500">
                          {repository.full_name}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                      Public
                    </span>
                  </div>

                  <p className="mb-5 line-clamp-2 min-h-10 text-xs leading-5 text-gray-400">
                    {repository.description ||
                      "No description provided."}
                  </p>

                  <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                    {repository.language && (
                      <span className="flex items-center gap-1.5">
                        <Code2 size={13} />
                        {repository.language}
                      </span>
                    )}

                    <span className="flex items-center gap-1.5">
                      <Star size={13} />
                      {repository.stars}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <GitFork size={13} />
                      {repository.forks}
                    </span>
                  </div>

                  <div className="mb-5 flex items-center justify-between border-t border-[#2d2d39] pt-3 text-[11px] text-gray-500">
                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                      <GitBranch size={12} />
                      <span className="truncate">
                        {repository.default_branch}
                      </span>
                    </span>

                    <span className="shrink-0">
                      Updated{" "}
                      {new Date(
                        repository.updated_at,
                      ).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      selectRepository(repository)
                    }
                    className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#7659c9] px-4 text-sm font-semibold text-white transition hover:bg-[#896de0]"
                  >
                    <ShieldCheck size={16} />
                    Analyze security
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
