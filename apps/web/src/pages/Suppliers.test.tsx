import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Supplier } from '../api/partners'
import {
  apiError,
  deferredResponse,
  getRequestBody,
  renderAuthenticatedPath,
  renderUnauthenticated,
  success,
} from '../test/catalog-test-utils'

const activeSupplier: Supplier = {
  id: 'supplier-active',
  name: 'XYZ Supplies',
  registrationNumber: 'SUP-2026-88',
  contactPerson: 'Daniel Lim',
  email: 'orders@xyz.example',
  phone: '+60 3 9876 5432',
  address: '8 Industrial Park\nPetaling Jaya',
  notes: 'Primary hardware wholesaler.',
  isActive: true,
  createdAt: '2026-08-24T06:00:00.000Z',
  updatedAt: '2026-08-24T07:00:00.000Z',
}

const archivedSupplier: Supplier = {
  ...activeSupplier,
  id: 'supplier-archived',
  name: 'Old Parts Co',
  registrationNumber: null,
  contactPerson: null,
  email: null,
  phone: null,
  address: null,
  notes: null,
  isActive: false,
}

function fillSupplierForm() {
  fireEvent.change(screen.getByLabelText('Supplier name'), {
    target: { value: '  XYZ Supplies  ' },
  })
  fireEvent.change(screen.getByLabelText(/Registration number/), {
    target: { value: ' SUP-2026-88 ' },
  })
  fireEvent.change(screen.getByLabelText(/Contact person/), {
    target: { value: ' Daniel Lim ' },
  })
  fireEvent.change(screen.getByLabelText(/Email/), {
    target: { value: ' Orders@XYZ.Example ' },
  })
  fireEvent.change(screen.getByLabelText(/Phone/), {
    target: { value: ' +60 3 9876 5432 ' },
  })
  fireEvent.change(screen.getByLabelText(/^Address/), {
    target: { value: ' 8 Industrial Park\nPetaling Jaya ' },
  })
  fireEvent.change(screen.getByLabelText(/Notes/), {
    target: { value: ' Primary hardware wholesaler. ' },
  })
}

