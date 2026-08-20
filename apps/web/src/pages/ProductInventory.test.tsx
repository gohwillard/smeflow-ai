import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type {
  InventoryMovement,
  InventoryMovementType,
  Product,
} from '../api/catalog'
import {
  activeCategory,
  activeProduct,
  apiError,
  archivedProduct,
  deferredResponse,
  getRequestBody,
  renderAuthenticatedPath,
  success,
} from '../test/catalog-test-utils'

const openingProduct: Product = {
  ...activeProduct,
  id: 'product-opening',
  sku: 'NEW-001',
  name: 'New Product',
  quantityOnHand: '0.000',
}

function movement(
  id: string,
  type: InventoryMovementType,
  quantity: string,
  before: string,
  after: string,
  overrides: Partial<InventoryMovement> = {},
): InventoryMovement {
  return {
    id,
    type,
    quantity,
    quantityBefore: before,
    quantityAfter: after,
    note: null,
    createdAt: '2026-08-20T03:00:00.000Z',
    createdBy: {
      id: 'user-owner',
      firstName: 'Olivia',
      lastName: 'Owner',
    },
    ...overrides,
  }
}

const stockInMovement = movement(
  'movement-in',
  'MANUAL_IN',
  '5.500',
  '4.500',
  '10.000',
  { note: 'Physical count correction' },
)

async function renderProductInventory(
  product: Product = activeProduct,
  movements: InventoryMovement[] = [],
  role: 'OWNER' | 'ADMIN' | 'STAFF' = 'OWNER',
) {
  return renderAuthenticatedPath(
    `/products/${product.id}`,
    [
      success({ product }),
      success({ categories: [activeCategory] }),
      success({ movements }),
    ],
    role,
  )
}

async function openAdjustmentDialog() {
  const trigger = await screen.findByRole('button', { name: 'Adjust Stock' })
  fireEvent.click(trigger)
  return screen.getByRole('dialog', { name: 'Adjust Stock' })
}

function fillAdjustment(quantity: string, note = '') {
  fireEvent.change(screen.getByLabelText('Quantity'), {
    target: { value: quantity },
  })
  if (note) {
    fireEvent.change(screen.getByLabelText(/Note/), {
      target: { value: note },
    })
  }
}

