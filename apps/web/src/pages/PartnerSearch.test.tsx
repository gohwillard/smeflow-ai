import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Customer, Supplier } from '../api/partners'
import {
  renderAuthenticatedPath,
  success,
} from '../test/catalog-test-utils'

const activeCustomer: Customer = {
  id: 'customer-active-search',
  name: 'Alice Hardware',
  registrationNumber: 'CUS-100',
  contactPerson: 'Amina Rahman',
  email: 'alice@example.com',
  phone: '+60 12 345 6789',
  billingAddress: null,
  shippingAddress: null,
  notes: null,
  isActive: true,
  createdAt: '2026-08-24T06:00:00.000Z',
  updatedAt: '2026-08-24T07:00:00.000Z',
}

const archivedCustomer: Customer = {
  ...activeCustomer,
  id: 'customer-archived-search',
  name: 'Archived Alice',
  isActive: false,
}

const activeSupplier: Supplier = {
  id: 'supplier-active-search',
  name: 'Alpha Industrial',
  registrationNumber: 'SUP-100',
  contactPerson: 'Daniel Lim',
  email: 'orders@alpha.example',
  phone: '+60 3 9876 5432',
  address: null,
  notes: null,
  isActive: true,
  createdAt: '2026-08-24T06:00:00.000Z',
  updatedAt: '2026-08-24T07:00:00.000Z',
}

const archivedSupplier: Supplier = {
  ...activeSupplier,
  id: 'supplier-archived-search',
  name: 'Archived Alpha',
  isActive: false,
}

function expectNoCompanyId(url: unknown) {
  expect(String(url)).not.toContain('companyId')
}

