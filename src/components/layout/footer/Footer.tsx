import { ArrowUpRight, Network } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#09090d] px-6 py-7 lg:px-10">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
            <Network size={17} className="text-[#b7a1ff]" />
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide">
              CODE <span className="text-[#a98cff]">ATLAS</span>
            </p>
            <p className="mt-1 text-[10px] text-[#777483]">
              Understand the structure. Navigate the complexity.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-[#92909d]">
          <a
            href="https://larissabraga.dev"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 transition hover:text-[#b7a1ff]"
          >
            Portfolio <ArrowUpRight size={12} />
          </a>

          <a
            href="https://github.com/LarissaMBraga"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 transition hover:text-[#b7a1ff]"
          >
            GitHub <ArrowUpRight size={12} />
          </a>

          <a
            href="https://www.linkedin.com/in/larissa-braga128/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 transition hover:text-[#b7a1ff]"
          >
            LinkedIn <ArrowUpRight size={12} />
          </a>
        </div>

        <p className="text-[10px] text-[#656270]">
          © 2026 CODE ATLAS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}