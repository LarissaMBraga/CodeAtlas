
import { NextRequest, NextResponse } from "next/server";
import { githubApiFetch } from "@/lib/github/app-auth";
import { isRateLimitResponse } from "@/lib/github/rate-limit";

type GitHubRepositoryResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
  private: boolean;
  owner: {
    login: string;
  };
};

type PublicRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
  private: boolean;
  owner: {
    login: string;
  };
};

function mapRepository(
  repository: GitHubRepositoryResponse,
): PublicRepository {
  return {
    id: repository.id,
    name: repository.name,
    full_name: repository.full_name,
    description: repository.description,
    html_url: repository.html_url,
    language: repository.language,
    stargazers_count: repository.stargazers_count,
    forks_count: repository.forks_count,
    default_branch: repository.default_branch,
    updated_at: repository.updated_at,
    private: repository.private,
    owner: {
      login: repository.owner.login,
    },
  };
}

function sortByRecentlyUpdated(
  repositories: PublicRepository[],
): PublicRepository[] {
  return repositories.sort((a, b) => {
    const dateA = Date.parse(a.updated_at || "");
    const dateB = Date.parse(b.updated_at || "");

    const validA = Number.isFinite(dateA);
    const validB = Number.isFinite(dateB);

    if (!validA && !validB) return 0;
    if (!validA) return 1;
    if (!validB) return -1;

    return dateB - dateA;
  });
}

function getGitHubErrorMessage(status: number) {
  if (status === 404) {
    return "Repository not found or not accessible.";
  }

  if (status === 403) {
    return "GitHub API access was denied. Check the GitHub App permissions or rate limit.";
  }

  return "Unable to retrieve repository information from GitHub.";
}

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username")?.trim();

    if (!username) {
      return NextResponse.json(
        { error: "GitHub username is required." },
        { status: 400 },
      );
    }

    const response = await githubApiFetch(
      "/installation/repositories?per_page=100",
    );

    if (await isRateLimitResponse(response)) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: getGitHubErrorMessage(response.status) },
        { status: response.status },
      );
    }

    const data = (await response.json()) as {
      repositories: GitHubRepositoryResponse[];
    };

    const repositories = sortByRecentlyUpdated(
      (data.repositories ?? [])
        .filter(
          (repository) =>
            !repository.private &&
            repository.owner.login.toLowerCase() === username.toLowerCase(),
        )
        .map(mapRepository),
    );

    return NextResponse.json({ repositories });
  } catch (error) {
    console.error("Impact repositories GET error:", error);

    return NextResponse.json(
      { error: "Unable to retrieve public repositories." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      repositoryUrl?: string;
    };

    const repositoryUrl = body.repositoryUrl?.trim();

    if (!repositoryUrl) {
      return NextResponse.json(
        { error: "Repository URL is required." },
        { status: 400 },
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(repositoryUrl);
    } catch {
      return NextResponse.json(
        { error: "Enter a valid GitHub repository URL." },
        { status: 400 },
      );
    }

    if (
      parsedUrl.protocol !== "https:" ||
      !["github.com", "www.github.com"].includes(parsedUrl.hostname)
    ) {
      return NextResponse.json(
        { error: "Only public GitHub repositories are supported." },
        { status: 400 },
      );
    }

    const segments = parsedUrl.pathname.split("/").filter(Boolean);

    if (segments.length !== 2) {
      return NextResponse.json(
        {
          error:
            "Use a repository URL in the format github.com/owner/repository.",
        },
        { status: 400 },
      );
    }

    const [owner, rawRepository] = segments;
    const repository = rawRepository.replace(/\.git$/i, "");

    if (
      !/^[a-zA-Z0-9-]+$/.test(owner) ||
      !/^[a-zA-Z0-9_.-]+$/.test(repository)
    ) {
      return NextResponse.json(
        {
          error:
            "The repository URL contains an invalid owner or repository name.",
        },
        { status: 400 },
      );
    }

    const response = await githubApiFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
    );

    if (await isRateLimitResponse(response)) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    if (response.status === 404) {
      return NextResponse.json(
        {
          error:
            "Repository not found. Make sure it exists and is public.",
        },
        { status: 404 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: getGitHubErrorMessage(response.status) },
        { status: response.status },
      );
    }

    const data = (await response.json()) as GitHubRepositoryResponse;

    if (data.private) {
      return NextResponse.json(
        {
          error:
            "This repository is private. Only public repositories can be analyzed here.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      repository: mapRepository(data),
    });
  } catch (error) {
    console.error("Impact repository validation error:", error);

    return NextResponse.json(
      { error: "Unable to validate this GitHub repository." },
      { status: 500 },
    );
  }
}
