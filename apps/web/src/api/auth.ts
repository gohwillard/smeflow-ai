import { ApiError, apiRequest } from './client'

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF'

export type AuthenticatedUser = {
  id: string
  companyId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
}

export type LoginInput = {
  email: string
  password: string
}

export type RegistrationInput = {
  companyName: string
  firstName: string
  lastName: string
  email: string
  password: string
}

type LoginData = {
  accessToken: string
  expiresIn: number
  user: AuthenticatedUser
}

type CurrentUserData = {
  user: AuthenticatedUser
}

type RegistrationData = {
  company: {
    id: string
    name: string
  }
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: UserRole
    isActive: boolean
    createdAt: string
  }
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const user = value as Record<string, unknown>

  return (
    typeof user.id === 'string' &&
    typeof user.companyId === 'string' &&
    typeof user.email === 'string' &&
    typeof user.firstName === 'string' &&
    typeof user.lastName === 'string' &&
    (user.role === 'OWNER' || user.role === 'ADMIN' || user.role === 'STAFF') &&
    typeof user.isActive === 'boolean'
  )
}

function unexpectedResponse(): never {
  throw new ApiError(
    200,
    'UNEXPECTED_RESPONSE',
    'The server returned an unexpected response.',
  )
}

export async function registerCompanyOwner(
  input: RegistrationInput,
): Promise<RegistrationData> {
  return apiRequest<RegistrationData>('/auth/register', {
    method: 'POST',
    body: input,
  })
}

export async function loginUser(input: LoginInput): Promise<LoginData> {
  const data = await apiRequest<LoginData>('/auth/login', {
    method: 'POST',
    body: input,
  })

  if (
    typeof data.accessToken !== 'string' ||
    typeof data.expiresIn !== 'number' ||
    !isAuthenticatedUser(data.user)
  ) {
    return unexpectedResponse()
  }

  return data
}

export async function getCurrentUser(
  accessToken: string,
): Promise<AuthenticatedUser> {
  const data = await apiRequest<CurrentUserData>('/auth/me', { accessToken })

  if (!isAuthenticatedUser(data.user)) {
    return unexpectedResponse()
  }

  return data.user
}
