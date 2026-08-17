export type HealthResponse = {
  status: 'ok'
  service: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/health`, {
    signal,
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  const data: unknown = await response.json()

  if (
    typeof data !== 'object' ||
    data === null ||
    !('status' in data) ||
    data.status !== 'ok' ||
    !('service' in data) ||
    typeof data.service !== 'string'
  ) {
    throw new Error('Health check returned an unexpected response')
  }

  return data as HealthResponse
}
