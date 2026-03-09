import { useEffect } from 'react'
import { ANALYTICS_SCRIPTS } from '../shared/siteConfig'

/**
 * Загружает скрипты аналитики из siteConfig.
 * Используется в Layout для страниц входа, политики и т.п.
 * В ANALYTICS_SCRIPTS: { src: 'url' } — внешний скрипт, { inline: 'код' } — встроенный.
 */
export default function Analytics() {
  useEffect(() => {
    ANALYTICS_SCRIPTS.forEach((item) => {
      try {
        const el = document.createElement('script')
        if ('src' in item) {
          el.src = item.src
          el.async = true
        } else if ('inline' in item) {
          el.textContent = item.inline
        }
        document.body.appendChild(el)
      } catch {
        // ignore
      }
    })
  }, [])
  return null
}
