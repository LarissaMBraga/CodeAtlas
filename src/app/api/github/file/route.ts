import { NextResponse } from "next/server";
import { githubApiFetch } from "@/lib/github/app-auth";
import { isRateLimitResponse } from "@/lib/github/rate-limit";

const MAX_FILE_SIZE = 500 * 1024;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("owner" in body) ||
      !("repo" in body) ||
      !("path" in body) ||
      !("ref" in body) ||
      typeof body.owner !== "string" ||
      typeof body.repo !== "string" ||
      typeof body.path !== "string" ||
      typeof body.ref !== "string"
    ) {
      return NextResponse.json(
        { error: "Owner, repository, file path and branch are required." },
        { status: 400 }
      );
    }

    const { owner, repo, path, ref } = body;

    if (
      !/^[a-zA-Z0-9-]+$/.test(owner) ||
      !/^[a-zA-Z0-9_.-]+$/.test(repo) ||
      !/^[a-zA-Z0-9._/-]+$/.test(ref) ||
      path.startsWith("/") ||
      path.split("/").some(
        (part) => !part || part === "." || part === ".."
      )
    ) {
      return NextResponse.json(
        { error: "Invalid repository or file information." },
        { status: 400 }
      );
    }

    const encodedPath = path
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const endpoint =
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` +
      `/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;

    const response = await githubApiFetch(endpoint);

    if (await isRateLimitResponse(response)) {
      return NextResponse.json(
        { error: "GitHub API rate limit reached. Please try again later." },
        { status: 429 }
      );
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: "File not found in this repository or branch." },
        { status: 404 }
      );
    }

    if (response.status === 403) {
      return NextResponse.json(
        { error: "GitHub denied access to this file." },
        { status: 403 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to retrieve file content from GitHub." },
        { status: 502 }
      );
    }

    const file = await response.json();

    if (file.type !== "file" || typeof file.content !== "string") {
      return NextResponse.json(
        { error: "The selected path is not a supported file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "This file is too large to display in the Code Explorer." },
        { status: 413 }
      );
    }

    const content = Buffer.from(
      file.content.replace(/\s/g, ""),
      "base64"
    ).toString("utf-8");

    return NextResponse.json({
      name: file.name,
      path: file.path,
      sha: file.sha,
      size: file.size,
      content,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while retrieving the file." },
      { status: 500 }
    );
  }
}