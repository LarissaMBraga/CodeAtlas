
import {
  FolderGit2,
  GitBranch,
  ArrowUpRight,
  Clock3,
} from "lucide-react";

export default function RecentRepositories() {
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

      <div className="mt-8 flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015] px-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#9b7bff]/15 bg-[#9b7bff]/10">
          <GitBranch size={21} className="text-[#b7a1ff]" />
        </div>

        <p className="mt-4 text-sm font-medium text-white">
          No repositories yet
        </p>

        <p className="mt-2 max-w-xs text-xs leading-5 text-[#777483]">
          Connect a GitHub repository to start exploring its architecture,
          dependencies and code health.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#252530] pt-4">
        <div className="flex items-center gap-2 text-[11px] text-[#777483]">
          <Clock3 size={13} />
          <span>Updated automatically</span>
        </div>

        <span className="flex items-center gap-1 text-[11px] font-medium text-[#a98cff]">
          View all
          <ArrowUpRight size={13} />
        </span>
      </div>
    </section>
  );
}
