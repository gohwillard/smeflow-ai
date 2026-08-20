import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { InventoryMovement, Product } from '../api/catalog'
import {
  activeCategory,
  activeProduct,
  getRequestBody,
  renderAuthenticatedPath,
  success,
} from '../test/catalog-test-utils'

const lowStockProduct: Product = {
  ...activeProduct,
  id: 'product-low',
  name: 'Low Stock Drill',
  quantityOnHand: '2.000',
  reorderLevel: '5.000',
}

const equalStockProduct: Product = {
  ...activeProduct,
  id: 'product-equal',
  sku: 'EQUAL-001',
  name: 'Equal Stock Product',
  quantityOnHand: '5.000',
  reorderLevel: '5.000',
}

const zeroStockProduct: Product = {
  ...activeProduct,
  id: 'product-zero',
  sku: 'ZERO-000',
  name: 'Zero Reorder Product',
  quantityOnHand: '0.000',
  reorderLevel: '0.000',
}

const archivedLowProduct: Product = {
  ...activeProduct,
  id: 'product-archived-low',
  sku: 'OLD-001',
  name: 'Archived Low Product',
  quantityOnHand: '0.000',
  reorderLevel: '5.000',
  isActive: false,
}

function adjustmentMovement(quantityAfter: string): InventoryMovement {
  return {
    id: 'movement-search-refresh',
    type: 'MANUAL_IN',
    quantity: '10.000',
    quantityBefore: '2.000',
    quantityAfter,
    note: null,
    createdAt: '2026-08-20T06:00:00.000Z',
    createdBy: {
      id: 'user-owner',
      firstName: 'Olivia',
      lastName: 'Owner',
    },
  }
}

