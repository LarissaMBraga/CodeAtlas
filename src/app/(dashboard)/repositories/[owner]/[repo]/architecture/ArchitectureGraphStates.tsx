import {
  AlertCircle,
  LoaderCircle,
  Network,
} from "lucide-react";

export function ArchitectureLoadingState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-[#252530] bg-[#111117]">
      <LoaderCircle
        size={30}
        className="animate-spin text-purple-400"
      />

      <p className="mt-4 text-sm font-medium text-gray-300">
        Analyzing repository architecture
      </p>

      <p className="mt-1 text-xs text-gray-500">
        Mapping components and internal dependencies...
      </p>
    </div>
  );
}

type ArchitectureErrorStateProps = {
  error: string;
  onRetry: () => void;
};

export function ArchitectureErrorState({
  error,
  onRetry,
}: ArchitectureErrorStateProps) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 px-6 text-center">
      <AlertCircle size={28} className="text-red-400" />

      <p className="mt-4 text-sm font-semibold text-white">
        Architecture analysis failed
      </p>

      <p className="mt-2 max-w-md text-xs text-gray-400">
        {error}
      </p>

      <button
        onClick={onRetry}
        className="mt-5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-medium text-purple-300 transition hover:bg-purple-500/20"
      >
        Try again
      </button>
    </div>
  );
}

export function ArchitectureEmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[#252530] bg-[#111117] px-6 text-center">
      <Network size={30} className="text-gray-500" />

      <p className="mt-4 text-sm font-semibold text-white">
        No architecture data found
      </p>

      <p className="mt-2 max-w-md text-xs text-gray-500">
        No supported source files or internal dependencies were found in this repository.
      </p>
    </div>
  );
}