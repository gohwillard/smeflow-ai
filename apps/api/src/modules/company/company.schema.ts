import { z } from "zod";

const nullableNonBlankString = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} must not be blank`)
    .nullable()
    .optional();

export const companyProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Company name must not be blank").optional(),
    registrationNumber: nullableNonBlankString("Registration number"),
    email: z
      .string()
      .trim()
      .min(1, "Company email must not be blank")
      .email("Company email must be a valid email address")
      .transform((email) => email.toLowerCase())
      .nullable()
      .optional(),
    phone: nullableNonBlankString("Phone"),
    address: nullableNonBlankString("Address"),
  })
  .strict();

export type CompanyProfileUpdateInput = z.infer<
  typeof companyProfileUpdateSchema
>;
