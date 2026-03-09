import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ticket, Plus, MessageSquare, ArrowLeft, Paperclip, X } from 'lucide-react'

const MAX_FILE_MB = 10

type TicketItem = { id: number; subject: string; status: string; created_at: string; updated_at: string }
type Reply = { id: number; body: string; is_staff: boolean; created_at: string; attachments?: { id: number; filename: string; size_bytes: number }[] }
type Attachment = { id: number; filename: string; size_bytes: number }

const STATUS_LABELS: Record<string, string> = {
  open: 'Открыт',
  in_progress: 'В работе',
  resolved: 'Решён',
  closed: 'Закрыт',
}

export default function CabinetTickets() {
  const [searchParams, setSearchParams] = useSearchParams()
  const idFromUrl = parseInt(searchParams.get('id') || '', 10)
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(idFromUrl || null)
  const [detail, setDetail] = useState<{
    id: number
    subject: string
    body: string
    status: string
    replies: Reply[]
    attachments?: Attachment[]
  } | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const newFileInputRef = useRef<HTMLInputElement>(null)
  const replyFileInputRef = useRef<HTMLInputElement>(null)
  const token = localStorage.getItem('access_token')

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

  const fetchTickets = () => {
    if (!token) return
    fetch('/api/cabinet/tickets', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setTickets(d.items || []))
      .catch(() => setTickets([]))
  }

  useEffect(() => { fetchTickets() }, [])
  useEffect(() => { if (idFromUrl) setSelectedId(idFromUrl) }, [idFromUrl])

  useEffect(() => {
    if (!selectedId || !token) return
    fetch(`/api/cabinet/tickets/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDetail)
      .catch(() => setDetail(null))
  }, [selectedId, token])

  const createTicket = () => {
    if (!newSubject.trim() || !newBody.trim() || !token) return
    setCreating(true)
    const fd = new FormData()
    fd.append('subject', newSubject.trim())
    fd.append('body', newBody.trim())
    newFiles.forEach((f) => fd.append('files', f))
    fetch('/api/cabinet/tickets', {
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
          fetchTickets()
          setSelectedId(d.id)
          setSearchParams({ id: String(d.id) })
        }
      })
      .finally(() => setCreating(false))
  }

  const sendReply = () => {
    if (!selectedId || !replyText.trim() || !token) return
    setLoading(true)
    const fd = new FormData()
    fd.append('body', replyText.trim())
    replyFiles.forEach((f) => fd.append('files', f))
    fetch(`/api/cabinet/tickets/${selectedId}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setReplyText('')
          setReplyFiles([])
        }
      })
      .then(() => { if (selectedId) return fetch(`/api/cabinet/tickets/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then(setDetail) })
      .finally(() => setLoading(false))
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
            <h1 className="ds-h1">Тикеты</h1>
            <p className="ds-lead">Создавайте тикеты, получайте ответы, ведите историю обращений.</p>
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
                  <button key={a.id} type="button" onClick={() => downloadAttachment(`/api/cabinet/tickets/attachment/${a.id}`, a.filename)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }}>
                    <Paperclip size={14} />
                    {a.filename}
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              {detail.replies.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: 14,
                    marginBottom: 10,
                    background: r.is_staff ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)',
                    borderLeft: r.is_staff ? '4px solid var(--accent)' : '4px solid transparent',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{r.is_staff ? 'Поддержка' : 'Вы'} · {new Date(r.created_at).toLocaleString('ru')}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{r.body}</div>
                  {r.attachments && r.attachments.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {r.attachments.map((a) => (
                        <button key={a.id} type="button" onClick={() => downloadAttachment(`/api/cabinet/tickets/attachment/${a.id}`, a.filename)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>
                          <Paperclip size={12} />
                          {a.filename}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onPaste={(e) => handlePaste(e, setReplyFiles)}
                placeholder="Ваш ответ... (Ctrl+V — вставить скриншот)"
                rows={3}
                className="ds-input"
                style={{ resize: 'vertical' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input type="file" ref={replyFileInputRef} multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files, setReplyFiles)} />
                <button type="button" onClick={() => replyFileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
                  <Paperclip size={16} />
                  Файлы (до {MAX_FILE_MB} МБ)
                </button>
                {replyFiles.map((f, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 12 }}>
                    {f.name}
                    <button type="button" onClick={() => setReplyFiles((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
                <button type="button" className="btn-primary" onClick={sendReply} disabled={loading || !replyText.trim()} style={{ marginLeft: 'auto' }}>
                  {loading ? '…' : 'Отправить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="ds-card" style={{ marginBottom: 20 }}>
            <div className="ds-cardHeader">
              <div className="ds-cardTitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={20} />
                Новый тикет
              </div>
            </div>
            <div className="ds-cardBody">
              <input
                className="ds-input"
                placeholder="Тема"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <textarea
                className="ds-input"
                placeholder="Опишите проблему или вопрос... (Ctrl+V — вставить скриншот)"
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
              <button type="button" className="btn-primary" onClick={createTicket} disabled={creating || !newSubject.trim() || !newBody.trim()}>
                {creating ? '…' : 'Создать тикет'}
              </button>
            </div>
          </div>
          <div className="ds-card">
            <div className="ds-cardHeader">
              <div className="ds-cardTitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={20} />
                История тикетов
              </div>
            </div>
            <div className="ds-cardBody">
              {tickets.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Нет тикетов. Создайте первый выше.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setSelectedId(t.id); setSearchParams({ id: String(t.id) }) }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 14,
                        background: selectedId === t.id ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'inherit',
                      }}
                    >
                      <div>
                        <strong>{t.subject}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{STATUS_LABELS[t.status] || t.status} · {new Date(t.updated_at).toLocaleString('ru')}</div>
                      </div>
                      <Ticket size={20} style={{ color: 'var(--text-muted)' }} />
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
