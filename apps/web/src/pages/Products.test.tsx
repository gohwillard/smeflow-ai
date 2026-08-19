import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  activeCategory,
  activeProduct,
  apiError,
  archivedCategory,
  archivedProduct,
  deferredResponse,
  getRequestBody,
  renderAuthenticatedPath,
  renderUnauthenticated,
  success,
} from '../test/catalog-test-utils'

function fillProductForm() {
  fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'drill-001' } })
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Cordless Drill' } })
  fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'pcs' } })
  fireEvent.change(screen.getByLabelText('Cost price'), { target: { value: '10.25' } })
  fireEvent.change(screen.getByLabelText('Selling price'), { target: { value: '15.99' } })
  fireEvent.change(screen.getByLabelText(/Reorder level/), { target: { value: '1.500' } })
}

function getCategorySelector() {
  return screen.getByRole('combobox', { name: /Category/ })
}

function openCategorySelector() {
  const selector = getCategorySelector()
  if (selector.getAttribute('aria-expanded') !== 'true') fireEvent.click(selector)
  return screen.getByRole('listbox', { name: /Category/ })
}

function chooseCategory(name: string) {
  const listbox = openCategorySelector()
  fireEvent.click(within(listbox).getByRole('option', { name }))
}

describe('Phase 3D Product list', () => {
  it('protects Product list, create, detail, and edit routes', async () => {
    for (const path of ['/products', '/products/new', '/products/product-1', '/products/product-1/edit']) {
      const view = renderUnauthenticated(path)
      expect(await screen.findByRole('heading', { name: 'Sign in to SMEFlow' })).toBeTruthy()
      view.unmount()
    }
  })

  it('shows Product loading state before an empty state', async () => {
    const request = deferredResponse()
    await renderAuthenticatedPath('/products', [request.promise, success({ categories: [] })])
    expect(await screen.findByText('Loading Products…')).toBeTruthy()
    expect(screen.queryByText('Your Product catalog is empty')).toBeNull()
    request.resolve(success({ products: [] }))
    expect(await screen.findByText('Your Product catalog is empty')).toBeTruthy()
  })

  it('shows role-appropriate Product empty states', async () => {
    await renderAuthenticatedPath('/products', [success({ products: [] }), success({ categories: [] })])
    expect(await screen.findByRole('link', { name: 'Create first Product' })).toBeTruthy()
  })

  it('renders Product fields, Category names, Uncategorized, stock, and archive state', async () => {
    await renderAuthenticatedPath('/products', [
      success({ products: [activeProduct, archivedProduct] }),
      success({ categories: [activeCategory] }),
    ])

    expect(await screen.findByText('Cordless Drill')).toBeTruthy()
    expect(screen.getByText(/DRILL-001/)).toBeTruthy()
    expect(screen.getByText('Power Tools')).toBeTruthy()
    expect(screen.getByText('Uncategorized')).toBeTruthy()
    expect(screen.getByText('4.500')).toBeTruthy()
    expect(screen.getAllByText('15.99')).toHaveLength(2)
    expect(screen.getByText('Archived')).toBeTruthy()
    expect(screen.getByText('Stock is read only here')).toBeTruthy()
  })

  it('marks an archived Category without removing the Product relationship', async () => {
    await renderAuthenticatedPath('/products', [
      success({ products: [{ ...activeProduct, categoryId: archivedCategory.id }] }),
      success({ categories: [archivedCategory] }),
    ])
    expect(await screen.findByText('Legacy Tools (Archived)')).toBeTruthy()
  })

  it.each(['OWNER', 'ADMIN'] as const)('shows Product management actions to %s', async (role) => {
    await renderAuthenticatedPath('/products', [
      success({ products: [activeProduct] }),
      success({ categories: [activeCategory] }),
    ], role)
    expect(await screen.findByRole('link', { name: 'Create Product' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Edit' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Archive' }).className).toContain('text-button--danger')
  })

  it('uses card-ready labels and a non-destructive style for archived Product actions', async () => {
    await renderAuthenticatedPath('/products', [
      success({ products: [archivedProduct] }),
      success({ categories: [] }),
    ])
    const productCell = await screen.findByRole('cell', { name: /Legacy Saw/ })
    expect(productCell.getAttribute('data-label')).toBe('Product')
    expect(screen.getByRole('button', { name: 'Reactivate' }).className).toContain('text-button--positive')
  })

  it('keeps STAFF Product list and direct form access read-only', async () => {
    await renderAuthenticatedPath('/products', [
      success({ products: [activeProduct] }),
      success({ categories: [activeCategory] }),
    ], 'STAFF')
    expect(await screen.findByText('Read only')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Create Product' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull()
  })
})

describe('Phase 3D Create Product', () => {
  it('renders only approved fields and active Category choices', async () => {
    await renderAuthenticatedPath('/products/new', [success({ categories: [activeCategory, archivedCategory] })])
    expect(await screen.findByRole('heading', { name: 'Create Product' })).toBeTruthy()
    expect(screen.getByLabelText('SKU')).toBeTruthy()
    expect(screen.getByLabelText('Product name')).toBeTruthy()
    expect(getCategorySelector().textContent).toContain('Uncategorized')
    expect(screen.getByLabelText('Unit')).toBeTruthy()
    expect(screen.getByLabelText('Cost price')).toBeTruthy()
    expect(screen.getByLabelText('Selling price')).toBeTruthy()
    expect(screen.getByLabelText(/Reorder level/)).toBeTruthy()
    expect(screen.queryByRole('listbox')).toBeNull()
    const listbox = openCategorySelector()
    expect(within(listbox).getByRole('option', { name: 'Uncategorized' })).toBeTruthy()
    expect(within(listbox).getByRole('option', { name: 'Power Tools' })).toBeTruthy()
    expect(within(listbox).queryByRole('option', { name: /Legacy Tools/ })).toBeNull()
    fireEvent.click(within(listbox).getByRole('option', { name: 'Power Tools' }))
    expect(getCategorySelector().textContent).toContain('Power Tools')
    expect(screen.queryByLabelText(/quantity on hand/i)).toBeNull()
    expect(screen.queryByLabelText(/company/i)).toBeNull()
  })

  it('supports Uncategorized creation when no active Categories exist', async () => {
    await renderAuthenticatedPath('/products/new', [success({ categories: [archivedCategory] })])
    expect(await screen.findByText('No active Categories are available. Uncategorized remains valid.')).toBeTruthy()
    const listbox = openCategorySelector()
    expect(within(listbox).getByRole('option', { name: 'Uncategorized' })).toBeTruthy()
    expect(within(listbox).queryByRole('option', { name: /Legacy Tools/ })).toBeNull()
  })

  it('supports keyboard selection, Escape, and outside-click closing', async () => {
    await renderAuthenticatedPath('/products/new', [success({ categories: [activeCategory] })])
    await screen.findByRole('heading', { name: 'Create Product' })
    const selector = getCategorySelector()

    selector.focus()
    fireEvent.keyDown(selector, { key: 'ArrowDown' })
    expect(selector.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(selector, { key: 'ArrowDown' })
    fireEvent.keyDown(selector, { key: 'Enter' })
    expect(selector.textContent).toContain('Power Tools')
    expect(screen.queryByRole('listbox')).toBeNull()

    fireEvent.keyDown(selector, { key: 'Enter' })
    expect(screen.getByRole('listbox', { name: /Category/ })).toBeTruthy()
    fireEvent.keyDown(selector, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()

    fireEvent.keyDown(selector, { key: ' ' })
    expect(screen.getByRole('listbox', { name: /Category/ })).toBeTruthy()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('sends exact Decimal strings and safe Product fields, then displays normalized SKU', async () => {
    const fetchMock = await renderAuthenticatedPath('/products/new', [success({ categories: [activeCategory] })])
    await screen.findByRole('heading', { name: 'Create Product' })
    fetchMock
      .mockResolvedValueOnce(success({ product: activeProduct }, 201))
      .mockResolvedValueOnce(success({ product: activeProduct }))
      .mockResolvedValueOnce(success({ categories: [activeCategory] }))

    fillProductForm()
    chooseCategory('Power Tools')
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: '18V cordless drill' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))

    expect(await screen.findByText('Product DRILL-001 created successfully.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Cordless Drill' })).toBeTruthy()
    expect(getRequestBody(fetchMock, 3)).toEqual({
      categoryId: activeCategory.id,
      sku: 'drill-001',
      name: 'Cordless Drill',
      description: '18V cordless drill',
      unit: 'pcs',
      costPrice: '10.25',
      sellingPrice: '15.99',
      reorderLevel: '1.500',
    })
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('companyId')
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('quantityOnHand')
  })

  it('omits blank optional reorder level and sends Uncategorized as null', async () => {
    const product = { ...activeProduct, categoryId: null, reorderLevel: '0.000' }
    const fetchMock = await renderAuthenticatedPath('/products/new', [success({ categories: [] })])
    await screen.findByRole('heading', { name: 'Create Product' })
    fetchMock
      .mockResolvedValueOnce(success({ product }, 201))
      .mockResolvedValueOnce(success({ product }))
      .mockResolvedValueOnce(success({ categories: [] }))

    fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'drill-001' } })
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Cordless Drill' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'pcs' } })
    fireEvent.change(screen.getByLabelText('Cost price'), { target: { value: '10.25' } })
    fireEvent.change(screen.getByLabelText('Selling price'), { target: { value: '15.99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    await screen.findByText('Product DRILL-001 created successfully.')

    expect(getRequestBody(fetchMock, 3)).toMatchObject({ categoryId: null })
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('reorderLevel')
  })

  it('shows duplicate SKU, unavailable Category, and validation feedback', async () => {
    const fetchMock = await renderAuthenticatedPath('/products/new', [success({ categories: [activeCategory] })])
    await screen.findByRole('heading', { name: 'Create Product' })
    fillProductForm()

    fetchMock.mockResolvedValueOnce(apiError(409, 'SKU_ALREADY_EXISTS', 'A product with this SKU already exists'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    expect(await screen.findByText('This SKU is already used by an active or archived Product.')).toBeTruthy()
    expect(screen.getByLabelText('Product name')).toHaveProperty('value', 'Cordless Drill')

    fetchMock.mockResolvedValueOnce(apiError(400, 'CATEGORY_UNAVAILABLE', 'Category is unavailable for assignment'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    expect(await screen.findByText('This Category is archived or no longer available.')).toBeTruthy()

    fetchMock.mockResolvedValueOnce(apiError(400, 'VALIDATION_ERROR', 'Product input is invalid', [{ field: 'unit', message: 'Product unit is invalid' }]))
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    expect(await screen.findByText('Product unit is invalid')).toBeTruthy()

    fetchMock.mockResolvedValueOnce(apiError(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    expect(await screen.findByText('An unexpected error occurred')).toBeTruthy()
  })

  it('validates decimal precision client-side without unsafe arithmetic', async () => {
    const fetchMock = await renderAuthenticatedPath('/products/new', [success({ categories: [] })])
    await screen.findByRole('heading', { name: 'Create Product' })
    fillProductForm()
    fireEvent.change(screen.getByLabelText('Cost price'), { target: { value: '10.255' } })
    fireEvent.change(screen.getByLabelText(/Reorder level/), { target: { value: '1.5009' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))

    expect(await screen.findByText('Enter a non-negative amount with at most 2 decimal places.')).toBeTruthy()
    expect(screen.getByText('Enter a non-negative quantity with at most 3 decimal places.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('prevents duplicate submissions while a Product request is pending', async () => {
    const fetchMock = await renderAuthenticatedPath('/products/new', [success({ categories: [] })])
    await screen.findByRole('heading', { name: 'Create Product' })
    const request = deferredResponse()
    fetchMock.mockReturnValueOnce(request.promise)
    fetchMock.mockResolvedValueOnce(success({ product: { ...activeProduct, categoryId: null } }))
    fetchMock.mockResolvedValueOnce(success({ categories: [] }))
    fillProductForm()

    const submit = screen.getByRole('button', { name: 'Create Product' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(await screen.findByRole('button', { name: 'Saving Product…' })).toHaveProperty('disabled', true)

    request.resolve(success({ product: { ...activeProduct, categoryId: null } }, 201))
    expect(await screen.findByText('Product DRILL-001 created successfully.')).toBeTruthy()
  })

  it('clears authentication on Product POST 401 but preserves it on 403', async () => {
    const fetchMock = await renderAuthenticatedPath('/products/new', [success({ categories: [] })])
    await screen.findByRole('heading', { name: 'Create Product' })
    fillProductForm()
    fetchMock.mockResolvedValueOnce(apiError(403, 'FORBIDDEN', 'Forbidden'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    expect(await screen.findByText('You do not have permission to manage Products.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy()

    fetchMock.mockResolvedValueOnce(apiError(401, 'INVALID_TOKEN', 'Access token is invalid'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }))
    expect(await screen.findByRole('heading', { name: 'Sign in to SMEFlow' })).toBeTruthy()
  })
})

describe('Phase 3D Product details and lifecycle', () => {
  it('shows a detail loading state and all important business fields', async () => {
    const request = deferredResponse()
    await renderAuthenticatedPath(`/products/${activeProduct.id}`, [request.promise, success({ categories: [activeCategory] })])
    expect(await screen.findByText('Loading Product details…')).toBeTruthy()
    request.resolve(success({ product: activeProduct }))

    expect(await screen.findByRole('heading', { name: 'Cordless Drill' })).toBeTruthy()
    expect(screen.getAllByText('DRILL-001').length).toBeGreaterThan(0)
    expect(screen.getByText('Power Tools')).toBeTruthy()
    expect(screen.getAllByText('18V cordless drill')).toHaveLength(2)
    expect(screen.getByText('10.25')).toBeTruthy()
    expect(screen.getByText('15.99')).toBeTruthy()
    expect(screen.getByText('4.500')).toBeTruthy()
    expect(
      screen.getByText(
        (_text, element) =>
          element?.tagName === 'DD' && element.textContent?.trim() === '1.500 pcs',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Current stock is read only')).toBeTruthy()
  })

  it('shows a safe not-found state', async () => {
    await renderAuthenticatedPath('/products/missing', [
      apiError(404, 'PRODUCT_NOT_FOUND', 'Product was not found'),
      success({ categories: [] }),
    ])
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeTruthy()
    expect(screen.getByText('This Product does not exist or is unavailable to your Company.')).toBeTruthy()
  })

  it.each(['OWNER', 'ADMIN'] as const)('shows detail management actions to %s', async (role) => {
    await renderAuthenticatedPath(`/products/${activeProduct.id}`, [
      success({ product: activeProduct }),
      success({ categories: [activeCategory] }),
    ], role)
    expect(await screen.findByRole('link', { name: 'Edit Product' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Archive Product' })).toBeTruthy()
  })

  it('keeps STAFF Product details read-only', async () => {
    await renderAuthenticatedPath(`/products/${archivedProduct.id}`, [
      success({ product: archivedProduct }),
      success({ categories: [] }),
    ], 'STAFF')
    expect(await screen.findByRole('heading', { name: 'Legacy Saw' })).toBeTruthy()
    expect(screen.getByText('Read only')).toBeTruthy()
    expect(screen.getAllByText('Archived')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Edit Product' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reactivate Product' })).toBeNull()
  })

  it('requires confirmation and archives exactly once while the request is pending', async () => {
    const fetchMock = await renderAuthenticatedPath(`/products/${activeProduct.id}`, [
      success({ product: activeProduct }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByRole('heading', { name: 'Cordless Drill' })
    const request = deferredResponse()
    fetchMock.mockReturnValueOnce(request.promise)

    const trigger = screen.getByRole('button', { name: 'Archive Product' })
    expect(trigger.className).toContain('button--danger')
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Archive Product?' })
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }))

    const confirm = within(dialog).getByRole('button', { name: 'Archive Product' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(within(dialog).getByRole('button', { name: 'Archiving Product…' })).toHaveProperty('disabled', true)

    request.resolve(success({ product: { ...activeProduct, isActive: false } }))
    expect(await screen.findByText('Product DRILL-001 archived successfully.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Cordless Drill' })).toBeTruthy()
    expect(screen.getByText('4.500')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reactivate Product' })).toBeTruthy()
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe('DELETE')
  })

  it('cancels with Cancel or Escape, sends no lifecycle request, and restores focus', async () => {
    const fetchMock = await renderAuthenticatedPath(`/products/${activeProduct.id}`, [
      success({ product: activeProduct }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByRole('heading', { name: 'Cordless Drill' })
    const trigger = screen.getByRole('button', { name: 'Archive Product' })

    trigger.focus()
    fireEvent.click(trigger)
    const firstDialog = screen.getByRole('dialog')
    const cancel = within(firstDialog).getByRole('button', { name: 'Cancel' })
    const confirm = within(firstDialog).getByRole('button', { name: 'Archive Product' })
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(confirm)
    fireEvent.keyDown(confirm, { key: 'Tab' })
    expect(document.activeElement).toBe(cancel)
    fireEvent.click(cancel)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(document.activeElement).toBe(trigger)
  })

  it('reactivates through PATCH isActive true', async () => {
    const fetchMock = await renderAuthenticatedPath(`/products/${archivedProduct.id}`, [
      success({ product: archivedProduct }),
      success({ categories: [] }),
    ])
    await screen.findByRole('heading', { name: 'Legacy Saw' })
    fetchMock.mockResolvedValueOnce(success({ product: { ...archivedProduct, isActive: true } }))
    const trigger = screen.getByRole('button', { name: 'Reactivate Product' })
    fireEvent.click(trigger)

    let dialog = screen.getByRole('dialog', { name: 'Reactivate Product?' })
    expect(fetchMock).toHaveBeenCalledTimes(4)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(4)

    fireEvent.click(trigger)
    dialog = screen.getByRole('dialog', { name: 'Reactivate Product?' })
    const confirm = within(dialog).getByRole('button', { name: 'Reactivate Product' })
    expect(confirm.className).toContain('button--primary')
    fireEvent.click(confirm)

    expect(await screen.findByText('Product SAW-OLD reactivated successfully.')).toBeTruthy()
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe('PATCH')
    expect(getRequestBody(fetchMock, 4)).toEqual({ isActive: true })
  })
})

describe('Phase 3D Edit Product', () => {
  it('populates master data, keeps stock non-editable, and Cancel avoids PATCH', async () => {
    const fetchMock = await renderAuthenticatedPath(`/products/${activeProduct.id}/edit`, [
      success({ product: activeProduct }),
      success({ categories: [activeCategory] }),
    ])
    expect(await screen.findByRole('heading', { name: 'Edit Product' })).toBeTruthy()
    expect(screen.getByLabelText('SKU')).toHaveProperty('value', 'DRILL-001')
    expect(screen.getByLabelText('Product name')).toHaveProperty('value', 'Cordless Drill')
    expect(getCategorySelector().textContent).toContain('Power Tools')
    expect(screen.getByText('4.500 pcs')).toBeTruthy()
    expect(screen.queryByLabelText(/quantity on hand/i)).toBeNull()
    fetchMock
      .mockResolvedValueOnce(success({ product: activeProduct }))
      .mockResolvedValueOnce(success({ categories: [activeCategory] }))
    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))
    expect(await screen.findByRole('heading', { name: 'Cordless Drill' })).toBeTruthy()
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(false)
  })

  it('submits only changed master fields and uses the normalized backend response', async () => {
    const fetchMock = await renderAuthenticatedPath(`/products/${activeProduct.id}/edit`, [
      success({ product: activeProduct }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByRole('heading', { name: 'Edit Product' })
    const updated = { ...activeProduct, sku: 'DRILL-PRO', name: 'Professional Drill' }
    fetchMock
      .mockResolvedValueOnce(success({ product: updated }))
      .mockResolvedValueOnce(success({ product: updated }))
      .mockResolvedValueOnce(success({ categories: [activeCategory] }))

    fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'drill-pro' } })
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Professional Drill' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Product DRILL-PRO updated successfully.')).toBeTruthy()
    expect(getRequestBody(fetchMock, 4)).toEqual({ sku: 'drill-pro', name: 'Professional Drill' })
    expect(getRequestBody(fetchMock, 4)).not.toHaveProperty('quantityOnHand')
    expect(getRequestBody(fetchMock, 4)).not.toHaveProperty('companyId')
  })

  it('preserves an inactive current Category during unrelated edits without resubmitting it', async () => {
    const product = { ...activeProduct, categoryId: archivedCategory.id }
    const fetchMock = await renderAuthenticatedPath(`/products/${product.id}/edit`, [
      success({ product }),
      success({ categories: [activeCategory, archivedCategory] }),
    ])
    await screen.findByRole('heading', { name: 'Edit Product' })
    expect(getCategorySelector().textContent).toContain('Legacy Tools (Archived — current)')
    const archivedOption = within(openCategorySelector()).getByRole('option', { name: 'Legacy Tools (Archived — current)' })
    expect(archivedOption.getAttribute('aria-disabled')).toBe('true')
    fireEvent.keyDown(getCategorySelector(), { key: 'Escape' })

    const updated = { ...product, name: 'Updated Drill' }
    fetchMock
      .mockResolvedValueOnce(success({ product: updated }))
      .mockResolvedValueOnce(success({ product: updated }))
      .mockResolvedValueOnce(success({ categories: [activeCategory, archivedCategory] }))
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Updated Drill' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Product DRILL-001 updated successfully.')

    expect(getRequestBody(fetchMock, 4)).toEqual({ name: 'Updated Drill' })
    expect(getRequestBody(fetchMock, 4)).not.toHaveProperty('categoryId')
  })

  it('does not allow an archived original Category to be newly selected after changing away', async () => {
    const product = { ...activeProduct, categoryId: archivedCategory.id }
    await renderAuthenticatedPath(`/products/${product.id}/edit`, [
      success({ product }),
      success({ categories: [activeCategory, archivedCategory] }),
    ])
    await screen.findByRole('heading', { name: 'Edit Product' })

    chooseCategory('Power Tools')
    expect(getCategorySelector().textContent).toContain('Power Tools')
    const listbox = openCategorySelector()
    const archivedOption = within(listbox).getByRole('option', { name: 'Legacy Tools (Archived — current)' })
    expect(archivedOption.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(archivedOption)
    expect(getCategorySelector().textContent).toContain('Power Tools')
  })

  it('changes Category to an active choice or Uncategorized through an explicit null', async () => {
    const fetchMock = await renderAuthenticatedPath(`/products/${activeProduct.id}/edit`, [
      success({ product: activeProduct }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByRole('heading', { name: 'Edit Product' })
    const uncategorized = { ...activeProduct, categoryId: null }
    fetchMock
      .mockResolvedValueOnce(success({ product: uncategorized }))
      .mockResolvedValueOnce(success({ product: uncategorized }))
      .mockResolvedValueOnce(success({ categories: [activeCategory] }))

    chooseCategory('Uncategorized')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Product DRILL-001 updated successfully.')
    expect(getRequestBody(fetchMock, 4)).toEqual({ categoryId: null })
  })

  it('shows duplicate SKU and Category unavailable edit errors without losing the draft', async () => {
    const fetchMock = await renderAuthenticatedPath(`/products/${activeProduct.id}/edit`, [
      success({ product: activeProduct }),
      success({ categories: [activeCategory] }),
    ])
    await screen.findByRole('heading', { name: 'Edit Product' })
    fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'taken-sku' } })
    fetchMock.mockResolvedValueOnce(apiError(409, 'SKU_ALREADY_EXISTS', 'Conflict'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('This SKU is already used by an active or archived Product.')).toBeTruthy()
    expect(screen.getByLabelText('SKU')).toHaveProperty('value', 'taken-sku')

    fetchMock.mockResolvedValueOnce(apiError(400, 'CATEGORY_UNAVAILABLE', 'Unavailable'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('This Category is archived or no longer available.')).toBeTruthy()
  })

  it('blocks STAFF from entering an editable Product state through a direct route', async () => {
    await renderAuthenticatedPath(`/products/${activeProduct.id}/edit`, [], 'STAFF')
    expect(await screen.findByRole('heading', { name: 'Product management unavailable' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    expect(screen.queryByLabelText('SKU')).toBeNull()
  })
})
