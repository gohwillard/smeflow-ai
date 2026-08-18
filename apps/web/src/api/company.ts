import { ApiError, apiRequest } from './client'

export type CompanyProfile = {
  id: string
  name: string
  registrationNumber: string | null
  email: string | null
  phone: string | null
  address: string | null
  createdAt: string
  updatedAt: string
}

export type CompanyProfileUpdate = Partial<{
  name: string
  registrationNumber: string | null
  email: string | null
  phone: string | null
  address: string | null
}>

type CompanyProfileData = {
  company: CompanyProfile
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isCompanyProfile(value: unknown): value is CompanyProfile {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const company = value as Record<string, unknown>

  return (
    typeof company.id === 'string' &&
    typeof company.name === 'string' &&
    isNullableString(company.registrationNumber) &&
    isNullableString(company.email) &&
    isNullableString(company.phone) &&
    isNullableString(company.address) &&
    typeof company.createdAt === 'string' &&
    typeof company.updatedAt === 'string'
  )
}

export async function getCompanyProfile(
  accessToken: string,
  signal?: AbortSignal,
): Promise<CompanyProfile> {
  const data = await apiRequest<CompanyProfileData>('/company/profile', {
    accessToken,
    signal,
  })

  if (!isCompanyProfile(data.company)) {
    throw new ApiError(
      200,
      'UNEXPECTED_RESPONSE',
      'The server returned an unexpected response.',
    )
  }

  return data.company
}

export async function updateCompanyProfile(
  accessToken: string,
  input: CompanyProfileUpdate,
): Promise<CompanyProfile> {
  const data = await apiRequest<CompanyProfileData>('/company/profile', {
    method: 'PATCH',
    accessToken,
    body: input,
  })

  if (!isCompanyProfile(data.company)) {
    throw new ApiError(
      200,
      'UNEXPECTED_RESPONSE',
      'The server returned an unexpected response.',
    )
  }

  return data.company
}
