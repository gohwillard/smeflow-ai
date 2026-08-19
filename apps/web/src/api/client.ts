export type ApiErrorDetail = {
  field: string
  message: string
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  accessToken?: string
  signal?: AbortSignal
}

type ErrorPayload = {
  status: 'error'
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[]
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetail[]

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorDetail[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Record<string, unknown>

  if (
    payload.status !== 'error' ||
    typeof payload.error !== 'object' ||
    payload.error === null
  ) {
    return false
  }

  const error = payload.error as Record<string, unknown>
  return typeof error.code === 'string' && typeof error.message === 'string'
}

function getErrorDetails(payload: ErrorPayload): ApiErrorDetail[] {
  if (!Array.isArray(payload.error.details)) {
    return []
  }

  return payload.error.details.filter(
    (detail): detail is ApiErrorDetail =>
      typeof detail === 'object' &&
      detail !== null &&
      typeof detail.field === 'string' &&
      typeof detail.message === 'string',
  )
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!apiBaseUrl) {
    throw new ApiError(
      0,
      'API_NOT_CONFIGURED',
      'The API URL is not configured for this application.',
    )
  }

  const headers = new Headers()

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`)
  }

  let response: Response

  try {
    response = await fetch(
      `${apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`,
      {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      },
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }

    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Unable to reach the SMEFlow API. Check your connection and try again.',
    )
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    throw new ApiError(
      response.status,
      'UNEXPECTED_RESPONSE',
      'The server returned an unexpected response.',
    )
  }

  if (!response.ok) {
    if (isErrorPayload(payload)) {
      throw new ApiError(
        response.status,
        payload.error.code,
        payload.error.message,
        getErrorDetails(payload),
      )
    }

    throw new ApiError(
      response.status,
      'REQUEST_FAILED',
      'The request could not be completed.',
    )
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('status' in payload) ||
    payload.status !== 'success' ||
    !('data' in payload)
  ) {
    throw new ApiError(
      response.status,
      'UNEXPECTED_RESPONSE',
      'The server returned an unexpected response.',
    )
  }

  return payload.data as T
}
