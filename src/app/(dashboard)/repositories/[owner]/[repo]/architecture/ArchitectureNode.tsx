
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import { Code2, FileCode2 } from "lucide-react";
import type { ArchitectureFlowNode } from "./architecture-types";

const nodeStyles = {
  component: {
    container: "border-purple-500/40 bg-[#211735]",
    icon: "bg-purple-500/15 text-purple-300",
    label: "text-purple-300",
    description: "React component",
    Icon: Code2,
  },
  module: {
    container: "border-[#353541] bg-[#191920]",
    icon: "bg-[#30303c] text-gray-300",
    label: "text-gray-400",
    description: "Module",
    Icon: FileCode2,
  },
} as const;

export default function ArchitectureNode({
  data,
}: NodeProps<ArchitectureFlowNode>) {
  const styles =
    data.type === "component"
      ? nodeStyles.component
      : nodeStyles.module;

  const Icon = styles.Icon;

  return (
    <div
      className={`min-w-[190px] rounded-xl border px-4 py-3 shadow-lg ${styles.container}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-[#111117] !bg-purple-400"
      />

      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
        >
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {data.label}
          </p>

          <p
            className={`mt-1 text-[10px] font-medium uppercase tracking-wider ${styles.label}`}
          >
            {styles.description}
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
