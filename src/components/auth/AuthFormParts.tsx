import { ArrowRight, LoaderCircle } from "lucide-react";

export type AuthFeedbackType = "success" | "error";

type AuthFormFeedbackProps = {
  message: string;
  type?: AuthFeedbackType;
};

type AuthSubmitButtonProps = {
  loading: boolean;
  loadingText: string;
  buttonText: string;
};

export function getAuthFieldErrors<T extends string>(
  issues: readonly {
    path: PropertyKey[];
    message: string;
  }[]
): Partial<Record<T, string>> {
  const errors: Partial<Record<T, string>> = {};

  issues.forEach((issue) => {
    const field = issue.path[0] as T | undefined;

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  });

  return errors;
}

export function AuthFormFeedback({
  message,
  type = "error",
}: AuthFormFeedbackProps) {
  if (!message) return null;

  return (
    <p
      role={type === "error" ? "alert" : "status"}
      className={`rounded-lg border p-3 text-xs leading-5 ${
        type === "error"
          ? "border-red-400/20 bg-red-400/10 text-red-300"
          : "border-[#9b7bff]/20 bg-[#9b7bff]/10 text-[#c5b5ff]"
      }`}
    >
      {message}
    </p>
  );
}

export function AuthSubmitButton({
  loading,
  loadingText,
  buttonText,
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#9b7bff] text-sm font-semibold text-white transition hover:bg-[#8966f0] focus:outline-none focus:ring-2 focus:ring-[#b7a1ff] focus:ring-offset-2 focus:ring-offset-[#111117] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <LoaderCircle size={17} className="animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {buttonText}
          <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}