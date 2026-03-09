import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const text = await r.text()
      let data: Record<string, unknown>
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        throw new Error(r.ok ? 'Ошибка ответа сервера' : `Ошибка (${r.status})`)
      }
      if (!r.ok) {
        const msg = Array.isArray(data.detail)
          ? (data.detail as { msg?: string }[]).map((e) => e.msg).join('. ') || 'Ошибка'
          : (typeof data.detail === 'string' ? data.detail : 'Ошибка')
        throw new Error(msg)
      }
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: '0.9375rem',
    outline: 'none',
  }

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: 400 }}>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
        Восстановление пароля
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
        Укажите email — мы отправим ссылку для сброса пароля.
      </p>

      {sent ? (
        <div
          style={{
            padding: '1rem',
            background: 'rgba(34, 197, 94, 0.15)',
            borderRadius: 'var(--radius)',
            color: 'var(--success, #16a34a)',
            fontSize: '0.9375rem',
          }}
        >
          Если email зарегистрирован, на него отправлена ссылка для сброса пароля. Проверьте почту (включая папку «Спам»).
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(248, 81, 73, 0.15)',
                borderRadius: 'var(--radius)',
                marginBottom: '1rem',
                color: 'var(--error)',
                fontSize: '0.9375rem',
              }}
            >
              {error}
            </div>
          )}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '0.9375rem',
            }}
          >
            {loading ? 'Отправка...' : 'Отправить ссылку'}
          </button>
        </form>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <Link to="/login">Вернуться ко входу</Link>
      </p>
    </div>
  )
}
