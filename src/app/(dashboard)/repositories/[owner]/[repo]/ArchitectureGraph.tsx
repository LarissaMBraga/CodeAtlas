
"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import ArchitectureGraphCanvas from "./architecture/ArchitectureGraphCanvas";
import ArchitectureSummary from "./architecture/ArchitectureSummary";
import {
  ArchitectureEmptyState,
  ArchitectureErrorState,
  ArchitectureLoadingState,
} from "./architecture/ArchitectureGraphStates";
import { createArchitectureLayout } from "./architecture/architecture-layout";
import type { ArchitectureResponse } from "./architecture/architecture-types";

type ArchitectureGraphProps = {
  owner: string;
  repo: string;
};

async function fetchArchitecture(
  owner: string,
  repo: string
): Promise<ArchitectureResponse> {
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

  return result as ArchitectureResponse;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

function ArchitectureTruncationNotice({
  maxFiles,
}: {
  maxFiles: number;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
      <AlertCircle
        size={17}
        className="mt-0.5 shrink-0 text-amber-400"
      />

      <p className="text-xs leading-relaxed text-amber-200/80">
        This repository contains more source files than the current analysis limit.
        The graph displays a partial architecture based on up to{" "}
        {maxFiles} files.
      </p>
    </div>
  );
}

export default function ArchitectureGraph({
  owner,
  repo,
}: ArchitectureGraphProps) {
  const [architecture, setArchitecture] =
    useState<ArchitectureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadArchitecture = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await fetchArchitecture(owner, repo);
      setArchitecture(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [owner, repo]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadArchitecture();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadArchitecture]);

  if (loading) {
    return <ArchitectureLoadingState />;
  }

  if (error) {
    return (
      <ArchitectureErrorState
        error={error}
        onRetry={() => void loadArchitecture()}
      />
    );
  }

  if (!architecture || architecture.nodes.length === 0) {
    return <ArchitectureEmptyState />;
  }

  const layout = createArchitectureLayout(architecture);

  return (
    <div className="space-y-5">
      <ArchitectureSummary summary={architecture.summary} />

      {architecture.summary.truncated && (
        <ArchitectureTruncationNotice
          maxFiles={architecture.summary.maxFiles}
        />
      )}

      <ArchitectureGraphCanvas
        initialNodes={layout.nodes}
        initialEdges={layout.edges}
      />

      <p className="text-xs text-gray-500">
        Select and drag nodes to explore the architecture. Use the controls or mouse wheel to zoom and navigate the graph.
      </p>
    </div>
  );
}
