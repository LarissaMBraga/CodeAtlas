"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import {
  AuthFormFeedback,
  AuthSubmitButton,
  getAuthFieldErrors,
  type AuthFeedbackType,
} from "@/components/auth/AuthFormParts";
import { registerSchema } from "@/features/auth/schemas/registerSchema";
import { signUpWithEmail } from "@/features/auth/services/authService";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function RegisterForm() {
  const router = useRouter();

  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] =
    useState<AuthFeedbackType>("success");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrors({});
    setFeedback("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const result = registerSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!result.success) {
      setErrors(getAuthFieldErrors<keyof FieldErrors>(result.error.issues));
      return;
    }

    setLoading(true);

    try {
      const data = await signUpWithEmail({
        fullName: result.data.fullName,
        email: result.data.email,
        password: result.data.password,
      });

      if (data.user && data.user.identities?.length === 0) {
        throw new Error("An account with this email may already exist.");
      }

      router.push("/verify-email");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
      setFeedbackType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <AuthInput
        id="fullName"
        name="fullName"
        label="Full name"
        type="text"
        placeholder="Your full name"
        autoComplete="name"
        required
        disabled={loading}
        error={errors.fullName}
      />

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

      <PasswordInput
        id="password"
        name="password"
        label="Password"
        placeholder="Create a password"
        autoComplete="new-password"
        required
        disabled={loading}
        error={errors.password}
      />

      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm password"
        placeholder="Repeat your password"
        autoComplete="new-password"
        required
        disabled={loading}
        error={errors.confirmPassword}
      />

      <p className="text-xs leading-5 text-[#777483]">
        Your password must contain at least 8 characters, including an
        uppercase letter, a lowercase letter and a number.
      </p>

      <AuthFormFeedback message={feedback} type={feedbackType} />

      <AuthSubmitButton
        loading={loading}
        loadingText="Creating account..."
        buttonText="Create account"
      />
    </form>
  );
}