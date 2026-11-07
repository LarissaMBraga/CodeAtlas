import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildRepositoryContext } from "@/lib/ai/repository-context";
import { buildInvestigatorMessages } from "@/lib/ai/prompts";
import { OpenRouterProvider } from "@/lib/ai/openrouter";

const investigationSchema = z.object({
  owner: z
    .string()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9-]+$/),
  repo: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  branch: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._/-]+$/)
    .refine(
      (value) =>
        !value.includes("..") &&
        !value.includes("//") &&
        !value.endsWith("/") &&
        !value.startsWith("/"),
    ),
  question: z.string().trim().min(3).max(2000),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error: authError } =
      await supabase.auth.getUser();

    if (authError || !data.user) {
      return NextResponse.json(
        { error: "You must be authenticated to use AI Investigator." },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const validation = investigationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid investigation request.",
          details: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const { owner, repo, branch, question } = validation.data;

    const repositoryContext = await buildRepositoryContext({
      owner,
      repo,
      branch,
      question,
    });

    const messages = buildInvestigatorMessages({
      owner,
      repo,
      branch,
      question,
      context: repositoryContext.context,
    });

    const provider = new OpenRouterProvider();

    const answer = await provider.complete({
      messages,
      temperature: 0.2,
      maxTokens: 2000,
    });

    return NextResponse.json({
      answer,
      repository: {
        owner,
        repo,
        branch,
      },
      context: {
        filesIncluded: repositoryContext.filesIncluded,
        totalFilesAvailable: repositoryContext.totalFilesAvailable,
        excludedFiles: repositoryContext.excludedFiles,
        totalRedactions: repositoryContext.totalRedactions,
        truncated: repositoryContext.truncated,
        limitations: repositoryContext.limitations,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "GITHUB_RATE_LIMIT") {
        return NextResponse.json(
          {
            error: "GitHub API rate limit reached. Please try again later.",
          },
          { status: 429 },
        );
      }

      if (error.message === "GITHUB_ACCESS_DENIED") {
        return NextResponse.json(
          {
            error: "GitHub denied access to this repository.",
          },
          { status: 403 },
        );
      }

      console.error("[AI Investigator] Request failed:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("[AI Investigator] Unknown request failure:", error);
    }

    return NextResponse.json(
      {
        error: "Unable to complete the AI investigation. Please try again.",
      },
      { status: 502 },
    );
  }
}