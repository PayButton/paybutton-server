export const saveStateToCookie = (key: string, value?: string): void => {
  if (value !== undefined) {
    document.cookie = `${key}=${JSON.stringify(value)}; path=/`
  }
}

export const loadStateFromCookie = (key: string, defaultValue: any): string | undefined => {
  const matches = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))
  const cookieValue = (matches != null) ? decodeURIComponent(matches[1]) : undefined
  if (cookieValue !== undefined) {
    return JSON.parse(cookieValue)
  }
  return defaultValue
}
