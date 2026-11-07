
"use client";

import type { ComponentProps } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Network,
  FolderTree,
  Code2,
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

import ArchitectureGraph from "./ArchitectureGraph";
import CodeExplorer from "./CodeExplorer";
import LanguagesAnalysis from "./LanguagesAnalysis";
import DependenciesAnalysis from "./DependenciesAnalysis";
import type { DependenciesAnalysisData } from "./dependencies-analysis-types";
import RepositoryOverview from "@/components/RepositoryOverview";
import CodeHealthAnalysis from "@/components/CodeHealthAnalysis";
import type { RepositoryAnalysis } from "@/lib/github/repository-types";

import {
  useRepositoryAnalysisData,
  type RepositorySourceFile,
  type RepositoryFileAnalysis,
  type RepositoryLanguage,
  type RepositoryLanguageAnalysis,
} from "./useRepositoryAnalysisData";
import { useRepositoryCodeHealth } from "./useRepositoryCodeHealth";

type CodeHealthData = ComponentProps<
  typeof CodeHealthAnalysis
>["data"];

type Section = {
  name: string;
  id: string;
  icon: typeof LayoutDashboard;
  status: string;
};

type RepositoryAnalysisSectionProps = {
  section: Section;
  owner: string;
  repo: string;
  defaultBranch: string;
  files: RepositorySourceFile[];
  languages: RepositoryLanguage[];
  languageAnalysis: RepositoryLanguageAnalysis | null;
  dependenciesAnalysis: DependenciesAnalysisData | null;
  codeHealthData: CodeHealthData | null;
  isCodeHealthLoading: boolean;
  codeHealthError: string;
};

const sections: Section[] = [
  {
    name: "Overview",
    id: "overview",
    icon: LayoutDashboard,
    status: "Available",
  },
  {
    name: "Architecture",
    id: "architecture",
    icon: Network,
    status: "Available",
  },
  {
    name: "Code Explorer",
    id: "code-explorer",
    icon: FolderTree,
    status: "Available",
  },
  {
    name: "Languages",
    id: "languages",
    icon: Code2,
    status: "Available",
  },
  {
    name: "Dependencies",
    id: "dependencies",
    icon: Package,
    status: "Available",
  },
  {
    name: "Code Health",
    id: "code-health",
    icon: HeartPulse,
    status: "Available",
  },
  {
    name: "Security",
    id: "security",
    icon: ShieldCheck,
    status: "Coming soon",
  },
  {
    name: "Impact Analysis",
    id: "impact-analysis",
    icon: GitPullRequest,
    status: "Coming soon",
  },
  {
    name: "AI Investigator",
    id: "ai-investigator",
    icon: Bot,
    status: "Coming soon",
  },
];

function isAvailableSection(sectionId: string): boolean {
  return [
    "overview",
    "architecture",
    "code-explorer",
    "languages",
    "dependencies",
    "code-health",
  ].includes(sectionId);
}

function RepositoryBackLink() {
  return (
    <Link
      href="/repositories"
      className="mb-8 inline-flex items-center gap-2 text-xs text-[#92919f] transition hover:text-white"
    >
      <ArrowLeft size={14} />
      Back to repositories
    </Link>
  );
}

function RepositoryLoadingState() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[1440px] items-center justify-center px-6">
      <div className="flex items-center gap-3 text-sm text-[#92919f]">
        <LoaderCircle
          size={20}
          className="animate-spin text-[#b7a1ff]"
        />
        Loading repository analysis...
      </div>
    </div>
  );
}

