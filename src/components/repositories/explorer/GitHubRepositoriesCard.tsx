
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Code2,
  ExternalLink,
  GitBranch,
  LoaderCircle,
  RefreshCw,
  Search,
  Star,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Repository = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  defaultBranch: string;
  updatedAt: string;
};

type GitHubIdentityData = {
  user_name?: string;
  login?: string;
  preferred_username?: string;
};

async function fetchGitHubRepositories(): Promise<{
  username: string;
  repositories: Repository[];
}> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.auth.getUserIdentities();

  if (error) {
    throw error;
  }

  const githubIdentity = data.identities.find(
    (identity) => identity.provider === "github"
  );

  if (!githubIdentity) {
    return {
      username: "",
      repositories: [],
    };
  }

  const identityData = (githubIdentity.identity_data ??
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

export default function GitHubRepositoriesCard() {
  const router = useRouter();

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeRepositories() {
      try {
        const result = await fetchGitHubRepositories();

        if (isMounted) {
          setUsername(result.username);
          setRepositories(result.repositories);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load GitHub repositories."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeRepositories();

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadRepositories() {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }

  async function handleAnalyze(repository: Repository) {
    setAnalyzingId(repository.id);
    setError("");

    try {
      const response = await fetch("/api/github/repository", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryUrl: repository.url,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to retrieve repository information."
        );
      }

      const [owner, repo] = repository.fullName.split("/");

      if (!owner || !repo) {
        throw new Error("Invalid repository information.");
      }

      router.push(
        `/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Unable to start repository analysis."
      );
    } finally {
      setAnalyzingId(null);
    }
  }

  const filteredRepositories = repositories.filter((repository) => {
    const searchValue = search.toLowerCase();

    return (
      repository.name.toLowerCase().includes(searchValue) ||
      repository.description?.toLowerCase().includes(searchValue) ||
      repository.language?.toLowerCase().includes(searchValue)
    );
  });

  return (
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
          {!isLoading && repositories.length > 0 && (
            <span className="rounded-full border border-[#302d3b] bg-[#191720] px-3 py-1 text-[11px] text-[#aaa7b7]">
              {repositories.length} repositories
            </span>
          )}

          <button
            type="button"
            onClick={loadRepositories}
            disabled={isLoading}
            aria-label="Refresh repositories"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#302d3b] bg-[#191720] text-[#92919f] transition hover:border-[#9b7bff]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!isLoading && repositories.length > 0 && (
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

      <div className="mt-6">
        {isLoading ? (
          <div className="flex min-h-[180px] items-center justify-center gap-3 text-xs text-[#92919f]">
            <LoaderCircle size={18} className="animate-spin text-[#b7a1ff]" />
            Loading your public repositories...
          </div>
        ) : !username ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015] px-5 text-center">
            <BookOpen size={25} className="text-[#777483]" />
            <p className="mt-3 text-sm font-medium text-[#e8e5f0]">
              GitHub account not connected
            </p>
            <p className="mt-2 max-w-md text-xs leading-5 text-[#777483]">
              Connect your GitHub account above to see your public repositories.
            </p>
          </div>
        ) : repositories.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015] px-5 text-center">
            <BookOpen size={25} className="text-[#777483]" />
            <p className="mt-3 text-sm font-medium text-[#e8e5f0]">
              No public repositories found
            </p>
            <p className="mt-2 max-w-md text-xs leading-5 text-[#777483]">
              Your public GitHub repositories will appear here.
            </p>
          </div>
        ) : filteredRepositories.length === 0 ? (
          <div className="flex min-h-[150px] items-center justify-center text-xs text-[#777483]">
            No repositories match your search.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(155,123,255,0.35)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9b7bff]/35 [&::-webkit-scrollbar-thumb:hover]:bg-[#9b7bff]/80">
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
                    onClick={() => handleAnalyze(repository)}
                    disabled={analyzingId !== null}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-4 text-xs font-semibold text-white transition hover:bg-[#8966f0] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analyzingId === repository.id ? (
                      <>
                        <LoaderCircle size={14} className="animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        Analyze
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {!isLoading && repositories.length > 0 && (
        <p className="mt-2 text-[10px] text-[#656270]">
          Only public repositories are displayed. Scroll horizontally to
          explore more projects.
        </p>
      )}
    </section>
  );
}
