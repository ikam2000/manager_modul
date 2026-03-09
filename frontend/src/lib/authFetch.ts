/** Fetch с автоматическим обновлением токена при 401. */

export class TokenRefreshedError extends Error {
  constructor() {
    super('TOKEN_REFRESHED')
    this.name = 'TokenRefreshedError'
  }
}

/**
 * Выполняет fetch с Bearer-токеном. При 401 пробует обновить токен и выбрасывает
 * TokenRefreshedError — вызовите операцию повторно.
 * При ошибке refresh очищает сессию и выбрасывает ошибку.
 */
export async function authFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('Требуется авторизация')
  }

  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)

  let res = await fetch(url, { ...init, headers })

  if (res.status !== 401) {
    return res
  }

  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    _clearAndLogout()
    const d = await res.json().catch(() => ({}))
    throw new Error((d.detail as string) || 'Сессия истекла. Войдите снова.')
  }

  const refreshRes = await fetch('/auth/refresh', {
    method: 'POST',
    headers: { Authorization: `Bearer ${refreshToken}` },
  })

  if (!refreshRes.ok) {
    _clearAndLogout()
    const d = await refreshRes.json().catch(() => ({}))
    throw new Error((d.detail as string) || 'Сессия истекла. Войдите снова.')
  }

  const data = await refreshRes.json()
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)

  throw new TokenRefreshedError()
}

/** Для запросов с JSON/string body — автоматически повторяет при TokenRefreshedError. */
export async function authFetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await authFetch(url, init)
  } catch (e) {
    if (e instanceof TokenRefreshedError) {
      return authFetch(url, init)
    }
    throw e
  }
}

function _clearAndLogout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.dispatchEvent(new CustomEvent('auth:logout'))
}
