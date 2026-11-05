
import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Name must have at least 2 characters.")
      .max(80, "Name must have at most 80 characters."),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address."),

    password: z
      .string()
      .min(8, "Password must have at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain an uppercase letter.")
      .regex(/[a-z]/, "Password must contain a lowercase letter.")
      .regex(/[0-9]/, "Password must contain a number."),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
