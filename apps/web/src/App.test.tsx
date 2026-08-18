import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import type { UserRole } from './api/auth'

function createUser(role: UserRole = 'OWNER') {
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

const ownerUser = createUser()

const company = {
  id: 'company-1',
  name: 'Northstar Supplies',
  registrationNumber: '202601234567',
  email: 'contact@northstar.example',
  phone: '+60 12 345 6789',
  address: '1 Example Road, Kuala Lumpur',
  createdAt: '2026-08-18T03:48:15.375Z',
  updatedAt: '2026-08-18T07:30:00.000Z',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function success(data: unknown, status = 200): Response {
  return jsonResponse({ status: 'success', data }, status)
}

function apiError(
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

function TestNavigation() {
  const navigate = useNavigate()

  return (
    <div hidden>
      <button data-testid="navigate-login" onClick={() => navigate('/login')}>
        Test login navigation
      </button>
      <button
        data-testid="navigate-register"
        onClick={() => navigate('/register')}
      >
        Test registration navigation
      </button>
    </div>
  )
}

function renderApp(path: string, includeTestNavigation = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {includeTestNavigation && <TestNavigation />}
      <App />
    </MemoryRouter>,
  )
}

function fillLoginForm(email = ownerUser.email) {
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'a secure demo passphrase' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

function fillRegistrationForm() {
  fireEvent.change(screen.getByLabelText('Company name'), {
    target: { value: 'Northstar Supplies' },
  })
  fireEvent.change(screen.getByLabelText('First name'), {
    target: { value: 'Amina' },
  })
  fireEvent.change(screen.getByLabelText('Last name'), {
    target: { value: 'Rahman' },
  })
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: ownerUser.email },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'a secure demo passphrase' },
  })
}

function mockSuccessfulLogin(
  fetchMock: ReturnType<typeof vi.fn>,
  authenticatedUser = ownerUser,
) {
  fetchMock
    .mockResolvedValueOnce(
      success({
        accessToken: 'memory-only-token',
        expiresIn: 1800,
        user: authenticatedUser,
      }),
    )
    .mockResolvedValueOnce(success({ user: authenticatedUser }))
}

async function loginAndOpenCompany(
  fetchMock: ReturnType<typeof vi.fn>,
  authenticatedUser = ownerUser,
) {
  mockSuccessfulLogin(fetchMock, authenticatedUser)
  fetchMock.mockResolvedValueOnce(success({ company }))
  vi.stubGlobal('fetch', fetchMock)

  renderApp('/login')
  fillLoginForm(authenticatedUser.email)
  fireEvent.click(
    await screen.findByRole('link', { name: 'Open company profile' }),
  )
  await screen.findByRole('heading', { name: company.name })
}

function getRequestBody(
  fetchMock: ReturnType<typeof vi.fn>,
  callIndex: number,
): Record<string, unknown> {
  const body = fetchMock.mock.calls[callIndex]?.[1]?.body
  return JSON.parse(String(body)) as Record<string, unknown>
}

