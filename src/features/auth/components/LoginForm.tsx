"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import {
  AuthFormFeedback,
  AuthSubmitButton,
  getAuthFieldErrors,
} from "@/components/auth/AuthFormParts";
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
      setErrors(getAuthFieldErrors<keyof FieldErrors>(result.error.issues));
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

      <AuthFormFeedback message={feedback} />

      <AuthSubmitButton
        loading={loading}
        loadingText="Signing in..."
        buttonText="Sign in"
      />
    </form>
  );
}