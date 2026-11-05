
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface SignUpData {
  fullName: string;
  email: string;
  password: string;
}

interface SignInData {
  email: string;
  password: string;
}

export async function signUpWithEmail({
  fullName,
  email,
  password,
}: SignUpData) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInWithEmail({
  email,
  password,
}: SignInData) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}
