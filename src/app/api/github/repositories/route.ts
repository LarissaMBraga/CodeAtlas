
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username || !/^[a-zA-Z0-9-]+$/.test(username)) {
      return NextResponse.json(
        { error: "A valid GitHub username is required." },
        { status: 400 }
      );
    }

    const githubResponse = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=public&sort=updated&per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      }
    );

    if (githubResponse.status === 404) {
      return NextResponse.json(
        { error: "GitHub user not found." },
        { status: 404 }
      );
    }

    if (githubResponse.status === 403 || githubResponse.status === 429) {
      return NextResponse.json(
        { error: "GitHub API rate limit reached. Please try again later." },
        { status: 429 }
      );
    }

    if (!githubResponse.ok) {
      return NextResponse.json(
        { error: "Unable to retrieve public repositories from GitHub." },
        { status: 502 }
      );
    }

    const data = await githubResponse.json();

    const repositories = data
      .filter(
        (repository: { private: boolean }) => !repository.private
      )
      .map(
        (repository: {
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
        }) => ({
          id: repository.id,
          name: repository.name,
          fullName: repository.full_name,
          description: repository.description,
          url: repository.html_url,
          language: repository.language,
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          defaultBranch: repository.default_branch,
          updatedAt: repository.updated_at,
        })
      );

    return NextResponse.json({ repositories });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while retrieving repositories." },
      { status: 500 }
    );
  }
}
