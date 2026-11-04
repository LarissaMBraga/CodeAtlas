import Link from "next/link";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";
import ArchitecturePreview from "./ArchitecturePreview";

export default function HeroSection() {
  return (
    <section className="relative px-6 pb-24 pt-6 lg:px-10 lg:pt-8">
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
  );
}