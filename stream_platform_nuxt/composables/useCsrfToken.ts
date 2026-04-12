export const useCsrfToken = () => {
  const csrfToken = useState<string>('csrf_token', () => '')

  const setCsrfToken = (token: string) => {
    csrfToken.value = token
  }

  const clearCsrfToken = () => {
    csrfToken.value = ''
  }

  return { csrfToken: readonly(csrfToken), setCsrfToken, clearCsrfToken }
}
