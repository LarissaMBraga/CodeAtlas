import {
  ArrowUpRight,
  CheckCircle2,
  Code2,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

type GitHubProfile = {
  username: string;
  name: string;
  avatarUrl: string;
};

type GitHubConnectionBadgeProps = {
  connected: boolean;
};

type GitHubProfileDetailsProps = {
  profile: GitHubProfile;
};

type GitHubConnectButtonProps = {
  isConnecting: boolean;
  disabled: boolean;
  onClick: () => void;
};

type GitHubConnectionErrorProps = {
  error: string;
};

export function GitHubConnectionBadge({
  connected,
}: GitHubConnectionBadgeProps) {
  if (!connected) return null;

  return (
    <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      <CheckCircle2 size={11} />
      Connected
    </span>
  );
}

export function GitHubConnectionLoading() {
  return (
    <div className="mt-6 flex items-center gap-2 text-xs text-[#92919f]">
      <LoaderCircle size={15} className="animate-spin" />
      Checking GitHub connection...
    </div>
  );
}

export function GitHubProfileDetails({
  profile,
}: GitHubProfileDetailsProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#302d3b] bg-[#191720] p-4">
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
  );
}

export function GitHubConnectionBenefits() {
  return (
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
  );
}

export function GitHubConnectButton({
  isConnecting,
  disabled,
  onClick,
}: GitHubConnectButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
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
  );
}

export function GitHubConnectionError({
  error,
}: GitHubConnectionErrorProps) {
  if (!error) return null;

  return (
    <p
      role="alert"
      className="mt-5 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400"
    >
      {error}
    </p>
  );
}