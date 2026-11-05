
"use client";

import { useEffect, useState } from "react";
import {
  Code2,
  LockKeyhole,
  ArrowUpRight,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GitHubProfile = {
  username: string;
  name: string;
  avatarUrl: string;
};

export default function GitHubConnectionCard() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<GitHubProfile | null>(null);

  useEffect(() => {
    async function loadGitHubProfile() {
      try {
        const supabase = createSupabaseBrowserClient();

        const { data, error: identitiesError } =
          await supabase.auth.getUserIdentities();

        if (identitiesError) {
          throw identitiesError;
        }

        const githubIdentity = data.identities.find(
          (identity) => identity.provider === "github"
        );

        if (!githubIdentity) {
          setProfile(null);
          return;
        }

        const identityData = (githubIdentity.identity_data ?? {}) as Record<
          string,
          string | undefined
        >;

        setProfile({
          username:
            identityData.user_name ||
            identityData.login ||
            identityData.preferred_username ||
            "GitHub user",
          name: identityData.name || identityData.user_name || "GitHub user",
          avatarUrl: identityData.avatar_url || "",
        });
      } catch {
        setError("Unable to check your GitHub connection.");
      } finally {
        setIsLoading(false);
      }
    }

    loadGitHubProfile();
  }, []);

  async function handleConnect() {
    setIsConnecting(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Your CODE ATLAS session was not found. Please sign in again."
        );
      }

      const { data, error: identitiesError } =
        await supabase.auth.getUserIdentities();

      if (identitiesError) {
        throw identitiesError;
      }

      const githubIdentity = data.identities.find(
        (identity) => identity.provider === "github"
      );

      if (githubIdentity) {
        throw new Error("GitHub is already connected to your account.");
      }

      const { error: linkingError } = await supabase.auth.linkIdentity({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/repositories`,
          scopes: "read:user user:email",
        },
      });

      if (linkingError) {
        throw linkingError;
      }
    } catch (connectionError) {
      setError(
        connectionError instanceof Error
          ? connectionError.message
          : "Unable to connect your GitHub account."
      );
      setIsConnecting(false);
    }
  }

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

            {profile && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <CheckCircle2 size={11} />
                Connected
              </span>
            )}
          </div>

          <p className="mt-2 max-w-xl text-xs leading-5 text-[#777483]">
            {profile
              ? "Your GitHub account is linked to CODE ATLAS."
              : "Link your GitHub account to CODE ATLAS and prepare your workspace for repository exploration."}
          </p>

          {isLoading ? (
            <div className="mt-6 flex items-center gap-2 text-xs text-[#92919f]">
              <LoaderCircle size={15} className="animate-spin" />
              Checking GitHub connection...
            </div>
          ) : profile ? (
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-[#302d3b] bg-[#191720] p-4">
              <div
                role="img"
                aria-label={`${profile.username} GitHub avatar`}
                className="h-12 w-12 shrink-0 rounded-full border border-[#383444] bg-cover bg-center bg-[#302d3b]"
                style={
                  profile.avatarUrl
                    ? { backgroundImage: `url("${profile.avatarUrl}")` }
                    : undefined
                }
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {profile.name}
                </p>
                <p className="mt-1 truncate text-xs text-[#92919f]">
                  @{profile.username}
                </p>
              </div>

              <CheckCircle2
                size={18}
                className="ml-auto shrink-0 text-emerald-400"
              />
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] text-[#92919f]">
              <span className="flex items-center gap-1.5">
                <Code2 size={13} />
                Public repositories
              </span>

              <span className="flex items-center gap-1.5">
                <LockKeyhole size={13} />
                Authorized private repositories
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400"
        >
          {error}
        </p>
      )}

      {!isLoading && !profile && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          className="mt-7 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-4 text-sm font-semibold text-white transition hover:bg-[#8966f0] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isConnecting ? (
            <>
              <LoaderCircle size={16} className="animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Code2 size={16} />
              Connect GitHub
              <ArrowUpRight size={14} />
            </>
          )}
        </button>
      )}
    </section>
  );
}
