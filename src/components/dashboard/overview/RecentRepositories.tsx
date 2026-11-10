
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  GitBranch,
  ArrowUpRight,
  Clock3,
  Star,
  LoaderCircle,
} from "lucide-react";

type RecentRepository = {
  id: string;
  repository_key: string;
  repository_full_name: string;
  owner: string;
  name: string;
  repository_url: string;
  description: string | null;
  avatar_url: string | null;
  language: string | null;
  stars: number;
  forks: number;
  default_branch: string;
  last_analyzed_at: string;
};

export default function RecentRepositories() {
  const [repositories, setRepositories] = useState<RecentRepository[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRecentRepositories() {
      try {
        const response = await fetch("/api/recent-repositories");
        const result = await response.json();

        if (!response.ok) {
          throw new Error("Unable to retrieve recent repositories.");
        }

        if (isMounted) {
          setRepositories(result.repositories ?? []);
        }
      } catch (error) {
        console.error("[Recent Repositories] Fetch failed:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecentRepositories();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="rounded-xl border border-[#252530] bg-[#111117] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">
            Recent repositories
          </h2>
          <p className="mt-1 text-xs text-[#777483]">
            Your recently analyzed projects
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/15 bg-[#9b7bff]/10">
          <FolderGit2 size={17} className="text-[#b7a1ff]" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015]">
          <div className="flex items-center gap-3 text-xs text-[#92919f]">
            <LoaderCircle
              size={18}
              className="animate-spin text-[#b7a1ff]"
            />
            Loading recent repositories...
          </div>
        </div>
      ) : repositories.length === 0 ? (
        <div className="mt-8 flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015] px-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#9b7bff]/15 bg-[#9b7bff]/10">
            <GitBranch size={21} className="text-[#b7a1ff]" />
          </div>

          <p className="mt-4 text-sm font-medium text-white">
            No repositories yet
          </p>

          <p className="mt-2 max-w-xs text-xs leading-5 text-[#777483]">
            Analyze a GitHub repository to start building your project history.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {repositories.slice(0, 3).map((repository) => (
            <Link
              key={repository.id}
              href={`/repositories/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`}
              className="flex items-center gap-3 rounded-lg border border-[#252530] bg-white/[0.015] p-3 transition hover:border-[#9b7bff]/40 hover:bg-white/[0.03]"
            >
              {repository.avatar_url ? (
                <img
                  src={repository.avatar_url}
                  alt={`${repository.owner} avatar`}
                  className="h-10 w-10 shrink-0 rounded-lg border border-[#302d3b]"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#302d3b] bg-[#191720]">
                  <FolderGit2 size={17} className="text-[#b7a1ff]" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {repository.name}
                </p>
                <p className="mt-1 truncate text-[11px] text-[#777483]">
                  {repository.owner}
                  {repository.language
                    ? ` · ${repository.language}`
                    : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1 text-[11px] text-[#92919f]">
                <Star size={12} />
                {repository.stars.toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-[#252530] pt-4">
        <div className="flex items-center gap-2 text-[11px] text-[#777483]">
          <Clock3 size={13} />
          <span>Updated automatically</span>
        </div>

        <Link
          href="/recent-projects"
          className="flex items-center gap-1 text-[11px] font-medium text-[#a98cff] transition hover:text-white"
        >
          View all
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </section>
  );
}
