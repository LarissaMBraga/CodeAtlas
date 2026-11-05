
import Link from "next/link";
import { MailCheck, ArrowLeft, ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      title="Check your inbox"
      description="Your account is almost ready!"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#9b7bff]/20 bg-[#9b7bff]/10">
          <MailCheck size={38} className="text-[#b7a1ff]" />
        </div>

        <h2 className="text-lg font-semibold text-white">
          Verify your email address
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#92919f]">
          We&apos;ve sent you a confirmation link. Open the email and click
          the link to activate your CODE ATLAS account.
        </p>

        <div className="mt-6 flex w-full items-start gap-3 rounded-lg border border-[#9b7bff]/15 bg-[#9b7bff]/[0.06] p-4 text-left">
          <ShieldCheck
            size={19}
            className="mt-0.5 shrink-0 text-[#b7a1ff]"
          />

          <p className="text-xs leading-5 text-[#aaa7b7]">
            For security reasons, you&apos;ll need to confirm your email before
            signing in.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#9b7bff] text-sm font-semibold text-white transition hover:bg-[#8966f0] focus:outline-none focus:ring-2 focus:ring-[#b7a1ff] focus:ring-offset-2 focus:ring-offset-[#111117]"
        >
          <ArrowLeft size={16} />
          Go to sign in
        </Link>

        <p className="mt-5 text-xs leading-5 text-[#777483]">
          Didn&apos;t receive the email? Check your spam or junk folder.
        </p>
      </div>
    </AuthLayout>
  );
}
