"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Profile = {
  name: string;
  email: string;
  avatarUrl: string;
};

type ProfileAnchor = "header" | "sidebar";

type ProfileContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  openAnchor: ProfileAnchor | null;
  isSigningOut: boolean;
  error: string;
  toggleMenu: (anchor: ProfileAnchor) => void;
  closeMenu: () => void;
  signOut: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function getString(...values: unknown[]) {
  return values.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0
  )?.trim() ?? "";
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}

export function ProfileAvatar({
  profile,
  size = "h-9 w-9",
}: {
  profile: Profile | null;
  size?: string;
}) {
  const name = profile?.name || "CODE ATLAS User";
  const avatarUrl = profile?.avatarUrl;

  return (
    <div
      role="img"
      aria-label={`${name} avatar`}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#9b7bff]/25 bg-[#9b7bff]/15 text-xs font-semibold text-[#c5b5ff] ${size}`}
      style={
        avatarUrl
          ? {
              backgroundImage: `url("${avatarUrl}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {getInitials(name)}
    </div>
  );
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openAnchor, setOpenAnchor] = useState<ProfileAnchor | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  const closeMenu = useCallback(() => {
    setOpenAnchor(null);
    setError("");
  }, []);

  const toggleMenu = useCallback((anchor: ProfileAnchor) => {
    setOpenAnchor((current) => (current === anchor ? null : anchor));
    setError("");
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (active) {
            setProfile(null);
          }
          return;
        }

       const { data: identities, error: identitiesError } =
  await supabase.auth.getUserIdentities();

if (identitiesError) {
  throw identitiesError;
}

const githubIdentity = identities?.identities?.find(
  (identity) => identity.provider === "github"
);

        const metadata = user.user_metadata ?? {};

        const githubData = (githubIdentity?.identity_data ?? {}) as Record<
          string,
          unknown
        >;

        const email = user.email || "";

        const name = getString(
          metadata.full_name,
          metadata.name,
          githubData.name,
          githubData.user_name,
          email.split("@")[0],
          "CODE ATLAS User"
        );

        const avatarUrl = getString(
          metadata.avatar_url,
          metadata.picture,
          githubData.avatar_url
        );

        if (active) {
          setProfile({
            name,
            email,
            avatarUrl,
          });
        }
      } catch {
        if (active) {
          setProfile(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(null);
        setOpenAnchor(null);
        setIsLoading(false);
        return;
      }

      void loadProfile();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    setError("");

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      setProfile(null);
      setOpenAnchor(null);

      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Unable to sign out. Please try again."
      );
    } finally {
      setIsSigningOut(false);
    }
  }, [router, supabase]);

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      openAnchor,
      isSigningOut,
      error,
      toggleMenu,
      closeMenu,
      signOut,
    }),
    [
      profile,
      isLoading,
      openAnchor,
      isSigningOut,
      error,
      toggleMenu,
      closeMenu,
      signOut,
    ]
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
      {openAnchor && (
        <ProfileMenu
          profile={profile}
          anchor={openAnchor}
          isLoading={isLoading}
          isSigningOut={isSigningOut}
          error={error}
          onClose={closeMenu}
          onSignOut={signOut}
        />
      )}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider.");
  }

  return context;
}

function ProfileMenu({
  profile,
  anchor,
  isLoading,
  isSigningOut,
  error,
  onClose,
  onSignOut,
}: {
  profile: Profile | null;
  anchor: ProfileAnchor;
  isLoading: boolean;
  isSigningOut: boolean;
  error: string;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close profile menu"
        className="fixed inset-0 z-[50] cursor-default bg-transparent"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-label="Account details"
        className={`fixed z-[60] w-[min(288px,calc(100vw-2rem))] rounded-xl border border-[#302b3d] bg-[#13121a] p-4 shadow-2xl shadow-black/50 ${
          anchor === "header"
            ? "right-6 top-[68px]"
            : "bottom-[76px] left-4"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <UserRound size={15} className="text-[#b7a1ff]" />
            Account details
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-[#777483] transition hover:bg-white/[0.06] hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-[#252530] bg-white/[0.02] p-3">
          <ProfileAvatar
            profile={profile}
            size="h-11 w-11"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {isLoading
                ? "Loading profile..."
                : profile?.name || "CODE ATLAS User"}
            </p>

            <p className="mt-1 break-all text-[11px] text-[#92919f]">
              {profile?.email || "No email available"}
            </p>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-300"
          >
            {error}
          </p>
        )}

        <div className="my-3 border-t border-[#252530]" />

        <button
          type="button"
          disabled={isSigningOut}
          onClick={() => void onSignOut()}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium text-[#f18b91] transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut size={16} />
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </>
  );
}