describe('Phase 4E Customer search and lifecycle filters', () => {
  it.each(['OWNER', 'ADMIN', 'STAFF'] as const)(
    'renders accessible Customer discovery controls for %s',
    async (role) => {
      await renderAuthenticatedPath(
        '/customers',
        [success({ customers: [activeCustomer] })],
        role,
      )

      expect(await screen.findByLabelText('Search Customers')).toBeTruthy()
      expect(
        screen.getByPlaceholderText(
          'Search by name, registration number, contact person, email, or phone',
        ),
      ).toBeTruthy()
      expect(screen.getByLabelText('Lifecycle status')).toBeTruthy()
      if (role === 'STAFF') expect(screen.getByText('Read only')).toBeTruthy()
    },
  )

  it('submits a trimmed, encoded Customer search without Company scope', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers', [
      success({ customers: [activeCustomer] }),
    ])
    await screen.findByText('Alice Hardware')
    fetchMock.mockResolvedValueOnce(success({ customers: [activeCustomer] }))

    fireEvent.change(screen.getByLabelText('Search Customers'), {
      target: { value: '  Alice Hardware  ' },
    })
    fireEvent.submit(screen.getByLabelText('Search Customers').closest('form')!)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[3]?.[0]).toMatch(
      /\/customers\?search=Alice\+Hardware$/,
    )
    expectNoCompanyId(fetchMock.mock.calls[3]?.[0])
  })

  it.each([
    ['Active', 'active'],
    ['Archived', 'archived'],
  ])('sends the Customer %s lifecycle filter as status=%s', async (_label, status) => {
    const fetchMock = await renderAuthenticatedPath('/customers', [
      success({ customers: [activeCustomer, archivedCustomer] }),
    ])
    await screen.findByText('Alice Hardware')
    fetchMock.mockResolvedValueOnce(success({ customers: [] }))

    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: status },
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[3]?.[0]).toMatch(
      new RegExp(`/customers\\?status=${status}$`),
    )
    expect(screen.getByLabelText('Lifecycle status')).toHaveProperty('value', status)
  })

  it('maps Customer All to an omitted status query', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers', [
      success({ customers: [activeCustomer] }),
    ])
    await screen.findByText('Alice Hardware')
    fetchMock
      .mockResolvedValueOnce(success({ customers: [activeCustomer] }))
      .mockResolvedValueOnce(
        success({ customers: [activeCustomer, archivedCustomer] }),
      )

    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'active' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: '' },
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    expect(fetchMock.mock.calls[4]?.[0]).toMatch(/\/customers$/)
  })

  it('combines Customer search and status and clears only search', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers', [
      success({ customers: [activeCustomer] }),
    ])
    await screen.findByText('Alice Hardware')
    fetchMock
      .mockResolvedValueOnce(success({ customers: [activeCustomer] }))
      .mockResolvedValueOnce(success({ customers: [activeCustomer] }))
      .mockResolvedValueOnce(success({ customers: [activeCustomer] }))

    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'active' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fireEvent.change(screen.getByLabelText('Search Customers'), {
      target: { value: 'alice' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    expect(fetchMock.mock.calls[4]?.[0]).toMatch(
      /\/customers\?search=alice&status=active$/,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6))
    expect(fetchMock.mock.calls[5]?.[0]).toMatch(
      /\/customers\?status=active$/,
    )
  })

  it('shows filtered no-results and clears all Customer filters', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers', [
      success({ customers: [activeCustomer] }),
    ])
    await screen.findByText('Alice Hardware')
    fetchMock
      .mockResolvedValueOnce(success({ customers: [activeCustomer] }))
      .mockResolvedValueOnce(success({ customers: [] }))
      .mockResolvedValueOnce(
        success({ customers: [activeCustomer, archivedCustomer] }),
      )

    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'active' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fireEvent.change(screen.getByLabelText('Search Customers'), {
      target: { value: 'missing' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(
      await screen.findByRole('heading', {
        name: 'No Customers match your current search or filter',
      }),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    await screen.findByText('Archived Alice')
    expect(screen.getByLabelText('Search Customers')).toHaveProperty('value', '')
    expect(screen.getByLabelText('Lifecycle status')).toHaveProperty('value', '')
    expect(fetchMock.mock.calls[5]?.[0]).toMatch(/\/customers$/)
  })

  it('lets STAFF apply Customer filters without management controls', async () => {
    const fetchMock = await renderAuthenticatedPath(
      '/customers',
      [success({ customers: [activeCustomer] })],
      'STAFF',
    )
    await screen.findByText('Alice Hardware')
    fetchMock.mockResolvedValueOnce(success({ customers: [activeCustomer] }))
    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'active' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[3]?.[0]).toMatch(/\/customers\?status=active$/)
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull()
  })

  it('authoritatively refetches the active Customer filter after archive', async () => {
    const fetchMock = await renderAuthenticatedPath('/customers', [
      success({ customers: [activeCustomer] }),
    ])
    await screen.findByText('Alice Hardware')
    fetchMock
      .mockResolvedValueOnce(success({ customers: [activeCustomer] }))
      .mockResolvedValueOnce(
        success({ customer: { ...activeCustomer, isActive: false } }),
      )
      .mockResolvedValueOnce(success({ customers: [] }))

    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'active' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    const dialog = screen.getByRole('dialog', { name: 'Archive Customer?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive Customer' }))

    expect(
      await screen.findByRole('heading', {
        name: 'No Customers match your current search or filter',
      }),
    ).toBeTruthy()
    expect(fetchMock.mock.calls[5]?.[0]).toMatch(
      /\/customers\?status=active$/,
    )
  })
})

