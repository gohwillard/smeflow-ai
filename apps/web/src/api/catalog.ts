import { ApiError, apiRequest } from './client'

export type Category = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CategoryCreateInput = {
  name: string
  description?: string | null
}

export type CategoryUpdateInput = Partial<{
  name: string
  description: string | null
  isActive: boolean
}>

export type Product = {
  id: string
  categoryId: string | null
  sku: string
  name: string
  description: string | null
  unit: string
  costPrice: string
  sellingPrice: string
  quantityOnHand: string
  reorderLevel: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProductCreateInput = {
  categoryId?: string | null
  sku: string
  name: string
  description?: string | null
  unit: string
  costPrice: string
  sellingPrice: string
  reorderLevel?: string
}

export type ProductUpdateInput = Partial<
  ProductCreateInput & { isActive: boolean }
>

export type InventoryMovementType =
  | 'OPENING_BALANCE'
  | 'MANUAL_IN'
  | 'MANUAL_OUT'

export type InventoryMovement = {
  id: string
  type: InventoryMovementType
  quantity: string
  quantityBefore: string
  quantityAfter: string
  note: string | null
  createdAt: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
}

export type InventoryAdjustmentInput = {
  type: InventoryMovementType
  quantity: string
  note?: string | null
}

export type InventoryAdjustmentResult = {
  product: {
    id: string
    quantityOnHand: string
  }
  movement: InventoryMovement
}

type CategoriesData = { categories: Category[] }
type CategoryData = { category: Category }
type ProductsData = { products: Product[] }
type ProductData = { product: Product }
type InventoryMovementsData = { movements: InventoryMovement[] }

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) return false
  const category = value as Record<string, unknown>

  return (
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    isNullableString(category.description) &&
    typeof category.isActive === 'boolean' &&
    typeof category.createdAt === 'string' &&
    typeof category.updatedAt === 'string'
  )
}

function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false
  const product = value as Record<string, unknown>

  return (
    typeof product.id === 'string' &&
    isNullableString(product.categoryId) &&
    typeof product.sku === 'string' &&
    typeof product.name === 'string' &&
    isNullableString(product.description) &&
    typeof product.unit === 'string' &&
    typeof product.costPrice === 'string' &&
    typeof product.sellingPrice === 'string' &&
    typeof product.quantityOnHand === 'string' &&
    typeof product.reorderLevel === 'string' &&
    typeof product.isActive === 'boolean' &&
    typeof product.createdAt === 'string' &&
    typeof product.updatedAt === 'string'
  )
}

function isInventoryMovement(value: unknown): value is InventoryMovement {
  if (typeof value !== 'object' || value === null) return false
  const movement = value as Record<string, unknown>
  const createdBy = movement.createdBy

  return (
    typeof movement.id === 'string' &&
    ['OPENING_BALANCE', 'MANUAL_IN', 'MANUAL_OUT'].includes(
      String(movement.type),
    ) &&
    typeof movement.quantity === 'string' &&
    typeof movement.quantityBefore === 'string' &&
    typeof movement.quantityAfter === 'string' &&
    isNullableString(movement.note) &&
    typeof movement.createdAt === 'string' &&
    typeof createdBy === 'object' &&
    createdBy !== null &&
    typeof (createdBy as Record<string, unknown>).id === 'string' &&
    typeof (createdBy as Record<string, unknown>).firstName === 'string' &&
    typeof (createdBy as Record<string, unknown>).lastName === 'string'
  )
}

function isInventoryAdjustmentResult(
  value: unknown,
): value is InventoryAdjustmentResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Record<string, unknown>
  const product = result.product

  return (
    typeof product === 'object' &&
    product !== null &&
    typeof (product as Record<string, unknown>).id === 'string' &&
    typeof (product as Record<string, unknown>).quantityOnHand === 'string' &&
    isInventoryMovement(result.movement)
  )
}

function unexpectedResponse(): never {
  throw new ApiError(
    200,
    'UNEXPECTED_RESPONSE',
    'The server returned an unexpected response.',
  )
}

function requireCategory(data: CategoryData): Category {
  return isCategory(data.category) ? data.category : unexpectedResponse()
}

function requireProduct(data: ProductData): Product {
  return isProduct(data.product) ? data.product : unexpectedResponse()
}

export async function getCategories(
  accessToken: string,
  signal?: AbortSignal,
): Promise<Category[]> {
  const data = await apiRequest<CategoriesData>('/categories', {
    accessToken,
    signal,
  })

  return Array.isArray(data.categories) && data.categories.every(isCategory)
    ? data.categories
    : unexpectedResponse()
}

export async function createCategory(
  accessToken: string,
  input: CategoryCreateInput,
): Promise<Category> {
  return requireCategory(
    await apiRequest<CategoryData>('/categories', {
      method: 'POST',
      accessToken,
      body: input,
    }),
  )
}

export async function updateCategory(
  accessToken: string,
  categoryId: string,
  input: CategoryUpdateInput,
): Promise<Category> {
  return requireCategory(
    await apiRequest<CategoryData>(`/categories/${categoryId}`, {
      method: 'PATCH',
      accessToken,
      body: input,
    }),
  )
}

export async function archiveCategory(
  accessToken: string,
  categoryId: string,
): Promise<Category> {
  return requireCategory(
    await apiRequest<CategoryData>(`/categories/${categoryId}`, {
      method: 'DELETE',
      accessToken,
    }),
  )
}

export async function getProducts(
  accessToken: string,
  signal?: AbortSignal,
): Promise<Product[]> {
  const data = await apiRequest<ProductsData>('/products', {
    accessToken,
    signal,
  })

  return Array.isArray(data.products) && data.products.every(isProduct)
    ? data.products
    : unexpectedResponse()
}

export async function getProduct(
  accessToken: string,
  productId: string,
  signal?: AbortSignal,
): Promise<Product> {
  return requireProduct(
    await apiRequest<ProductData>(`/products/${productId}`, {
      accessToken,
      signal,
    }),
  )
}

export async function createProduct(
  accessToken: string,
  input: ProductCreateInput,
): Promise<Product> {
  return requireProduct(
    await apiRequest<ProductData>('/products', {
      method: 'POST',
      accessToken,
      body: input,
    }),
  )
}

export async function updateProduct(
  accessToken: string,
  productId: string,
  input: ProductUpdateInput,
): Promise<Product> {
  return requireProduct(
    await apiRequest<ProductData>(`/products/${productId}`, {
      method: 'PATCH',
      accessToken,
      body: input,
    }),
  )
}

export async function archiveProduct(
  accessToken: string,
  productId: string,
): Promise<Product> {
  return requireProduct(
    await apiRequest<ProductData>(`/products/${productId}`, {
      method: 'DELETE',
      accessToken,
    }),
  )
}

export async function getInventoryMovements(
  accessToken: string,
  productId: string,
  signal?: AbortSignal,
): Promise<InventoryMovement[]> {
  const data = await apiRequest<InventoryMovementsData>(
    `/products/${productId}/inventory-movements`,
    { accessToken, signal },
  )

  return Array.isArray(data.movements) &&
    data.movements.every(isInventoryMovement)
    ? data.movements
    : unexpectedResponse()
}

export async function createInventoryAdjustment(
  accessToken: string,
  productId: string,
  input: InventoryAdjustmentInput,
): Promise<InventoryAdjustmentResult> {
  const data = await apiRequest<InventoryAdjustmentResult>(
    `/products/${productId}/inventory-adjustments`,
    {
      method: 'POST',
      accessToken,
      body: input,
    },
  )

  return isInventoryAdjustmentResult(data) ? data : unexpectedResponse()
}
