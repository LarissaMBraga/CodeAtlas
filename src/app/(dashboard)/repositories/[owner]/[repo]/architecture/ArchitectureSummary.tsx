import {
  Boxes,
  Code2,
  FileCode2,
  GitBranch,
} from "lucide-react";
import type { ArchitectureResponse } from "./architecture-types";

type ArchitectureSummaryProps = {
  summary: ArchitectureResponse["summary"];
};

export default function ArchitectureSummary({
  summary,
}: ArchitectureSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <FileCode2 size={15} />
          <span className="text-xs">Analyzed files</span>
        </div>

        <p className="mt-3 text-2xl font-semibold text-white">
          {summary.analyzedFiles}
        </p>
      </div>

      <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
        <div className="flex items-center gap-2 text-purple-300">
          <Code2 size={15} />
          <span className="text-xs">Components</span>
        </div>

        <p className="mt-3 text-2xl font-semibold text-white">
          {summary.totalComponents}
        </p>
      </div>

      <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Boxes size={15} />
          <span className="text-xs">Modules</span>
        </div>

        <p className="mt-3 text-2xl font-semibold text-white">
          {summary.totalModules}
        </p>
      </div>

      <div className="rounded-xl border border-[#252530] bg-[#111117] p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <GitBranch size={15} />
          <span className="text-xs">Connections</span>
        </div>

        <p className="mt-3 text-2xl font-semibold text-white">
          {summary.totalConnections}
        </p>
      </div>
    </div>
  );
}