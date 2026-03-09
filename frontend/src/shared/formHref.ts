import type { Theme } from '../contexts/ThemeContext'

/** Добавляет ?theme=day к ссылке на форму заявки, если активна дневная тема */
export function formHref(path: string, theme: Theme): string {
  if (theme !== 'day' || !path.startsWith('/request-')) return path
  return path + (path.includes('?') ? '&' : '?') + 'theme=day'
}
