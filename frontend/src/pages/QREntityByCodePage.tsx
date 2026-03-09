import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

/** Страница по коду сущности — загружает данные и редиректит на /scan/entity/:type/:id */
export default function QREntityByCodePage() {
  const { type, code } = useParams<{ type: string; code: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!type || !code) return
    fetch(`/qr/entity/${type}/by-code/${encodeURIComponent(code)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Не найдено')
        return r.text()
      })
      .then((text) => {
        try {
          return JSON.parse(text)
        } catch {
          throw new Error('Ошибка данных')
        }
      })
      .then((data) => {
        navigate(`/scan/entity/${type}/${data.entity_id}`, { replace: true, state: { prefetched: data } })
      })
      .catch(() => setError('Сущность не найдена'))
  }, [type, code, navigate])

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: 'center', minHeight: '50vh' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Не найдено</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 48, textAlign: 'center', minHeight: '50vh' }}>
      <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
    </div>
  )
}
