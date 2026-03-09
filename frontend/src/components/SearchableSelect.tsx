import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SearchableSelectOption {
  id: number | string
  name: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowEmpty?: boolean
  emptyLabel?: string
  className?: string
  style?: React.CSSProperties
  listMaxHeight?: number
  onSearchChange?: (query: string) => void
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Поиск в списке…',
  allowEmpty = true,
  emptyLabel = '— все —',
  className = '',
  style = {},
  listMaxHeight = 200,
  onSearchChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => String(o.id) === value)
  const displayValue = open ? query : (selected?.name ?? (allowEmpty && !value ? emptyLabel : ''))
  const filtered = options.filter(
    (o) => !query.trim() || o.name.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`searchable-select ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => {
          if (!open && selected) setQuery(selected.name)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter' && !open) setOpen(true)
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text)',
          fontSize: '0.9375rem',
          cursor: 'text',
        }}
      >
        <input
          type="text"
          value={displayValue}
          placeholder={!displayValue ? placeholder : undefined}
          onChange={(e) => {
            const v = e.target.value
            setQuery(v)
            onSearchChange?.(v)
            if (!open) setOpen(true)
          }}
          onFocus={() => {
            if (!open) {
              if (selected) setQuery(selected.name)
              setOpen(true)
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            fontSize: 'inherit',
            outline: 'none',
          }}
        />
        <ChevronDown
          size={18}
          style={{
            flexShrink: 0,
            color: 'var(--text-secondary)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </div>
      {open && (
        <ul
          role="listbox"
          className="searchable-select-list"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            margin: 0,
            marginTop: 4,
            padding: 4,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            maxHeight: listMaxHeight,
            overflowY: 'auto',
            listStyle: 'none',
            zIndex: 1000,
            boxShadow: 'var(--shadow)',
          }}
        >
          {allowEmpty && (
            <li
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange('')
                setQuery('')
                setOpen(false)
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.9375rem',
                color: 'var(--text-secondary)',
                background: !value ? 'var(--accent-muted)' : 'transparent',
              }}
            >
              {emptyLabel}
            </li>
          )}
          {filtered.map((opt) => (
            <li
              key={opt.id}
              role="option"
              aria-selected={String(opt.id) === value}
              onClick={() => {
                onChange(String(opt.id))
                setQuery('')
                setOpen(false)
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.9375rem',
                color: 'var(--text)',
                background: String(opt.id) === value ? 'var(--accent-muted)' : 'transparent',
              }}
            >
              {opt.name}
            </li>
          ))}
          {filtered.length === 0 && query.trim() && (
            <li style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Ничего не найдено
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
