import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Customer } from '../api/partners'
import {
  apiError,
  deferredResponse,
  getRequestBody,
  renderAuthenticatedPath,
  renderUnauthenticated,
  success,
} from '../test/catalog-test-utils'

const activeCustomer: Customer = {
  id: 'customer-active',
  name: 'ABC Trading',
  registrationNumber: '202601234567',
  contactPerson: 'Aisha Tan',
  email: 'sales@abc.example',
  phone: '+60 12 345 6789',
  billingAddress: '10 Market Road\nKuala Lumpur',
  shippingAddress: 'Warehouse 3\nShah Alam',
  notes: 'Prefers email communication.',
  isActive: true,
  createdAt: '2026-08-24T04:00:00.000Z',
  updatedAt: '2026-08-24T05:00:00.000Z',
}

const archivedCustomer: Customer = {
  ...activeCustomer,
  id: 'customer-archived',
  name: 'Legacy Retail',
  registrationNumber: null,
  contactPerson: null,
  email: null,
  phone: null,
  billingAddress: null,
  shippingAddress: null,
  notes: null,
  isActive: false,
}

function fillCustomerForm() {
  fireEvent.change(screen.getByLabelText('Customer name'), {
    target: { value: '  ABC Trading  ' },
  })
  fireEvent.change(screen.getByLabelText(/Registration number/), {
    target: { value: ' 202601234567 ' },
  })
  fireEvent.change(screen.getByLabelText(/Contact person/), {
    target: { value: ' Aisha Tan ' },
  })
  fireEvent.change(screen.getByLabelText(/Email/), {
    target: { value: ' Sales@ABC.Example ' },
  })
  fireEvent.change(screen.getByLabelText(/Phone/), {
    target: { value: ' +60 12 345 6789 ' },
  })
  fireEvent.change(screen.getByLabelText(/Billing address/), {
    target: { value: ' 10 Market Road\nKuala Lumpur ' },
  })
  fireEvent.change(screen.getByLabelText(/Shipping address/), {
    target: { value: ' Warehouse 3\nShah Alam ' },
  })
  fireEvent.change(screen.getByLabelText(/Notes/), {
    target: { value: ' Prefers email communication. ' },
  })
}

