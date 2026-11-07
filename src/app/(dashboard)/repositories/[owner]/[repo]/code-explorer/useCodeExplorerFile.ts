
import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { getLanguage } from "./file-tree-utils";
import type {
  FileContent,
  SourceFile,
} from "./code-explorer-types";

type UseCodeExplorerFileProps = {
  owner: string;
  repo: string;
  defaultBranch: string;
  selectedFile: SourceFile | null;
};

type UseCodeExplorerFileResult = {
  fileContent: FileContent | null;
  highlightedCode: string;
  isLoading: boolean;
  error: string;
};

export function useCodeExplorerFile({
  owner,
  repo,
  defaultBranch,
  selectedFile,
}: UseCodeExplorerFileProps): UseCodeExplorerFileResult {
  const [fileContent, setFileContent] =
    useState<FileContent | null>(null);
  const [highlightedCode, setHighlightedCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedFile) {
      setFileContent(null);
      setHighlightedCode("");
      setIsLoading(false);
      setError("");
      return;
    }

    const file = selectedFile;
    const controller = new AbortController();

    async function loadFile() {
      setIsLoading(true);
      setError("");
      setFileContent(null);
      setHighlightedCode("");

      try {
        const response = await fetch("/api/github/file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner,
            repo,
            path: file.path,
            ref: defaultBranch,
          }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to load file content."
          );
        }

        const content = result as FileContent;
        const html = await codeToHtml(content.content, {
          lang: getLanguage(content.path),
          theme: "github-dark",
        });

        if (!controller.signal.aborted) {
          setFileContent(content);
          setHighlightedCode(html);
        }
      } catch (loadError) {
        if (
          loadError instanceof Error &&
          loadError.name !== "AbortError" &&
          !controller.signal.aborted
        ) {
          setError(loadError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadFile();

    return () => controller.abort();
  }, [owner, repo, defaultBranch, selectedFile]);

  return {
    fileContent,
    highlightedCode,
    isLoading,
    error,
  };
}
