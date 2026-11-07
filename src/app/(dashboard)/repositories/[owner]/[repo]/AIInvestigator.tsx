
"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock3,
  GitBranch,
  LoaderCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type AIInvestigatorProps = {
  owner: string;
  repo: string;
  branch: string;
};

type InvestigationContext = {
  filesIncluded: number;
  totalFilesAvailable: number;
  excludedFiles: number;
  totalRedactions: number;
  truncated: boolean;
  limitations: string[];
};

type InvestigationResult = {
  answer: string;
  repository: {
    owner: string;
    repo: string;
    branch: string;
  };
  context: InvestigationContext;
};

type InvestigationMessage = {
  id: number;
  question: string;
  result: InvestigationResult;
  createdAt: string;
};

const suggestedQuestions = [
  "How does authentication work?",
  "Explain the repository architecture.",
  "Where could bugs occur?",
];

function normalizeMarkdown(answer: string) {
  const escapableCharacters = [
    "\\", "`", "*", "_", "{", "}", "[", "]", "(", ")",
    "#", "+", "-", ".", "!", "|", ">", "~",
  ];

  return answer.replace(/\\(.)/g, (match, character: string) =>
    escapableCharacters.includes(character) ? character : match,
  );
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-7 text-lg font-bold leading-snug text-white first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-7 border-b border-[#302d3b] pb-2 text-base font-semibold text-white first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-sm font-semibold text-[#e8e1ff] first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-4 text-sm font-semibold text-[#e8e6ef]">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-3 text-[13px] leading-7 text-[#c3c0cc]">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#f0edf8]">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="text-[#d4c9ed]">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-2 pl-6 marker:text-[#a98cff]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-[#a98cff]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 text-[13px] leading-7 text-[#c3c0cc]">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-[#a98cff] bg-[#a98cff]/5 py-2 pl-4 pr-3 text-[#bcb4ca]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-[#302d3b]" />,
  table: ({ children }) => (
    <div className="my-5 w-full overflow-x-auto rounded-lg border border-[#302d3b]">
      <table className="w-full min-w-[480px] border-collapse text-left text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#1b1924] text-[#e8e1ff]">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-[#302d3b]">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-[#a98cff]/5">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 font-semibold leading-5">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 align-top leading-6 text-[#c3c0cc]">
      {children}
    </td>
  ),
  code: ({ className, children, ...props }) => (
    <code
      className={
        className
          ? `${className} font-mono text-[12px]`
          : "rounded-md border border-[#a98cff]/15 bg-[#a98cff]/10 px-1.5 py-0.5 font-mono text-[11px] text-[#d0c3ff]"
      }
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg border border-[#302d3b] bg-[#09090e] p-4 text-xs leading-6 text-[#d5d1df]">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#b7a1ff] underline decoration-[#a98cff]/40 underline-offset-4 transition hover:text-white"
    >
      {children}
    </a>
  ),
};

function AnswerContent({ answer }: { answer: string }) {
  return (
    <div className="min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {normalizeMarkdown(answer)}
      </ReactMarkdown>
    </div>
  );
}

function ContextDetails({
  context,
}: {
  context: InvestigationContext;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-5 border-t border-[#252530] pt-3">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 text-left text-[11px] text-[#92919f] transition hover:text-[#d0c3ff]"
      >
        <span className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-[#a98cff]" />
          Context and safety details
        </span>

        <span className="flex items-center gap-2">
          {context.filesIncluded} files analyzed
          {expanded ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Files included", context.filesIncluded],
              ["Files available", context.totalFilesAvailable],
              ["Secrets masked", context.totalRedactions],
              ["Files excluded", context.excludedFiles],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg bg-[#0d0d13] px-3 py-3"
              >
                <p className="text-base font-semibold text-[#e8e6ef]">
                  {value}
                </p>
                <p className="mt-1 text-[10px] text-[#777483]">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {context.truncated && (
            <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-[11px] leading-5 text-yellow-200/80">
              The repository context was shortened to fit the investigation
              limits. Some relevant files may not have been included.
            </p>
          )}

          {context.limitations.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#777483]">
                Limitations
              </p>

              {context.limitations.map((limitation) => (
                <p
                  key={limitation}
                  className="text-[11px] leading-5 text-[#92919f]"
                >
                  {limitation}
                </p>
              ))}
            </div>
          )}

          <p className="text-[10px] leading-5 text-[#777483]">
            Environment files are excluded and potential secrets are masked
            before repository content is sent to the AI provider.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AIInvestigator({
  owner,
  repo,
  branch,
}: AIInvestigatorProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<InvestigationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submittedQuestion = question.trim();

    if (submittedQuestion.length < 3 || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/github/ai-investigator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          repo,
          branch,
          question: submittedQuestion,
        }),
      });

      const result: InvestigationResult | { error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          "error" in result && result.error
            ? result.error
            : "Unable to complete the investigation.",
        );
      }

      if (!("answer" in result) || !result.answer) {
        throw new Error("The AI provider returned an empty answer.");
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          question: submittedQuestion,
          result,
          createdAt: new Date().toISOString(),
        },
      ]);

      setQuestion("");
    } catch (investigationError) {
      setError(
        investigationError instanceof Error
          ? investigationError.message
          : "An unexpected error occurred during the investigation.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-[#292633] bg-[#111117] shadow-xl shadow-black/10">
      <header className="border-b border-[#292633] px-5 py-5 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#a98cff]/20 bg-[#a98cff]/10">
              <Bot size={19} className="text-[#b7a1ff]" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">
                AI Investigator
              </h2>
              <p className="mt-1 text-xs text-[#777483]">
                Understand your codebase through conversation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#92919f]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {loading ? "Investigating..." : "Ready to investigate"}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#92919f]">
          <span className="flex items-center gap-2">
            <GitBranch size={13} className="text-[#a98cff]" />
            <span className="text-[#dedbe6]">
              {owner}/{repo}
            </span>
          </span>

          <span className="hidden h-3 w-px bg-[#302d3b] sm:block" />

          <span>
            Branch: <span className="text-[#c3c0cc]">{branch}</span>
          </span>

          <span className="hidden h-3 w-px bg-[#302d3b] sm:block" />

          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" />
            Sanitized repository context
          </span>
        </div>
      </header>

      <div className="border-b border-[#292633] bg-[#0d0d13] p-4 sm:p-5">
        <form onSubmit={submitQuestion}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask anything about this repository..."
            rows={2}
            maxLength={2000}
            disabled={loading}
            aria-label="Your investigation question"
            className="w-full resize-y rounded-xl border border-[#302d3b] bg-[#111117] px-4 py-3 text-xs leading-6 text-[#e8e6ef] outline-none transition placeholder:text-[#686574] focus:border-[#a98cff]/50 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mt-3 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
            <span className="text-[10px] text-[#777483]">
              {question.length}/2000
            </span>

           <button
  type="submit"
  disabled={loading || question.trim().length < 3}
  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#a98cff] px-3 py-2 text-[11px] font-semibold text-[#171321] transition hover:bg-[#bba5ff] disabled:cursor-not-allowed disabled:opacity-40"
>
  {loading ? (
    <>
      <LoaderCircle size={12} className="animate-spin" />
      Investigating
    </>
  ) : (
    <>
      <Send size={12} />
      Ask AI
    </>
  )}
</button>
          </div>
        </form>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-6">
        {messages.length === 0 && !loading && (
          <div className="py-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#a98cff]/20 bg-[#a98cff]/10">
              <Sparkles size={21} className="text-[#b7a1ff]" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-[#e8e6ef]">
              Explore your repository
            </h3>

            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#92919f]">
              Ask technical questions about your code, architecture,
              dependencies and implementation.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestedQuestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={loading}
                  onClick={() => setQuestion(suggestion)}
                  className="rounded-full border border-[#302d3b] px-3 py-2 text-[11px] text-[#aaa5b8] transition hover:border-[#a98cff]/40 hover:bg-[#a98cff]/5 hover:text-[#d0c3ff] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex items-center justify-between border-b border-[#252530] pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-[#a98cff]" />
              <h3 className="text-xs font-semibold text-[#e8e6ef]">
                Conversation
              </h3>
            </div>

            <span className="text-[10px] text-[#777483]">
              {messages.length}{" "}
              {messages.length === 1 ? "question" : "questions"}
            </span>
          </div>
        )}

        {[...messages].reverse().map((message) => (
          <article
            key={message.id}
            className="space-y-4 border-b border-[#252530] pb-6 last:border-0 last:pb-0"
          >
            <div className="flex justify-end">
              <div className="max-w-[90%] rounded-2xl rounded-br-md border border-[#a98cff]/20 bg-[#a98cff]/10 px-4 py-3 sm:max-w-[80%]">
                <p className="whitespace-pre-wrap text-xs leading-6 text-[#e8e1ff]">
                  {message.question}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#a98cff]/20 bg-[#a98cff]/10">
                  <Bot size={16} className="text-[#b7a1ff]" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#e8e6ef]">
                    AI Investigator
                  </p>
                  <p className="text-[10px] text-[#777483]">
                    Repository analysis
                  </p>
                </div>
              </div>

              <span className="flex items-center gap-1.5 text-[10px] text-[#777483]">
                <Clock3 size={11} />
                {new Intl.DateTimeFormat(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(message.createdAt))}
              </span>
            </div>

            <div className="pl-0 sm:pl-10">
              <AnswerContent answer={message.result.answer} />
              <ContextDetails context={message.result.context} />
            </div>
          </article>
        ))}

        {loading && (
          <div className="flex items-center gap-3 rounded-xl bg-[#a98cff]/5 px-4 py-4">
            <LoaderCircle
              size={17}
              className="animate-spin text-[#b7a1ff]"
            />
            <div>
              <p className="text-xs font-medium text-[#e8e6ef]">
                Analyzing your repository
              </p>
              <p className="mt-1 text-[10px] text-[#777483]">
                Gathering relevant files and preparing your answer...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <p className="text-center text-[10px] leading-5 text-[#686574]">
          AI-generated answers may contain inaccuracies. Always verify
          important findings against the source code.
        </p>
      </div>
    </section>
  );
}