describe('Phase 2G route behavior', () => {
  it.each([
    ['/login', 'Sign in to SMEFlow'],
    ['/register', 'Create your company account'],
  ])('keeps unauthenticated public route %s accessible', async (path, heading) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderApp(path)

    expect(await screen.findByRole('heading', { name: heading })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['/app', '/company'])(
    'redirects unauthenticated protected route %s to login',
    async (path) => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      renderApp(path)

      expect(
        await screen.findByRole('heading', { name: 'Sign in to SMEFlow' }),
      ).toBeTruthy()
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['login', 'navigate-login'],
    ['registration', 'navigate-register'],
  ])(
    'redirects authenticated SPA navigation to the %s route back to /app',
    async (_routeName, navigationTestId) => {
      const fetchMock = vi.fn()
      mockSuccessfulLogin(fetchMock)
      vi.stubGlobal('fetch', fetchMock)

      renderApp('/login', true)
      fillLoginForm()
      await screen.findByRole('heading', { name: 'Welcome, Amina.' })

      fireEvent.click(screen.getByTestId(navigationTestId))

      expect(
        await screen.findByRole('heading', { name: 'Welcome, Amina.' }),
      ).toBeTruthy()
      expect(
        screen.queryByRole('heading', { name: 'Sign in to SMEFlow' }),
      ).toBeNull()
      expect(
        screen.queryByRole('heading', { name: 'Create your company account' }),
      ).toBeNull()
    },
  )

  it('loses authentication when the app is remounted and never persists it', async () => {
    const storageSetItem = vi.spyOn(Storage.prototype, 'setItem')
    const fetchMock = vi.fn()
    mockSuccessfulLogin(fetchMock)
    vi.stubGlobal('fetch', fetchMock)

    const firstRender = renderApp('/login')
    fillLoginForm()
    await screen.findByRole('heading', { name: 'Welcome, Amina.' })
    firstRender.unmount()

    renderApp('/app')

    expect(
      await screen.findByRole('heading', { name: 'Sign in to SMEFlow' }),
    ).toBeTruthy()
    expect(storageSetItem).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
})

describe('Phase 2G registration and login', () => {
  it('registers an owner and sends the user to login without authenticating', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      success(
        {
          company: { id: 'company-1', name: 'Northstar Supplies' },
          user: {
            id: 'user-owner',
            email: ownerUser.email,
            firstName: 'Amina',
            lastName: 'Rahman',
            role: 'OWNER',
            isActive: true,
            createdAt: '2026-08-18T03:48:15.375Z',
          },
        },
        201,
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/register')
    fillRegistrationForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText(
        'Registration complete. Sign in with your new account.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/register')
  })

  it('shows a field-safe duplicate-email registration error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        apiError(
          409,
          'EMAIL_ALREADY_EXISTS',
          'An account with this email already exists',
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/register')
    fillRegistrationForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeTruthy()
    expect(screen.queryByDisplayValue('a secure demo passphrase')).toBeNull()
  })

  it('logs in, confirms the user through /auth/me, and opens /app', async () => {
    const fetchMock = vi.fn()
    mockSuccessfulLogin(fetchMock)
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/login')
    fillLoginForm()

    expect(
      await screen.findByRole('heading', { name: 'Welcome, Amina.' }),
    ).toBeTruthy()
    expect(screen.getByText(ownerUser.email)).toBeTruthy()
    expect(screen.getByText('OWNER')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/login')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/auth/me')

    const meHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Headers
    expect(meHeaders.get('Authorization')).toBe('Bearer memory-only-token')
  })

  it('shows the same safe invalid-credentials message and clears the password', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        apiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
      )
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/login')
    fillLoginForm()

    expect(await screen.findByText('Invalid email or password.')).toBeTruthy()
    expect(screen.queryByDisplayValue('a secure demo passphrase')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('toggles login password visibility without changing or submitting it', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderApp('/login')

    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    fireEvent.change(passwordInput, { target: { value: 'unchanged secret' } })

    expect(passwordInput.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(passwordInput.type).toBe('text')
    expect(passwordInput.value).toBe('unchanged secret')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(passwordInput.type).toBe('password')
    expect(passwordInput.value).toBe('unchanged secret')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('toggles registration password visibility without changing or submitting it', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderApp('/register')

    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    fireEvent.change(passwordInput, { target: { value: 'unchanged secret' } })

    expect(passwordInput.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(passwordInput.type).toBe('text')
    expect(passwordInput.value).toBe('unchanged secret')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(passwordInput.type).toBe('password')
    expect(passwordInput.value).toBe('unchanged secret')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears authentication and returns to login on logout', async () => {
    const fetchMock = vi.fn()
    mockSuccessfulLogin(fetchMock)
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/login')
    fillLoginForm()
    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(
      await screen.findByRole('heading', { name: 'Sign in to SMEFlow' }),
    ).toBeTruthy()
  })
})

describe('Phase 2G Company Profile editing', () => {
  it.each(['OWNER', 'ADMIN'] as const)(
    'shows Edit profile to an authenticated %s',
    async (role) => {
      const fetchMock = vi.fn()
      await loginAndOpenCompany(fetchMock, createUser(role))

      expect(
        screen.getByRole('button', { name: 'Edit profile' }),
      ).toBeTruthy()
      expect(screen.queryByText('Read only')).toBeNull()
    },
  )

  it('keeps STAFF read-only without editable controls', async () => {
    const fetchMock = vi.fn()
    await loginAndOpenCompany(fetchMock, createUser('STAFF'))

    expect(screen.getByText('Read only')).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Edit profile' }),
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
  })

  it('populates edit values and Cancel discards changes without PATCH', async () => {
    const fetchMock = vi.fn()
    await loginAndOpenCompany(fetchMock)

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))

    expect(screen.getByLabelText('Company name')).toHaveProperty(
      'value',
      company.name,
    )
    expect(screen.getByLabelText('Registration number')).toHaveProperty(
      'value',
      company.registrationNumber,
    )
    expect(screen.getByLabelText('Contact email')).toHaveProperty(
      'value',
      company.email,
    )
    expect(screen.getByLabelText('Phone')).toHaveProperty('value', company.phone)
    expect(screen.getByLabelText('Address')).toHaveProperty(
      'value',
      company.address,
    )

    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Unsaved Company' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      screen.getByRole('heading', { name: company.name }),
    ).toBeTruthy()
    expect(screen.queryByDisplayValue('Unsaved Company')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('sends only normalized changed fields and uses the PATCH response', async () => {
    const fetchMock = vi.fn()
    await loginAndOpenCompany(fetchMock)
    const updatedCompany = {
      ...company,
      name: 'Northstar Trading',
      email: 'updated@northstar.example',
      phone: '+60 11 222 3333',
      address: '2 Updated Road, Kuala Lumpur',
      updatedAt: '2026-08-18T08:30:00.000Z',
    }
    fetchMock.mockResolvedValueOnce(success({ company: updatedCompany }))

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: '  Northstar Trading  ' },
    })
    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: '  UPDATED@NORTHSTAR.EXAMPLE  ' },
    })
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '  +60 11 222 3333  ' },
    })
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '  2 Updated Road, Kuala Lumpur  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByRole('heading', { name: 'Northstar Trading' }),
    ).toBeTruthy()
    expect(screen.getByText('updated@northstar.example')).toBeTruthy()
    expect(screen.getByText('+60 11 222 3333')).toBeTruthy()
    expect(screen.getByText('2 Updated Road, Kuala Lumpur')).toBeTruthy()

    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe('PATCH')
    expect(getRequestBody(fetchMock, 3)).toEqual({
      name: 'Northstar Trading',
      email: 'updated@northstar.example',
      phone: '+60 11 222 3333',
      address: '2 Updated Road, Kuala Lumpur',
    })
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('companyId')
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('id')
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('createdAt')
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty('updatedAt')
    expect(getRequestBody(fetchMock, 3)).not.toHaveProperty(
      'registrationNumber',
    )
  })

  it('sends null for cleared optional fields', async () => {
    const fetchMock = vi.fn()
    await loginAndOpenCompany(fetchMock)
    const clearedCompany = {
      ...company,
      registrationNumber: null,
      email: null,
      phone: null,
      address: null,
    }
    fetchMock.mockResolvedValueOnce(success({ company: clearedCompany }))

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByLabelText('Registration number'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Company profile updated successfully.')
    expect(getRequestBody(fetchMock, 3)).toEqual({
      registrationNumber: null,
      email: null,
      phone: null,
      address: null,
    })
    expect(screen.getAllByText('Not provided')).toHaveLength(4)
  })

  it('rejects a blank required Company name before PATCH', async () => {
    const fetchMock = vi.fn()
    await loginAndOpenCompany(fetchMock)
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Company name must not be blank.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('rejects an invalid Company email before PATCH', async () => {
    const fetchMock = vi.fn()
    await loginAndOpenCompany(fetchMock)
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: 'invalid-email' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('Enter a valid company email address.'),
    ).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('keeps the user authenticated and preserves edit state after PATCH 403', async () => {
    const fetchMock = vi.fn()
    await loginAndOpenCompany(fetchMock)
    fetchMock.mockResolvedValueOnce(
      apiError(403, 'FORBIDDEN', 'You do not have permission'),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Forbidden Update' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText(
        'You are signed in, but you do not have permission to update this profile.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy()
    expect(screen.getByLabelText('Company name')).toHaveProperty(
      'value',
      'Forbidden Update',
    )
  })

  it('clears authentication when PATCH returns 401', async () => {
    const fetchMock = vi.fn()
    await loginAndOpenCompany(fetchMock)
    fetchMock.mockResolvedValueOnce(
      apiError(401, 'INVALID_TOKEN', 'Access token is invalid'),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Unauthorized Update' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByRole('heading', { name: 'Sign in to SMEFlow' }),
    ).toBeTruthy()
  })
})
