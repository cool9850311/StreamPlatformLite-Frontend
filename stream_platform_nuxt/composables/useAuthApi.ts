export const useAuthApi = () => {
  const config = useRuntimeConfig()
  const authBaseURL = config.public.AUTH_URL
  const { csrfToken } = useCsrfToken()

  const authApiFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
    const method = (options.method ?? 'GET').toUpperCase()
    const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    return fetch(`${authBaseURL}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(needsCsrf ? { 'X-XSRF-TOKEN': csrfToken.value } : {}),
        ...(options.headers as Record<string, string> ?? {}),
      },
    })
  }

  return { authApiFetch }
}
