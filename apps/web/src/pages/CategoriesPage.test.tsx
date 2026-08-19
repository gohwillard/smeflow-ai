import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  activeCategory,
  apiError,
  archivedCategory,
  deferredResponse,
  getRequestBody,
  renderAuthenticatedPath,
  renderUnauthenticated,
  success,
} from '../test/catalog-test-utils'

describe('Phase 3D Category route and states', () => {
  it('protects the Category route', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderUnauthenticated('/categories')

    expect(await screen.findByRole('heading', { name: 'Sign in to SMEFlow' })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a Category loading state without flashing the empty state', async () => {
    const request = deferredResponse()
    await renderAuthenticatedPath('/categories', [request.promise])

    expect(await screen.findByText('Loading Categories…')).toBeTruthy()
    expect(screen.queryByText('Your Category list is empty')).toBeNull()
    request.resolve(success({ categories: [] }))
    expect(await screen.findByText('Your Category list is empty')).toBeTruthy()
  })

  it('guides OWNER through the empty state while STAFF sees read-only guidance', async () => {
    await renderAuthenticatedPath('/categories', [success({ categories: [] })])
    expect(await screen.findByRole('button', { name: 'Create first Category' })).toBeTruthy()

    document.body.innerHTML = ''
    await renderAuthenticatedPath('/categories', [success({ categories: [] })], 'STAFF')
    expect(await screen.findByText('No Categories have been created yet. Products can still be Uncategorized.')).toBeTruthy()
    expect(screen.getByText('Read only')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Create/ })).toBeNull()
  })

  it.each(['OWNER', 'ADMIN'] as const)('shows management controls to %s', async (role) => {
    await renderAuthenticatedPath('/categories', [success({ categories: [activeCategory] })], role)
    expect(await screen.findByRole('button', { name: 'Create Category' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Archive Category' }).className).toContain('button--danger')
  })

  it('keeps STAFF Category UI read-only', async () => {
    await renderAuthenticatedPath('/categories', [success({ categories: [activeCategory, archivedCategory] })], 'STAFF')
    expect(await screen.findByText('Power Tools')).toBeTruthy()
    expect(screen.getByText('Legacy Tools')).toBeTruthy()
    expect(screen.getByText('Read only')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Archive Category' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reactivate Category' })).toBeNull()
  })
})

