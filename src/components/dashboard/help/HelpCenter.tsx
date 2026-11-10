
"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileCode2,
  GitBranch,
  HeartPulse,
  Lightbulb,
  Search,
  ShieldAlert,
  Workflow,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Guide = {
  title: string;
  description: string;
  details: string;
  keywords: string;
  icon: LucideIcon;
  color: string;
};

const guides: Guide[] = [
  {
    title: "Getting Started",
    description: "Learn the basics and start exploring your codebase.",
    details:
      "Open Repositories, connect your GitHub account or enter a public repository, and select a project to begin its analysis.",
    keywords: "start setup introduction first steps account",
    icon: GitBranch,
    color: "#b7a1ff",
  },
  {
    title: "Repositories",
    description: "Connect, browse and manage your analyzed repositories.",
    details:
      "Browse your available repositories, open a project to inspect its analysis, and revisit previously analyzed projects through Recent Projects.",
    keywords: "github connect projects repository history recent",
    icon: FileCode2,
    color: "#9b7bff",
  },
  {
    title: "Architecture Map",
    description: "Understand how files and modules connect.",
    details:
      "Explore the architecture graph to identify components, modules and relationships. Use the graph to understand how different parts of a codebase are connected.",
    keywords: "architecture graph nodes edges components modules connections",
    icon: Workflow,
    color: "#7dd3fc",
  },
  {
    title: "AI Investigator",
    description: "Investigate your codebase with AI assistance.",
    details:
      "Use the investigator to ask questions about repository structure and implementation details. Review the context of each answer against the source code.",
    keywords: "ai questions assistant investigate code search",
    icon: Bot,
    color: "#c4b5fd",
  },
  {
    title: "Impact Analysis",
    description: "Explore the potential impact of code changes.",
    details:
      "Use impact analysis to understand relationships between code elements and identify areas that may be affected by a change.",
    keywords: "impact changes dependencies affected files risk",
    icon: GitBranch,
    color: "#f0abfc",
  },
  {
    title: "Code Health",
    description: "Review maintainability and code quality indicators.",
    details:
      "Inspect available code health metrics and findings, including analysis coverage and detected maintainability concerns.",
    keywords: "health quality maintainability duplication complexity coverage",
    icon: HeartPulse,
    color: "#fda4af",
  },
];

