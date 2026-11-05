
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  id: string;
  label: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function PasswordInput({
  id,
  label,
  name,
  placeholder = "Enter your password",
  autoComplete = "current-password",
  error,
  required = true,
  disabled = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#dedbe8]"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-lg border bg-[#0c0c12] px-4 pr-12 text-sm text-white outline-none transition placeholder:text-[#656270] focus:border-[#9b7bff] focus:ring-2 focus:ring-[#9b7bff]/15 disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? "border-red-400/70" : "border-[#292833]"
          }`}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#777483] transition hover:text-[#b7a1ff] disabled:cursor-not-allowed"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

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
