import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) setError('Ссылка недействительна — отсутствует токен')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }
    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return
    }
    setLoading(true)
    try {
      const r = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
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
          : (typeof data.detail === 'string' ? data.detail : 'Ссылка недействительна или истекла')
        throw new Error(msg)
      }
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
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

  if (!token && !error) return null

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: 400 }}>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
        Новый пароль
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
        Придумайте новый пароль (не менее 8 символов).
      </p>

      {success ? (
        <div
          style={{
            padding: '1rem',
            background: 'rgba(34, 197, 94, 0.15)',
            borderRadius: 'var(--radius)',
            color: 'var(--success, #16a34a)',
            fontSize: '0.9375rem',
          }}
        >
          Пароль изменён. Перенаправление на страницу входа…
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
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
              Новый пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
              Подтвердите пароль
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
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
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <Link to="/login">Вернуться ко входу</Link>
      </p>
    </div>
  )
}
