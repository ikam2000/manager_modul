import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const REQUISITES_LABELS: Record<string, string> = {
  name: 'Наименование',
  inn: 'ИНН',
  kpp: 'КПП',
  ogrn: 'ОГРН',
  legal_address: 'Юридический адрес',
  address: 'Фактический адрес',
  phone: 'Телефон',
  email: 'Email',
  contact_person: 'Контактное лицо',
  bank_name: 'Банк',
  bank_bik: 'БИК',
  bank_account: 'Расчётный счёт',
  bank_corr: 'Корр. счёт',
  payment_purpose: 'Назначение платежа',
}

export default function CabinetSettings() {
  const { user, refresh } = useAuth()
  const [tab, setTab] = useState<'profile' | 'company' | 'subscription' | 'payments'>('profile')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changePwdError, setChangePwdError] = useState('')
  const [changePwdOk, setChangePwdOk] = useState(false)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null)
  const [company, setCompany] = useState<any>(null)
  const [logoBlobUrl, setLogoBlobUrl] = useState<string | null>(null)
  const [requisites, setRequisites] = useState<Record<string, string>>({})
  const [reqSaving, setReqSaving] = useState(false)
  const [reqFile, setReqFile] = useState<File | null>(null)
  const [recognizedReq, setRecognizedReq] = useState<Record<string, string> | null>(null)
  const [reqMapping, setReqMapping] = useState<Record<string, string>>({})
  const [recognizing, setRecognizing] = useState(false)
  const [innLookupLoading, setInnLookupLoading] = useState(false)
  const [subscription, setSubscription] = useState<{
    status: string
    plan_name: string
    expires_at: string | null
    limits_note?: string
    limits?: { max_nomenclature?: number | null; max_suppliers?: number | null; max_nomenclature_per_supplier?: number | null; max_manufacturers?: number | null; max_customers?: number | null }
    usage?: { nomenclature: number; suppliers: number; manufacturers: number; customers: number }
  } | null>(null)
  const [invoices, setInvoices] = useState<Array<{ id: number; invoice_number?: string; amount: number; status: string; period_start?: string; period_end?: string; created_at: string }>>([])
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name)
      const url = user.avatar_url || null
      setAvatarUrl(url)
      if (!url) setAvatarBlobUrl(null)
    }
  }, [user])
  useEffect(() => {
    if (!avatarUrl || avatarUrl.startsWith('blob:') || avatarUrl.startsWith('data:')) return
    const token = localStorage.getItem('access_token')
    if (!token) return
    let cancelled = false
    let blobUrl: string | null = null
    fetch(avatarUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      .then((r) => r.ok ? r.blob() : null)
      .then((blob) => {
        if (cancelled || !blob) return
        blobUrl = URL.createObjectURL(blob)
        setAvatarBlobUrl(blobUrl)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [avatarUrl])

  useEffect(() => {
    if (!company?.logo_url) { setLogoBlobUrl(null); return }
    const token = localStorage.getItem('access_token')
    if (!token) return
    let blobUrl: string | null = null
    fetch('/api/cabinet/company/logo', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.blob() : null)
      .then((b) => { if (b) { blobUrl = URL.createObjectURL(b); setLogoBlobUrl(blobUrl) } })
      .catch(() => {})
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [company?.logo_url])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    if (tab === 'company') {
      fetch('/api/cabinet/company', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : { company: null })
        .then((d) => {
          setCompany(d.company)
          if (d.company) {
            setRequisites({
              name: d.company.name || '',
              inn: d.company.inn || '',
              kpp: d.company.kpp || '',
              ogrn: d.company.ogrn || '',
              legal_address: d.company.legal_address || '',
              address: d.company.address || '',
              phone: d.company.phone || '',
              email: d.company.email || '',
              contact_person: d.company.contact_person || '',
              bank_name: d.company.bank_name || '',
              bank_bik: d.company.bank_bik || '',
              bank_account: d.company.bank_account || '',
              bank_corr: d.company.bank_corr || '',
              payment_purpose: d.company.payment_purpose || '',
            })
          }
        })
        .catch(() => setCompany(null))
    }
    if (tab === 'subscription') {
      fetch('/api/cabinet/subscription', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : {})
        .then((d: { status?: string; plan_name?: string; expires_at?: string | null; limits_note?: string; limits?: { max_nomenclature?: number | null; max_suppliers?: number | null; max_nomenclature_per_supplier?: number | null; max_manufacturers?: number | null; max_customers?: number | null }; usage?: { nomenclature: number; suppliers: number; manufacturers: number; customers: number } }) => setSubscription(d.status != null ? { status: d.status, plan_name: d.plan_name ?? '—', expires_at: d.expires_at ?? null, limits_note: d.limits_note, limits: d.limits, usage: d.usage } : { status: 'trial', plan_name: 'Пробный', expires_at: null }))
        .catch(() => setSubscription({ status: '—', plan_name: '—', expires_at: null }))
    }
    if (tab === 'payments') {
      fetch('/api/cabinet/invoices', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : { items: [] })
        .then((d) => setInvoices(d.items || []))
        .catch(() => setInvoices([]))
    }
  }, [tab])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ full_name: fullName }),
      })
      if (r.ok) { await refresh(); window.location.reload() }
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/cabinet/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: fd,
      })
      if (r.ok) {
        const d = await r.json().catch(() => ({}))
        await refresh()
        if (d.avatar_data) {
          setAvatarBlobUrl(null)
          setAvatarUrl(d.avatar_data)
        } else {
          setAvatarBlobUrl(null)
          setAvatarUrl(`/api/cabinet/avatar?t=${Date.now()}`)
        }
      }
    } catch { /* ignore */ } finally { setSaving(false) }
    e.target.value = ''
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setReqSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/cabinet/company/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: fd,
      })
      if (r.ok) setCompany((c: any) => c ? { ...c, logo_url: '/api/cabinet/company/logo' } : null)
    } catch { /* ignore */ } finally { setReqSaving(false) }
    e.target.value = ''
  }

  async function saveRequisites(e: React.FormEvent) {
    e.preventDefault()
    setReqSaving(true)
    try {
      const r = await fetch('/api/cabinet/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify(requisites),
      })
      if (r.ok) alert('Реквизиты сохранены')
    } catch { alert('Ошибка') } finally { setReqSaving(false) }
  }

  async function recognizeRequisites() {
    if (!reqFile) { alert('Выберите файл'); return }
    setRecognizing(true)
    try {
      const fd = new FormData()
      fd.append('file', reqFile)
      const r = await fetch('/api/cabinet/company/recognize-requisites', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: fd,
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.detected) {
        setRecognizedReq(d.detected)
        setReqMapping(d.detected)
      } else alert(d.detail || 'Не удалось распознать')
    } catch { alert('Ошибка') } finally { setRecognizing(false) }
  }

  async function applyRequisites() {
    setReqSaving(true)
    try {
      const r = await fetch('/api/cabinet/company/apply-requisites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ mapping: reqMapping }),
      })
      if (r.ok) {
        setRequisites((prev) => ({ ...prev, ...reqMapping }))
        setRecognizedReq(null)
        setReqFile(null)
      }
    } catch { alert('Ошибка') } finally { setReqSaving(false) }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setChangePwdError('')
    setChangePwdOk(false)
    if (!oldPassword || !newPassword) { setChangePwdError('Заполните оба поля'); return }
    if (newPassword.length < 8) { setChangePwdError('Новый пароль минимум 8 символов'); return }
    try {
      const r = await fetch('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) { setChangePwdOk(true); setOldPassword(''); setNewPassword('') }
      else setChangePwdError(d.detail || 'Ошибка смены пароля')
    } catch { setChangePwdError('Ошибка сети') }
  }

  const tabs = [
    { id: 'profile' as const, label: 'Профиль' },
    { id: 'company' as const, label: 'Компания и реквизиты' },
    { id: 'subscription' as const, label: 'Подписка' },
    { id: 'payments' as const, label: 'Счета и оплаты' },
  ]

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Профиль и настройки</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: tab === t.id ? 'rgba(14,165,233,0.2)' : 'transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={saveProfile} style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '2px solid var(--border)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {(avatarBlobUrl || (avatarUrl && (avatarUrl.startsWith('data:') || avatarUrl.startsWith('blob:')))) ? (
                <img src={avatarBlobUrl || avatarUrl!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => { setAvatarBlobUrl(null); if (avatarUrl?.startsWith('data:')) setAvatarUrl('/api/cabinet/avatar') }} />
              ) : (
                <ImageIcon size={32} style={{ color: 'var(--text-secondary)' }} />
              )}
            </div>
            <div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadAvatar}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={saving}
                className="btn-mk-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}
              >
                <Upload size={16} /> Загрузить аватар
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Email</label>
            <input type="email" value={user?.email ?? ''} disabled style={{ width: '100%', padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)' }} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Имя</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
          </div>
          <button type="submit" disabled={saving} className="btn-mk-primary" style={{ padding: '10px 20px' }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: 16 }}>Сменить пароль</h3>
            <form onSubmit={changePassword}>
              {changePwdError && <div style={{ color: 'var(--error)', marginBottom: 8, fontSize: 14 }}>{changePwdError}</div>}
              {changePwdOk && <div style={{ color: 'var(--success)', marginBottom: 8, fontSize: 14 }}>Пароль изменён</div>}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Текущий пароль</label>
                <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} style={{ width: '100%', padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Новый пароль</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
              </div>
              <button type="submit" className="btn-mk-primary" style={{ padding: '10px 20px' }}>Сменить пароль</button>
            </form>
          </div>
        </form>
      )}

      {tab === 'company' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Логотип</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 80, height: 80, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {(logoBlobUrl || company?.logo_url) ? (
                  <img src={logoBlobUrl || company.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <ImageIcon size={32} style={{ color: 'var(--text-secondary)' }} />
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" onChange={uploadLogo} style={{ display: 'none' }} />
              <button type="button" onClick={() => logoInputRef.current?.click()} disabled={reqSaving} className="btn-mk-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}>
                <Upload size={16} /> Загрузить логотип
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>PNG, SVG (прозрачный или белый фон)</span>
            </div>
          </div>
          <form onSubmit={saveRequisites}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Реквизиты компании</h3>
            <div style={{ marginBottom: 16, padding: 12, background: 'rgba(14,165,233,0.08)', borderRadius: 8, border: '1px solid var(--accent)' }}>
              <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>Поиск по ИНН</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="10 или 12 цифр"
                  value={requisites.inn ?? ''}
                  onChange={(e) => setRequisites((p) => ({ ...p, inn: e.target.value }))}
                  style={{ flex: 1, padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  disabled={innLookupLoading}
                  onClick={async () => {
                    const raw = (requisites.inn || '').replace(/\D/g, '')
                    if (raw.length !== 10 && raw.length !== 12) { alert('ИНН должен содержать 10 или 12 цифр'); return }
                    const t = localStorage.getItem('access_token')
                    if (!t) return
                    setInnLookupLoading(true)
                    try {
                      const r = await fetch(`/api/cabinet/inn-lookup?inn=${encodeURIComponent(raw)}`, { headers: { Authorization: `Bearer ${t}` } })
                      const j = await r.json().catch(() => ({}))
                      if (j.found && j.data) {
                        const d = j.data
                        setRequisites((p) => ({
                          ...p,
                          name: d.name || p.name,
                          inn: d.inn || raw,
                          kpp: d.kpp || '',
                          ogrn: d.ogrn || '',
                          legal_address: d.legal_address || '',
                          address: d.address || d.legal_address || '',
                          phone: d.phone || '',
                          email: d.email || '',
                          contact_person: d.contact_person || '',
                          bank_name: d.bank_name || '',
                          bank_bik: d.bank_bik || '',
                          bank_account: d.bank_account || '',
                          bank_corr: d.bank_corr || '',
                        }))
                      } else {
                        alert('Организация не найдена по ИНН')
                      }
                    } finally {
                      setInnLookupLoading(false)
                    }
                  }}
                  className="btn-mk-primary" style={{ padding: '10px 16px', cursor: innLookupLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {innLookupLoading ? '…' : 'Найти'}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              {Object.entries(REQUISITES_LABELS).map(([key, label]) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-secondary)' }}>{label}</label>
                  <input
                    type="text"
                    value={requisites[key] ?? ''}
                    onChange={(e) => setRequisites((p) => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}
                  />
                </div>
              ))}
            </div>
            <button type="submit" disabled={reqSaving} className="btn-mk-primary" style={{ padding: '10px 20px' }}>{reqSaving ? 'Сохранение...' : 'Сохранить'}</button>
          </form>
          <div style={{ marginTop: 32, padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <h4 style={{ marginBottom: 12, fontSize: 14 }}>Загрузить реквизиты из файла</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>PDF, Word или картинка. Распознавание и сопоставление полей.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                onChange={(e) => { setReqFile(e.target.files?.[0] || null); setRecognizedReq(null) }}
                style={{ fontSize: 13 }}
              />
              <button type="button" onClick={recognizeRequisites} disabled={!reqFile || recognizing} className="btn-mk-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                {recognizing ? 'Распознавание...' : 'Распознать'}
              </button>
            </div>
            {recognizedReq && Object.keys(recognizedReq).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, marginBottom: 8, color: 'var(--text-secondary)' }}>Распознанные поля. Применить к реквизитам:</p>
                <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                  {Object.entries(recognizedReq).map(([k]) => (
                    <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 120 }}>{REQUISITES_LABELS[k] || k}</span>
                      <input
                        type="text"
                        value={reqMapping[k] ?? ''}
                        onChange={(e) => setReqMapping((p) => ({ ...p, [k]: e.target.value }))}
                        style={{ flex: 1, padding: 8, fontSize: 13, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
                      />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={applyRequisites} disabled={reqSaving} className="btn-mk-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Применить</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'subscription' && (
        <div style={{ maxWidth: 500 }}>
          <div style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: '1rem' }}>
            <div style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 14 }}>Статус</div>
            <div style={{ fontWeight: 600 }}>{subscription?.status ?? 'Загрузка...'}</div>
          </div>
          <div style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: '1rem' }}>
            <div style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 14 }}>Тариф</div>
            <div style={{ fontWeight: 600 }}>{subscription?.plan_name ?? '—'}</div>
          </div>
          {subscription?.expires_at && (
            <div style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: '1rem' }}>
              <div style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 14 }}>Действует до</div>
              <div style={{ fontWeight: 600 }}>{subscription.expires_at}</div>
            </div>
          )}
          {(subscription?.limits_note || (subscription?.limits && subscription.limits.max_nomenclature_per_supplier != null)) && (
            <div style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: '1rem' }}>
              <div style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 14 }}>Условия тарифа</div>
              <div style={{ fontSize: 14 }}>
                {subscription?.limits_note && <div>{subscription.limits_note}</div>}
                {!subscription?.limits_note && subscription?.limits?.max_nomenclature_per_supplier != null && (
                  <div>До {subscription.limits.max_nomenclature_per_supplier} товаров по одному поставщику.</div>
                )}
              </div>
            </div>
          )}
          {subscription?.limits && subscription?.usage && (() => {
            const items: { label: string; used: number; max: number }[] = []
            if (subscription.limits.max_nomenclature != null) items.push({ label: 'Номенклатура', used: subscription.usage.nomenclature, max: subscription.limits.max_nomenclature })
            if (subscription.limits.max_suppliers != null) items.push({ label: 'Поставщики', used: subscription.usage.suppliers, max: subscription.limits.max_suppliers })
            if (subscription.limits.max_manufacturers != null) items.push({ label: 'Производители', used: subscription.usage.manufacturers, max: subscription.limits.max_manufacturers })
            if (subscription.limits.max_customers != null) items.push({ label: 'Заказчики', used: subscription.usage.customers, max: subscription.limits.max_customers })
            if (items.length === 0) return null
            return (
              <div style={{ padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: '1rem' }}>
                <div style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: 14 }}>Использование лимитов</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(({ label, used, max }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 600, color: used >= max ? 'var(--warning)' : undefined }}>{used} из {max}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
          <Link to="/cabinet/payment" style={{ display: 'inline-flex', padding: '12px 24px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>Продлить подписку</Link>
        </div>
      )}

      {tab === 'payments' && (
        <div>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>История выставленных счетов</h3>
          {invoices.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Выставленных счетов пока нет.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invoices.map((inv) => (
                <div key={inv.id} style={{ padding: '1rem 1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span><strong>Счёт {inv.invoice_number || inv.id}</strong></span>
                  <span>{(inv.amount / 100).toFixed(2)} ₽</span>
                  {inv.period_start && inv.period_end && (
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {new Date(inv.period_start).toLocaleDateString('ru')} — {new Date(inv.period_end).toLocaleDateString('ru')}
                    </span>
                  )}
                  <span style={{ color: inv.status === 'paid' ? 'var(--success)' : inv.status === 'pending' ? 'var(--warning)' : 'var(--text-secondary)' }}>{inv.status === 'paid' ? 'Оплачен' : inv.status === 'pending' ? 'Ожидает оплаты' : inv.status || 'Выставлен'}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{inv.created_at ? new Date(inv.created_at).toLocaleDateString('ru') : inv.created_at}</span>
                  <button
                    onClick={async () => {
                      try {
                        const r = await fetch(`/payment/invoice/${inv.id}/pdf`, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } })
                        if (!r.ok) {
                          const err = await r.json().catch(() => ({}))
                          alert(err.detail || `Ошибка ${r.status}`)
                          return
                        }
                        const blob = await r.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `Счёт_${inv.invoice_number || inv.id}.pdf`
                        a.style.display = 'none'
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      } catch (e) {
                        alert('Ошибка загрузки: ' + String(e))
                      }
                    }}
                    style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    Скачать PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
