
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import { loginSchema } from "@/features/auth/schemas/loginSchema";
import { signInWithEmail } from "@/features/auth/services/authService";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginForm() {
  const router = useRouter();

  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrors({});
    setFeedback("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const result = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!result.success) {
      const nextErrors: FieldErrors = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors;

        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      });

      setErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      await signInWithEmail({
        email: result.data.email,
        password: result.data.password,
      });

      router.push("/overview");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <AuthInput
        id="email"
        name="email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        disabled={loading}
        error={errors.email}
      />

      <div className="space-y-2">
        <PasswordInput
          id="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          disabled={loading}
          error={errors.password}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[#a98cff] transition hover:text-white"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {feedback && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-xs leading-5 text-red-300"
        >
          {feedback}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#9b7bff] text-sm font-semibold text-white transition hover:bg-[#8966f0] focus:outline-none focus:ring-2 focus:ring-[#b7a1ff] focus:ring-offset-2 focus:ring-offset-[#111117] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <LoaderCircle size={17} className="animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
