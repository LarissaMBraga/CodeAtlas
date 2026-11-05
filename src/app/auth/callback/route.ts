
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedPath = searchParams.get("next");

  const next =
    requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/overview";

  const isGitHubFlow = next === "/repositories";

  const failureUrl = isGitHubFlow
    ? `${origin}/repositories?github_error=oauth_failed`
    : `${origin}/login?error=confirmation_failed`;

  if (!code) {
    return NextResponse.redirect(
      isGitHubFlow
        ? failureUrl
        : `${origin}/login?error=missing_code`
    );
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(failureUrl);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
