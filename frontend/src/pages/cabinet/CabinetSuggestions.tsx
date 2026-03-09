import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lightbulb, Plus, ArrowLeft, Paperclip, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const MAX_FILE_MB = 10

type SuggestionItem = { id: number; subject: string; status: string; created_at: string }
type Update = { id: number; body: string; status_after: string | null; created_at: string; attachments?: { id: number; filename: string; size_bytes: number }[] }
type Attachment = { id: number; filename: string; size_bytes: number }

const STATUS_LABELS: Record<string, string> = {
  received: 'Получено',
  considering: 'На рассмотрении',
  thanked: 'Благодарим!',
  implemented: 'Реализовано',
  declined: 'Отклонено',
}

export default function CabinetSuggestions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const idFromUrl = parseInt(searchParams.get('id') || '', 10)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(idFromUrl || null)
  const [detail, setDetail] = useState<{
    id: number
    subject: string
    body: string
    status: string
    updates: Update[]
    attachments?: Attachment[]
  } | null>(null)
  const [creating, setCreating] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [adminUpdateBody, setAdminUpdateBody] = useState('')
  const [adminUpdateStatus, setAdminUpdateStatus] = useState('')
  const [adminUpdateFiles, setAdminUpdateFiles] = useState<File[]>([])
  const [addingUpdate, setAddingUpdate] = useState(false)
  const newFileInputRef = useRef<HTMLInputElement>(null)
  const adminFileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const token = localStorage.getItem('access_token')
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'trader'

  const addFiles = useCallback((files: FileList | null, setter: React.Dispatch<React.SetStateAction<File[]>>) => {
    if (!files?.length) return
    const toAdd: File[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        alert(`Файл «${f.name}» превышает ${MAX_FILE_MB} МБ`)
        continue
      }
      toAdd.push(f)
    }
    if (toAdd.length) setter((prev) => [...prev, ...toAdd])
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent, setter: React.Dispatch<React.SetStateAction<File[]>>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file && file.size <= MAX_FILE_MB * 1024 * 1024) {
          const ext = file.type.split('/')[1] || 'png'
          const f = new File([file], `screenshot_${Date.now()}.${ext}`, { type: file.type })
          setter((prev) => [...prev, f])
        } else if (file) {
          alert(`Скриншот превышает ${MAX_FILE_MB} МБ`)
        }
        break
      }
    }
  }, [])

  const downloadAttachment = useCallback(async (url: string, filename: string) => {
    if (!token) return
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) return
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {}
  }, [token])

  const fetchSuggestions = () => {
    if (!token) return
    fetch('/api/cabinet/suggestions', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setSuggestions(d.items || []))
      .catch(() => setSuggestions([]))
  }

  useEffect(() => { fetchSuggestions() }, [])
  useEffect(() => { if (idFromUrl) setSelectedId(idFromUrl) }, [idFromUrl])

  useEffect(() => {
    if (!selectedId || !token) return
    fetch(`/api/cabinet/suggestions/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDetail)
      .catch(() => setDetail(null))
  }, [selectedId, token])

  const createSuggestion = () => {
    if (!newSubject.trim() || !newBody.trim() || !token) return
    setCreating(true)
    const fd = new FormData()
    fd.append('subject', newSubject.trim())
    fd.append('body', newBody.trim())
    newFiles.forEach((f) => fd.append('files', f))
    fetch('/api/cabinet/suggestions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setNewSubject('')
          setNewBody('')
          setNewFiles([])
          fetchSuggestions()
          setSelectedId(d.id)
          setSearchParams({ id: String(d.id) })
        }
      })
      .finally(() => setCreating(false))
  }

  const addAdminUpdate = () => {
    if (!selectedId || !adminUpdateBody.trim() || !token) return
    setAddingUpdate(true)
    const fd = new FormData()
    fd.append('body', adminUpdateBody.trim())
    if (adminUpdateStatus) fd.append('status', adminUpdateStatus)
    adminUpdateFiles.forEach((f) => fd.append('files', f))
    fetch(`/api/cabinet/suggestions/${selectedId}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(() => {
        setAdminUpdateBody('')
        setAdminUpdateStatus('')
        setAdminUpdateFiles([])
      })
      .then(() => { if (selectedId) return fetch(`/api/cabinet/suggestions/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then(setDetail) })
      .finally(() => setAddingUpdate(false))
  }

  return (
    <div className="ds-page">
      <div className="ds-pageHeader">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {detail ? (
            <button type="button" onClick={() => { setDetail(null); setSelectedId(null); setSearchParams({}) }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <ArrowLeft size={20} />
              Назад
            </button>
          ) : null}
          <div>
            <h1 className="ds-h1">Предложить идею</h1>
            <p className="ds-lead">Предлагайте улучшения. Получайте уведомления о получении, рассмотрении и благодарности.</p>
          </div>
        </div>
      </div>

      {detail ? (
        <div className="ds-card">
          <div className="ds-cardHeader">
            <div className="ds-cardTitle">{detail.subject}</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{STATUS_LABELS[detail.status] || detail.status}</span>
          </div>
          <div className="ds-cardBody">
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 20 }}>{detail.body}</div>
            {detail.attachments && detail.attachments.length > 0 && (
              <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {detail.attachments.map((a) => (
                  <button key={a.id} type="button" onClick={() => downloadAttachment(`/api/cabinet/suggestions/attachment/${a.id}`, a.filename)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }}>
                    <Paperclip size={14} />
                    {a.filename}
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <div className="ds-label" style={{ marginBottom: 10 }}>Обновления</div>
              {detail.updates.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: 14,
                    marginBottom: 10,
                    background: 'rgba(34,197,94,0.08)',
                    borderLeft: '4px solid var(--success)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{new Date(u.created_at).toLocaleString('ru')}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{u.body}</div>
                  {u.attachments && u.attachments.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {u.attachments.map((a) => (
                        <button key={a.id} type="button" onClick={() => downloadAttachment(`/api/cabinet/suggestions/attachment/${a.id}`, a.filename)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>
                          <Paperclip size={12} />
                          {a.filename}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && (
              <div style={{ marginTop: 20, padding: 16, background: 'rgba(14,165,233,0.06)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div className="ds-label" style={{ marginBottom: 8 }}>Добавить обновление (от поддержки)</div>
                <textarea
                  value={adminUpdateBody}
                  onChange={(e) => setAdminUpdateBody(e.target.value)}
                  onPaste={(e) => handlePaste(e, setAdminUpdateFiles)}
                  placeholder="Например: На рассмотрении. Благодарим за предложение! (Ctrl+V — вставить скриншот)"
                  rows={2}
                  className="ds-input"
                  style={{ marginBottom: 8, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <input type="file" ref={adminFileInputRef} multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files, setAdminUpdateFiles)} />
                  <button type="button" onClick={() => adminFileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
                    <Paperclip size={16} />
                    Файлы (до {MAX_FILE_MB} МБ)
                  </button>
                  {adminUpdateFiles.map((f, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 12 }}>
                      {f.name}
                      <button type="button" onClick={() => setAdminUpdateFiles((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <select className="ds-select" value={adminUpdateStatus} onChange={(e) => setAdminUpdateStatus(e.target.value)} style={{ marginBottom: 8 }}>
                  <option value="">— статус —</option>
                  <option value="considering">На рассмотрении</option>
                  <option value="thanked">Благодарим!</option>
                  <option value="implemented">Реализовано</option>
                  <option value="declined">Отклонено</option>
                </select>
                <button type="button" className="btn-primary" onClick={addAdminUpdate} disabled={addingUpdate || !adminUpdateBody.trim()}>
                  {addingUpdate ? '…' : 'Отправить'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="ds-card" style={{ marginBottom: 20 }}>
            <div className="ds-cardHeader">
              <div className="ds-cardTitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={20} />
                Новое предложение
              </div>
            </div>
            <div className="ds-cardBody">
              <input
                className="ds-input"
                placeholder="Тема предложения"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <textarea
                className="ds-input"
                placeholder="Опишите идею по улучшению ikamdocs... (Ctrl+V — вставить скриншот)"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                onPaste={(e) => handlePaste(e, setNewFiles)}
                rows={4}
                style={{ marginBottom: 10, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <input type="file" ref={newFileInputRef} multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files, setNewFiles)} />
                <button type="button" onClick={() => newFileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
                  <Paperclip size={16} />
                  Файлы (до {MAX_FILE_MB} МБ)
                </button>
                {newFiles.map((f, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 12 }}>
                    {f.name}
                    <button type="button" onClick={() => setNewFiles((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <button type="button" className="btn-primary" onClick={createSuggestion} disabled={creating || !newSubject.trim() || !newBody.trim()}>
                {creating ? '…' : 'Отправить предложение'}
              </button>
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>Вы получите уведомление о получении и дальнейших статусах.</p>
            </div>
          </div>
          <div className="ds-card">
            <div className="ds-cardHeader">
              <div className="ds-cardTitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lightbulb size={20} />
                Ваши предложения
              </div>
            </div>
            <div className="ds-cardBody">
              {suggestions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Нет предложений. Создайте первое выше.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSelectedId(s.id); setSearchParams({ id: String(s.id) }) }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 14,
                        background: selectedId === s.id ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'inherit',
                      }}
                    >
                      <div>
                        <strong>{s.subject}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{STATUS_LABELS[s.status] || s.status} · {new Date(s.created_at).toLocaleString('ru')}</div>
                      </div>
                      <Lightbulb size={20} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