describe('Phase 4E Supplier search and lifecycle filters', () => {
  it.each(['OWNER', 'ADMIN', 'STAFF'] as const)(
    'renders accessible Supplier discovery controls for %s',
    async (role) => {
      await renderAuthenticatedPath(
        '/suppliers',
        [success({ suppliers: [activeSupplier] })],
        role,
      )

      expect(await screen.findByLabelText('Search Suppliers')).toBeTruthy()
      expect(screen.getByLabelText('Lifecycle status')).toBeTruthy()
      if (role === 'STAFF') expect(screen.getByText('Read only')).toBeTruthy()
    },
  )

  it('submits encoded Supplier search to the Supplier endpoint only', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers', [
      success({ suppliers: [activeSupplier] }),
    ])
    await screen.findByText('Alpha Industrial')
    fetchMock.mockResolvedValueOnce(success({ suppliers: [activeSupplier] }))
    fireEvent.change(screen.getByLabelText('Search Suppliers'), {
      target: { value: '  Alpha Industrial  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[3]?.[0]).toMatch(
      /\/suppliers\?search=Alpha\+Industrial$/,
    )
    expect(String(fetchMock.mock.calls[3]?.[0])).not.toContain('/customers')
    expectNoCompanyId(fetchMock.mock.calls[3]?.[0])
  })

  it.each([
    ['Active', 'active'],
    ['Archived', 'archived'],
  ])('sends the Supplier %s lifecycle filter as status=%s', async (_label, status) => {
    const fetchMock = await renderAuthenticatedPath('/suppliers', [
      success({ suppliers: [activeSupplier, archivedSupplier] }),
    ])
    await screen.findByText('Alpha Industrial')
    fetchMock.mockResolvedValueOnce(success({ suppliers: [] }))
    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: status },
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[3]?.[0]).toMatch(
      new RegExp(`/suppliers\\?status=${status}$`),
    )
  })

  it('maps Supplier All to an omitted status query', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers', [
      success({ suppliers: [activeSupplier] }),
    ])
    await screen.findByText('Alpha Industrial')
    fetchMock
      .mockResolvedValueOnce(success({ suppliers: [activeSupplier] }))
      .mockResolvedValueOnce(
        success({ suppliers: [activeSupplier, archivedSupplier] }),
      )
    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'active' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: '' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    expect(fetchMock.mock.calls[4]?.[0]).toMatch(/\/suppliers$/)
  })

  it('combines Supplier search/status and clears only search', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers', [
      success({ suppliers: [activeSupplier] }),
    ])
    await screen.findByText('Alpha Industrial')
    fetchMock
      .mockResolvedValueOnce(success({ suppliers: [activeSupplier] }))
      .mockResolvedValueOnce(success({ suppliers: [activeSupplier] }))
      .mockResolvedValueOnce(success({ suppliers: [activeSupplier] }))
    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'active' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fireEvent.change(screen.getByLabelText('Search Suppliers'), {
      target: { value: 'alpha' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    expect(fetchMock.mock.calls[4]?.[0]).toMatch(
      /\/suppliers\?search=alpha&status=active$/,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6))
    expect(fetchMock.mock.calls[5]?.[0]).toMatch(
      /\/suppliers\?status=active$/,
    )
  })

  it('shows Supplier no-results and clears all filters', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers', [
      success({ suppliers: [activeSupplier] }),
    ])
    await screen.findByText('Alpha Industrial')
    fetchMock
      .mockResolvedValueOnce(success({ suppliers: [activeSupplier] }))
      .mockResolvedValueOnce(success({ suppliers: [] }))
      .mockResolvedValueOnce(
        success({ suppliers: [activeSupplier, archivedSupplier] }),
      )
    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'archived' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fireEvent.change(screen.getByLabelText('Search Suppliers'), {
      target: { value: 'missing' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(
      await screen.findByRole('heading', {
        name: 'No Suppliers match your current search or filter',
      }),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    await screen.findByText('Archived Alpha')
    expect(fetchMock.mock.calls[5]?.[0]).toMatch(/\/suppliers$/)
  })

  it('lets STAFF apply Supplier filters without write controls', async () => {
    const fetchMock = await renderAuthenticatedPath(
      '/suppliers',
      [success({ suppliers: [activeSupplier] })],
      'STAFF',
    )
    await screen.findByText('Alpha Industrial')
    fetchMock.mockResolvedValueOnce(success({ suppliers: [activeSupplier] }))
    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'active' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[3]?.[0]).toMatch(/\/suppliers\?status=active$/)
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull()
  })

  it('authoritatively refetches the archived Supplier filter after reactivation', async () => {
    const fetchMock = await renderAuthenticatedPath('/suppliers', [
      success({ suppliers: [archivedSupplier] }),
    ])
    await screen.findByText('Archived Alpha')
    fetchMock
      .mockResolvedValueOnce(success({ suppliers: [archivedSupplier] }))
      .mockResolvedValueOnce(
        success({ supplier: { ...archivedSupplier, isActive: true } }),
      )
      .mockResolvedValueOnce(success({ suppliers: [] }))

    fireEvent.change(screen.getByLabelText('Lifecycle status'), {
      target: { value: 'archived' },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }))
    const dialog = screen.getByRole('dialog', { name: 'Reactivate Supplier?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reactivate Supplier' }))

    expect(
      await screen.findByRole('heading', {
        name: 'No Suppliers match your current search or filter',
      }),
    ).toBeTruthy()
    expect(fetchMock.mock.calls[5]?.[0]).toMatch(
      /\/suppliers\?status=archived$/,
    )
  })
})
