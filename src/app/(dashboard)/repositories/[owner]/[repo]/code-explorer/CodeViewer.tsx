import {
  AlertCircle,
  FileCode2,
  LoaderCircle,
} from "lucide-react";

type CodeViewerProps = {
  isLoading: boolean;
  error: string;
  highlightedCode: string;
};

function LoadingState() {
  return (
    <div className="flex min-h-[510px] items-center justify-center gap-3 text-xs text-[#92919f]">
      <LoaderCircle
        size={18}
        className="animate-spin text-[#b7a1ff]"
      />

      Loading source code...
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex min-h-[510px] flex-col items-center justify-center px-6 text-center">
      <AlertCircle size={24} className="text-red-400" />

      <p className="mt-3 text-xs font-medium text-white">
        Unable to load file
      </p>

      <p className="mt-2 max-w-sm text-xs leading-5 text-[#92919f]">
        {error}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[510px] flex-col items-center justify-center text-center">
      <FileCode2 size={28} className="text-[#51466f]" />

      <p className="mt-3 text-xs text-[#92919f]">
        Select a file to explore its source code.
      </p>
    </div>
  );
}

function HighlightedCode({
  html,
}: {
  html: string;
}) {
  return (
    <div className="code-explorer-content min-w-0 p-4">
      <div
        className="min-w-max text-xs leading-6 [&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!font-mono [&_code]:!font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default function CodeViewer({
  isLoading,
  error,
  highlightedCode,
}: CodeViewerProps) {
  let content = <EmptyState />;

  if (highlightedCode) {
    content = <HighlightedCode html={highlightedCode} />;
  }

  if (error) {
    content = <ErrorState error={error} />;
  }

  if (isLoading) {
    content = <LoadingState />;
  }

  return (
    <div className="min-h-[510px] min-w-0 flex-1 overflow-auto bg-[#0d0c12] [scrollbar-color:#51466f_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#51466f]">
      {content}
    </div>
  );
}