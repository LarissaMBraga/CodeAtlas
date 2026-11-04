
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  GitBranch,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow,
  Terminal,
  Zap,
} from "lucide-react";
import Footer from "@/components/layout/footer/Footer";

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

const nodes = [
  { name: "src/app", type: "entry", position: "left-[50%] top-[20%]" },
  { name: "features", type: "primary", position: "left-[21%] top-[49%]" },
  { name: "components", type: "primary", position: "left-[50%] top-[49%]" },
  { name: "lib", type: "primary", position: "left-[79%] top-[49%]" },
  { name: "analyzer", type: "secondary", position: "left-[29%] top-[80%]" },
  { name: "types", type: "secondary", position: "left-[71%] top-[80%]" },
];

function ArchitecturePreview() {
  return (
    <div className="relative mx-auto h-[390px] w-full max-w-[620px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d14]">
      <div className="atlas-grid absolute inset-0 opacity-60" />

      <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[#9b7bff]" />
        <span className="text-xs font-medium tracking-wide text-[#aaa6b8]">
          SOFTWARE DEPENDENCY MAP
        </span>
      </div>

      <div className="absolute right-5 top-5 z-10 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-[#aaa6b8]">
        DEMO STRUCTURE
      </div>

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 620 390"
        fill="none"
        preserveAspectRatio="none"
      >
        <g stroke="#8065c4" strokeOpacity=".45" strokeWidth="1.4">
          <path d="M310 105 V137 H130 V169" />
          <path d="M310 105 V169" />
          <path d="M310 105 V137 H490 V169" />
          <path d="M130 215 V245 H180 V292" />
          <path d="M310 215 V255 H440 V292" />
          <path d="M490 215 V245 H440 V292" />
        </g>

        <g fill="#a98cff">
          <circle cx="310" cy="137" r="3" />
          <circle cx="130" cy="137" r="3" />
          <circle cx="490" cy="137" r="3" />
          <circle cx="180" cy="245" r="3" />
          <circle cx="440" cy="255" r="3" />
        </g>
      </svg>

      {nodes.map((node) => (
        <div
          key={node.name}
          className={`absolute z-10 ${node.position} -translate-x-1/2 -translate-y-1/2`}
        >
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 shadow-xl ${
              node.type === "entry"
                ? "border-[#9b7bff]/50 bg-[#211b35] shadow-[0_0_25px_rgba(155,123,255,0.12)]"
                : node.type === "primary"
                  ? "border-[#9b7bff]/25 bg-[#191625]"
                  : "border-white/10 bg-[#17171f]"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                node.type === "entry"
                  ? "bg-[#b7a1ff]"
                  : node.type === "primary"
                    ? "bg-[#9b7bff]"
                    : "bg-[#77718d]"
              }`}
            />
            <span className="whitespace-nowrap font-mono text-[11px] text-[#e5dff7]">
              {node.name}
            </span>
          </div>
        </div>
      ))}

      <div className="absolute bottom-5 left-5 z-10 flex gap-5 text-[10px] text-[#777483]">
        <span>Application</span>
        <span>Modules</span>
        <span>Dependencies</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="relative z-20 border-b border-white/[0.06]">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#9b7bff]/30 bg-[#9b7bff]/10">
              <Network size={19} className="text-[#b7a1ff]" />
            </div>

            <span className="text-[17px] font-semibold tracking-[-0.7px]">
              CODE <span className="text-[#a98cff]">ATLAS</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-9 text-[13px] text-[#aaa7b5] md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
            <a href="#architecture" className="transition hover:text-white">
              Architecture
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-[13px] text-[#c2bfcd] transition hover:text-white sm:block"
            >
              Sign in
            </Link>

            <Link
              href="/register"
              className="flex items-center gap-2 rounded-lg bg-[#a184ff] px-4 py-2.5 text-[12px] font-semibold text-[#100c1b] transition hover:bg-[#b69fff]"
            >
              Get started
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative px-6 pb-24 pt-12 lg:px-10 lg:pt-16">
        <div className="atlas-grid absolute inset-0 opacity-50" />
        <div className="atlas-glow absolute left-1/2 top-0 h-[620px] w-full max-w-[1000px] -translate-x-1/2" />

        <div className="relative mx-auto max-w-[1000px] text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#9b7bff]/20 bg-[#9b7bff]/[0.07] px-4 py-2">
            <Sparkles size={13} className="text-[#b7a1ff]" />
            <span className="text-[11px] font-medium tracking-wide text-[#c5b5ff]">
              CODE INTELLIGENCE PLATFORM
            </span>
          </div>

          <h1 className="text-gradient text-5xl font-semibold leading-[1.08] tracking-[-2.8px] sm:text-6xl lg:text-[76px]">
            Understand your code.
            <br />
            <span className="text-[#a98cff]">
              See the bigger picture.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-[620px] text-[15px] leading-7 text-[#9996a5] sm:text-base">
            Explore your codebase beyond the files. Map architecture,
            investigate dependencies and understand the impact of every change.
          </p>

          <div className="mx-auto mt-10 flex max-w-[540px] flex-col gap-3 sm:flex-row">
            <Link
              href="/overview"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#a184ff] px-6 py-4 text-sm font-semibold text-[#100c1b] shadow-[0_0_35px_rgba(155,123,255,0.18)] transition hover:-translate-y-0.5 hover:bg-[#b69fff]"
            >
              Explore your codebase
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-6 py-4 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <GitBranch size={17} />
              Connect GitHub
            </Link>
          </div>

          <p className="mt-5 text-xs text-[#777483]">
            <span className="text-[#a98cff]">No account required.</span>{" "}
            Start exploring public repositories.
          </p>

          <div className="mx-auto mt-20 max-w-[780px]">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-mono text-[10px] tracking-wider text-[#777483]">
                YOUR CODEBASE, VISUALIZED
              </span>

              <span className="flex items-center gap-1.5 text-[10px] text-[#8f87a4]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#9b7bff]" />
                ARCHITECTURE OVERVIEW
              </span>
            </div>

            <ArchitecturePreview />
          </div>
        </div>
      </section>

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
              {[
                [
                  "01",
                  "Connect your repository",
                  "Choose a public or authorized private repository.",
                ],
                [
                  "02",
                  "Analyze the codebase",
                  "Extract modules, imports and architectural relationships.",
                ],
                [
                  "03",
                  "Explore with intelligence",
                  "Investigate dependencies and understand potential changes.",
                ],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-4">
                  <span className="font-mono text-xs text-[#a98cff]">
                    {number}
                  </span>

                  <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#898695]">
                      {description}
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
                {[
                  ["Modules", "24"],
                  ["Dependencies", "86"],
                  ["Components", "42"],
                  ["Circular deps.", "0"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <p className="text-[11px] text-[#898695]">{label}</p>
                    <p className="mt-2 font-mono text-2xl text-[#e8e3f5]">
                      {value}
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

      <Footer />
    </main>
  );
}
