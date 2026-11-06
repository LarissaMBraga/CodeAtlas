import type { Edge } from "@xyflow/react";
import type {
  ArchitectureFlowNode,
  ArchitectureLayout,
  ArchitectureResponse,
} from "./architecture-types";

function createNodeMap(response: ArchitectureResponse) {
  return new Map(
    response.nodes.map((node) => [node.id, node])
  );
}

function calculateNodeLevels(response: ArchitectureResponse) {
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

    if (processed.has(current)) {
      continue;
    }

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
      levels.set(
        node.id,
        Math.max(levels.get(node.id) ?? 0, 1)
      );
    }
  });

  return levels;
}

function groupNodesByLevel(
  response: ArchitectureResponse,
  levels: Map<string, number>
) {
  const grouped = new Map<
    number,
    ArchitectureResponse["nodes"]
  >();

  response.nodes.forEach((node) => {
    const level = levels.get(node.id) ?? 0;
    const group = grouped.get(level) ?? [];

    group.push(node);
    grouped.set(level, group);
  });

  return grouped;
}

function createPositionedNodes(
  response: ArchitectureResponse,
  levels: Map<string, number>,
  grouped: Map<number, ArchitectureResponse["nodes"]>
): ArchitectureFlowNode[] {
  return response.nodes.map((node) => {
    const level = levels.get(node.id) ?? 0;
    const group = grouped.get(level) ?? [];
    const index = group.findIndex(
      (item) => item.id === node.id
    );

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
}

function createEdges(
  response: ArchitectureResponse,
  nodeMap: ReturnType<typeof createNodeMap>
): Edge[] {
  return response.edges
    .filter(
      (edge) =>
        nodeMap.has(edge.source) &&
        nodeMap.has(edge.target)
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
}

export function createArchitectureLayout(
  response: ArchitectureResponse
): ArchitectureLayout {
  const nodeMap = createNodeMap(response);
  const levels = calculateNodeLevels(response);
  const grouped = groupNodesByLevel(response, levels);

  return {
    nodes: createPositionedNodes(
      response,
      levels,
      grouped
    ),
    edges: createEdges(response, nodeMap),
  };
}