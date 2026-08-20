import { z } from "zod";

const inventoryQuantitySchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,11}(?:\.\d{1,3})?$/u,
    "Quantity must be a positive decimal string with at most 3 decimal places",
  )
  .refine(
    (quantity) => /[1-9]/u.test(quantity),
    "Quantity must be greater than zero",
  );

const inventoryNoteSchema = z
  .string()
  .trim()
  .max(2_000, "Note must be at most 2000 characters")
  .transform((note) => note || null)
  .nullable();

export const inventoryProductIdParamsSchema = z
  .object({
    productId: z.uuid("Product ID must be a valid UUID"),
  })
  .strict();

export const inventoryAdjustmentSchema = z
  .object({
    type: z.enum(["OPENING_BALANCE", "MANUAL_IN", "MANUAL_OUT"]),
    quantity: inventoryQuantitySchema,
    note: inventoryNoteSchema.optional(),
  })
  .strict();

export type InventoryAdjustmentInput = z.infer<
  typeof inventoryAdjustmentSchema
>;