describe('Phase 3F Product search and low-stock UI', () => {
  it.each(['OWNER', 'ADMIN', 'STAFF'] as const)(
    'renders accessible Product discovery controls for %s',
    async (role) => {
      await renderAuthenticatedPath(
        '/products',
        [success({ products: [activeProduct] }), success({ categories: [activeCategory] })],
        role,
      )

      expect(await screen.findByLabelText('Search Products')).toBeTruthy()
      expect(screen.getByPlaceholderText('Search by SKU or Product name')).toBeTruthy()
      expect(screen.getByRole('checkbox', { name: /Low stock only/ })).toBeTruthy()
      if (role === 'STAFF') {
        expect(screen.getByText('Read only')).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Adjust Stock' })).toBeNull()
      }
    },
  )

  it('submits SKU search and renders the backend result', async () => {
    const fetchMock = await renderAuthenticatedPath('/products', [
      success({ products: [activeProduct] }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByText('Cordless Drill')
    fetchMock.mockResolvedValueOnce(success({ products: [lowStockProduct] }))

    fireEvent.change(screen.getByLabelText('Search Products'), {
      target: { value: '  drill-001  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    expect(fetchMock.mock.calls[4]?.[0]).toMatch(/\/products\?search=drill-001$/)
    expect(await screen.findByText('2.000')).toBeTruthy()
  })

  it('submits Product-name search with safe URL encoding', async () => {
    const fetchMock = await renderAuthenticatedPath('/products', [
      success({ products: [activeProduct] }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByText('Cordless Drill')
    fetchMock.mockResolvedValueOnce(success({ products: [activeProduct] }))

    fireEvent.change(screen.getByLabelText('Search Products'), {
      target: { value: 'Cordless Drill' },
    })
    fireEvent.submit(screen.getByLabelText('Search Products').closest('form')!)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    expect(fetchMock.mock.calls[4]?.[0]).toMatch(
      /\/products\?search=Cordless\+Drill$/,
    )
  })

  it('clears search without a refresh and restores the normal Product request', async () => {
    const fetchMock = await renderAuthenticatedPath('/products', [
      success({ products: [activeProduct] }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByText('Cordless Drill')
    fetchMock
      .mockResolvedValueOnce(success({ products: [] }))
      .mockResolvedValueOnce(success({ products: [activeProduct] }))

    fireEvent.change(screen.getByLabelText('Search Products'), {
      target: { value: 'missing' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(
      await screen.findByRole('heading', {
        name: 'No Products match your current search or filter',
      }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    await screen.findByText('Cordless Drill')
    expect(fetchMock.mock.calls[5]?.[0]).toMatch(/\/products$/)
  })

  it('enables and disables backend low-stock filtering', async () => {
    const fetchMock = await renderAuthenticatedPath('/products', [
      success({ products: [activeProduct] }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByText('Cordless Drill')
    fetchMock
      .mockResolvedValueOnce(success({ products: [lowStockProduct] }))
      .mockResolvedValueOnce(success({ products: [activeProduct] }))

    const checkbox = screen.getByRole('checkbox', { name: /Low stock only/ })
    fireEvent.click(checkbox)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    expect(fetchMock.mock.calls[4]?.[0]).toMatch(/\/products\?lowStock=true$/)

    fireEvent.click(checkbox)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6))
    expect(fetchMock.mock.calls[5]?.[0]).toMatch(/\/products$/)
  })

  it('shows low-stock indicators only for active Products at or below reorder level', async () => {
    await renderAuthenticatedPath('/products', [
      success({
        products: [
          lowStockProduct,
          equalStockProduct,
          activeProduct,
          zeroStockProduct,
          archivedLowProduct,
        ],
      }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByText('Equal Stock Product')

    expect(screen.getAllByText('Low stock')).toHaveLength(3)
    expect(within(screen.getByRole('row', { name: /Low Stock Drill/ })).getByText('Low stock')).toBeTruthy()
    expect(within(screen.getByRole('row', { name: /Equal Stock Product/ })).getByText('Low stock')).toBeTruthy()
    expect(within(screen.getByRole('row', { name: /Zero Reorder Product/ })).getByText('Low stock')).toBeTruthy()
    expect(within(screen.getByRole('row', { name: /Cordless Drill/ })).queryByText('Low stock')).toBeNull()
    expect(within(screen.getByRole('row', { name: /Archived Low Product/ })).queryByText('Low stock')).toBeNull()
    expect(within(screen.getByRole('row', { name: /Archived Low Product/ })).getByText('Archived')).toBeTruthy()
  })

  it('combines filters and lets users clear each one without discarding the other', async () => {
    const fetchMock = await renderAuthenticatedPath('/products', [
      success({ products: [activeProduct] }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByText('Cordless Drill')
    fetchMock
      .mockResolvedValueOnce(success({ products: [lowStockProduct] }))
      .mockResolvedValueOnce(success({ products: [lowStockProduct] }))
      .mockResolvedValueOnce(success({ products: [lowStockProduct] }))
      .mockResolvedValueOnce(success({ products: [activeProduct] }))

    fireEvent.click(screen.getByRole('checkbox', { name: /Low stock only/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    fireEvent.change(screen.getByLabelText('Search Products'), {
      target: { value: 'drill' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6))
    expect(fetchMock.mock.calls[5]?.[0]).toMatch(
      /\/products\?search=drill&lowStock=true$/,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(7))
    expect(fetchMock.mock.calls[6]?.[0]).toMatch(/\/products\?lowStock=true$/)

    fireEvent.click(screen.getByRole('checkbox', { name: /Low stock only/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8))
    expect(fetchMock.mock.calls[7]?.[0]).toMatch(/\/products$/)
  })

  it('clears all filters from the combined no-results state', async () => {
    const fetchMock = await renderAuthenticatedPath('/products', [
      success({ products: [activeProduct] }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByText('Cordless Drill')
    fetchMock
      .mockResolvedValueOnce(success({ products: [lowStockProduct] }))
      .mockResolvedValueOnce(success({ products: [] }))
      .mockResolvedValueOnce(success({ products: [activeProduct] }))

    fireEvent.click(screen.getByRole('checkbox', { name: /Low stock only/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    fireEvent.change(screen.getByLabelText('Search Products'), {
      target: { value: 'saw' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(
      await screen.findByRole('heading', {
        name: 'No Products match your current search or filter',
      }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    await screen.findByText('Cordless Drill')
    expect(screen.getByRole('checkbox', { name: /Low stock only/ })).toHaveProperty(
      'checked',
      false,
    )
    expect(screen.getByLabelText('Search Products')).toHaveProperty('value', '')
    expect(fetchMock.mock.calls[6]?.[0]).toMatch(/\/products$/)
  })

  it('refetches active filters after stock adjustment and removes resolved low stock', async () => {
    const fetchMock = await renderAuthenticatedPath('/products', [
      success({ products: [lowStockProduct] }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByText('Low Stock Drill')
    fetchMock
      .mockResolvedValueOnce(success({ products: [lowStockProduct] }))
      .mockResolvedValueOnce(success({ product: lowStockProduct }))
      .mockResolvedValueOnce(success({ movements: [] }))
      .mockResolvedValueOnce(
        success(
          {
            product: { id: lowStockProduct.id, quantityOnHand: '12.000' },
            movement: adjustmentMovement('12.000'),
          },
          201,
        ),
      )
      .mockResolvedValueOnce(success({ products: [] }))

    fireEvent.click(screen.getByRole('checkbox', { name: /Low stock only/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    fireEvent.click(screen.getByRole('button', { name: 'Adjust Stock' }))
    await screen.findByRole('dialog', { name: 'Adjust Stock' })
    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '10.000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Adjustment' }))

    expect(
      await screen.findByRole('heading', {
        name: 'No Products match your current search or filter',
      }),
    ).toBeTruthy()
    expect(fetchMock.mock.calls[8]?.[0]).toMatch(/\/products\?lowStock=true$/)
    expect(fetchMock.mock.calls[7]?.[1]?.method).toBe('POST')
    expect(getRequestBody(fetchMock, 7)).toEqual({
      type: 'MANUAL_IN',
      quantity: '10.000',
    })
    expect(getRequestBody(fetchMock, 7)).not.toHaveProperty('quantityOnHand')
  })
})
