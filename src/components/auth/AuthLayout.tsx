
import Link from "next/link";
import { Network } from "lucide-react";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090d] px-5 py-12 text-[#f4f2fa]">
      <div className="atlas-grid absolute inset-0 opacity-40" />

      <div className="atlas-glow absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 w-full max-w-[440px]">
        <Link
          href="/"
          className="mb-10 flex items-center justify-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#9b7bff]/25 bg-[#9b7bff]/10">
            <Network size={21} className="text-[#b7a1ff]" />
          </div>

          <span className="text-lg font-semibold tracking-wide">
            CODE <span className="text-[#b7a1ff]">ATLAS</span>
          </span>
        </Link>

        <section className="glass rounded-2xl p-7 shadow-2xl shadow-black/20 sm:p-9">
          <div className="mb-8 text-center">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a98cff]">
              Code Intelligence Platform
            </p>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>

            <p className="mx-auto mt-3 max-w-[320px] text-sm leading-6 text-[#92919f]">
              {description}
            </p>
          </div>

          {children}

          {footer && (
            <div className="mt-7 border-t border-white/[0.07] pt-6 text-center text-sm text-[#92919f]">
              {footer}
            </div>
          )}
        </section>

        <p className="mt-7 text-center text-xs text-[#656270]">
          © 2026 CODE ATLAS. All rights reserved.
        </p>
      </div>
    </main>
  );
}
