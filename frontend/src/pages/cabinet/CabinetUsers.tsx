import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Ban, Shield, LogIn, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface UserRow {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  permissions?: { can_delete_entities?: boolean; can_delete_documents?: boolean }
}

const ROLE_LABELS: Record<string, string> = { super_admin: 'Супер-админ', admin: 'Админ', user: 'Пользователь', trader: 'Трейдер' }

const PERMISSION_OPTIONS = [
  { key: 'can_delete_entities' as const, label: 'Удаление и отключение номенклатуры' },
  { key: 'can_delete_documents' as const, label: 'Удаление документов' },
]

export default function CabinetUsers() {
  const { user } = useAuth()
  const token = localStorage.getItem('access_token')
  const roleFromToken = token ? (() => { try { const p = JSON.parse(atob(token.split('.')[1])); return p.role || ''; } catch { return ''; } })() : ''
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'permissions' | null>(null)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [permissions, setPermissions] = useState<{ can_delete_entities: boolean; can_delete_documents: boolean }>({
    can_delete_entities: false,
    can_delete_documents: false,
  })
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      String(u.id).includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    )
  }, [users, search])

  function loadUsers() {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoadError('Нет токена авторизации')
      setLoading(false)
      return
    }
    setLoadError('')
    fetch('/api/cabinet/users', {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then(async (r) => {
        if (r.ok) return r.json()
        const d = await r.json().catch(() => ({}))
        const msg = typeof d.detail === 'string' ? d.detail : `Ошибка ${r.status}`
        setLoadError(msg)
        return { items: [] }
      })
      .then((d) => setUsers((d.items || []).map((u: Record<string, unknown>) => ({ ...u, is_active: u.is_active !== false }))))
      .catch((e) => {
        setLoadError(e?.message || 'Ошибка сети')
        setUsers([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!newEmail || !newPassword || newPassword.length < 8) {
      setError('Email и пароль (мин. 8 символов) обязательны')
      return
    }
    try {
      const r = await fetch('/api/cabinet/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ email: newEmail, full_name: newName || newEmail, password: newPassword }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setModal(null)
        setNewEmail('')
        setNewName('')
        setNewPassword('')
        loadUsers()
      } else {
        setError(d.detail || 'Ошибка')
      }
    } catch {
      setError('Ошибка сети')
    }
  }

  async function toggleActive(u: UserRow) {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const r = await fetch(`/api/cabinet/users/${u.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !u.is_active }),
      })
      if (r.ok) loadUsers()
    } catch {
      //
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Удалить пользователя?')) return
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const r = await fetch(`/api/cabinet/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      if (r.ok) {
        setModal(null)
        loadUsers()
      }
    } catch {
      //
    }
  }

  function openPermissions(u: UserRow) {
    setEditingUser(u)
    setPermissions({
      can_delete_entities: u.permissions?.can_delete_entities ?? false,
      can_delete_documents: u.permissions?.can_delete_documents ?? false,
    })
    setModal('permissions')
  }

  async function impersonate(u: UserRow) {
    const token = localStorage.getItem('access_token')
    const refresh = localStorage.getItem('refresh_token')
    if (!token) return
    try {
      const r = await fetch(`/admin/impersonate/${u.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.access_token) {
        localStorage.setItem('original_access_token', token)
        if (refresh) localStorage.setItem('original_refresh_token', refresh)
        localStorage.setItem('access_token', d.access_token)
        localStorage.setItem('impersonated', u.email)
        window.location.href = '/cabinet'
      } else {
        alert(d.detail || 'Не удалось войти')
      }
    } catch {
      alert('Ошибка сети')
    }
  }

  async function savePermissions(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const r = await fetch(`/api/cabinet/users/${editingUser.id}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          can_delete_entities: permissions.can_delete_entities,
          can_delete_documents: permissions.can_delete_documents,
        }),
      })
      if (r.ok) {
        setModal(null)
        setEditingUser(null)
        loadUsers()
      }
    } catch {
      //
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Управление пользователями</h1>
        <label style={{ position: 'relative', flexShrink: 0 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Поиск по ID, Email, Имя, Роль..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '10px 16px 10px 40px',
              borderRadius: 10,
              border: '2px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              width: 280,
              minWidth: 200,
              fontSize: 14,
              outline: 'none',
            }}
          />
        </label>
        <button
          onClick={() => setModal('add')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={18} /> Добавить
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      ) : filteredUsers.length === 0 ? (
        <div>
          {loadError ? (
            <>
              <p style={{ color: 'var(--error, #dc2626)', marginBottom: 12 }}>{loadError}</p>
              <button
                type="button"
                onClick={() => { setLoading(true); loadUsers() }}
                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Повторить
              </button>
            </>
          ) : search.trim() ? (
            <p style={{ color: 'var(--text-secondary)' }}>Ничего не найдено по запросу «{search}».</p>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Нет пользователей.</p>
          )}
        </div>
      ) : (
        <div className="data-list">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Имя</th>
                <th>Роль</th>
                <th>Статус</th>
                <th style={{ width: 120, minWidth: 120 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u: UserRow) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>{u.full_name}</td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td>
                    <span style={{ color: u.is_active ? 'var(--success)' : 'var(--text-muted)' }}>
                      {u.is_active ? 'Активен' : 'Отключён'}
                    </span>
                  </td>
                  <td style={{ width: 120, minWidth: 120, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    {(user?.role === 'super_admin' || roleFromToken === 'super_admin') && (
                    <button
                      onClick={() => impersonate(u)}
                      title="Войти как"
                      style={{ padding: 6, border: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer' }}
                    >
                      <LogIn size={16} />
                    </button>
                    )}
                    <button
                      onClick={() => openPermissions(u)}
                      title="Доступы"
                      style={{ padding: 6, border: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer' }}
                    >
                      <Shield size={16} />
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      title={u.is_active ? 'Отключить' : 'Включить'}
                      style={{ padding: 6, border: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <Ban size={16} />
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      title="Удалить"
                      style={{ padding: 6, border: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--error)', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'add' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              padding: '2rem',
              borderRadius: 12,
              maxWidth: 400,
              width: '100%',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '1.5rem' }}>Добавить пользователя</h2>
            <form onSubmit={addUser}>
              {error && <div style={{ color: 'var(--error)', marginBottom: 8 }}>{error}</div>}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Имя</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{ width: '100%', padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                  Создать
                </button>
                <button type="button" onClick={() => setModal(null)} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'permissions' && editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              padding: '2rem',
              borderRadius: 12,
              maxWidth: 400,
              width: '100%',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '0.5rem' }}>Доступы: {editingUser.email}</h2>
            {editingUser.role === 'admin' || editingUser.role === 'super_admin' || editingUser.role === 'trader' ? (
              <>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Администраторы имеют полный доступ к удалению и отключению номенклатуры и документов.
                </p>
                <button type="button" onClick={() => setModal(null)} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  Закрыть
                </button>
              </>
            ) : (
              <form onSubmit={savePermissions}>
                {PERMISSION_OPTIONS.map((s) => (
                  <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={permissions[s.key] ?? false}
                      onChange={(e) => setPermissions((p) => ({ ...p, [s.key]: e.target.checked }))}
                    />
                    {s.label}
                  </label>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: '1.5rem' }}>
                  <button type="submit" style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                    Сохранить
                  </button>
                  <button type="button" onClick={() => setModal(null)} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
