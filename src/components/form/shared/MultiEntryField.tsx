'use client'

import { useRef, useState } from 'react'
import FormField from '@/components/form/shared/FormField'

interface MultiEntryFieldProps {
  label: string
  placeholder?: string
  entries: string[]
  onChange: (entries: string[]) => void
  sectionId: string
  fieldKey: string
  industry?: string | null
}

export default function MultiEntryField({
  label,
  placeholder,
  entries,
  onChange,
  sectionId,
  fieldKey,
  industry,
}: MultiEntryFieldProps) {
  const [inputText, setInputText] = useState('')
  // Tracks whether the most recent onChange was driven by a keystroke.
  // When a suggestion is clicked (mousedown on portal), no keydown fires on
  // our wrapper — so isTypingRef is false → we know to auto-commit.
  const isTypingRef = useRef(false)

  function commit(raw: string) {
    const trimmed = raw.trim().replace(/,+$/, '').trim()
    if (!trimmed || entries.includes(trimmed)) {
      setInputText('')
      return
    }
    onChange([...entries, trimmed])
    setInputText('')
  }

  function handleChange(value: string) {
    // Comma-terminated → user typed a comma separator
    if (value.endsWith(',')) {
      commit(value)
      return
    }
    setInputText(value)
    // onChange fired without a preceding keydown on our wrapper
    // → must be a suggestion click → auto-commit
    if (!isTypingRef.current && value.length > 0) {
      commit(value)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Mark this onChange cycle as keyboard-driven
    isTypingRef.current = true
    setTimeout(() => { isTypingRef.current = false }, 0)

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      commit(inputText)
      return
    }
    if (e.key === 'Backspace' && inputText === '' && entries.length > 0) {
      onChange(entries.slice(0, -1))
    }
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index))
  }

  return (
    <div>
      {/* Committed pills */}
      {entries.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '8px',
          }}
        >
          {entries.map((entry, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px 3px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.01em',
                background: 'rgba(146,140,227,0.12)',
                border: '1px solid rgba(146,140,227,0.28)',
                color: 'var(--soft-lavender)',
                lineHeight: 1.6,
              }}
            >
              {entry}
              <button
                onClick={() => removeEntry(i)}
                title="Remove"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'rgba(146,140,227,0.20)',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--soft-lavender)',
                  fontSize: '11px',
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(146,140,227,0.20)')}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Text input — suggestion engine only ever sees the current inputText */}
      <div onKeyDown={handleKeyDown}>
        <FormField
          label={label}
          placeholder={entries.length === 0 ? placeholder : 'Add another model...'}
          value={inputText}
          onChange={handleChange}
          sectionId={sectionId}
          fieldKey={fieldKey}
          industry={industry}
        />
      </div>

      {/* Hint — only shown once at least one pill exists */}
      {entries.length > 0 && (
        <p
          style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            marginTop: '-6px',
            marginBottom: '4px',
            letterSpacing: '0.02em',
          }}
        >
          Enter · Tab · , to add &nbsp;·&nbsp; Backspace to remove last
        </p>
      )}
    </div>
  )
}