
import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import CodeHealthAnalysis from "@/components/CodeHealthAnalysis";

type CodeHealthData = ComponentProps<
  typeof CodeHealthAnalysis
>["data"];

type UseRepositoryCodeHealthResult = {
  data: CodeHealthData | null;
  isLoading: boolean;
  error: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to analyze repository code health.";
}

export function useRepositoryCodeHealth(
  owner: string,
  repo: string,
  defaultBranch: string | null
): UseRepositoryCodeHealthResult {
  const [data, setData] = useState<CodeHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!defaultBranch) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError("");
      setData(null);

      try {
        const response = await fetch("/api/github/code-health", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner,
            repo,
            ref: defaultBranch,
          }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to analyze repository code health."
          );
        }

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [owner, repo, defaultBranch]);

  return { data, isLoading, error };
}
