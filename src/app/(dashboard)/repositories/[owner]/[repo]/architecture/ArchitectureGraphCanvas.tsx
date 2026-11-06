import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
} from "@xyflow/react";
import type { ArchitectureFlowNode } from "./architecture-types";
import ArchitectureNode from "./ArchitectureNode";

const nodeTypes = {
  architecture: ArchitectureNode,
};

type ArchitectureGraphCanvasProps = {
  initialNodes: ArchitectureFlowNode[];
  initialEdges: Edge[];
};

export default function ArchitectureGraphCanvas({
  initialNodes,
  initialEdges,
}: ArchitectureGraphCanvasProps) {
  const [nodes, , onNodesChange] =
    useNodesState<ArchitectureFlowNode>(initialNodes);

  const [edges, , onEdgesChange] =
    useEdgesState<Edge>(initialEdges);

  const graphData = useMemo(
    () => ({ nodes, edges }),
    [nodes, edges]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#252530] bg-[#111117]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252530] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">
            <NetworkIcon />
          </span>

          <span className="text-sm font-medium text-white">
            Repository dependency graph
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-purple-400" />

            <span className="text-[11px] text-gray-400">
              Components
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-gray-500" />

            <span className="text-[11px] text-gray-400">
              Modules
            </span>
          </div>
        </div>
      </div>

      <div className="h-[600px] w-full">
        <ReactFlow
          nodes={graphData.nodes}
          edges={graphData.edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          defaultViewport={{
            x: 0,
            y: 0,
            zoom: 0.85,
          }}
          fitView={false}
          minZoom={0.08}
          maxZoom={1.8}
          proOptions={{
            hideAttribution: true,
          }}
          className="bg-[#0d0d13]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#34313f"
          />

          <Controls className="!overflow-hidden !rounded-lg !border !border-[#353541] !bg-[#191920] [&>button]:!border-[#353541] [&>button]:!bg-[#191920] [&>button]:!fill-gray-300 [&>button:hover]:!bg-[#292936]" />

          <MiniMap
            nodeColor={(node) =>
              node.data.type === "component"
                ? "#a78bfa"
                : "#6b7280"
            }
            maskColor="rgba(10, 10, 16, 0.75)"
            className="!border !border-[#353541] !bg-[#191920]"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

function NetworkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </svg>
  );
}