
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Star,
  GitFork,
  Code2,
  FolderTree,
  Network,
  Package,
  HeartPulse,
  ShieldCheck,
  GitPullRequest,
  Bot,
  LayoutDashboard,
  LoaderCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

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

const sections = [
  { name: "Overview", id: "overview", icon: LayoutDashboard, status: "Available" },
  { name: "Architecture", id: "architecture", icon: Network, status: "Coming soon" },
  { name: "Code Explorer", id: "code-explorer", icon: FolderTree, status: "Coming soon" },
  { name: "Languages", id: "languages", icon: Code2, status: "Coming soon" },
  { name: "Dependencies", id: "dependencies", icon: Package, status: "Coming soon" },
  { name: "Code Health", id: "code-health", icon: HeartPulse, status: "Coming soon" },
  { name: "Security", id: "security", icon: ShieldCheck, status: "Coming soon" },
  { name: "Impact Analysis", id: "impact-analysis", icon: GitPullRequest, status: "Coming soon" },
  { name: "AI Investigator", id: "ai-investigator", icon: Bot, status: "Coming soon" },
];

export default function RepositoryAnalysisContent() {
  const params = useParams<{ owner: string; repo: string }>();

  const owner = params.owner;
  const repo = params.repo;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRepository() {
      setIsLoading(true);
      setError("");

      try {
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

        if (isMounted) {
          setRepository(result.repository);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load repository information."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRepository();

    return () => {
      isMounted = false;
    };
  }, [owner, repo]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1440px] items-center justify-center px-6">
        <div className="flex items-center gap-3 text-sm text-[#92919f]">
          <LoaderCircle size={20} className="animate-spin text-[#b7a1ff]" />
          Loading repository analysis...
        </div>
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
        <Link
          href="/repositories"
          className="mb-8 inline-flex items-center gap-2 text-xs text-[#92919f] transition hover:text-white"
        >
          <ArrowLeft size={14} />
          Back to repositories
        </Link>

        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-red-500/20 bg-[#111117] px-6 text-center">
          <AlertCircle size={28} className="text-red-400" />
          <h1 className="mt-4 text-base font-semibold text-white">
            Unable to load repository
          </h1>
          <p className="mt-2 max-w-md text-xs leading-5 text-[#92919f]">
            {error || "Repository information could not be found."}
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Stars",
      value: repository.stars.toLocaleString("en-US"),
      icon: Star,
    },
    {
      label: "Forks",
      value: repository.forks.toLocaleString("en-US"),
      icon: GitFork,
    },
    {
      label: "Primary language",
      value: repository.language || "Not specified",
      icon: Code2,
    },
    {
      label: "Default branch",
      value: repository.defaultBranch,
      icon: GitBranch,
    },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
      <Link
        href="/repositories"
        className="mb-8 inline-flex items-center gap-2 text-xs text-[#92919f] transition hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to repositories
      </Link>

      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#a98cff]">
            <Sparkles size={14} />
            Repository Analysis
          </div>

          <div className="flex items-center gap-4">
            <img
              src={repository.owner.avatarUrl}
              alt={`${repository.owner.username} avatar`}
              className="h-12 w-12 rounded-xl border border-[#302d3b]"
            />

            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {repository.name}
              </h1>
              <p className="mt-1 text-xs text-[#92919f]">
                {repository.fullName}
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#92919f]">
            {repository.description || "No description provided for this repository."}
          </p>
        </div>

        <a
          href={repository.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#302d3b] bg-[#191720] px-4 text-xs font-medium text-[#e8e5f0] transition hover:border-[#9b7bff]/50 hover:text-white"
        >
          View on GitHub
          <ExternalLink size={13} />
        </a>
      </div>

      <nav className="mb-8 border-b border-[#252530]">
        <div className="-mb-px flex min-w-max gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((section) => {
            const Icon = section.icon;
            const isAvailable = section.id === "overview";

            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                title={section.status}
                aria-current={isAvailable ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors ${
                  isAvailable
                    ? "border-[#a98cff] text-[#c6b5ff]"
                    : "border-transparent text-[#777483] hover:border-[#51466f] hover:text-[#c7c3d1]"
                }`}
              >
                <Icon size={14} />
                {section.name}
              </a>
            );
          })}
        </div>
      </nav>

      <section id="overview" className="scroll-mt-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            Repository Overview
          </h2>
          <p className="mt-1 text-xs text-[#777483]">
            General information retrieved directly from GitHub.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                key={stat.label}
                className="rounded-xl border border-[#252530] bg-[#111117] p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#92919f]">{stat.label}</p>
                  <Icon size={16} className="text-[#a98cff]" />
                </div>

                <p className="mt-4 truncate text-xl font-semibold text-white">
                  {stat.value}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-[#252530] bg-[#111117] p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
              <Sparkles size={18} className="text-[#b7a1ff]" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">
                Repository analysis workspace
              </h3>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-[#92919f]">
                Your repository has been connected to CODE ATLAS. The next
                analysis stages will explore its file structure, architecture,
                dependencies and code quality.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015] px-5 py-8 text-center">
            <FolderTree size={25} className="mx-auto text-[#777483]" />
            <p className="mt-3 text-sm font-medium text-[#e8e5f0]">
              Repository structure analysis
            </p>
            <p className="mt-2 text-xs leading-5 text-[#777483]">
              The file tree and codebase insights will be displayed here when
              the analysis engine is implemented.
            </p>
          </div>
        </div>
      </section>

      {sections.slice(1).map((section) => {
        const Icon = section.icon;

        return (
          <section
            key={section.id}
            id={section.id}
            className="mt-8 scroll-mt-6 rounded-xl border border-[#252530] bg-[#111117] p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#302d3b] bg-[#191720]">
                <Icon size={17} className="text-[#a98cff]" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">
                    {section.name}
                  </h2>
                  <span className="rounded-full border border-[#302d3b] bg-[#191720] px-2 py-1 text-[10px] text-[#92919f]">
                    Coming soon
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-[#777483]">
                  This analysis module has not been implemented yet. Its
                  insights will appear here as CODE ATLAS evolves.
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
