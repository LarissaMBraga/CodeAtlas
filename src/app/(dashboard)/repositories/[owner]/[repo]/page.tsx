
import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import RepositoryAnalysisContent from "./RepositoryAnalysisContent";

export default function RepositoryAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[60vh] max-w-[1440px] items-center justify-center px-6">
          <div className="flex items-center gap-3 text-sm text-[#92919f]">
            <LoaderCircle
              size={20}
              className="animate-spin text-[#b7a1ff]"
            />
            Loading repository analysis...
          </div>
        </div>
      }
    >
      <RepositoryAnalysisContent />
    </Suspense>
  );
}
