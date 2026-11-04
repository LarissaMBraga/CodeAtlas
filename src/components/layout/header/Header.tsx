import Link from "next/link";
import { ArrowUpRight, Network } from "lucide-react";

export default function Header() {
  return (
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
  );
}