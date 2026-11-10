
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const repositorySchema = z.object({
  owner: z
    .string()
    .trim()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9-]+$/),
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  repositoryFullName: z.string().trim().min(1).max(140),
  repositoryUrl: z
    .string()
    .url()
    .refine((value) => {
      try {
        return new URL(value).hostname === "github.com";
      } catch {
        return false;
      }
    }),
  description: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  language: z.string().nullable(),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  defaultBranch: z.string().min(1).max(255),
});

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error: authError } =
      await supabase.auth.getUser();

    if (authError || !data.user) {
      return NextResponse.json({ repositories: [] });
    }

    const { data: repositories, error } = await supabase
      .from("recent_repositories")
      .select(
        "id, repository_key, repository_full_name, owner, name, repository_url, description, avatar_url, language, stars, forks, default_branch, last_analyzed_at"
      )
      .eq("user_id", data.user.id)
      .order("last_analyzed_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Recent Repositories] Fetch failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        {
          error: "Unable to retrieve recent repositories.",
          ...(process.env.NODE_ENV === "development"
            ? {
                diagnostic: {
                  message: error.message,
                  code: error.code,
                  details: error.details,
                  hint: error.hint,
                },
              }
            : {}),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      repositories: repositories ?? [],
    });
  } catch (error) {
    console.error("[Recent Repositories] GET failed:", error);

    return NextResponse.json(
      {
        error: "Unable to retrieve recent repositories.",
        ...(process.env.NODE_ENV === "development"
          ? {
              diagnostic: {
                message:
                  error instanceof Error
                    ? error.message
                    : String(error),
              },
            }
          : {}),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error: authError } =
      await supabase.auth.getUser();

    if (authError || !data.user) {
      return NextResponse.json({ saved: false });
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

    const validation = repositorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid repository information.",
          details: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const repository = validation.data;

    const repositoryKey =
      `${repository.owner}/${repository.name}`.toLowerCase();

    const { error } = await supabase
      .from("recent_repositories")
      .upsert(
        {
          user_id: data.user.id,
          repository_key: repositoryKey,
          repository_full_name: repository.repositoryFullName,
          owner: repository.owner,
          name: repository.name,
          repository_url: repository.repositoryUrl,
          description: repository.description,
          avatar_url: repository.avatarUrl,
          language: repository.language,
          stars: repository.stars,
          forks: repository.forks,
          default_branch: repository.defaultBranch,
          last_analyzed_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,repository_key",
        },
      );

    if (error) {
      console.error("[Recent Repositories] Save failed:", {
        message: error.message,
        code: error.code,
      });

      return NextResponse.json(
        { error: "Unable to save repository history." },
        { status: 500 },
      );
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("[Recent Repositories] POST failed:", error);

    return NextResponse.json(
      { error: "Unable to save repository history." },
      { status: 500 },
    );
  }
}