describe('Phase 4D Customer list and routes', () => {
  it('protects all Customer routes', async () => {
    for (const path of [
      '/customers',
      '/customers/new',
      '/customers/customer-1',
      '/customers/customer-1/edit',
    ]) {
      const view = renderUnauthenticated(path)
      expect(
        await screen.findByRole('heading', { name: 'Sign in to SMEFlow' }),
      ).toBeTruthy()
      view.unmount()
    }
  })

  it('shows loading, empty, and OWNER create guidance', async () => {
    const request = deferredResponse()
    await renderAuthenticatedPath('/customers', [request.promise])
    expect(await screen.findByText('Loading Customers…')).toBeTruthy()
    request.resolve(success({ customers: [] }))
    expect(
      await screen.findByRole('heading', { name: 'Your Customer list is empty' }),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Create first Customer' })).toBeTruthy()
  })

  it('shows a list error separately from an empty state', async () => {
    await renderAuthenticatedPath('/customers', [
      apiError(500, 'INTERNAL_SERVER_ERROR', 'Customers are temporarily unavailable'),
    ])
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Customers are temporarily unavailable',
    )
    expect(screen.queryByText('Your Customer list is empty')).toBeNull()
  })

  it('renders active and archived Customer data with responsive labels and navigation', async () => {
    await renderAuthenticatedPath('/customers', [
      success({ customers: [activeCustomer, archivedCustomer] }),
    ])
    expect(await screen.findByText('ABC Trading')).toBeTruthy()
    expect(screen.getByText('Aisha Tan')).toBeTruthy()
    expect(screen.getByText('sales@abc.example')).toBeTruthy()
    expect(screen.getAllByText('Active')).toHaveLength(1)
    expect(screen.getAllByText('Archived')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Customers' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Suppliers' })).toBeTruthy()
    expect(
      screen.getByRole('cell', { name: /ABC Trading/ }).getAttribute('data-label'),
    ).toBe('Customer')
  })

  it.each(['OWNER', 'ADMIN'] as const)(
    'shows Customer management controls to %s',
    async (role) => {
      await renderAuthenticatedPath(
        '/customers',
        [success({ customers: [activeCustomer, archivedCustomer] })],
        role,
      )
      expect(await screen.findByRole('link', { name: 'Create Customer' })).toBeTruthy()
      expect(screen.getAllByRole('link', { name: 'Edit' })).toHaveLength(2)
      expect(screen.getByRole('button', { name: 'Archive' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Reactivate' })).toBeTruthy()
    },
  )

  it('keeps STAFF Customer UI read-only while preserving View', async () => {
    await renderAuthenticatedPath(
      '/customers',
      [success({ customers: [activeCustomer] })],
      'STAFF',
    )
    expect(await screen.findByText('Read only')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Create Customer' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull()
  })
})

describe('Phase 4D Customer create and edit', () => {
  it('renders approved fields and validates a trim-aware required name', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers/new', [])
    expect(await screen.findByRole('heading', { name: 'Create Customer' })).toBeTruthy()
    expect(screen.getByLabelText('Customer name')).toBeTruthy()
    expect(screen.getByLabelText(/Billing address/).tagName).toBe('TEXTAREA')
    expect(screen.getByLabelText(/Shipping address/).tagName).toBe('TEXTAREA')
    expect(screen.getByLabelText(/Notes/).tagName).toBe('TEXTAREA')
    expect(screen.queryByLabelText(/companyId/i)).toBeNull()

    fireEvent.change(screen.getByLabelText('Customer name'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Customer' }))
    expect(await screen.findByText('Customer name must not be blank.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('creates with only approved normalized fields and no Company scope input', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers/new', [])
    fetchMock
      .mockResolvedValueOnce(success({ customer: activeCustomer }, 201))
      .mockResolvedValueOnce(success({ customer: activeCustomer }))
    fillCustomerForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create Customer' }))

    expect(
      await screen.findByText('Customer ABC Trading created successfully.'),
    ).toBeTruthy()
    expect(getRequestBody(fetchMock, 2)).toEqual({
      name: 'ABC Trading',
      registrationNumber: '202601234567',
      contactPerson: 'Aisha Tan',
      email: 'Sales@ABC.Example',
      phone: '+60 12 345 6789',
      billingAddress: '10 Market Road\nKuala Lumpur',
      shippingAddress: 'Warehouse 3\nShah Alam',
      notes: 'Prefers email communication.',
    })
    expect(getRequestBody(fetchMock, 2)).not.toHaveProperty('companyId')
    expect(getRequestBody(fetchMock, 2)).not.toHaveProperty('isActive')
  })

  it('preloads an archived Customer and sends a diff-only null clear without lifecycle fields', async () => {
    const fetchMock = await renderAuthenticatedPath(
      `/customers/${archivedCustomer.id}/edit`,
      [success({ customer: { ...archivedCustomer, phone: '+60 3 1111 2222' } })],
    )
    expect(await screen.findByRole('heading', { name: 'Edit Customer' })).toBeTruthy()
    expect((screen.getByLabelText('Customer name') as HTMLInputElement).value).toBe(
      'Legacy Retail',
    )
    expect((screen.getByLabelText(/Phone/) as HTMLInputElement).value).toBe(
      '+60 3 1111 2222',
    )

    fetchMock
      .mockResolvedValueOnce(success({ customer: archivedCustomer }))
      .mockResolvedValueOnce(success({ customer: archivedCustomer }))
    fireEvent.change(screen.getByLabelText(/Phone/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Customer Legacy Retail updated successfully.')).toBeTruthy()
    expect(getRequestBody(fetchMock, 3)).toEqual({ phone: null })
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('isActive')
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('companyId')
  })

  it('maps backend field validation to the matching form control', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers/new', [])
    fillCustomerForm()
    fetchMock.mockResolvedValueOnce(
      apiError(400, 'VALIDATION_ERROR', 'Customer input is invalid', [
        { field: 'email', message: 'Customer email must be a valid email address' },
      ]),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create Customer' }))
    expect(
      await screen.findByText('Customer email must be a valid email address'),
    ).toBeTruthy()

  })

  it('blocks STAFF direct Customer form access without making a resource request', async () => {
    await renderAuthenticatedPath('/customers/new', [], 'STAFF')
    expect(
      await screen.findByRole('heading', { name: 'Customer management unavailable' }),
    ).toBeTruthy()
  })
})

describe('Phase 4D Customer detail and lifecycle', () => {
  it('shows all detail fields, null placeholders, archived status, and safe not-found UX', async () => {
    await renderAuthenticatedPath(`/customers/${archivedCustomer.id}`, [
      success({ customer: archivedCustomer }),
    ], 'STAFF')
    expect(await screen.findByRole('heading', { name: 'Legacy Retail' })).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(7)
    expect(screen.getAllByText('Archived').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByRole('link', { name: 'Edit Customer' })).toBeNull()
  })

  it('shows a tenant-safe Customer not-found state', async () => {
    await renderAuthenticatedPath('/customers/missing', [
      apiError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found'),
    ])
    expect(await screen.findByRole('heading', { name: 'Customer not found' })).toBeTruthy()
    expect(
      screen.getByText('This Customer does not exist or is unavailable to your Company.'),
    ).toBeTruthy()
  })

  it('archives through the custom dialog with DELETE and authoritative response', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers', [
      success({ customers: [activeCustomer] }),
    ])
    fetchMock.mockResolvedValueOnce(
      success({ customer: { ...activeCustomer, isActive: false } }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }))
    const dialog = screen.getByRole('dialog', { name: 'Archive Customer?' })
    expect(within(dialog).getByText(/ABC Trading/)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Archive Customer' }).className)
      .toContain('button--danger')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive Customer' }))

    expect(await screen.findByText('Customer ABC Trading archived successfully.')).toBeTruthy()
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('DELETE')
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeTruthy()
  })

  it('reactivates through the custom dialog using only PATCH isActive true', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers', [
      success({ customers: [archivedCustomer] }),
    ])
    fetchMock.mockResolvedValueOnce(
      success({ customer: { ...archivedCustomer, isActive: true } }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate' }))
    const dialog = screen.getByRole('dialog', { name: 'Reactivate Customer?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reactivate Customer' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('PATCH')
    expect(getRequestBody(fetchMock, 3)).toEqual({ isActive: true })
    expect(await screen.findByText('Customer Legacy Retail reactivated successfully.')).toBeTruthy()
  })
})
