"use client";

import { Code2 } from "lucide-react";
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
    isLoading,
    error,
    profile,
    connect,
  } = useGitHubConnection();

  return (
    <section className="rounded-xl border border-[#252530] bg-[#111117] p-6 sm:p-8">
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

          {isLoading ? (
            <GitHubConnectionLoading />
          ) : profile ? (
            <div className="mt-6">
              <GitHubProfileDetails profile={profile} />
            </div>
          ) : (
            <GitHubConnectionBenefits />
          )}
        </div>
      </div>

      <GitHubConnectionError error={error} />

      {!isLoading && !profile && (
        <GitHubConnectButton
          isConnecting={isConnecting}
          disabled={isConnecting}
          onClick={connect}
        />
      )}
    </section>
  );
}