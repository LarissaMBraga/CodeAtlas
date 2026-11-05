
import { ChevronRight, Bell, Search } from "lucide-react";

export default function DashboardHeader() {
  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[#252530] px-6 sm:px-8">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#777483]">Workspace</span>
        <ChevronRight size={13} className="text-[#555260]" />
        <span className="font-medium text-white">Overview</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-[#252530] bg-[#111117] px-3 py-2 text-xs text-[#777483] sm:flex">
          <Search size={14} />
          <span>Search workspace...</span>
          <span className="ml-4 rounded border border-[#353440] px-1.5 py-0.5 text-[10px]">
            Ctrl K
          </span>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#252530] text-[#92919f] transition hover:border-[#9b7bff]/30 hover:text-white"
        >
          <Bell size={17} />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#9b7bff]/20 bg-[#9b7bff]/10 text-xs font-semibold text-[#c5b5ff]">
          CA
        </div>
      </div>
    </header>
  );
}
