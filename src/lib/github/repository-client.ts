export async function fetchRepository<T>(
  repositoryUrl: string
): Promise<T> {
  const response = await fetch("/api/github/repository", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositoryUrl,
    }),
  });

  const data = (await response.json()) as {
    error?: string;
    repository?: T;
  };

  if (!response.ok) {
    throw new Error(
      data.error || "Unable to retrieve repository information."
    );
  }

  if (!data.repository) {
    throw new Error("Repository information is unavailable.");
  }

  return data.repository;
}

export function getRepositoryAnalysisPath(fullName: string) {
  const [owner, repository] = fullName.split("/");

  if (!owner || !repository || fullName.split("/").length !== 2) {
    throw new Error("Invalid repository information.");
  }

  return `/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
}