const faqs = [
  {
    question: "How do I connect my GitHub account?",
    answer:
      "Open the Repositories page and use the GitHub connection option. Follow the authorization flow and grant the GitHub App access to the repositories you want to analyze.",
    keywords: "github connect login authentication authorization account",
  },
  {
    question: "Which GitHub account should I connect?",
    answer:
      "Connect the account that has access to the repositories you want to analyze. If you work with repositories from an organization, make sure the GitHub App is also authorized for that organization.",
    keywords: "github account organization connect access",
  },
  {
    question: "Why can't I see all my GitHub repositories?",
    answer:
      "The repository list depends on the permissions granted to the GitHub App. Review its installation settings on GitHub and confirm that the connected account or organization has access to the missing repositories.",
    keywords: "github missing repositories list permissions installation organization",
  },
  {
    question: "Can I analyze a public repository without connecting GitHub?",
    answer:
      "Yes. Public repository analysis can be started by providing the repository details through the public repository option. Connecting GitHub is useful when you want to access repositories through your account.",
    keywords: "public repository without account login analyze",
  },
  {
    question: "Can I access private repositories?",
    answer:
      "Private repositories can be accessed when the connected GitHub account and GitHub App installation have the required permissions. Check the installation settings if a private repository is unavailable.",
    keywords: "private repositories github permissions access",
  },
  {
    question: "How do I start analyzing a repository?",
    answer:
      "Open Repositories, connect your GitHub account or provide the details of a public repository, and select the project you want to inspect.",
    keywords: "start analyze repository project first steps",
  },
  {
    question: "Where can I find my analyzed repositories?",
    answer:
      "Open the Repositories page to browse the repositories available to your workspace. You can also use Recent Projects to revisit projects from your analysis history.",
    keywords: "find browse analyzed repositories projects workspace",
  },
  {
    question: "Where can I find my recently analyzed projects?",
    answer:
      "Open Recent Projects in the sidebar under the History section. The Overview page also displays your latest analyzed repositories when history is available.",
    keywords: "recent projects history repositories overview",
  },
  {
    question: "Why is a repository missing from my list?",
    answer:
      "Check that the GitHub App has permission to access that repository and that the correct GitHub account or organization is connected. You may need to review the App installation permissions on GitHub.",
    keywords: "missing repository list permissions installation organization",
  },
  {
    question: "Can I analyze the same repository again?",
    answer:
      "You can open a repository again from the Repositories page and inspect its available analysis. The information displayed depends on the analysis data currently available for that project.",
    keywords: "reanalyze repeat analysis repository project",
  },
  {
    question: "What is the Architecture Map?",
    answer:
      "The Architecture Map provides a visual representation of the analyzed codebase, helping you understand how files, components and modules relate to one another.",
    keywords: "architecture map overview visual graph",
  },
  {
    question: "What do nodes represent in the Architecture Map?",
    answer:
      "Nodes represent code elements identified during architecture analysis, such as components and modules. Their labels and types help you understand the structure of the repository.",
    keywords: "architecture nodes components modules elements",
  },
  {
    question: "What do connections represent in the graph?",
    answer:
      "Connections represent relationships identified between code elements, such as import relationships. They help illustrate how different parts of the project are connected.",
    keywords: "architecture connections edges imports relationships graph",
  },
  {
    question: "Why is my Architecture Map incomplete?",
    answer:
      "The graph depends on the files that can be analyzed and the relationships detected in the repository. Unsupported file types, analysis limits or files without detectable connections can result in a partial graph.",
    keywords: "architecture incomplete graph missing files limits connections",
  },
  {
    question: "What is Code Explorer?",
    answer:
      "Code Explorer lets you inspect repository files and explore their source code through the Code Atlas interface.",
    keywords: "code explorer files source inspect browse",
  },
  {
    question: "Can I search for a specific file?",
    answer:
      "Use Code Explorer to browse the files available in the analyzed repository and locate the source file you want to inspect.",
    keywords: "code explorer search find specific file browse",
  },
  {
    question: "Does Code Explorer modify my files?",
    answer:
      "Code Explorer is intended for inspecting source code. Viewing files through the explorer does not require editing your repository.",
    keywords: "code explorer modify edit write source files",
  },
  {
    question: "What is Code Health?",
    answer:
      "Code Health provides indicators and findings related to code quality and maintainability, helping you identify areas that may deserve further review.",
    keywords: "code health quality maintainability overview",
  },
  {
    question: "How is the code health score calculated?",
    answer:
      "The score is based on the code health indicators available from the repository analysis. Review the individual findings and coverage information alongside the score for a more complete understanding.",
    keywords: "code health score calculate metrics indicators",
  },
  {
    question: "What does analysis coverage mean?",
    answer:
      "Coverage indicates how much of the eligible repository content was included in a particular analysis. A partial result should be interpreted together with its coverage information and warnings.",
    keywords: "coverage analysis analyzed files percentage incomplete",
  },
  {
    question: "Why were duplicated code blocks detected?",
    answer:
      "Duplicate detection identifies code sections that appear similar or repeated. Review the reported locations before deciding whether the repetition should be refactored, since similar code is not always a problem.",
    keywords: "duplication duplicate repeated blocks code health",
  },
  {
    question: "What does code complexity mean?",
    answer:
      "Complexity is an indicator of how difficult a section of code may be to understand and maintain. Higher complexity can suggest that a function or module deserves closer review.",
    keywords: "complexity maintainability code health functions",
  },
  {
    question: "What is Dependencies Analysis?",
    answer:
      "Dependencies Analysis inspects supported package manifests in a repository and presents information about the dependencies declared by the project.",
    keywords: "dependencies analysis packages manifests npm",
  },
  {
    question: "Why are some dependencies missing?",
    answer:
      "Dependency information depends on the package manifests detected and successfully read during analysis. Check whether the repository contains supported manifest files and whether the analysis reported any limitations.",
    keywords: "missing dependencies packages manifests files",
  },
  {
    question: "What is the difference between production and development dependencies?",
    answer:
      "Production dependencies are generally needed by the application at runtime. Development dependencies are typically used for development tasks such as testing, building and linting.",
    keywords: "production development dev dependencies packages",
  },
  {
    question: "What can I ask AI Investigator?",
    answer:
      "You can use AI Investigator to explore questions about repository structure and implementation details. The usefulness of an answer depends on the context and source information available to the investigation.",
    keywords: "ai investigator ask questions assistant repository",
  },
  {
    question: "Why might an AI Investigator answer be incomplete?",
    answer:
      "Answers depend on the repository context and information available to the investigation. Try asking a more specific question and include the relevant file, component or feature in your question.",
    keywords: "ai investigator incomplete answer context questions",
  },
  {
    question: "How can I get better answers from AI Investigator?",
    answer:
      "Ask focused questions and mention relevant file names, components or behaviors. Specific questions make it easier to identify the part of the codebase you want to understand.",
    keywords: "ai investigator improve answers prompts specific questions",
  },
  {
    question: "What is Impact Analysis?",
    answer:
      "Impact Analysis helps explore relationships between code elements and understand which areas may be affected by a change.",
    keywords: "impact analysis changes relationships affected code",
  },
  {
    question: "How can I identify potentially affected files?",
    answer:
      "Use the available impact information to inspect relationships between code elements. Review the connected elements and their context before deciding which files need changes or testing.",
    keywords: "impact affected files dependencies relationships changes",
  },
  {
    question: "Does Impact Analysis guarantee that every affected file is found?",
    answer:
      "No analysis should be treated as a guarantee that every possible impact has been identified. Results depend on the relationships detected in the available repository content, so review the relevant code before making changes.",
    keywords: "impact analysis guarantee affected files complete limitations",
  },
  {
    question: "Does Code Atlas modify my source code?",
    answer:
      "Code Atlas is designed to inspect repository content and present analysis results. It does not need to modify your source files to display repository insights.",
    keywords: "modify write edit source code safety",
  },
  {
    question: "Why did an analysis return incomplete results?",
    answer:
      "Some analyses depend on supported file types, repository contents and API access. Large repositories or files outside the analysis limits may not be included. Check the coverage information and any warnings shown with the results.",
    keywords: "incomplete analysis coverage limits files errors",
  },
  {
    question: "Why am I seeing a GitHub API rate limit error?",
    answer:
      "GitHub limits how many API requests an application can make within a given period. If a rate limit is reached, wait for the limit to reset before trying the operation again.",
    keywords: "github api rate limit requests error",
  },
  {
    question: "What should I include when reporting a problem?",
    answer:
      "Include the affected page, the repository involved, the steps that led to the issue and the exact error message. Never include access tokens, private keys or other credentials.",
    keywords: "report problem support troubleshooting error steps",
  },
];

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function HelpCenter() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(
    faqs[0].question,
  );
  const faqSectionRef = useRef<HTMLElement | null>(null);

  const normalizedSearch = normalize(search.trim());

  const filteredGuides = useMemo(() => {
    if (!normalizedSearch) return guides;

    return guides.filter((guide) =>
      normalize(
        `${guide.title} ${guide.description} ${guide.details} ${guide.keywords}`,
      ).includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const filteredFaqs = useMemo(() => {
    if (!normalizedSearch) return faqs;

    return faqs.filter((faq) =>
      normalize(
        `${faq.question} ${faq.answer} ${faq.keywords}`,
      ).includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const hasResults =
    filteredGuides.length > 0 || filteredFaqs.length > 0;

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (filteredFaqs.length > 0) {
      setOpenFaq(filteredFaqs[0].question);
    }

    faqSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
      <section className="relative overflow-hidden rounded-2xl border border-[#30283f] bg-gradient-to-br from-[#171321] via-[#111019] to-[#101016] px-6 py-10 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#9b7bff]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[#7255c7]/10 blur-3xl" />

        <div className="relative max-w-2xl">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#9b7bff]/25 bg-[#9b7bff]/10">
            <CircleHelp size={22} className="text-[#b7a1ff]" />
          </div>

          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#a98cff]">
            Help Center
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How can we <span className="text-gradient">help you?</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-[#aaa7b7]">
            Find guides, learn how to use Code Atlas and get answers to
            common questions about your workspace.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="mt-7 flex h-12 max-w-xl items-center gap-3 rounded-xl border border-[#393345] bg-[#0d0c13]/80 px-4 transition focus-within:border-[#9b7bff]/60 focus-within:ring-2 focus-within:ring-[#9b7bff]/10"
          >
            <Search size={17} className="shrink-0 text-[#8c829f]" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guides, questions and topics..."
              aria-label="Search help articles and frequently asked questions"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#777483] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#92919f] transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </form>

          <p className="mt-3 text-[11px] text-[#777483]">
            Type a keyword and press Enter to jump to matching FAQs.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a98cff]">
              Explore
            </p>
            <h2 className="text-xl font-semibold text-white">
              Browse help topics
            </h2>
            <p className="mt-1 text-sm text-[#92919f]">
              Guides to help you get more from your workspace.
            </p>
          </div>

          <span className="hidden text-xs text-[#777483] sm:block">
            {filteredGuides.length}{" "}
            {filteredGuides.length === 1 ? "topic" : "topics"}
          </span>
        </div>

        {filteredGuides.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredGuides.map((guide) => {
              const Icon = guide.icon;

              return (
                <article
                  key={guide.title}
                  className="group rounded-xl border border-[#252530] bg-[#101016] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#9b7bff]/30 hover:bg-[#13121b]"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
                    <Icon size={19} style={{ color: guide.color }} />
                  </div>

                  <h3 className="text-sm font-semibold text-white">
                    {guide.title}
                  </h3>

                  <p className="mt-2 min-h-10 text-xs leading-5 text-[#92919f]">
                    {guide.description}
                  </p>

                  <div className="mt-4 border-t border-[#252530] pt-4">
                    <p className="text-xs leading-5 text-[#aaa7b7]">
                      {guide.details}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#b7a1ff]">
                    <BookOpen size={14} />
                    <span>Feature guide</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#35313f] bg-[#101016] px-5 py-8 text-center">
            <Search size={20} className="mx-auto text-[#777483]" />
            <p className="mt-3 text-sm font-medium text-white">
              No matching guides
            </p>
            <p className="mt-1 text-xs text-[#92919f]">
              Try another search term or clear your search.
            </p>
          </div>
        )}
      </section>

      <section
        ref={faqSectionRef}
        id="frequently-asked-questions"
        className="mt-12 scroll-mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"
      >
        <div>
          <div className="mb-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a98cff]">
              Common questions
            </p>
            <h2 className="text-xl font-semibold text-white">
              Frequently asked questions
            </h2>
            <p className="mt-1 text-sm text-[#92919f]">
              {normalizedSearch
                ? `${filteredFaqs.length} matching ${
                    filteredFaqs.length === 1 ? "question" : "questions"
                  } for "${search.trim()}".`
                : "Quick answers to common questions about Code Atlas."}
            </p>
          </div>

          {filteredFaqs.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-[#252530] bg-[#101016]">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openFaq === faq.question;
                const answerId = `faq-answer-${index}`;

                return (
                  <div
                    key={faq.question}
                    className="border-b border-[#252530] last:border-b-0"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      onClick={() =>
                        setOpenFaq(isOpen ? null : faq.question)
                      }
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025]"
                    >
                      <span className="text-sm font-medium text-[#e8e5ef]">
                        {faq.question}
                      </span>

                      <ChevronDown
                        size={17}
                        className={`shrink-0 text-[#8f829f] transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div
                        id={answerId}
                        className="px-5 pb-5"
                      >
                        <p className="max-w-3xl text-sm leading-7 text-[#b8b4c4]">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#35313f] bg-[#101016] px-5 py-8 text-center">
              <CircleHelp
                size={20}
                className="mx-auto text-[#777483]"
              />
              <p className="mt-3 text-sm font-medium text-white">
                No matching questions
              </p>
              <p className="mt-1 text-xs text-[#92919f]">
                Try a different term or clear your search to browse all FAQs.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-[#9b7bff]/20 bg-gradient-to-br from-[#191426] to-[#111016] p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#9b7bff]/10">
              <Lightbulb size={19} className="text-[#b7a1ff]" />
            </div>

            <h3 className="text-sm font-semibold text-white">
              New to Code Atlas?
            </h3>

            <p className="mt-2 text-xs leading-5 text-[#aaa7b7]">
              Start by connecting a GitHub account or opening a public
              repository. Then explore the available analysis tools.
            </p>

            <Link
              href="/repositories"
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#c5b5ff] transition hover:text-white"
            >
              Explore repositories
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="rounded-xl border border-[#252530] bg-[#101016] p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/10">
              <ShieldAlert size={19} className="text-amber-300" />
            </div>

            <h3 className="text-sm font-semibold text-white">
              Having a problem?
            </h3>

            <p className="mt-2 text-xs leading-5 text-[#92919f]">
              When reporting an issue, include the affected page, the
              repository involved and the exact error message. Never
              include access tokens, private keys or other credentials.
            </p>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#252530] bg-[#0c0c12] p-3">
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0 text-[#9b7bff]"
              />
              <p className="text-[11px] leading-5 text-[#92919f]">
                A clear error message and the steps to reproduce it make
                troubleshooting much easier.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#252530] bg-[#101016] p-5">
            <div className="mb-3 flex items-center gap-2">
              <Activity size={15} className="text-[#b7a1ff]" />
              <h3 className="text-xs font-semibold text-white">
                Helpful tip
              </h3>
            </div>

            <p className="text-xs leading-5 text-[#92919f]">
              Analysis results depend on repository contents, supported
              file types and access permissions. Check the coverage
              details before interpreting incomplete results.
            </p>
          </div>
        </aside>
      </section>

      {normalizedSearch && !hasResults && (
        <p className="mt-6 text-center text-xs text-[#777483]">
          No help content found for “{search}”. Try a broader search.
        </p>
      )}

      <div className="mt-12 border-t border-[#252530] pt-6">
        <p className="text-center text-[11px] text-[#777483]">
          Code Atlas Help Center · Your codebase, clearly understood.
        </p>
      </div>
    </div>
  );
}
