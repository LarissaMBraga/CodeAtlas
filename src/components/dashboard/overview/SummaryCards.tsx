
import {
  FolderGit2,
  GitBranch,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const metrics = [
  {
    label: "Repositories analyzed",
    value: "0",
    description: "No repositories connected yet",
    icon: FolderGit2,
    trend: null,
  },
  {
    label: "Dependencies mapped",
    value: "0",
    description: "Waiting for your first analysis",
    icon: GitBranch,
    trend: null,
  },
  {
    label: "Code health score",
    value: "--",
    description: "No codebase analyzed yet",
    icon: Activity,
    trend: null,
  },
];

export default function SummaryCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;

        return (
          <article
            key={metric.label}
            className="group relative overflow-hidden rounded-xl border border-[#252530] bg-[#111117] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#9b7bff]/30 hover:shadow-xl hover:shadow-[#9b7bff]/[0.04]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#9b7bff]/[0.04] blur-3xl transition duration-500 group-hover:bg-[#9b7bff]/[0.10]" />

            <div className="relative flex items-center justify-between">
              <p className="text-sm font-medium text-[#92919f]">
                {metric.label}
              </p>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#9b7bff]/15 bg-[#9b7bff]/10 transition duration-300 group-hover:border-[#9b7bff]/30 group-hover:bg-[#9b7bff]/15">
                <Icon size={18} className="text-[#b7a1ff]" />
              </div>
            </div>

            <div className="relative mt-7 flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-white">
                  {metric.value}
                </p>

                <p className="mt-2 text-xs text-[#777483]">
                  {metric.description}
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#252530] bg-white/[0.02] text-[#656270]">
                {index === 0 ? (
                  <ArrowUpRight size={15} />
                ) : index === 1 ? (
                  <ArrowUpRight size={15} />
                ) : (
                  <ArrowDownRight size={15} />
                )}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
