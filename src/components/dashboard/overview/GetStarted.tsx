
import {
  Code2,
  ScanSearch,
  Workflow,
  Bot,
  ArrowUpRight,
  Check,
} from "lucide-react";

const steps = [
  {
    title: "Connect a GitHub repository",
    description: "Choose a repository to start exploring.",
    icon: Code2,
  },
  {
    title: "Analyze your codebase",
    description: "Let CODE ATLAS map your project structure.",
    icon: ScanSearch,
  },
  {
    title: "Explore your architecture",
    description: "Visualize components and dependencies.",
    icon: Workflow,
  },
  {
    title: "Investigate with AI",
    description: "Ask questions and understand your code.",
    icon: Bot,
  },
];

export default function GetStarted() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-[#252530] bg-[#111117] p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#9b7bff]/[0.07] blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Get started
            </h2>
            <p className="mt-1 text-xs text-[#777483]">
              Your code intelligence journey starts here.
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/15 bg-[#9b7bff]/10">
            <ArrowUpRight size={17} className="text-[#b7a1ff]" />
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.title} className="group flex items-start gap-4">
                <div className="relative flex shrink-0 flex-col items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#383444] bg-[#191720] text-[#b7a1ff] transition group-hover:border-[#9b7bff]/40 group-hover:bg-[#9b7bff]/10">
                    <Icon size={17} />
                  </div>

                  {index !== steps.length - 1 && (
                    <div className="absolute top-11 h-5 w-px bg-[#302d3b]" />
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-[#e8e5f0] transition group-hover:text-white">
                      {step.title}
                    </p>

                    <span className="shrink-0 text-[10px] text-[#656270]">
                      0{index + 1}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] leading-5 text-[#777483]">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-2 rounded-lg border border-[#9b7bff]/15 bg-[#9b7bff]/[0.06] px-3 py-3">
          <Check size={15} className="shrink-0 text-[#b7a1ff]" />
          <p className="text-[11px] text-[#aaa7b7]">
            All your tools, connected in one workspace.
          </p>
        </div>
      </div>
    </section>
  );
}
