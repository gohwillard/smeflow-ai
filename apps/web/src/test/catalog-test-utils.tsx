import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import App from '../App'
import type { UserRole } from '../api/auth'
import type { Category, Product } from '../api/catalog'
import { TestNavigation } from './TestNavigation'

export function createUser(role: UserRole = 'OWNER') {
  return {
    id: `user-${role.toLowerCase()}`,
    companyId: 'company-1',
    email: `${role.toLowerCase()}@example.com`,
    firstName: 'Amina',
    lastName: 'Rahman',
    role,
    isActive: true,
  }
}

export const activeCategory: Category = {
  id: 'category-active',
  name: 'Power Tools',
  description: 'Powered workshop equipment',
  isActive: true,
  createdAt: '2026-08-19T04:00:00.000Z',
  updatedAt: '2026-08-19T04:00:00.000Z',
}

export const archivedCategory: Category = {
  id: 'category-archived',
  name: 'Legacy Tools',
  description: null,
  isActive: false,
  createdAt: '2026-08-19T04:01:00.000Z',
  updatedAt: '2026-08-19T04:01:00.000Z',
}

export const activeProduct: Product = {
  id: 'product-active',
  categoryId: activeCategory.id,
  sku: 'DRILL-001',
  name: 'Cordless Drill',
  description: '18V cordless drill',
  unit: 'pcs',
  costPrice: '10.25',
  sellingPrice: '15.99',
  quantityOnHand: '4.500',
  reorderLevel: '1.500',
  isActive: true,
  createdAt: '2026-08-19T04:30:00.000Z',
  updatedAt: '2026-08-19T04:30:00.000Z',
}

export const archivedProduct: Product = {
  ...activeProduct,
  id: 'product-archived',
  categoryId: null,
  sku: 'SAW-OLD',
  name: 'Legacy Saw',
  description: null,
  quantityOnHand: '2.000',
  isActive: false,
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function success(data: unknown, status = 200): Response {
  return jsonResponse({ status: 'success', data }, status)
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: { field: string; message: string }[],
): Response {
  return jsonResponse(
    {
      status: 'error',
      error: { code, message, ...(details ? { details } : {}) },
    },
    status,
  )
}

export function renderUnauthenticated(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

export async function renderAuthenticatedPath(
  path: string,
  routeResponses: (Response | Promise<Response>)[],
  role: UserRole = 'OWNER',
) {
  const user = createUser(role)
  const fetchMock = vi.fn()
  fetchMock.mockResolvedValueOnce(
    success({ accessToken: 'memory-only-token', expiresIn: 1800, user }),
  )
  fetchMock.mockResolvedValueOnce(success({ user }))
  for (const response of routeResponses) {
    fetchMock.mockReturnValueOnce(Promise.resolve(response))
  }
  vi.stubGlobal('fetch', fetchMock)

  render(
    <MemoryRouter initialEntries={['/login']}>
      <TestNavigation path={path} />
      <App />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: user.email },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'a secure demo passphrase' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  await screen.findByRole('heading', { name: 'Welcome, Amina.' })
  fireEvent.click(screen.getByTestId('catalog-navigation'))

  return fetchMock
}

export function getRequestBody(
  fetchMock: ReturnType<typeof vi.fn>,
  callIndex: number,
): Record<string, unknown> {
  const body = fetchMock.mock.calls[callIndex]?.[1]?.body
  return JSON.parse(String(body)) as Record<string, unknown>
}

export function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((next) => {
    resolve = next
  })
  return { promise, resolve }
}
