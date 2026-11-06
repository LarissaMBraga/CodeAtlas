
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  AlertCircle,
  Boxes,
  Code2,
  FileCode2,
  GitBranch,
  LoaderCircle,
  Network,
} from "lucide-react";
import "@xyflow/react/dist/style.css";

type ArchitectureNodeData = {
  label: string;
  path: string;
  type: "component" | "module";
};

type ArchitectureFlowNode = Node<ArchitectureNodeData>;

type ArchitectureResponse = {
  repository: {
    owner: string;
    name: string;
    branch: string;
  };
  nodes: {
    id: string;
    label: string;
    path: string;
    type: "component" | "module";
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
  }[];
  summary: {
    totalFiles: number;
    analyzedFiles: number;
    totalComponents: number;
    totalModules: number;
    totalConnections: number;
    truncated: boolean;
    maxFiles: number;
  };
};

function ArchitectureNode({ data }: NodeProps<ArchitectureFlowNode>) {
  const isComponent = data.type === "component";

  return (
    <div
      className={`min-w-[190px] rounded-xl border px-4 py-3 shadow-lg ${
        isComponent
          ? "border-purple-500/40 bg-[#211735]"
          : "border-[#353541] bg-[#191920]"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-[#111117] !bg-purple-400"
      />

      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isComponent
              ? "bg-purple-500/15 text-purple-300"
              : "bg-[#30303c] text-gray-300"
          }`}
        >
          {isComponent ? <Code2 size={17} /> : <FileCode2 size={17} />}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {data.label}
          </p>
          <p
            className={`mt-1 text-[10px] font-medium uppercase tracking-wider ${
              isComponent ? "text-purple-300" : "text-gray-400"
            }`}
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

const nodeTypes = {
  architecture: ArchitectureNode,
};

function createLayout(
  response: ArchitectureResponse
): {
  nodes: ArchitectureFlowNode[];
  edges: Edge[];
} {
  const nodeMap = new Map(
    response.nodes.map((node) => [node.id, node])
  );

  const levels = new Map<string, number>();
  const incoming = new Map<string, number>();

  response.nodes.forEach((node) => {
    levels.set(node.id, 0);
    incoming.set(node.id, 0);
  });

  response.edges.forEach((edge) => {
    incoming.set(
      edge.target,
      (incoming.get(edge.target) ?? 0) + 1
    );
  });

  const queue = response.nodes
    .filter((node) => incoming.get(node.id) === 0)
    .map((node) => node.id);

  const remainingIncoming = new Map(incoming);
  const processed = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (processed.has(current)) continue;
    processed.add(current);

    const outgoing = response.edges.filter(
      (edge) => edge.source === current
    );

    outgoing.forEach((edge) => {
      const nextLevel = (levels.get(current) ?? 0) + 1;

      levels.set(
        edge.target,
        Math.max(levels.get(edge.target) ?? 0, nextLevel)
      );

      const remaining =
        (remainingIncoming.get(edge.target) ?? 1) - 1;

      remainingIncoming.set(edge.target, remaining);

      if (remaining <= 0) {
        queue.push(edge.target);
      }
    });
  }

  response.nodes.forEach((node) => {
    if (!processed.has(node.id)) {
      levels.set(node.id, Math.max(levels.get(node.id) ?? 0, 1));
    }
  });

  const grouped = new Map<number, typeof response.nodes>();

  response.nodes.forEach((node) => {
    const level = levels.get(node.id) ?? 0;
    const group = grouped.get(level) ?? [];

    group.push(node);
    grouped.set(level, group);
  });

  const nodes: ArchitectureFlowNode[] = response.nodes.map((node) => {
    const level = levels.get(node.id) ?? 0;
    const group = grouped.get(level) ?? [];
    const index = group.findIndex((item) => item.id === node.id);

    return {
      id: node.id,
      type: "architecture",
      position: {
        x: level * 330,
        y: index * 150,
      },
      data: {
        label: node.label,
        path: node.path,
        type: node.type,
      },
    };
  });

  const edges: Edge[] = response.edges
    .filter(
      (edge) =>
        nodeMap.has(edge.source) && nodeMap.has(edge.target)
    )
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: false,
      style: {
        stroke: "#77718f",
        strokeWidth: 1.5,
      },
    }));

  return { nodes, edges };
}

export default function ArchitectureGraph({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<ArchitectureFlowNode>([]);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState<Edge>([]);

  const [summary, setSummary] =
    useState<ArchitectureResponse["summary"] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const graphData = useMemo(
    () => ({
      nodes,
      edges,
    }),
    [nodes, edges]
  );

  const loadArchitecture = useCallback(async () => {
    try {
      const response = await fetch("/api/github/architecture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryUrl: `https://github.com/${owner}/${repo}`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to analyze repository architecture."
        );
      }

      const architecture = result as ArchitectureResponse;
      const layout = createLayout(architecture);

      setNodes(layout.nodes);
      setEdges(layout.edges);
      setSummary(architecture.summary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [owner, repo, setNodes, setEdges]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadArchitecture();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadArchitecture]);

  if (loading) {
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

  if (error) {
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
          onClick={() => {
            setError("");
            setLoading(true);
            void loadArchitecture();
          }}
          className="mt-5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-medium text-purple-300 transition hover:bg-purple-500/20"
        >
          Try again
        </button>
      </div>
    );
  }

  if (nodes.length === 0) {
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

  return (
    <div className="space-y-5">
      {summary && (
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
      )}

      {summary?.truncated && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertCircle
            size={17}
            className="mt-0.5 shrink-0 text-amber-400"
          />
          <p className="text-xs leading-relaxed text-amber-200/80">
            This repository contains more source files than the current analysis limit.
            The graph displays a partial architecture based on up to{" "}
            {summary.maxFiles} files.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#252530] bg-[#111117]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252530] px-4 py-3">
          <div className="flex items-center gap-2">
            <Network size={16} className="text-purple-400" />
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

      <p className="text-xs text-gray-500">
        Select and drag nodes to explore the architecture. Use the controls or mouse wheel to zoom and navigate the graph.
      </p>
    </div>
  );
}