function RepositoryErrorState({ error }: { error: string }) {
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
      <RepositoryBackLink />

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

function RepositoryHeader({
  repository,
}: {
  repository: RepositoryAnalysis;
}) {
  return (
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
          {repository.description ||
            "No description provided for this repository."}
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
  );
}

function RepositoryNavigation() {
  return (
    <nav className="mb-8 border-b border-[#252530]">
      <div className="-mb-px flex min-w-max gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const Icon = section.icon;
          const available = isAvailableSection(section.id);

          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              title={section.status}
              aria-current={available ? "page" : undefined}
              className={`relative flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors ${
                available
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
  );
}

function CodeHealthPanel({
  data,
  isLoading,
  error,
}: {
  data: CodeHealthData | null;
  isLoading: boolean;
  error: string;
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-[#252530] bg-[#111117]">
        <div className="flex items-center gap-3 text-sm text-[#92919f]">
          <LoaderCircle
            size={20}
            className="animate-spin text-[#b7a1ff]"
          />
          Analyzing repository code health...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-red-500/20 bg-[#111117] px-6 text-center">
        <AlertCircle size={26} className="text-red-400" />

        <h2 className="mt-4 text-sm font-semibold text-white">
          Unable to analyze code health
        </h2>

        <p className="mt-2 max-w-md text-xs leading-5 text-[#92919f]">
          {error}
        </p>
      </div>
    );
  }

  if (data) {
    return <CodeHealthAnalysis data={data} />;
  }

  return null;
}

function ComingSoonSection({ section }: { section: Section }) {
  const Icon = section.icon;

  return (
    <section
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
}

function RepositoryAnalysisSection({
  section,
  owner,
  repo,
  defaultBranch,
  files,
  languages,
  languageAnalysis,
  dependenciesAnalysis,
  codeHealthData,
  isCodeHealthLoading,
  codeHealthError,
}: RepositoryAnalysisSectionProps) {
  const sectionClassName = "mt-8 scroll-mt-6";

  if (section.id === "architecture") {
    return (
      <section
        key={section.id}
        id={section.id}
        className={sectionClassName}
      >
        <ArchitectureGraph owner={owner} repo={repo} />
      </section>
    );
  }

  if (section.id === "code-explorer") {
    return (
      <section
        key={section.id}
        id={section.id}
        className={sectionClassName}
      >
        <CodeExplorer
          owner={owner}
          repo={repo}
          defaultBranch={defaultBranch}
          files={files}
        />
      </section>
    );
  }

  if (section.id === "languages") {
    return (
      <section
        key={section.id}
        id={section.id}
        className={sectionClassName}
      >
        <LanguagesAnalysis
          languages={languages}
          analysis={languageAnalysis}
        />
      </section>
    );
  }

  if (section.id === "dependencies") {
    return (
      <section
        key={section.id}
        id={section.id}
        className={sectionClassName}
      >
        <DependenciesAnalysis analysis={dependenciesAnalysis} />
      </section>
    );
  }

  if (section.id === "code-health") {
    return (
      <section
        key={section.id}
        id={section.id}
        className={sectionClassName}
      >
        <CodeHealthPanel
          data={codeHealthData}
          isLoading={isCodeHealthLoading}
          error={codeHealthError}
        />
      </section>
    );
  }

  return <ComingSoonSection key={section.id} section={section} />;
}

export default function RepositoryAnalysisContent() {
  const params = useParams<{ owner: string; repo: string }>();
  const owner = params.owner;
  const repo = params.repo;

  const {
    repository,
    files,
    analysis,
    languages,
    languageAnalysis,
    dependenciesAnalysis,
    isLoading,
    error,
  } = useRepositoryAnalysisData(owner, repo);

  const {
    data: codeHealthData,
    isLoading: isCodeHealthLoading,
    error: codeHealthError,
  } = useRepositoryCodeHealth(
    owner,
    repo,
    repository?.defaultBranch ?? null
  );

  if (isLoading) {
    return <RepositoryLoadingState />;
  }

  if (error || !repository) {
    return <RepositoryErrorState error={error} />;
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
      <RepositoryBackLink />

      <RepositoryHeader repository={repository} />

      <RepositoryNavigation />

      <RepositoryOverview
        stars={repository.stars}
        forks={repository.forks}
        language={repository.language}
        defaultBranch={repository.defaultBranch}
        totalSourceFiles={
          analysis?.totalSourceFiles ?? files.length
        }
        maxFiles={analysis?.maxFiles ?? files.length}
        truncated={analysis?.truncated ?? false}
        files={files}
      />

      {sections.slice(1).map((section) => (
        <RepositoryAnalysisSection
          key={section.id}
          section={section}
          owner={owner}
          repo={repo}
          defaultBranch={repository.defaultBranch}
          files={files}
          languages={languages}
          languageAnalysis={languageAnalysis}
          dependenciesAnalysis={dependenciesAnalysis}
          codeHealthData={codeHealthData}
          isCodeHealthLoading={isCodeHealthLoading}
          codeHealthError={codeHealthError}
        />
      ))}
    </div>
  );
}
