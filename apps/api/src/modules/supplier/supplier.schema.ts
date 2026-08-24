import { z } from "zod";

const singleLineControlCharacterPattern = /[\u0000-\u001F\u007F]/u;
const unsafeMultilineControlCharacterPattern =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

const requiredSingleLineString = (fieldName: string, maximumLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} must not be blank`)
    .max(maximumLength, `${fieldName} must be at most ${maximumLength} characters`)
    .refine(
      (value) => !singleLineControlCharacterPattern.test(value),
      `${fieldName} must not contain control characters`,
    );

const optionalSingleLineString = (fieldName: string, maximumLength: number) =>
  z
    .string()
    .trim()
    .max(maximumLength, `${fieldName} must be at most ${maximumLength} characters`)
    .refine(
      (value) => !singleLineControlCharacterPattern.test(value),
      `${fieldName} must not contain control characters`,
    )
    .transform((value) => value || null)
    .nullable();

const optionalMultilineString = (fieldName: string) =>
  z
    .string()
    .trim()
    .max(2_000, `${fieldName} must be at most 2000 characters`)
    .refine(
      (value) => !unsafeMultilineControlCharacterPattern.test(value),
      `${fieldName} must not contain unsafe control characters`,
    )
    .transform((value) => value || null)
    .nullable();

const optionalEmailSchema = z
  .string()
  .trim()
  .max(320, "Supplier email must be at most 320 characters")
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Supplier email must be a valid email address",
  )
  .transform((value) => (value ? value.toLowerCase() : null))
  .nullable();

const supplierFields = {
  name: requiredSingleLineString("Supplier name", 200),
  registrationNumber: optionalSingleLineString("Registration number", 100),
  contactPerson: optionalSingleLineString("Contact person", 200),
  email: optionalEmailSchema,
  phone: optionalSingleLineString("Phone", 50),
  address: optionalMultilineString("Address"),
  notes: optionalMultilineString("Notes"),
};

export const supplierIdParamsSchema = z
  .object({
    supplierId: z.uuid("Supplier ID must be a valid UUID"),
  })
  .strict();

export const supplierListQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(1, "Search must not be blank")
      .max(320, "Search must be at most 320 characters")
      .refine(
        (value) => !singleLineControlCharacterPattern.test(value),
        "Search must not contain control characters",
      )
      .optional(),
    status: z.enum(["active", "archived"]).optional(),
  })
  .strict();

export const supplierCreateSchema = z
  .object({
    name: supplierFields.name,
    registrationNumber: supplierFields.registrationNumber.optional(),
    contactPerson: supplierFields.contactPerson.optional(),
    email: supplierFields.email.optional(),
    phone: supplierFields.phone.optional(),
    address: supplierFields.address.optional(),
    notes: supplierFields.notes.optional(),
  })
  .strict();

export const supplierUpdateSchema = z
  .object({
    name: supplierFields.name.optional(),
    registrationNumber: supplierFields.registrationNumber.optional(),
    contactPerson: supplierFields.contactPerson.optional(),
    email: supplierFields.email.optional(),
    phone: supplierFields.phone.optional(),
    address: supplierFields.address.optional(),
    notes: supplierFields.notes.optional(),
    isActive: z
      .boolean()
      .refine(
        (isActive) => isActive,
        "isActive may only be true for reactivation",
      )
      .optional(),
  })
  .strict();

export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
export type SupplierListQuery = z.infer<typeof supplierListQuerySchema>;
