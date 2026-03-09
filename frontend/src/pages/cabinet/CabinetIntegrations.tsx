import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Key, Webhook, Package, Copy, Trash2, ExternalLink, Check, Plug, HelpCircle } from 'lucide-react'

const API_BASE = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/integrate`

type ApiKeyItem = { id: number; name: string; last_used_at: string | null; created_at: string | null }
type WebhookItem = { id: number; name: string; url: string; events: string[]; is_active: boolean; last_triggered_at: string | null }
type OAuthProvider = {
  id: string
  name: string
  needs_shop: boolean
  help_slug: string
  configured: boolean
  supports_api_key?: boolean
  supports_credentials_form?: boolean
  instructions?: string
}
type OAuthConnItem = { provider: string; store_url: string | null; store_id: string | null; created_at: string; updated_at: string }

const WEBHOOK_EVENTS = [
  { value: 'nomenclature.created', label: 'Номенклатура создана' },
  { value: 'nomenclature.updated', label: 'Номенклатура обновлена' },
  { value: 'nomenclature.deleted', label: 'Номенклатура удалена' },
  { value: 'supply.created', label: 'Поставка создана' },
  { value: 'supply.updated', label: 'Поставка обновлена' },
  { value: 'supplier.created', label: 'Поставщик создан' },
  { value: 'supplier.updated', label: 'Поставщик обновлён' },
  { value: 'contract.created', label: 'Договор создан' },
  { value: 'contract.updated', label: 'Договор обновлён' },
]

export default function CabinetIntegrations() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<'api' | 'webhooks' | 'modules' | 'oauth'>('api')
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([])
  const [oauthConnections, setOauthConnections] = useState<OAuthConnItem[]>([])
  const [oauthLoading, setOauthLoading] = useState(true)
  const [oauthShopInput, setOauthShopInput] = useState<Record<string, string>>({})
  const [oauthApiKeyInput, setOauthApiKeyInput] = useState<Record<string, { client_id?: string; api_key: string }>>({})
  const [oauthShopifyCreds, setOauthShopifyCreds] = useState({ client_id: '', client_secret: '' })
  const [oauthConnecting, setOauthConnecting] = useState<string | null>(null)
  const [apiKeyConnecting, setApiKeyConnecting] = useState<string | null>(null)
  const [credentialsSaving, setCredentialsSaving] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<Record<string, { ok: boolean; message: string }>>({})
  const [newKeyName, setNewKeyName] = useState('')
  const [createKeyLoading, setCreateKeyLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [newWebhookName, setNewWebhookName] = useState('')
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['nomenclature.created', 'supply.created'])
  const [createWebhookLoading, setCreateWebhookLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const token = localStorage.getItem('access_token')

  const fetchApiKeys = () => {
    if (!token) return
    fetch('/api/cabinet/api-keys', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setApiKeys(d.items || []))
      .catch(() => setApiKeys([]))
  }

  const fetchWebhooks = () => {
    if (!token) return
    fetch('/api/cabinet/webhooks', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setWebhooks(d.items || []))
      .catch(() => setWebhooks([]))
  }

  const fetchOauth = () => {
    if (!token) {
      setOauthLoading(false)
      return
    }
    setOauthLoading(true)
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch('/api/cabinet/integrations/oauth/providers', { headers }).then((r) => (r.ok ? r.json() : { providers: [] })).then((d) => d.providers || []),
      fetch('/api/cabinet/integrations/oauth', { headers }).then((r) => (r.ok ? r.json() : { connections: [] })).then((d) => d.connections || []),
    ])
      .then(([providers, connections]) => {
        setOauthProviders(Array.isArray(providers) ? providers : [])
        setOauthConnections(Array.isArray(connections) ? connections : [])
      })
      .catch(() => {
        setOauthProviders([])
        setOauthConnections([])
      })
      .finally(() => setOauthLoading(false))
  }

  useEffect(() => {
    fetchApiKeys()
    fetchWebhooks()
    fetchOauth()
  }, [])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'api' || t === 'webhooks' || t === 'modules' || t === 'oauth') setTab(t)
    const oauth = searchParams.get('oauth')
    const oauthError = searchParams.get('oauth_error')
    if (oauth) {
      setTab('oauth')
      setSearchParams({}, { replace: true })
    }
    if (oauthError) {
      setTab('oauth')
      alert(`Ошибка подключения: ${oauthError}`)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams])

  const createApiKey = () => {
    if (!newKeyName.trim() || !token) return
    setCreateKeyLoading(true)
    setCreatedKey(null)
    fetch('/api/cabinet/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newKeyName.trim() }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.key) {
          setCreatedKey(d.key)
          setNewKeyName('')
          fetchApiKeys()
        }
      })
      .finally(() => setCreateKeyLoading(false))
  }

  const revokeApiKey = (id: number) => {
    if (!token || !confirm('Отозвать ключ? Интеграции с ним перестанут работать.')) return
    fetch(`/api/cabinet/api-keys/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok && fetchApiKeys())
  }

  const createWebhook = () => {
    if (!newWebhookUrl.trim() || !token) return
    setCreateWebhookLoading(true)
    fetch('/api/cabinet/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newWebhookName.trim() || 'Webhook', url: newWebhookUrl.trim(), events: newWebhookEvents }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setNewWebhookName('')
          setNewWebhookUrl('')
          setNewWebhookEvents(['nomenclature.created', 'supply.created'])
          fetchWebhooks()
        }
      })
      .finally(() => setCreateWebhookLoading(false))
  }

  const deleteWebhook = (id: number) => {
    if (!token || !confirm('Удалить webhook?')) return
    fetch(`/api/cabinet/webhooks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok && fetchWebhooks())
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startOauthConnect = async (providerId: string) => {
    if (!token) return
    const shop = oauthShopInput[providerId]?.trim()
    const prov = oauthProviders.find((p) => p.id === providerId)
    if (prov?.needs_shop && !shop) {
      alert('Укажите адрес магазина (например: mystore.myshopify.com)')
      return
    }
    setOauthConnecting(providerId)
    try {
      const url = prov?.needs_shop
        ? `/api/cabinet/integrations/oauth/${providerId}/init?shop=${encodeURIComponent(shop)}`
        : `/api/cabinet/integrations/oauth/${providerId}/init`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const j = await r.json().catch(() => ({}))
      if (j.redirect_url) window.location.href = j.redirect_url
      else alert(j.detail || 'Не удалось получить ссылку')
    } finally {
      setOauthConnecting(null)
    }
  }

  const disconnectOauth = async (provider: string, store?: string) => {
    if (!token || !confirm('Отключить интеграцию?')) return
    const q = store ? `?store=${encodeURIComponent(store)}` : ''
    await fetch(`/api/cabinet/integrations/oauth/${provider}${q}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchOauth()
  }

  const saveShopifyCredentials = async () => {
    if (!token || !oauthShopifyCreds.client_id.trim() || !oauthShopifyCreds.client_secret.trim()) return
    setCredentialsSaving('shopify')
    try {
      const r = await fetch('/api/cabinet/integrations/oauth/shopify/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id: oauthShopifyCreds.client_id.trim(),
          client_secret: oauthShopifyCreds.client_secret.trim(),
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        fetchOauth()
      } else {
        alert(j.detail || 'Ошибка сохранения')
      }
    } finally {
      setCredentialsSaving(null)
    }
  }

  const testConnection = async (providerId: string, shopOverride?: string) => {
    if (!token) return
    setTestStatus((s) => ({ ...s, [providerId]: { ok: false, message: 'Проверка…' } }))
    try {
      const shop = providerId === 'shopify' ? (shopOverride || oauthShopInput[providerId]) : undefined
      const q = shop ? `?shop=${encodeURIComponent(shop)}` : ''
      const r = await fetch(`/api/cabinet/integrations/oauth/${providerId}/test${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const j = await r.json().catch(() => ({}))
      setTestStatus((s) => ({ ...s, [providerId]: { ok: j.ok ?? false, message: j.message || 'Ошибка' } }))
    } finally {
      // keep last status
    }
  }

  const connectApiKey = async (providerId: string) => {
    if (!token) return
    const inp = oauthApiKeyInput[providerId]
    const api_key = inp?.api_key?.trim()
    if (!api_key) {
      alert('Укажите API-ключ')
      return
    }
    if (providerId === 'ozon' && !(inp?.client_id?.trim())) {
      alert('Укажите Client-Id Ozon')
      return
    }
    setApiKeyConnecting(providerId)
    try {
      const r = await fetch(`/api/cabinet/integrations/oauth/${providerId}/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          client_id: providerId === 'ozon' ? inp?.client_id?.trim() : undefined,
          api_key,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        fetchOauth()
        setOauthApiKeyInput((prev) => ({ ...prev, [providerId]: { api_key: '' } }))
      } else {
        alert(j.detail || 'Ошибка подключения')
      }
    } finally {
      setApiKeyConnecting(null)
    }
  }

  const tabs = [
    { id: 'api' as const, label: 'REST API', icon: <Key size={18} /> },
    { id: 'webhooks' as const, label: 'Webhooks', icon: <Webhook size={18} /> },
    { id: 'oauth' as const, label: 'Подключения', icon: <Plug size={18} /> },
    { id: 'modules' as const, label: 'Модули 1С / ERP / CRM', icon: <Package size={18} /> },
  ]

  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div>
          <h1 className="ds-h1">Интеграции</h1>
          <p className="ds-lead">
            REST API, webhooks и модули для 1С, ERP, CRM. Двусторонняя синхронизация данных.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id)
              setSearchParams({ tab: t.id }, { replace: true })
            }}
            className={tab === t.id ? 'btn-mk-primary' : 'btn-mk-secondary'}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'api' && (
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">REST API</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
              Базовый URL: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4 }}>{API_BASE}</code>
              <button
                type="button"
                onClick={() => copyToClipboard(API_BASE)}
                style={{ marginLeft: 8, padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--accent)' }}
                title="Копировать"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </p>
          </div>
          <div className="ds-cardBody">
            <p style={{ marginBottom: 16 }}>Все запросы требуют заголовок <code>X-Api-Key: ваш_ключ</code>.</p>
            <div style={{ marginBottom: 20 }}>
              <label className="ds-label">Создать API-ключ</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="ds-input"
                  placeholder="Например: 1С УТ 11"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-mk-primary" onClick={createApiKey} disabled={createKeyLoading}>
                  {createKeyLoading ? '…' : 'Создать'}
                </button>
              </div>
            </div>
            {createdKey && (
              <div
                style={{
                  padding: 16,
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.4)',
                  borderRadius: 10,
                  marginBottom: 20,
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: 8 }}>Ключ создан. Сохраните его — он больше не будет показан:</p>
                <code style={{ fontSize: 13, wordBreak: 'break-all' }}>{createdKey}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdKey)}
                  style={{ marginLeft: 8, padding: '4px 8px', border: 'none', borderRadius: 6, background: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
                >
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button type="button" onClick={() => setCreatedKey(null)} style={{ marginLeft: 8 }}>
                  Закрыть
                </button>
              </div>
            )}
            <div>
              <div className="ds-label">Ваши ключи</div>
              {apiKeys.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Нет активных ключей</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {apiKeys.map((k) => (
                    <div
                      key={k.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div>
                        <strong>{k.name}</strong>
                        <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                          {k.last_used_at ? `Использован: ${new Date(k.last_used_at).toLocaleString('ru')}` : 'Не использован'}
                        </span>
                      </div>
                      <button type="button" onClick={() => revokeApiKey(k.id)} style={{ color: 'var(--destructive)' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
              Документация: <a href="/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>OpenAPI / Swagger</a>
            </p>
          </div>
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Webhooks</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Push-уведомления при изменениях сущностей. POST на ваш endpoint.</p>
          </div>
          <div className="ds-cardBody">
            <div style={{ marginBottom: 20 }}>
              <label className="ds-label">Добавить webhook</label>
              <input
                className="ds-input"
                placeholder="Название"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <input
                className="ds-input"
                placeholder="URL (https://...)"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div className="ds-label" style={{ marginBottom: 8 }}>События</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {WEBHOOK_EVENTS.map((e) => (
                  <label key={e.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newWebhookEvents.includes(e.value)}
                      onChange={(ev) => setNewWebhookEvents((prev) => ev.target.checked ? [...prev, e.value] : prev.filter((x) => x !== e.value))}
                    />
                    <span style={{ fontSize: 13 }}>{e.label}</span>
                  </label>
                ))}
              </div>
              <button type="button" className="btn-mk-primary" onClick={createWebhook} disabled={createWebhookLoading || !newWebhookUrl.trim()} style={{ marginTop: 12 }}>
                {createWebhookLoading ? '…' : 'Добавить webhook'}
              </button>
            </div>
            <div>
              <div className="ds-label">Webhooks</div>
              {webhooks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Нет webhooks</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {webhooks.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: 12,
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong>{h.name}</strong>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{h.url}</div>
                          <div style={{ fontSize: 12, marginTop: 4 }}>События: {h.events.join(', ')}</div>
                        </div>
                        <button type="button" onClick={() => deleteWebhook(h.id)} style={{ color: 'var(--destructive)' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'oauth' && (
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Внешние интеграции</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              OAuth-подключение к маркетплейсам и магазинам. Подключите Shopify, Wildberries или Ozon для синхронизации товаров.
            </p>
          </div>
          <div className="ds-cardBody">
            <div
              style={{
                padding: 16,
                marginBottom: 24,
                background: 'rgba(14,165,233,0.08)',
                border: '1px solid rgba(14,165,233,0.3)',
                borderRadius: 10,
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              <strong style={{ color: 'var(--accent)' }}>Подсказки:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                <li><strong>Shopify:</strong> partners.shopify.com → создать приложение → Client ID и Secret → Redirect URL: <code style={{ fontSize: 11 }}>https://ikamdocs.ru/api/cabinet/integrations/oauth/shopify/callback</code></li>
                <li><strong>Wildberries:</strong> Личный кабинет → Настройки → API → сгенерировать токен</li>
                <li><strong>Ozon:</strong> Настройки продавца → Seller API → Client-Id и Api-Key</li>
              </ul>
              <Link to="/cabinet/help#integrations-oauth" style={{ color: 'var(--accent)', marginTop: 8, display: 'inline-block' }}>Подробная инструкция в Справке →</Link>
            </div>

            {oauthLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>Загрузка списка интеграций…</p>
            ) : oauthProviders.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: 12 }}>Не удалось загрузить список интеграций.</p>
                <p style={{ fontSize: 13, marginBottom: 16 }}>Убедитесь, что вы авторизованы, или попробуйте обновить страницу.</p>
                <button type="button" className="btn-mk-secondary" onClick={fetchOauth}>Повторить загрузку</button>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {oauthProviders.map((p) => {
                const conn = oauthConnections.find((c) => c.provider === p.id)
                const store = conn?.store_url || conn?.store_id
                const canConnect = p.configured
                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 20,
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                      gap: 16,
                      justifyContent: 'space-between',
                      opacity: canConnect ? 1 : 0.85,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <strong style={{ fontSize: 16 }}>{p.name}</strong>
                        <Link
                          to={`/cabinet/help#${p.help_slug}`}
                          style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
                          title="Инструкция"
                        >
                          <HelpCircle size={14} />
                          Инструкция
                        </Link>
                      </div>
                      {p.instructions && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            marginBottom: 12,
                            padding: 10,
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {p.instructions}
                        </div>
                      )}
                      {p.supports_credentials_form && !canConnect && (
                        <div style={{ marginBottom: 12, maxWidth: 400 }}>
                          <div className="ds-label">Введите учётные данные приложения</div>
                          <input
                            className="ds-input"
                            placeholder="Client ID"
                            value={oauthShopifyCreds.client_id}
                            onChange={(e) => setOauthShopifyCreds((c) => ({ ...c, client_id: e.target.value }))}
                            style={{ marginBottom: 8 }}
                          />
                          <input
                            className="ds-input"
                            type="password"
                            placeholder="Client Secret"
                            value={oauthShopifyCreds.client_secret}
                            onChange={(e) => setOauthShopifyCreds((c) => ({ ...c, client_secret: e.target.value }))}
                            style={{ marginBottom: 8 }}
                          />
                          <button
                            type="button"
                            className="btn-mk-primary"
                            disabled={credentialsSaving === 'shopify'}
                            onClick={saveShopifyCredentials}
                          >
                            {credentialsSaving === 'shopify' ? '…' : 'Сохранить'}
                          </button>
                        </div>
                      )}
                      {!canConnect && !p.supports_credentials_form && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                          Требуется настройка администратором (добавить credentials в .env)
                        </div>
                      )}
                      {canConnect && p.needs_shop && !p.supports_api_key && (
                        <input
                          className="ds-input"
                          placeholder="store.myshopify.com"
                          value={oauthShopInput[p.id] || ''}
                          onChange={(e) => setOauthShopInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          style={{ marginTop: 8, maxWidth: 280 }}
                        />
                      )}
                      {canConnect && p.supports_api_key && !conn && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
                          {p.id === 'ozon' && (
                            <input
                              className="ds-input"
                              placeholder="Client-Id Ozon"
                              value={oauthApiKeyInput[p.id]?.client_id || ''}
                              onChange={(e) =>
                                setOauthApiKeyInput((prev) => ({
                                  ...prev,
                                  [p.id]: { ...prev[p.id], client_id: e.target.value, api_key: prev[p.id]?.api_key || '' },
                                }))
                              }
                            />
                          )}
                          <input
                            className="ds-input"
                            type="password"
                            placeholder={p.id === 'ozon' ? 'API-ключ Ozon' : 'API-ключ Wildberries'}
                            value={oauthApiKeyInput[p.id]?.api_key || ''}
                            onChange={(e) =>
                              setOauthApiKeyInput((prev) => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], api_key: e.target.value },
                              }))
                            }
                          />
                        </div>
                      )}
                      {conn && store && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                          Подключено: {store || (p.id === 'ozon' ? 'Client-Id задан' : 'API-ключ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {testStatus[p.id] && (
                        <span
                          style={{
                            fontSize: 12,
                            color: testStatus[p.id].ok ? 'var(--success)' : 'var(--destructive)',
                            marginRight: 4,
                          }}
                        >
                          {testStatus[p.id].message}
                        </span>
                      )}
                      {canConnect && conn && (
                        <button
                          type="button"
                          className="btn-mk-secondary"
                          onClick={() => testConnection(p.id, conn?.store_url || undefined)}
                          title="Проверить подключение"
                        >
                          Проверить
                        </button>
                      )}
                      {canConnect ? (
                        conn ? (
                          <>
                            {!p.supports_api_key && (
                              <button
                                type="button"
                                className="btn-mk-primary"
                                disabled={oauthConnecting === p.id}
                                onClick={() => startOauthConnect(p.id)}
                              >
                                {oauthConnecting === p.id ? '…' : 'Обновить'}
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-mk-secondary"
                              onClick={() => disconnectOauth(p.id, conn.store_url || undefined)}
                            >
                              Отключить
                            </button>
                          </>
                        ) : p.supports_api_key ? (
                          <button
                            type="button"
                            className="btn-mk-primary"
                            disabled={apiKeyConnecting === p.id}
                            onClick={() => connectApiKey(p.id)}
                          >
                            {apiKeyConnecting === p.id ? '…' : 'Подключить'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-mk-primary"
                            disabled={oauthConnecting === p.id}
                            onClick={() => startOauthConnect(p.id)}
                          >
                            {oauthConnecting === p.id ? '…' : 'Подключить'}
                          </button>
                        )
                      ) : (
                        <button type="button" className="btn-mk-secondary" disabled title="Настройте credentials в .env на сервере">
                          Скоро
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </div>
        </div>
      )}

      {tab === 'modules' && (
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">Модули 1С / ERP / CRM</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Готовые решения для интеграции с внешними системами.</p>
          </div>
          <div className="ds-cardBody">
            <div style={{ display: 'grid', gap: 16 }}>
              <div
                style={{
                  padding: 20,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}
              >
                <h3 style={{ marginBottom: 8 }}>1С:Предприятие</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                  Обработка для синхронизации справочников и документов. HTTP-соединение к REST API, маппинг полей.
                </p>
                <p style={{ fontSize: 13 }}>Доступ: установочный файл по запросу или магазин конфигураций 1С.</p>
              </div>
              <div
                style={{
                  padding: 20,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}
              >
                <h3 style={{ marginBottom: 8 }}>ERP / CRM (AmoCRM, Bitrix24 и др.)</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                  Интеграция через REST API и webhooks. Zapier, Make (Integromat), n8n — готовые сценарии.
                </p>
                <p style={{ fontSize: 13 }}>Используйте API-ключ и webhooks для двусторонней синхронизации.</p>
              </div>
              <div
                style={{
                  padding: 20,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}
              >
                <h3 style={{ marginBottom: 8 }}>Zapier / Make / n8n</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                  Автоматизация без кода. Триггеры на события, действия: создание, обновление сущностей.
                </p>
                <a href="/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={14} /> Документация API (Swagger)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
