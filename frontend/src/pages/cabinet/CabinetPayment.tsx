import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Download } from 'lucide-react'

type InvoiceItem = { id: number; invoice_number?: string; amount: number; status: string; period_start?: string; period_end?: string; created_at: string }

export default function CabinetPayment() {
  const [plans, setPlans] = useState<Array<{ id: number; name: string; price_monthly: number; price_yearly: number; max_users: number; max_storage_mb: number; limits_note?: string }>>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [invoicing, setInvoicing] = useState(false)
  const [invoiceResult, setInvoiceResult] = useState<any>(null)
  const [invoicesHistory, setInvoicesHistory] = useState<InvoiceItem[]>([])

  const loadInvoices = () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/api/cabinet/invoices', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setInvoicesHistory(d.items || []))
      .catch(() => setInvoicesHistory([]))
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/payment/plans', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : { plans: [] })
      .then((d) => {
        setPlans(d.plans || [])
        if ((d.plans?.length ?? 0) > 0 && !selectedPlanId) setSelectedPlanId(d.plans[0].id)
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false))
    loadInvoices()
  }, [])

  const downloadInvoicePdf = async (inv: InvoiceItem) => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const r = await fetch(`/payment/invoice/${inv.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
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
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)
  const amount = selectedPlan
    ? period === 'yearly'
      ? selectedPlan.price_yearly
      : selectedPlan.price_monthly
    : 0

  async function payCard() {
    if (!selectedPlanId || amount <= 0) return
    setPaying(true)
    try {
      const returnUrl = `${window.location.origin}/cabinet/settings`
      const r = await fetch('/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          period,
          return_success_url: returnUrl,
          return_cancel_url: returnUrl,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.confirmation_url) {
        window.location.href = d.confirmation_url
      } else {
        alert(d.detail || 'Ошибка создания платежа')
      }
    } catch (e) {
      alert('Ошибка сети')
    } finally {
      setPaying(false)
    }
  }

  async function createInvoice() {
    if (!selectedPlanId || amount <= 0) return
    setInvoicing(true)
    setInvoiceResult(null)
    try {
      const r = await fetch('/payment/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ plan_id: selectedPlanId, period }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setInvoiceResult(d)
        loadInvoices()
      } else {
        alert(d.detail || 'Ошибка. Заполните реквизиты компании в настройках.')
      }
    } catch {
      alert('Ошибка сети')
    } finally {
      setInvoicing(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка тарифов...</p>

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>Продление подписки</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Оплата картой или СБП через ЮKassa. Или выставление счёта для юрлиц (реквизиты из настроек).
      </p>
      {plans.length === 0 ? (
        <div style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <p style={{ color: 'var(--text-secondary)' }}>Тарифы не настроены. Обратитесь к администратору.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                style={{
                  padding: 20,
                  background: selectedPlanId === p.id ? 'rgba(14,165,233,0.15)' : 'var(--surface)',
                  border: selectedPlanId === p.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  color: 'var(--text)',
                  textAlign: 'left',
                  minWidth: 180,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{(p.price_monthly / 100).toFixed(0)} ₽/мес</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>До {p.max_users} пользователей</div>
                {p.limits_note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{p.limits_note}</div>}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ marginRight: 12 }}>Период:</label>
            <label style={{ marginRight: 16, cursor: 'pointer' }}>
              <input type="radio" checked={period === 'monthly'} onChange={() => setPeriod('monthly')} /> Месяц
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" checked={period === 'yearly'} onChange={() => setPeriod('yearly')} /> Год
            </label>
          </div>
          {selectedPlan && amount > 0 && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
              <button
                onClick={payCard}
                disabled={paying}
                style={{
                  padding: '14px 28px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: paying ? 'not-allowed' : 'pointer',
                  fontSize: 15,
                }}
              >
                {paying ? 'Создание...' : 'Оплатить картой / СБП'}
              </button>
              <button
                onClick={createInvoice}
                disabled={invoicing}
                style={{
                  padding: '14px 28px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: invoicing ? 'not-allowed' : 'pointer',
                  fontSize: 15,
                }}
              >
                {invoicing ? 'Создание...' : 'Выставить счёт'}
              </button>
            </div>
          )}
          {invoiceResult && (
            <div style={{ padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, maxWidth: 600, marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Счёт {invoiceResult.invoice_number}</h3>
              <p style={{ marginBottom: 8 }}><strong>Сумма:</strong> {invoiceResult.amount_rub?.toFixed(2)} ₽</p>
              <p style={{ marginBottom: 8 }}><strong>Период:</strong> {invoiceResult.period_start} — {invoiceResult.period_end}</p>
              <button
                onClick={() => downloadInvoicePdf({ id: invoiceResult.invoice_id, invoice_number: invoiceResult.invoice_number, amount: invoiceResult.amount_rub * 100, status: '', created_at: '' })}
                style={{
                  marginBottom: 16, padding: '10px 20px',
                  background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Скачать счёт (PDF)
              </button>
              {invoiceResult.seller && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 13 }}>
                  <strong>Реквизиты для оплаты:</strong>
                  <p style={{ margin: '8px 0' }}>{invoiceResult.seller.name}</p>
                  <p>ИНН {invoiceResult.seller.inn} ОГРНИП {invoiceResult.seller.ogrn}</p>
                  <p>Р/с {invoiceResult.seller.bank_account}</p>
                  <p>Банк {invoiceResult.seller.bank_name} БИК {invoiceResult.seller.bank_bik}</p>
                  <p>К/с {invoiceResult.seller.bank_corr}</p>
                  <p>{invoiceResult.seller.address}</p>
                </div>
              )}
            </div>
          )}
          {invoicesHistory.length > 0 && (
            <div style={{ marginTop: 32, padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>История выставленных счетов</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {invoicesHistory.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={18} style={{ color: 'var(--text-secondary)' }} />
                      <strong>Счёт {inv.invoice_number || inv.id}</strong>
                    </span>
                    <span>{(inv.amount / 100).toFixed(2)} ₽</span>
                    {inv.period_start && inv.period_end && (
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Период: {new Date(inv.period_start).toLocaleDateString('ru')} — {new Date(inv.period_end).toLocaleDateString('ru')}
                      </span>
                    )}
                    <span
                      style={{
                        color: inv.status === 'paid' ? 'var(--success)' : inv.status === 'pending' ? 'var(--warning)' : 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {inv.status === 'paid' ? 'Оплачен' : inv.status === 'pending' ? 'Ожидает оплаты' : inv.status || 'Выставлен'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString('ru') : ''}
                    </span>
                    <button
                      onClick={() => downloadInvoicePdf(inv)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        background: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      <Download size={16} />
                      Скачать PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <Link
        to="/cabinet/settings"
        style={{ display: 'inline-block', marginTop: '1.5rem', color: 'var(--accent)', fontSize: 14 }}
      >
        ← Назад к настройкам
      </Link>
    </div>
  )
}
