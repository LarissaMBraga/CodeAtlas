"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type GitHubProfile = {
  username: string;
  name: string;
  avatarUrl: string;
};

export function useGitHubConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
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

    void loadGitHubProfile();
  }, []);

  async function connect() {
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

  async function disconnect() {
    const confirmed = window.confirm(
      "Are you sure you want to disconnect your GitHub account?"
    );

    if (!confirmed) {
      return;
    }

    setIsDisconnecting(true);
    setError("");

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

      const { error: unlinkError } =
        await supabase.auth.unlinkIdentity(githubIdentity);

      if (unlinkError) {
        throw unlinkError;
      }

      setProfile(null);
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Unable to disconnect your GitHub account."
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  return {
    profile,
    error,
    isLoading,
    isConnecting,
    isDisconnecting,
    connect,
    disconnect,
  };
}