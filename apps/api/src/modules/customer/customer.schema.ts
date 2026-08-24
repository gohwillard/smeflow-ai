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
  .max(320, "Customer email must be at most 320 characters")
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Customer email must be a valid email address",
  )
  .transform((value) => (value ? value.toLowerCase() : null))
  .nullable();

const customerFields = {
  name: requiredSingleLineString("Customer name", 200),
  registrationNumber: optionalSingleLineString("Registration number", 100),
  contactPerson: optionalSingleLineString("Contact person", 200),
  email: optionalEmailSchema,
  phone: optionalSingleLineString("Phone", 50),
  billingAddress: optionalMultilineString("Billing address"),
  shippingAddress: optionalMultilineString("Shipping address"),
  notes: optionalMultilineString("Notes"),
};

export const customerIdParamsSchema = z
  .object({
    customerId: z.uuid("Customer ID must be a valid UUID"),
  })
  .strict();

export const customerListQuerySchema = z.object({}).strict();

export const customerCreateSchema = z
  .object({
    name: customerFields.name,
    registrationNumber: customerFields.registrationNumber.optional(),
    contactPerson: customerFields.contactPerson.optional(),
    email: customerFields.email.optional(),
    phone: customerFields.phone.optional(),
    billingAddress: customerFields.billingAddress.optional(),
    shippingAddress: customerFields.shippingAddress.optional(),
    notes: customerFields.notes.optional(),
  })
  .strict();

export const customerUpdateSchema = z
  .object({
    name: customerFields.name.optional(),
    registrationNumber: customerFields.registrationNumber.optional(),
    contactPerson: customerFields.contactPerson.optional(),
    email: customerFields.email.optional(),
    phone: customerFields.phone.optional(),
    billingAddress: customerFields.billingAddress.optional(),
    shippingAddress: customerFields.shippingAddress.optional(),
    notes: customerFields.notes.optional(),
    isActive: z
      .boolean()
      .refine(
        (isActive) => isActive,
        "isActive may only be true for reactivation",
      )
      .optional(),
  })
  .strict();

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
