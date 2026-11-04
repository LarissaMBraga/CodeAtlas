import { Terminal, Zap } from "lucide-react";

const workflowSteps = [
  {
    number: "01",
    title: "Connect your repository",
    description: "Choose a public or authorized private repository.",
  },
  {
    number: "02",
    title: "Analyze the codebase",
    description: "Extract modules, imports and architectural relationships.",
  },
  {
    number: "03",
    title: "Explore with intelligence",
    description:
      "Investigate dependencies and understand potential changes.",
  },
];

const metrics = [
  { label: "Modules", value: "24" },
  { label: "Dependencies", value: "86" },
  { label: "Components", value: "42" },
  { label: "Circular deps.", value: "0" },
];

export default function WorkflowSection() {
  return (
    <section
      id="how-it-works"
      className="border-t border-white/[0.06] px-6 py-24 lg:px-10"
    >
      <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2">
        <div>
          <span className="text-[11px] font-semibold tracking-[2px] text-[#a98cff]">
            SIMPLE WORKFLOW
          </span>

          <h2 className="mt-4 text-3xl font-semibold tracking-[-1.2px] sm:text-4xl">
            From repository
            <br />
            to understanding.
          </h2>

          <p className="mt-5 max-w-[450px] text-sm leading-7 text-[#9996a5]">
            Start with a GitHub repository. CODE ATLAS analyzes its structure
            and builds an interactive representation of your software.
          </p>

          <div className="mt-9 space-y-6">
            {workflowSteps.map((step) => (
              <div key={step.number} className="flex gap-4">
                <span className="font-mono text-xs text-[#a98cff]">
                  {step.number}
                </span>

                <div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>

                  <p className="mt-1 text-xs leading-5 text-[#898695]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div id="architecture" className="relative">
          <div className="absolute -inset-8 rounded-full bg-[#7955e8]/[0.07] blur-3xl" />

          <div className="relative rounded-2xl border border-white/[0.08] bg-[#111117] p-6">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#9b7bff]/10">
                  <Terminal size={17} className="text-[#b7a1ff]" />
                </div>

                <div>
                  <p className="text-xs font-semibold">
                    Repository analysis
                  </p>

                  <p className="mt-1 text-[10px] text-[#777483]">
                    Project intelligence
                  </p>
                </div>
              </div>

              <span className="rounded-md border border-[#9b7bff]/20 bg-[#9b7bff]/10 px-2 py-1 text-[10px] text-[#b7a1ff]">
                DEMO
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 py-6">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <p className="text-[11px] text-[#898695]">
                    {metric.label}
                  </p>

                  <p className="mt-2 font-mono text-2xl text-[#e8e3f5]">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[#9b7bff]/15 bg-[#9b7bff]/[0.06] p-4">
              <Zap size={17} className="shrink-0 text-[#b7a1ff]" />

              <p className="text-[11px] leading-5 text-[#c2b9d8]">
                Explore the relationships behind your software architecture.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}