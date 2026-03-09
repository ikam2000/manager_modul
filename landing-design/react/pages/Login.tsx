import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { refresh } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const text = await r.text()
      let data: Record<string, unknown>
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        throw new Error(r.ok ? 'Ошибка ответа сервера' : `Ошибка сервера (${r.status}). Попробуйте позже.`)
      }
      if (!r.ok) {
        const msg = Array.isArray(data.detail)
          ? (data.detail as { msg?: string; message?: string }[]).map((e) => e.msg || e.message).join('. ') || 'Ошибка входа'
          : (typeof data.detail === 'string' ? data.detail : (data.detail as { message?: string })?.message) || 'Ошибка входа'
        throw new Error(msg)
      }
      const d = data as { access_token?: string; refresh_token?: string }
      if (d.access_token) localStorage.setItem('access_token', d.access_token)
      if (d.refresh_token) localStorage.setItem('refresh_token', d.refresh_token)
      await refresh()
      navigate('/cabinet')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
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
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Вход</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
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
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <Link to="/forgot-password" style={{ color: 'var(--text-muted)' }}>Забыли пароль?</Link>
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
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
