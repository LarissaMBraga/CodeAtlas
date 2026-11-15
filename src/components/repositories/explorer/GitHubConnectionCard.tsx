
"use client";

import Link from "next/link";
import { Code2, LoaderCircle, Unlink } from "lucide-react";
import { useGitHubConnection } from "@/hooks/useGitHubConnection";
import {
  GitHubConnectionBadge,
  GitHubConnectionBenefits,
  GitHubConnectionError,
  GitHubConnectButton,
  GitHubConnectionLoading,
  GitHubProfileDetails,
} from "@/components/repositories/GitHubConnectionCardParts";

export default function GitHubConnectionCard() {
  const {
    isConnecting,
    isDisconnecting,
    isLoading,
    isAuthenticated,
    error,
    profile,
    connect,
    disconnect,
  } = useGitHubConnection();

  return (
    <section className="w-full rounded-xl border border-[#252530] bg-[#111117] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#383444] bg-[#191720]">
          <Code2 size={22} className="text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              Connect your GitHub account
            </h2>

            <GitHubConnectionBadge connected={Boolean(profile)} />
          </div>

          <p className="mt-2 max-w-xl text-xs leading-5 text-[#777483]">
            {profile
              ? "Your GitHub account is linked to CODE ATLAS."
              : "Link your GitHub account to CODE ATLAS and prepare your workspace for repository exploration."}
          </p>
        </div>
      </div>

      {isLoading ? (
        <GitHubConnectionLoading />
      ) : profile ? (
        <div className="mt-6 w-full">
          <div className="w-full">
            <GitHubProfileDetails profile={profile} />
          </div>

          <button
            type="button"
            onClick={disconnect}
            disabled={isDisconnecting || isConnecting}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 text-sm font-medium text-red-400 transition hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDisconnecting ? (
              <>
                <LoaderCircle size={15} className="animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Unlink size={15} />
                Disconnect GitHub
              </>
            )}
          </button>
        </div>
      ) : !isAuthenticated ? (
        <div className="mt-6 rounded-lg border border-[#302d3b] bg-[#191720] p-5">
          <p className="text-sm font-semibold text-white">
            Create an account to connect GitHub
          </p>

          <p className="mt-2 text-xs leading-5 text-[#92919f]">
            Sign up for CODE ATLAS to link your GitHub account and access your
            repositories.
          </p>

          <Link
            href="/register"
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-4 text-sm font-semibold text-white transition hover:bg-[#8966f0] sm:w-auto"
          >
            Create account
          </Link>

          <p className="mt-3 text-[11px] text-[#777483]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#b7a1ff] transition hover:text-white"
            >
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
          <GitHubConnectionBenefits />

          <GitHubConnectButton
            isConnecting={isConnecting}
            disabled={isConnecting || isDisconnecting}
            onClick={connect}
          />
        </>
      )}

      <GitHubConnectionError error={error} />
    </section>
  );
}
