import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import { Code2, FileCode2 } from "lucide-react";
import type { ArchitectureFlowNode } from "./architecture-types";

export default function ArchitectureNode({
  data,
}: NodeProps<ArchitectureFlowNode>) {
  const isComponent = data.type === "component";

  const containerStyle = isComponent
    ? "border-purple-500/40 bg-[#211735]"
    : "border-[#353541] bg-[#191920]";

  const iconStyle = isComponent
    ? "bg-purple-500/15 text-purple-300"
    : "bg-[#30303c] text-gray-300";

  const labelStyle = isComponent
    ? "text-purple-300"
    : "text-gray-400";

  return (
    <div
      className={`min-w-[190px] rounded-xl border px-4 py-3 shadow-lg ${containerStyle}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-[#111117] !bg-purple-400"
      />

      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
        >
          {isComponent ? (
            <Code2 size={17} />
          ) : (
            <FileCode2 size={17} />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {data.label}
          </p>

          <p
            className={`mt-1 text-[10px] font-medium uppercase tracking-wider ${labelStyle}`}
          >
            {isComponent ? "React component" : "Module"}
          </p>
        </div>
      </div>

      <p
        className="mt-3 max-w-[190px] truncate border-t border-white/10 pt-2 text-[10px] text-gray-500"
        title={data.path}
      >
        {data.path}
      </p>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-[#111117] !bg-purple-400"
      />
    </div>
  );
}