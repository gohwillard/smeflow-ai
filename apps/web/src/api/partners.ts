import { ApiError, apiRequest } from './client'

export type Customer = {
  id: string
  name: string
  registrationNumber: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  billingAddress: string | null
  shippingAddress: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerCreateInput = {
  name: string
  registrationNumber?: string | null
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  billingAddress?: string | null
  shippingAddress?: string | null
  notes?: string | null
}

export type CustomerUpdateInput = Partial<CustomerCreateInput>

export type Supplier = {
  id: string
  name: string
  registrationNumber: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SupplierCreateInput = {
  name: string
  registrationNumber?: string | null
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
}

export type SupplierUpdateInput = Partial<SupplierCreateInput>

type CustomersData = { customers: Customer[] }
type CustomerData = { customer: Customer }
type SuppliersData = { suppliers: Supplier[] }
type SupplierData = { supplier: Supplier }

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function hasSharedFields(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isNullableString(value.registrationNumber) &&
    isNullableString(value.contactPerson) &&
    isNullableString(value.email) &&
    isNullableString(value.phone) &&
    isNullableString(value.notes) &&
    typeof value.isActive === 'boolean' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isCustomer(value: unknown): value is Customer {
  if (typeof value !== 'object' || value === null) return false
  const customer = value as Record<string, unknown>
  return (
    hasSharedFields(customer) &&
    isNullableString(customer.billingAddress) &&
    isNullableString(customer.shippingAddress)
  )
}

function isSupplier(value: unknown): value is Supplier {
  if (typeof value !== 'object' || value === null) return false
  const supplier = value as Record<string, unknown>
  return hasSharedFields(supplier) && isNullableString(supplier.address)
}

function unexpectedResponse(): never {
  throw new ApiError(
    200,
    'UNEXPECTED_RESPONSE',
    'The server returned an unexpected response.',
  )
}

function requireCustomer(data: CustomerData): Customer {
  return isCustomer(data.customer) ? data.customer : unexpectedResponse()
}

function requireSupplier(data: SupplierData): Supplier {
  return isSupplier(data.supplier) ? data.supplier : unexpectedResponse()
}

export async function getCustomers(
  accessToken: string,
  signal?: AbortSignal,
): Promise<Customer[]> {
  const data = await apiRequest<CustomersData>('/customers', {
    accessToken,
    signal,
  })
  return Array.isArray(data.customers) && data.customers.every(isCustomer)
    ? data.customers
    : unexpectedResponse()
}

export async function getCustomer(
  accessToken: string,
  customerId: string,
  signal?: AbortSignal,
): Promise<Customer> {
  return requireCustomer(
    await apiRequest<CustomerData>(`/customers/${customerId}`, {
      accessToken,
      signal,
    }),
  )
}

export async function createCustomer(
  accessToken: string,
  input: CustomerCreateInput,
): Promise<Customer> {
  return requireCustomer(
    await apiRequest<CustomerData>('/customers', {
      method: 'POST',
      accessToken,
      body: input,
    }),
  )
}

export async function updateCustomer(
  accessToken: string,
  customerId: string,
  input: CustomerUpdateInput | { isActive: true },
): Promise<Customer> {
  return requireCustomer(
    await apiRequest<CustomerData>(`/customers/${customerId}`, {
      method: 'PATCH',
      accessToken,
      body: input,
    }),
  )
}

export async function archiveCustomer(
  accessToken: string,
  customerId: string,
): Promise<Customer> {
  return requireCustomer(
    await apiRequest<CustomerData>(`/customers/${customerId}`, {
      method: 'DELETE',
      accessToken,
    }),
  )
}

export async function getSuppliers(
  accessToken: string,
  signal?: AbortSignal,
): Promise<Supplier[]> {
  const data = await apiRequest<SuppliersData>('/suppliers', {
    accessToken,
    signal,
  })
  return Array.isArray(data.suppliers) && data.suppliers.every(isSupplier)
    ? data.suppliers
    : unexpectedResponse()
}

export async function getSupplier(
  accessToken: string,
  supplierId: string,
  signal?: AbortSignal,
): Promise<Supplier> {
  return requireSupplier(
    await apiRequest<SupplierData>(`/suppliers/${supplierId}`, {
      accessToken,
      signal,
    }),
  )
}

export async function createSupplier(
  accessToken: string,
  input: SupplierCreateInput,
): Promise<Supplier> {
  return requireSupplier(
    await apiRequest<SupplierData>('/suppliers', {
      method: 'POST',
      accessToken,
      body: input,
    }),
  )
}

export async function updateSupplier(
  accessToken: string,
  supplierId: string,
  input: SupplierUpdateInput | { isActive: true },
): Promise<Supplier> {
  return requireSupplier(
    await apiRequest<SupplierData>(`/suppliers/${supplierId}`, {
      method: 'PATCH',
      accessToken,
      body: input,
    }),
  )
}

export async function archiveSupplier(
  accessToken: string,
  supplierId: string,
): Promise<Supplier> {
  return requireSupplier(
    await apiRequest<SupplierData>(`/suppliers/${supplierId}`, {
      method: 'DELETE',
      accessToken,
    }),
  )
}
