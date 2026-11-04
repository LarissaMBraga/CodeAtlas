import {
  ArrowRight,
  BrainCircuit,
  Network,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Architecture Mapping",
    description:
      "Visualize how your components, modules and dependencies connect across your codebase.",
    number: "01",
  },
  {
    icon: BrainCircuit,
    title: "AI Investigator",
    description:
      "Ask questions about your code and receive contextual answers backed by real source references.",
    number: "02",
  },
  {
    icon: Workflow,
    title: "Impact Analysis",
    description:
      "Understand what might break before changing a file, function or component.",
    number: "03",
  },
  {
    icon: ShieldCheck,
    title: "Code Health",
    description:
      "Identify complexity, circular dependencies and potential maintenance risks.",
    number: "04",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="border-t border-white/[0.06] px-6 py-24 lg:px-10"
    >
      <div className="mx-auto max-w-[1160px]">
        <div className="mb-14 max-w-[600px]">
          <span className="text-[11px] font-semibold tracking-[2px] text-[#a98cff]">
            BUILT FOR DEVELOPERS
          </span>

          <h2 className="mt-4 text-3xl font-semibold tracking-[-1.2px] sm:text-4xl">
            Your codebase has a story.
            <br />
            <span className="text-[#898695]">
              Understand every layer.
            </span>
          </h2>

          <p className="mt-4 text-sm leading-6 text-[#9996a5]">
            CODE ATLAS transforms complex codebases into something you can
            explore, understand and reason about.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.number}
                className="group rounded-xl border border-white/[0.07] bg-[#111117] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#9b7bff]/30 hover:bg-[#15131e]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
                    <Icon size={19} className="text-[#b7a1ff]" />
                  </div>

                  <span className="font-mono text-xs text-[#5d5a69]">
                    {feature.number}
                  </span>
                </div>

                <h3 className="text-[15px] font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-3 text-[12px] leading-6 text-[#92909d]">
                  {feature.description}
                </p>

                <div className="mt-6 flex items-center gap-2 text-[11px] font-medium text-[#a98cff] opacity-0 transition group-hover:opacity-100">
                  Explore feature
                  <ArrowRight size={13} />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}