describe('Phase 4D Supplier list and routes', () => {
  it('protects all Supplier routes', async () => {
    for (const path of [
      '/suppliers',
      '/suppliers/new',
      '/suppliers/supplier-1',
      '/suppliers/supplier-1/edit',
    ]) {
      const view = renderUnauthenticated(path)
      expect(
        await screen.findByRole('heading', { name: 'Sign in to SMEFlow' }),
      ).toBeTruthy()
      view.unmount()
    }
  })

  it('shows loading and role-aware empty states', async () => {
    const request = deferredResponse()
    await renderAuthenticatedPath('/suppliers', [request.promise], 'STAFF')
    expect(await screen.findByText('Loading Suppliers…')).toBeTruthy()
    request.resolve(success({ suppliers: [] }))
    expect(
      await screen.findByRole('heading', { name: 'Your Supplier list is empty' }),
    ).toBeTruthy()
    expect(screen.getByText(/Your access is read-only/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Create first Supplier' })).toBeNull()
  })

  it('shows list errors without rendering an empty state', async () => {
    await renderAuthenticatedPath('/suppliers', [
      apiError(500, 'INTERNAL_SERVER_ERROR', 'Suppliers are temporarily unavailable'),
    ])
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Suppliers are temporarily unavailable',
    )
    expect(screen.queryByText('Your Supplier list is empty')).toBeNull()
  })

  it('renders active and archived Supplier fields with mobile-card labels', async () => {
    await renderAuthenticatedPath('/suppliers', [
      success({ suppliers: [activeSupplier, archivedSupplier] }),
    ])
    expect(await screen.findByText('XYZ Supplies')).toBeTruthy()
    expect(screen.getByText('Daniel Lim')).toBeTruthy()
    expect(screen.getByText('orders@xyz.example')).toBeTruthy()
    expect(screen.getAllByText('Active')).toHaveLength(1)
    expect(screen.getAllByText('Archived')).toHaveLength(1)
    expect(
      screen.getByRole('cell', { name: /XYZ Supplies/ }).getAttribute('data-label'),
    ).toBe('Supplier')
  })

  it.each(['OWNER', 'ADMIN'] as const)(
    'shows Supplier management controls to %s',
    async (role) => {
      await renderAuthenticatedPath(
        '/suppliers',
        [success({ suppliers: [activeSupplier, archivedSupplier] })],
        role,
      )
      expect(await screen.findByRole('link', { name: 'Create Supplier' })).toBeTruthy()
      expect(screen.getAllByRole('link', { name: 'Edit' })).toHaveLength(2)
      expect(screen.getByRole('button', { name: 'Archive' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Reactivate' })).toBeTruthy()
    },
  )

  it('keeps STAFF Supplier list read-only with View available', async () => {
    await renderAuthenticatedPath(
      '/suppliers',
      [success({ suppliers: [activeSupplier] })],
      'STAFF',
    )
    expect(await screen.findByText('Read only')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Create Supplier' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull()
  })
})

describe('Phase 4D Supplier create and edit', () => {
  it('renders only approved controls and validates the required name', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers/new', [])
    expect(await screen.findByRole('heading', { name: 'Create Supplier' })).toBeTruthy()
    expect(screen.getByLabelText('Supplier name')).toBeTruthy()
    expect(screen.getByLabelText(/^Address/).tagName).toBe('TEXTAREA')
    expect(screen.getByLabelText(/Notes/).tagName).toBe('TEXTAREA')
    expect(screen.queryByLabelText(/companyId/i)).toBeNull()

    fireEvent.change(screen.getByLabelText('Supplier name'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Supplier' }))
    expect(await screen.findByText('Supplier name must not be blank.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('creates with the exact approved payload and no Company or lifecycle fields', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers/new', [])
    fetchMock
      .mockResolvedValueOnce(success({ supplier: activeSupplier }, 201))
      .mockResolvedValueOnce(success({ supplier: activeSupplier }))
    fillSupplierForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create Supplier' }))

    expect(
      await screen.findByText('Supplier XYZ Supplies created successfully.'),
    ).toBeTruthy()
    expect(getRequestBody(fetchMock, 2)).toEqual({
      name: 'XYZ Supplies',
      registrationNumber: 'SUP-2026-88',
      contactPerson: 'Daniel Lim',
      email: 'Orders@XYZ.Example',
      phone: '+60 3 9876 5432',
      address: '8 Industrial Park\nPetaling Jaya',
      notes: 'Primary hardware wholesaler.',
    })
    expect(getRequestBody(fetchMock, 2)).not.toHaveProperty('companyId')
    expect(getRequestBody(fetchMock, 2)).not.toHaveProperty('isActive')
  })

  it('preloads an archived Supplier and clears optional fields with diff-only null PATCH', async () => {
    const loaded = { ...archivedSupplier, address: 'Old warehouse' }
    const fetchMock = await renderAuthenticatedPath(
      `/suppliers/${archivedSupplier.id}/edit`,
      [success({ supplier: loaded })],
    )
    expect(await screen.findByRole('heading', { name: 'Edit Supplier' })).toBeTruthy()
    expect((screen.getByLabelText('Supplier name') as HTMLInputElement).value).toBe(
      'Old Parts Co',
    )
    expect((screen.getByLabelText(/^Address/) as HTMLTextAreaElement).value).toBe(
      'Old warehouse',
    )

    fetchMock
      .mockResolvedValueOnce(success({ supplier: archivedSupplier }))
      .mockResolvedValueOnce(success({ supplier: archivedSupplier }))
    fireEvent.change(screen.getByLabelText(/^Address/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Supplier Old Parts Co updated successfully.')).toBeTruthy()
    expect(getRequestBody(fetchMock, 3)).toEqual({ address: null })
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('isActive')
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('companyId')
  })

  it('maps backend validation feedback to Supplier fields', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers/new', [])
    fillSupplierForm()
    fetchMock.mockResolvedValueOnce(
      apiError(400, 'VALIDATION_ERROR', 'Supplier input is invalid', [
        { field: 'phone', message: 'Phone must be at most 50 characters' },
      ]),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create Supplier' }))
    expect(await screen.findByText('Phone must be at most 50 characters')).toBeTruthy()
  })

  it('blocks STAFF direct Supplier form access', async () => {
    await renderAuthenticatedPath('/suppliers/new', [], 'STAFF')
    expect(
      await screen.findByRole('heading', { name: 'Supplier management unavailable' }),
    ).toBeTruthy()
  })
})

describe('Phase 4D Supplier detail and lifecycle', () => {
  it('renders full Supplier details and nullable fields for archived STAFF access', async () => {
    await renderAuthenticatedPath(
      `/suppliers/${archivedSupplier.id}`,
      [success({ supplier: archivedSupplier })],
      'STAFF',
    )
    expect(await screen.findByRole('heading', { name: 'Old Parts Co' })).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(6)
    expect(screen.getAllByText('Archived').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByRole('link', { name: 'Edit Supplier' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reactivate Supplier' })).toBeNull()
  })

  it('uses a tenant-safe Supplier not-found state', async () => {
    await renderAuthenticatedPath('/suppliers/missing', [
      apiError(404, 'SUPPLIER_NOT_FOUND', 'Supplier was not found'),
    ])
    expect(await screen.findByRole('heading', { name: 'Supplier not found' })).toBeTruthy()
    expect(
      screen.getByText('This Supplier does not exist or is unavailable to your Company.'),
    ).toBeTruthy()
  })

  it('archives through the custom destructive dialog and uses DELETE', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers', [
      success({ suppliers: [activeSupplier] }),
    ])
    fetchMock.mockResolvedValueOnce(
      success({ supplier: { ...activeSupplier, isActive: false } }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }))
    const dialog = screen.getByRole('dialog', { name: 'Archive Supplier?' })
    expect(within(dialog).getByText(/XYZ Supplies/)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Archive Supplier' }).className)
      .toContain('button--danger')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive Supplier' }))

    expect(await screen.findByText('Supplier XYZ Supplies archived successfully.')).toBeTruthy()
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('DELETE')
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeTruthy()
  })

  it('reactivates with only PATCH isActive true and authoritative response state', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers', [
      success({ suppliers: [archivedSupplier] }),
    ])
    fetchMock.mockResolvedValueOnce(
      success({ supplier: { ...archivedSupplier, isActive: true } }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate' }))
    const dialog = screen.getByRole('dialog', { name: 'Reactivate Supplier?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reactivate Supplier' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('PATCH')
    expect(getRequestBody(fetchMock, 3)).toEqual({ isActive: true })
    expect(await screen.findByText('Supplier Old Parts Co reactivated successfully.')).toBeTruthy()
  })
})