describe('Phase 3D Category management', () => {
  it('creates a Category with the correct body and never sends companyId', async () => {
    const fetchMock = await renderAuthenticatedPath('/categories', [success({ categories: [] })])
    await screen.findByText('Your Category list is empty')
    fetchMock.mockResolvedValueOnce(success({ category: activeCategory }, 201))

    fireEvent.click(screen.getByRole('button', { name: 'Create first Category' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Power Tools  ' } })
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: '  Powered workshop equipment  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }))

    expect(await screen.findByText('Category Power Tools created successfully.')).toBeTruthy()
    expect(getRequestBody(fetchMock, 3)).toEqual({
      name: 'Power Tools',
      description: 'Powered workshop equipment',
    })
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('companyId')
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('POST')
  })

  it('normalizes an empty optional description to null', async () => {
    const category = { ...activeCategory, description: null }
    const fetchMock = await renderAuthenticatedPath('/categories', [success({ categories: [] })])
    await screen.findByText('Your Category list is empty')
    fetchMock.mockResolvedValueOnce(success({ category }, 201))

    fireEvent.click(screen.getByRole('button', { name: 'Create first Category' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Power Tools' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }))

    await screen.findByText('Category Power Tools created successfully.')
    expect(getRequestBody(fetchMock, 3)).toEqual({ name: 'Power Tools', description: null })
  })

  it('displays duplicate and backend validation errors while preserving values', async () => {
    const fetchMock = await renderAuthenticatedPath('/categories', [success({ categories: [] })])
    await screen.findByText('Your Category list is empty')
    fetchMock.mockResolvedValueOnce(apiError(409, 'CATEGORY_ALREADY_EXISTS', 'A category with this name already exists'))

    fireEvent.click(screen.getByRole('button', { name: 'Create first Category' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Power Tools' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }))

    expect(await screen.findByText('A Category with this name already exists, including archived Categories.')).toBeTruthy()
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Power Tools')

    fetchMock.mockResolvedValueOnce(apiError(400, 'VALIDATION_ERROR', 'Category input is invalid', [{ field: 'description', message: 'Category description is too long' }]))
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }))
    expect(await screen.findByText('Category description is too long')).toBeTruthy()
  })

  it('edits a Category and Cancel discards a later draft', async () => {
    const fetchMock = await renderAuthenticatedPath('/categories', [success({ categories: [activeCategory] })])
    await screen.findByText('Power Tools')
    const updated = { ...activeCategory, name: 'Workshop Tools', description: 'Updated' }
    fetchMock.mockResolvedValueOnce(success({ category: updated }))

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Workshop Tools' } })
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Category Workshop Tools updated successfully.')).toBeTruthy()
    expect(getRequestBody(fetchMock, 3)).toEqual({ name: 'Workshop Tools', description: 'Updated' })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unsaved' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Workshop Tools')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('archives after confirmation and keeps the Category visible', async () => {
    const fetchMock = await renderAuthenticatedPath('/categories', [success({ categories: [activeCategory] })])
    await screen.findByText('Power Tools')
    fetchMock.mockResolvedValueOnce(success({ category: { ...activeCategory, isActive: false } }))

    fireEvent.click(screen.getByRole('button', { name: 'Archive Category' }))
    const dialog = screen.getByRole('dialog', { name: 'Archive Category?' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive Category' }))

    expect(await screen.findByText('Category Power Tools archived successfully.')).toBeTruthy()
    expect(screen.getByText('Power Tools')).toBeTruthy()
    expect(screen.getByText('Archived')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reactivate Category' })).toBeTruthy()
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('DELETE')
  })

  it('does not archive when confirmation is cancelled', async () => {
    const fetchMock = await renderAuthenticatedPath('/categories', [success({ categories: [activeCategory] })])
    await screen.findByText('Power Tools')
    fireEvent.click(screen.getByRole('button', { name: 'Archive Category' }))
    const dialog = screen.getByRole('dialog', { name: 'Archive Category?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(screen.getByText('Active')).toBeTruthy()
  })

  it('reactivates an archived Category through PATCH isActive true', async () => {
    const fetchMock = await renderAuthenticatedPath('/categories', [success({ categories: [archivedCategory] })])
    await screen.findByText('Legacy Tools')
    fetchMock.mockResolvedValueOnce(success({ category: { ...archivedCategory, isActive: true } }))

    fireEvent.click(screen.getByRole('button', { name: 'Reactivate Category' }))
    const dialog = screen.getByRole('dialog', { name: 'Reactivate Category?' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const confirm = within(dialog).getByRole('button', { name: 'Reactivate Category' })
    expect(confirm.className).toContain('button--primary')
    fireEvent.click(confirm)

    expect(await screen.findByText('Category Legacy Tools reactivated successfully.')).toBeTruthy()
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('PATCH')
    expect(getRequestBody(fetchMock, 3)).toEqual({ isActive: true })
  })

  it('shows safe permission and server failures without logging out on 403', async () => {
    const fetchMock = await renderAuthenticatedPath('/categories', [success({ categories: [] })])
    await screen.findByText('Your Category list is empty')
    fetchMock.mockResolvedValueOnce(apiError(403, 'FORBIDDEN', 'Forbidden'))

    fireEvent.click(screen.getByRole('button', { name: 'Create first Category' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Power Tools' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }))

    expect(await screen.findByText('You do not have permission to manage Categories.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy()

    fetchMock.mockResolvedValueOnce(apiError(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }))
    expect(await screen.findByText('An unexpected error occurred')).toBeTruthy()
  })
})
