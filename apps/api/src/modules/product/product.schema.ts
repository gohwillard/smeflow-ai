import { z } from "zod";

const requiredProductString = (fieldName: string, maximumLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} must not be blank`)
    .max(
      maximumLength,
      `${fieldName} must be at most ${maximumLength} characters`,
    )
    .refine(
      (value) => !/[\u0000-\u001F\u007F]/u.test(value),
      `${fieldName} must not contain control characters`,
    );

const productDescriptionSchema = z
  .string()
  .trim()
  .max(2_000, "Product description must be at most 2000 characters")
  .transform((description) => description || null)
  .nullable();

const productUnitSchema = requiredProductString(
  "Product unit",
  50,
).transform((unit) => unit.toUpperCase());

const exactDecimalString = (
  fieldName: string,
  integerDigits: number,
  fractionalDigits: number,
) =>
  z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d{1,${integerDigits}}(?:\\.\\d{1,${fractionalDigits}})?$`),
      `${fieldName} must be a non-negative decimal string with at most ${fractionalDigits} decimal places`,
    );

const moneySchema = (fieldName: string) =>
  exactDecimalString(fieldName, 10, 2);
const quantitySchema = (fieldName: string) =>
  exactDecimalString(fieldName, 11, 3);

export const productIdParamsSchema = z
  .object({
    productId: z.uuid("Product ID must be a valid UUID"),
  })
  .strict();

export const productCreateSchema = z
  .object({
    categoryId: z.uuid("Category ID must be a valid UUID").nullable().optional(),
    sku: requiredProductString("SKU", 100).transform((sku) =>
      sku.toUpperCase(),
    ),
    name: requiredProductString("Product name", 200),
    description: productDescriptionSchema.optional(),
    unit: productUnitSchema,
    costPrice: moneySchema("Cost price"),
    sellingPrice: moneySchema("Selling price"),
    reorderLevel: quantitySchema("Reorder level").optional(),
  })
  .strict();

export const productUpdateSchema = z
  .object({
    categoryId: z.uuid("Category ID must be a valid UUID").nullable().optional(),
    sku: requiredProductString("SKU", 100)
      .transform((sku) => sku.toUpperCase())
      .optional(),
    name: requiredProductString("Product name", 200).optional(),
    description: productDescriptionSchema.optional(),
    unit: productUnitSchema.optional(),
    costPrice: moneySchema("Cost price").optional(),
    sellingPrice: moneySchema("Selling price").optional(),
    reorderLevel: quantitySchema("Reorder level").optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
