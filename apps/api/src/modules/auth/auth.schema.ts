import { z } from "zod";

export const registrationSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(1, "Company name must not be blank"),
    firstName: z.string().trim().min(1, "First name must not be blank"),
    lastName: z.string().trim().min(1, "Last name must not be blank"),
    email: z
      .string()
      .trim()
      .email("Email must be a valid email address")
      .transform((email) => email.toLowerCase()),
    password: z
      .string()
      .min(15, "Password must be at least 15 characters")
      .max(128, "Password must be at most 128 characters"),
  })
  .strict();

export type RegistrationInput = z.infer<typeof registrationSchema>;
