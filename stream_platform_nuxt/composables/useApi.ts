export const useApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.BACKEND_URL
  const { csrfToken } = useCsrfToken()

  const apiFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
    const method = (options.method ?? 'GET').toUpperCase()
    const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    return fetch(`${baseURL}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(needsCsrf ? { 'X-XSRF-TOKEN': csrfToken.value } : {}),
        ...(options.headers as Record<string, string> ?? {}),
      },
    })
  }

  return { apiFetch }
}
