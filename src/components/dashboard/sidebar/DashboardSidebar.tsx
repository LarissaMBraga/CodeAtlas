"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Network,
  LayoutDashboard,
  FolderGit2,
  Workflow,
  Bot,
  GitBranch,
  HeartPulse,
  Clock3,
  Settings,
  CircleHelp,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import {
  ProfileAvatar,
  useProfile,
} from "@/components/dashboard/profile/ProfileProvider";

const navigation = [
  {
    label: "WORKSPACE",
    items: [
      { name: "Overview", href: "/overview", icon: LayoutDashboard },
      { name: "Repositories", href: "/repositories", icon: FolderGit2 },
      { name: "Architecture Map", href: "/architecture", icon: Workflow },
    ],
  },
  {
    label: "CODE INTELLIGENCE",
    items: [
      { name: "AI Investigator", href: "/investigator", icon: Bot },
      { name: "Impact Analysis", href: "/impact", icon: GitBranch },
      { name: "Code Health", href: "/code-health", icon: HeartPulse },
    ],
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { profile, toggleMenu, openAnchor } = useProfile();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-[#252530] bg-[#0d0d13] lg:flex">
      <div className="flex h-[76px] items-center justify-between border-b border-[#252530] px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#9b7bff]/25 bg-[#9b7bff]/10">
            <Network size={19} className="text-[#b7a1ff]" />
          </div>

          <span className="text-sm font-bold tracking-[0.08em] text-white">
            CODE <span className="text-[#b7a1ff]">ATLAS</span>
          </span>
        </Link>

        <button
          type="button"
          aria-label="Collapse sidebar"
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#777483] transition hover:bg-white/[0.05] hover:text-white"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-7 [scrollbar-color:#594b78_#0d0d13] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#594b78] [&::-webkit-scrollbar-thumb:hover]:bg-[#9b7bff] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#0d0d13]">
        <div className="mb-8 rounded-xl border border-[#9b7bff]/15 bg-gradient-to-br from-[#9b7bff]/10 to-transparent p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-[#b7a1ff]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b7a1ff]">
              Workspace
            </span>
          </div>

          <p className="text-sm font-medium text-white">Your codebase,</p>
          <p className="text-sm font-medium text-[#aaa7b7]">
            clearly understood.
          </p>
        </div>

        <nav className="space-y-8">
          {navigation.map((section) => (
            <div key={section.label}>
              <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-[#656270]">
                {section.label}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] transition ${
                        active
                          ? "border border-[#9b7bff]/20 bg-[#9b7bff]/10 font-medium text-[#c5b5ff]"
                          : "text-[#92919f] hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <Icon
                        size={17}
                        className={
                          active
                            ? "text-[#b7a1ff]"
                            : "text-[#777483] transition group-hover:text-white"
                        }
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-8">
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-[#656270]">
            HISTORY
          </p>

          <Link
            href="/recent-projects"
            className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] text-[#92919f] transition hover:bg-white/[0.04] hover:text-white"
          >
            <Clock3 size={17} className="text-[#777483]" />
            Recent Projects
          </Link>
        </div>
      </div>

      <div className="space-y-1 border-t border-[#252530] p-4">
        <button
          type="button"
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] text-[#92919f] transition hover:bg-white/[0.04] hover:text-white"
        >
          <Settings size={17} className="text-[#777483]" />
          Settings
        </button>

        <button
          type="button"
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] text-[#92919f] transition hover:bg-white/[0.04] hover:text-white"
        >
          <CircleHelp size={17} className="text-[#777483]" />
          Help & Support
        </button>

        <button
          type="button"
          aria-label="Open account details"
          aria-expanded={openAnchor === "sidebar"}
          onClick={() => toggleMenu("sidebar")}
          className="mt-3 flex w-full items-center gap-3 border-t border-[#252530] px-2 pt-4 text-left transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b7bff]"
        >
          <ProfileAvatar profile={profile} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">
              {profile?.name || "CODE ATLAS User"}
            </p>
            <p className="truncate text-[10px] text-[#777483]">
              {profile?.email || "Loading account..."}
            </p>
          </div>

          <Settings size={15} className="shrink-0 text-[#777483]" />
        </button>
      </div>
    </aside>
  );
}