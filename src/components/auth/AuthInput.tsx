
import type { InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function AuthInput({
  label,
  error,
  id,
  className = "",
  ...props
}: AuthInputProps) {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#dedbe8]"
      >
        {label}
      </label>

      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-12 w-full rounded-lg border bg-[#0c0c12] px-4 text-sm text-white outline-none transition placeholder:text-[#656270] focus:border-[#9b7bff] focus:ring-2 focus:ring-[#9b7bff]/15 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? "border-red-400/70" : "border-[#292833]"
        } ${className}`}
        {...props}
      />

      {error && (
        <p
          id={`${id}-error`}
          className="mt-2 text-xs text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
