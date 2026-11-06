"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  Link2,
  LoaderCircle,
  Star,
  GitFork,
  Code2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import {
  fetchRepository,
  getRepositoryAnalysisPath,
} from "@/lib/github/repository-client";

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
  isPrivate: boolean;
  owner: {
    username: string;
    avatarUrl: string;
  };
};

export default function PublicRepositoryInput() {
  const router = useRouter();

  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [error, setError] = useState("");
  const [repository, setRepository] = useState<Repository | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUrl = repositoryUrl.trim().replace(/\/+$/, "");
    const repositoryPattern =
      /^https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/;

    if (!repositoryPattern.test(normalizedUrl)) {
      setError("Enter a valid GitHub repository URL.");
      setRepository(null);
      return;
    }

    setError("");
    setRepository(null);
    setIsAnalyzing(true);

    try {
      const result = await fetchRepository<Repository>(normalizedUrl);
      setRepository(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleOpenAnalysis() {
    if (!repository) return;

    try {
      router.push(getRepositoryAnalysisPath(repository.fullName));
    } catch (navigationError) {
      setError(
        navigationError instanceof Error
          ? navigationError.message
          : "Invalid repository information."
      );
    }
  }

  return (
    <section className="rounded-xl border border-[#252530] bg-[#111117] p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
          <Link2 size={19} className="text-[#b7a1ff]" />
        </div>

        <div>
          <h2 className="text-base font-semibold text-white">
            Analyze a public repository
          </h2>
          <p className="mt-1 text-xs text-[#777483]">
            Explore any public GitHub project without connecting your account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-7">
        <label
          htmlFor="repository-url"
          className="mb-2 block text-xs font-medium text-[#c5c2d0]"
        >
          GitHub repository URL
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="repository-url"
            type="url"
            value={repositoryUrl}
            onChange={(event) => {
              setRepositoryUrl(event.target.value);
              setError("");
              setRepository(null);
            }}
            placeholder="https://github.com/owner/repository"
            className="h-11 min-w-0 flex-1 rounded-lg border border-[#302d3b] bg-[#09090d] px-4 text-sm text-white outline-none transition placeholder:text-[#555260] focus:border-[#9b7bff]/60 focus:ring-2 focus:ring-[#9b7bff]/10"
          />

          <button
            type="submit"
            disabled={!repositoryUrl.trim() || isAnalyzing}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-5 text-sm font-semibold text-white transition hover:bg-[#8966f0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Searching...
              </>
            ) : (
              <>
                Analyze repository
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </form>

      {repository && (
        <div className="mt-7 rounded-xl border border-[#383444] bg-[#191720] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src={repository.owner.avatarUrl}
                alt={`${repository.owner.username} avatar`}
                width={44}
                height={44}
                unoptimized
                className="h-11 w-11 rounded-full border border-[#383444]"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {repository.fullName}
                </p>
                <p className="mt-1 text-xs text-[#777483]">
                  Public repository
                </p>
              </div>
            </div>

            <a
              href={repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#b7a1ff] transition hover:text-white"
            >
              View on GitHub
              <ExternalLink size={13} />
            </a>
          </div>

          <p className="mt-4 text-xs leading-5 text-[#aaa7b7]">
            {repository.description || "No description provided."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-[#302d3b] bg-[#111117] p-3">
              <div className="flex items-center gap-1.5 text-[#92919f]">
                <Code2 size={13} />
                <span className="text-[10px]">Language</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-white">
                {repository.language || "Not specified"}
              </p>
            </div>

            <div className="rounded-lg border border-[#302d3b] bg-[#111117] p-3">
              <div className="flex items-center gap-1.5 text-[#92919f]">
                <Star size={13} />
                <span className="text-[10px]">Stars</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-white">
                {repository.stars.toLocaleString("en-US")}
              </p>
            </div>

            <div className="rounded-lg border border-[#302d3b] bg-[#111117] p-3">
              <div className="flex items-center gap-1.5 text-[#92919f]">
                <GitFork size={13} />
                <span className="text-[10px]">Forks</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-white">
                {repository.forks.toLocaleString("en-US")}
              </p>
            </div>

            <div className="rounded-lg border border-[#302d3b] bg-[#111117] p-3">
              <div className="flex items-center gap-1.5 text-[#92919f]">
                <Code2 size={13} />
                <span className="text-[10px]">Default branch</span>
              </div>
              <p className="mt-2 truncate text-xs font-semibold text-white">
                {repository.defaultBranch}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAnalysis}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-5 text-sm font-semibold text-white transition hover:bg-[#8966f0]"
          >
            Open repository analysis
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      <p className="mt-4 text-[11px] text-[#656270]">
        Only public repositories are supported in this access mode.
      </p>
    </section>
  );
}