describe('Phase 3E inventory movement history', () => {
  it('shows a movement-history loading state', async () => {
    const pendingHistory = deferredResponse()
    await renderAuthenticatedPath(`/products/${activeProduct.id}`, [
      success({ product: activeProduct }),
      success({ categories: [activeCategory] }),
      pendingHistory.promise,
    ])

    expect(await screen.findByText('Loading inventory movements…')).toBeTruthy()
    expect(screen.queryByText('No inventory movements yet')).toBeNull()
    pendingHistory.resolve(success({ movements: [] }))
    expect(await screen.findByText('No inventory movements yet')).toBeTruthy()
  })

  it('shows a deliberate empty state without treating it as an error', async () => {
    await renderProductInventory()
    expect(await screen.findByRole('heading', { name: 'Inventory Movements' })).toBeTruthy()
    expect(screen.getByText('No inventory movements yet')).toBeTruthy()
    expect(screen.getByText('This Product has no recorded stock changes.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders API order, business labels, exact balances, note, creator, and time', async () => {
    const latest = movement('movement-out', 'MANUAL_OUT', '1.250', '10.000', '8.750', {
      note: 'Damaged item correction',
      createdAt: '2026-08-20T04:00:00.000Z',
      createdBy: { id: 'user-admin', firstName: 'Aiden', lastName: 'Admin' },
    })
    const opening = movement('movement-opening', 'OPENING_BALANCE', '4.500', '0.000', '4.500')
    await renderProductInventory(activeProduct, [latest, stockInMovement, opening])

    await screen.findByText('Inventory Movements')
    expect(screen.getByText('Stock Out')).toBeTruthy()
    expect(screen.getByText('Stock In')).toBeTruthy()
    expect(screen.getByText('Opening Balance')).toBeTruthy()
    expect(screen.getByText('1.250 pcs')).toBeTruthy()
    expect(screen.getByText('10.000 → 8.750')).toBeTruthy()
    expect(screen.getByText('Damaged item correction')).toBeTruthy()
    expect(screen.getByText('Aiden Admin')).toBeTruthy()

    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('Stock Out')).toBeTruthy()
    expect(within(rows[2]).getByText('Stock In')).toBeTruthy()
    expect(within(rows[3]).getByText('Opening Balance')).toBeTruthy()
  })

  it('keeps movement history visible to STAFF without adjustment controls', async () => {
    await renderProductInventory(activeProduct, [stockInMovement], 'STAFF')
    expect(await screen.findByText('Stock In')).toBeTruthy()
    expect(screen.getByText('Olivia Owner')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Adjust Stock' })).toBeNull()
  })

  it('shows a history error and recovers through Try again', async () => {
    const fetchMock = await renderAuthenticatedPath(`/products/${activeProduct.id}`, [
      success({ product: activeProduct }),
      success({ categories: [activeCategory] }),
      apiError(500, 'INTERNAL_SERVER_ERROR', 'Movement history is unavailable'),
    ])
    expect(await screen.findByText('Movement history is unavailable')).toBeTruthy()
    fetchMock.mockResolvedValueOnce(success({ movements: [stockInMovement] }))
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Stock In')).toBeTruthy()
    expect(screen.queryByText('Movement history is unavailable')).toBeNull()
  })
})

describe('Phase 3E inventory adjustment workflow', () => {
  it.each(['OWNER', 'ADMIN'] as const)(
    'shows an adjustment action and focused form to %s',
    async (role) => {
      await renderProductInventory(openingProduct, [], role)
      const dialog = await openAdjustmentDialog()

      expect(within(dialog).getByText('0.000 pcs')).toBeTruthy()
      expect(screen.getByLabelText('Adjustment type')).toBeTruthy()
      expect(screen.getByLabelText('Quantity')).toBeTruthy()
      expect(screen.getByLabelText(/Note/)).toBeTruthy()
      expect(screen.getByText('Optional')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Save Adjustment' })).toBeTruthy()
      expect(document.activeElement).toBe(screen.getByLabelText('Adjustment type'))
    },
  )

  it('offers Opening Balance only for a zero-stock Product with no history', async () => {
    const firstView = await renderProductInventory(openingProduct)
    await openAdjustmentDialog()
    expect(screen.getByRole('option', { name: 'Opening Balance' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Stock In' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Stock Out' })).toBeTruthy()
    firstView.mockClear()

    // A recorded movement makes Opening Balance ineligible even if stock is zero.
    screen.getByRole('button', { name: 'Cancel' }).click()
  })

  it('does not offer Opening Balance after any movement exists', async () => {
    await renderProductInventory(openingProduct, [
      movement('movement-zero', 'MANUAL_OUT', '1.000', '1.000', '0.000'),
    ])
    await openAdjustmentDialog()
    expect(screen.queryByRole('option', { name: 'Opening Balance' })).toBeNull()
    expect(screen.getByLabelText('Adjustment type')).toHaveProperty('value', 'MANUAL_IN')
  })

  it('cancels without a request and restores focus', async () => {
    const fetchMock = await renderProductInventory()
    const trigger = await screen.findByRole('button', { name: 'Adjust Stock' })
    trigger.focus()
    fireEvent.click(trigger)
    await screen.findByRole('dialog', { name: 'Adjust Stock' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(document.activeElement).toBe(trigger)
  })

  it('sends only approved exact-string fields for Stock In and refreshes Product and history', async () => {
    const fetchMock = await renderProductInventory()
    fetchMock
      .mockResolvedValueOnce(
        success(
          {
            product: { id: activeProduct.id, quantityOnHand: '10.000' },
            movement: stockInMovement,
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        success({ product: { ...activeProduct, quantityOnHand: '10.000' } }),
      )
      .mockResolvedValueOnce(success({ movements: [stockInMovement] }))

    await openAdjustmentDialog()
    fireEvent.change(screen.getByLabelText('Adjustment type'), {
      target: { value: 'MANUAL_IN' },
    })
    fillAdjustment('5.500', '  Physical count correction  ')
    fireEvent.click(screen.getByRole('button', { name: 'Save Adjustment' }))

    expect(
      await screen.findByText(
        'Stock In recorded successfully. Current stock is 10.000 pcs.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('10.000')).toBeTruthy()
    expect(screen.getByText('4.500 → 10.000')).toBeTruthy()
    expect(getRequestBody(fetchMock, 5)).toEqual({
      type: 'MANUAL_IN',
      quantity: '5.500',
      note: 'Physical count correction',
    })
    expect(getRequestBody(fetchMock, 5)).not.toHaveProperty('quantityOnHand')
    expect(getRequestBody(fetchMock, 5)).not.toHaveProperty('quantityBefore')
    expect(getRequestBody(fetchMock, 5)).not.toHaveProperty('quantityAfter')
    expect(getRequestBody(fetchMock, 5)).not.toHaveProperty('companyId')
    expect(getRequestBody(fetchMock, 5)).not.toHaveProperty('createdByUserId')
    expect(fetchMock.mock.calls[6]?.[0]).toContain(`/products/${activeProduct.id}`)
    expect(fetchMock.mock.calls[7]?.[0]).toContain('inventory-movements')
  })

  it('records Stock Out, omits a blank optional note, and shows backend-authoritative stock', async () => {
    const stockOut = movement('movement-stock-out', 'MANUAL_OUT', '3.250', '4.500', '1.250')
    const fetchMock = await renderProductInventory()
    fetchMock
      .mockResolvedValueOnce(success({
        product: { id: activeProduct.id, quantityOnHand: '1.250' },
        movement: stockOut,
      }, 201))
      .mockResolvedValueOnce(success({ product: { ...activeProduct, quantityOnHand: '1.250' } }))
      .mockResolvedValueOnce(success({ movements: [stockOut] }))

    await openAdjustmentDialog()
    fireEvent.change(screen.getByLabelText('Adjustment type'), {
      target: { value: 'MANUAL_OUT' },
    })
    fillAdjustment('3.250', '   ')
    fireEvent.click(screen.getByRole('button', { name: 'Save Adjustment' }))

    expect(await screen.findByText('Stock Out recorded successfully. Current stock is 1.250 pcs.')).toBeTruthy()
    expect(screen.getByText('4.500 → 1.250')).toBeTruthy()
    expect(getRequestBody(fetchMock, 5)).toEqual({
      type: 'MANUAL_OUT',
      quantity: '3.250',
    })
  })

  it('records Opening Balance and removes that option from the next dialog', async () => {
    const opening = movement('movement-opening-success', 'OPENING_BALANCE', '7.000', '0.000', '7.000')
    const fetchMock = await renderProductInventory(openingProduct)
    fetchMock
      .mockResolvedValueOnce(success({
        product: { id: openingProduct.id, quantityOnHand: '7.000' },
        movement: opening,
      }, 201))
      .mockResolvedValueOnce(success({ product: { ...openingProduct, quantityOnHand: '7.000' } }))
      .mockResolvedValueOnce(success({ movements: [opening] }))

    await openAdjustmentDialog()
    fillAdjustment('7')
    fireEvent.click(screen.getByRole('button', { name: 'Save Adjustment' }))
    expect(await screen.findByText('Opening Balance recorded successfully. Current stock is 7.000 pcs.')).toBeTruthy()

    await openAdjustmentDialog()
    expect(screen.queryByRole('option', { name: 'Opening Balance' })).toBeNull()
  })

  it('shows insufficient-stock and backend validation errors without pretending success', async () => {
    const fetchMock = await renderProductInventory()
    fetchMock.mockResolvedValueOnce(
      apiError(409, 'INSUFFICIENT_STOCK', 'Insufficient stock for this adjustment'),
    )
    await openAdjustmentDialog()
    fireEvent.change(screen.getByLabelText('Adjustment type'), {
      target: { value: 'MANUAL_OUT' },
    })
    fillAdjustment('9.000')
    fireEvent.click(screen.getByRole('button', { name: 'Save Adjustment' }))
    expect(await screen.findByText('Insufficient stock for this adjustment.')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByText(/recorded successfully/)).toBeNull()

    fetchMock.mockResolvedValueOnce(
      apiError(400, 'VALIDATION_ERROR', 'Invalid input', [
        { field: 'quantity', message: 'Quantity is outside the allowed range' },
      ]),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save Adjustment' }))
    expect(await screen.findByText('Quantity is outside the allowed range')).toBeTruthy()
  })

  it('validates exact positive decimal strings before sending a request', async () => {
    const fetchMock = await renderProductInventory()
    await openAdjustmentDialog()
    fillAdjustment('1.0001')
    fireEvent.click(screen.getByRole('button', { name: 'Save Adjustment' }))

    expect(await screen.findByText('Enter a quantity greater than zero with at most 3 decimal places.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('prevents duplicate submissions while an adjustment is pending', async () => {
    const fetchMock = await renderProductInventory()
    const pending = deferredResponse()
    fetchMock
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(success({ product: { ...activeProduct, quantityOnHand: '5.500' } }))
      .mockResolvedValueOnce(success({ movements: [stockInMovement] }))
    await openAdjustmentDialog()
    fireEvent.change(screen.getByLabelText('Adjustment type'), {
      target: { value: 'MANUAL_IN' },
    })
    fillAdjustment('1.000')
    const submit = screen.getByRole('button', { name: 'Save Adjustment' })
    fireEvent.click(submit)
    fireEvent.click(submit)

    expect(fetchMock).toHaveBeenCalledTimes(6)
    expect(await screen.findByRole('button', { name: 'Saving Adjustment…' })).toHaveProperty('disabled', true)
    pending.resolve(success({
      product: { id: activeProduct.id, quantityOnHand: '5.500' },
      movement: { ...stockInMovement, quantity: '1.000', quantityAfter: '5.500' },
    }, 201))
    expect(await screen.findByText('Stock In recorded successfully. Current stock is 5.500 pcs.')).toBeTruthy()
  })

  it('does not show an enabled adjustment action for an archived Product', async () => {
    await renderProductInventory(archivedProduct, [stockInMovement])
    expect(await screen.findByText('Stock In')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Adjust Stock' })).toBeNull()
  })
})
