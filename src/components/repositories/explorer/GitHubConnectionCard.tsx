
import { Code2, LockKeyhole, ArrowUpRight } from "lucide-react";

export default function GitHubConnectionCard() {
  return (
    <section className="rounded-xl border border-[#252530] bg-[#111117] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#383444] bg-[#191720]">
          <Code2 size={22} className="text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              Connect your GitHub account
            </h2>

            <span className="rounded-full border border-[#383444] bg-[#191720] px-2 py-0.5 text-[10px] font-medium text-[#aaa7b7]">
              Coming soon
            </span>
          </div>

          <p className="mt-2 max-w-xl text-xs leading-5 text-[#777483]">
            Access your repositories in one place. Choose projects from your
            GitHub account and analyze private repositories with your
            authorization.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] text-[#92919f]">
            <span className="flex items-center gap-1.5">
              <Code2 size={13} />
              Public repositories
            </span>

            <span className="flex items-center gap-1.5">
              <LockKeyhole size={13} />
              Authorized private repositories
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="mt-7 flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-[#302d3b] bg-[#191720] px-4 text-sm font-medium text-[#777483] opacity-70 sm:w-auto"
      >
        <Code2 size={16} />
        Connect GitHub
        <ArrowUpRight size={14} />
      </button>
    </section>
  );
}
