import { z } from "zod";

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Category name must not be blank")
  .max(200, "Category name must be at most 200 characters");

const categoryDescriptionSchema = z
  .string()
  .trim()
  .max(2_000, "Category description must be at most 2000 characters")
  .transform((description) => description || null)
  .nullable();

export const categoryIdParamsSchema = z
  .object({
    categoryId: z.uuid("Category ID must be a valid UUID"),
  })
  .strict();

export const categoryCreateSchema = z
  .object({
    name: categoryNameSchema,
    description: categoryDescriptionSchema.optional(),
  })
  .strict();

export const categoryUpdateSchema = z
  .object({
    name: categoryNameSchema.optional(),
    description: categoryDescriptionSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
