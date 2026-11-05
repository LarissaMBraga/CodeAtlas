
import DashboardSidebar from "@/components/dashboard/sidebar/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/header/DashboardHeader";
import { GitBranch, FolderGit2, Activity, ArrowUpRight } from "lucide-react";

const metrics = [
  {
    label: "Repositories analyzed",
    value: "0",
    description: "Connect your first repository",
    icon: FolderGit2,
  },
  {
    label: "Dependencies mapped",
    value: "0",
    description: "Waiting for analysis",
    icon: GitBranch,
  },
  {
    label: "Code health score",
    value: "--",
    description: "No analysis available",
    icon: Activity,
  },
];

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-[#09090d] text-[#f4f2fa]">
      <DashboardSidebar />

      <main className="min-h-screen lg:pl-[260px]">
        <DashboardHeader />

        <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#a98cff]">
                Dashboard
              </p>

              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Welcome to your <span className="text-gradient">workspace.</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#92919f]">
                Get a clearer picture of your codebase, explore dependencies
                and understand how your projects are connected.
              </p>
            </div>

            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-5 text-sm font-semibold text-white transition hover:bg-[#8966f0]"
            >
              Connect repository
              <ArrowUpRight size={16} />
            </button>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <article
                  key={metric.label}
                  className="rounded-xl border border-[#252530] bg-[#111117] p-5 transition hover:border-[#9b7bff]/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#92919f]">{metric.label}</p>

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/15 bg-[#9b7bff]/10">
                      <Icon size={17} className="text-[#b7a1ff]" />
                    </div>
                  </div>

                  <p className="mt-6 text-3xl font-semibold text-white">
                    {metric.value}
                  </p>

                  <p className="mt-2 text-xs text-[#777483]">
                    {metric.description}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-[#252530] bg-[#111117] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Recent repositories
                  </h2>
                  <p className="mt-1 text-xs text-[#777483]">
                    Your recently analyzed projects
                  </p>
                </div>

                <FolderGit2 size={19} className="text-[#777483]" />
              </div>

              <div className="mt-8 flex min-h-[180px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#9b7bff]/15 bg-[#9b7bff]/10">
                  <GitBranch size={21} className="text-[#b7a1ff]" />
                </div>

                <p className="mt-4 text-sm font-medium text-white">
                  No repositories yet
                </p>

                <p className="mt-2 max-w-xs text-xs leading-5 text-[#777483]">
                  Connect a GitHub repository to start exploring its
                  architecture and dependencies.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#252530] bg-[#111117] p-6">
              <h2 className="text-base font-semibold text-white">
                Get started
              </h2>

              <p className="mt-1 text-xs text-[#777483]">
                Your code intelligence journey starts here.
              </p>

              <div className="mt-7 space-y-5">
                {[
                  "Connect a GitHub repository",
                  "Analyze your codebase",
                  "Explore your architecture",
                  "Investigate dependencies with AI",
                ].map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#383444] text-xs text-[#a98cff]">
                      {index + 1}
                    </div>

                    <p className="text-xs text-[#aaa7b7]">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
