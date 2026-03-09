import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const COMPANY_FIELDS = [
  { key: 'company_name', label: 'Название компании', required: true },
  { key: 'inn', label: 'ИНН', required: false },
  { key: 'kpp', label: 'КПП', required: false },
  { key: 'ogrn', label: 'ОГРН', required: false },
  { key: 'legal_address', label: 'Юридический адрес', required: false },
  { key: 'address', label: 'Фактический адрес', required: false },
  { key: 'phone', label: 'Телефон', required: false },
  { key: 'company_email', label: 'Email компании', required: false },
  { key: 'contact_person', label: 'Контактное лицо', required: false },
  { key: 'bank_name', label: 'Банк', required: false },
  { key: 'bank_bik', label: 'БИК', required: false },
  { key: 'bank_account', label: 'Расчётный счёт', required: false },
  { key: 'bank_corr', label: 'Корр. счёт', required: false },
] as const

export default function Register() {
  const [form, setForm] = useState<Record<string, string>>({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
    inn: '',
    kpp: '',
    ogrn: '',
    legal_address: '',
    address: '',
    phone: '',
    company_email: '',
    contact_person: '',
    bank_name: '',
    bank_bik: '',
    bank_account: '',
    bank_corr: '',
    company_type: 'customer',
  })
  const [innLookupLoading, setInnLookupLoading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const email = (form.email || '').trim().toLowerCase()
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Укажите корректный email')
      return
    }
    if (!form.password?.trim()) {
      setError('Укажите пароль')
      return
    }
    if (!form.full_name?.trim()) {
      setError('Укажите ФИО')
      return
    }
    if (!form.company_name?.trim()) {
      setError('Укажите название компании')
      return
    }
    const innClean = (form.inn || '').replace(/\D/g, '')
    if (innClean && innClean.length !== 10 && innClean.length !== 12) {
      setError('ИНН должен быть 10 или 12 цифр')
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        email,
        password: form.password,
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim(),
        inn: innClean || undefined,
        company_type: form.company_type || 'customer',
        kpp: form.kpp?.trim() || undefined,
        ogrn: form.ogrn?.trim() || undefined,
        legal_address: form.legal_address?.trim() || undefined,
        address: form.address?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        company_email: form.company_email?.trim() || undefined,
        contact_person: form.contact_person?.trim() || undefined,
        bank_name: form.bank_name?.trim() || undefined,
        bank_bik: form.bank_bik?.trim() || undefined,
        bank_account: form.bank_account?.trim() || undefined,
        bank_corr: form.bank_corr?.trim() || undefined,
      }
      const r = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const text = await r.text()
      let data: Record<string, unknown>
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        throw new Error(r.ok ? 'Ошибка ответа сервера' : `Ошибка сервера (${r.status}). Попробуйте позже.`)
      }
      if (!r.ok) {
        let msg: string
        if (Array.isArray(data.detail) && data.detail[0]) {
          const m = (data.detail[0] as { msg?: string }).msg || ''
          msg = m.replace(/^Value error,\s*/i, '').replace(/^.*expected pattern.*$/i, 'Проверьте формат полей (email, ИНН)')
        } else {
          msg = typeof data.detail === 'string' ? data.detail : 'Ошибка регистрации'
        }
        throw new Error(msg || 'Ошибка регистрации')
      }
      const tokenData = data as { access_token?: string; refresh_token?: string }
      if (tokenData.access_token) localStorage.setItem('access_token', tokenData.access_token)
      if (tokenData.refresh_token) localStorage.setItem('refresh_token', tokenData.refresh_token)
      navigate('/cabinet')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: '0.9375rem',
  }

  const companyTypes = [
    { value: 'customer', label: 'Заказчик' },
    { value: 'supplier', label: 'Поставщик (оборудование, товары, услуги)' },
    { value: 'trader', label: 'Трейдер (работа с площадками, наценки)' },
  ] as const

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: 400 }}>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Регистрация</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(248, 81, 73, 0.15)', borderRadius: 'var(--radius)', marginBottom: '1rem', color: 'var(--error)', fontSize: '0.9375rem' }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: '1.5rem', padding: 12, background: 'rgba(14,165,233,0.08)', borderRadius: 'var(--radius)', border: '1px solid var(--accent)' }}>
          <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Поиск компании по ИНН</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="10 или 12 цифр"
              value={form.inn}
              onChange={(e) => setForm((f) => ({ ...f, inn: e.target.value }))}
              style={{ flex: 1, ...inputStyle }}
              inputMode="numeric"
            />
            <button
              type="button"
              disabled={innLookupLoading}
              onClick={async () => {
                const raw = (form.inn || '').replace(/\D/g, '')
                if (raw.length !== 10 && raw.length !== 12) { setError('ИНН должен содержать 10 или 12 цифр'); return }
                setInnLookupLoading(true)
                setError('')
                try {
                  const r = await fetch(`/auth/inn-lookup?inn=${encodeURIComponent(raw)}`)
                  const j = await r.json().catch(() => ({}))
                  if (j.found && j.data) {
                    const d = j.data
                    setForm((f) => ({
                      ...f,
                      company_name: d.name || f.company_name,
                      inn: d.inn || raw,
                      kpp: d.kpp || '',
                      ogrn: d.ogrn || '',
                      legal_address: d.legal_address || '',
                      address: d.address || d.legal_address || '',
                      phone: d.phone || '',
                      company_email: d.email || '',
                      contact_person: d.contact_person || '',
                      bank_name: d.bank_name || '',
                      bank_bik: d.bank_bik || '',
                      bank_account: d.bank_account || '',
                      bank_corr: d.bank_corr || '',
                    }))
                  } else {
                    setError('Организация не найдена по ИНН. Введите данные вручную.')
                  }
                } finally {
                  setInnLookupLoading(false)
                }
              }}
              style={{ padding: '8px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: innLookupLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
            >
              {innLookupLoading ? '…' : 'Найти'}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Роль в системе</label>
          <select
            value={form.company_type}
            onChange={(e) => setForm((f) => ({ ...f, company_type: e.target.value }))}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {companyTypes.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required autoComplete="email" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>Пароль</label>
          <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required autoComplete="new-password" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>ФИО</label>
          <input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required style={inputStyle} />
        </div>
        {COMPANY_FIELDS.map(({ key, label, required }) => (
          <div key={key} style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem' }}>{label}</label>
            <input
              type={key.includes('email') ? 'email' : 'text'}
              value={form[key] ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              required={required}
              inputMode={key === 'inn' || key === 'kpp' || key === 'ogrn' || key === 'bank_bik' ? 'numeric' : undefined}
              style={inputStyle}
            />
          </div>
        ))}
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Регистрируясь, вы соглашаетесь с <Link to="/privacy">политикой конфиденциальности</Link> и{' '}
          <Link to="/agreement">соглашением о персональных данных</Link>.
        </p>
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
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  )
}
