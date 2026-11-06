import type { Edge, Node } from "@xyflow/react";

export type ArchitectureNodeData = {
  label: string;
  path: string;
  type: "component" | "module";
};

export type ArchitectureFlowNode = Node<ArchitectureNodeData>;

export type ArchitectureResponse = {
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

export type ArchitectureLayout = {
  nodes: ArchitectureFlowNode[];
  edges: Edge[];
};