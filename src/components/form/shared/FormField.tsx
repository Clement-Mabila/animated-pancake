'use client'

import { useRef, useEffect, useState, useId } from 'react'
import { createPortal } from 'react-dom'
import { useSuggestions } from '@/hooks/useSuggestions'
import SuggestionDropdown from './SuggestionDropdown'
import FieldDefaultBadge from './FieldDefaultBadge'
import { saveSuggestionAction } from '@/app/actions/session'
import { getFixedSuggestionDropdownStyle } from '@/components/form/shared/suggestionPortalLayout'

interface FormFieldProps {
  label:         string
  type?:         'text' | 'textarea' | 'select' | 'email' | 'tel' | 'number'
  placeholder?:  string
  defaultValue?: string
  value?:        string
  onChange?:     (value: string) => void
  rows?:         number
  options?:      { value: string; label: string }[]
  hint?:         string
  required?:     boolean
  // suggestion props — both required to activate
  sectionId?:    string
  fieldKey?:     string
  industry?:     string | null
}

export default function FormField({
  label,
  type = 'text',
  placeholder,
  defaultValue,
  value = '',
  onChange,
  rows = 3,
  options = [],
  hint,
  required = false,
  sectionId,
  fieldKey,
  industry,
}: FormFieldProps) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<React.CSSProperties>({})
  const [mounted,     setMounted]     = useState(false)
  const listboxId = useId()

  const suggestions = useSuggestions(sectionId, fieldKey, industry)

  // track client mount for portal
  useEffect(() => { setMounted(true) }, [])

  // recalculate dropdown position on open or window resize/scroll
  useEffect(() => {
    if (!suggestions.open) return

    function updatePos() {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setDropdownPos(getFixedSuggestionDropdownStyle(rect))
    }

    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [suggestions.open])

  // ── Derived state ──────────────────────────────────────────────────────────
  const filtered        = suggestions.filter(value)
  const pageSuggestions = suggestions.getPage(filtered)
  const showDropdown    = suggestions.open && (pageSuggestions.length > 0 || suggestions.loading)

  // ── Styles ─────────────────────────────────────────────────────────────────
  const hasDefault = !!defaultValue
  // When the badge icon is present, push content right so text doesn't overlap it
  const paddingLeft = hasDefault ? '28px' : '12px'

  const baseStyle: React.CSSProperties = {
    width:        '100%',
    background:   'var(--bg-elevated)',
    border:       '1px solid rgba(146, 140, 227, 0.2)',
    borderRadius: 'var(--radius-md)',
    color:        'var(--text-primary)',
    fontFamily:   'var(--font-family)',
    fontSize:     '13px',
    padding:      `9px 12px 9px ${paddingLeft}`,
    outline:      'none',
    transition:   'border-color 0.15s, box-shadow 0.15s',
    resize:       'vertical',
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleChange(v: string) {
    suggestions.resetPage()
    onChange?.(v)
  }

  function handleFocus(e: React.FocusEvent<HTMLElement>) {
    const el = e.target as HTMLElement
    el.style.borderColor = '#928CE3'
    el.style.boxShadow   = '0 0 0 3px rgba(146, 140, 227, 0.15)'
    el.style.background  = 'var(--bg-surface)'
    suggestions.onFocus()
  }

  function handleBlur(e: React.FocusEvent<HTMLElement>) {
    const el = e.target as HTMLElement
    el.style.borderColor = 'rgba(146, 140, 227, 0.2)'
    el.style.boxShadow   = 'none'
    el.style.background  = 'var(--bg-elevated)'
    suggestions.onClose()

    // save on blur + optimistic update
    if (sectionId && fieldKey) {
      const v = (e.target as HTMLInputElement | HTMLTextAreaElement).value
      if (v.trim().length >= 3) {
        suggestions.addOptimistic(v.trim(), industry)
        saveSuggestionAction(sectionId, fieldKey, v.trim(), industry ?? null).catch(() => {})
      }
    }
  }

  function handleSelect(v: string) {
    onChange?.(v)
    suggestions.onClose()
    if (sectionId && fieldKey) {
      suggestions.addOptimistic(v.trim(), industry)
      saveSuggestionAction(sectionId, fieldKey, v.trim(), industry ?? null).catch(() => {})
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    suggestions.handleKey(e, pageSuggestions, handleSelect)
  }

  // ── Shared input props ─────────────────────────────────────────────────────
  const sharedProps = {
    style:        baseStyle,
    onFocus:      handleFocus,
    onBlur:       handleBlur,
    onKeyDown:    handleKeyDown,
    // ARIA
    role:         suggestions.enabled ? ('combobox' as const) : undefined,
    'aria-expanded':     suggestions.enabled ? showDropdown : undefined,
    'aria-autocomplete': suggestions.enabled ? ('list'      as const) : undefined,
    'aria-controls':     suggestions.enabled && showDropdown ? listboxId : undefined,
    'aria-activedescendant':
      suggestions.enabled && suggestions.activeIndex >= 0
        ? `suggestion-${suggestions.activeIndex}`
        : undefined,
  }

  return (
    <div ref={containerRef} className="mb-3">
      <label
        className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-label)' }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>
        )}
      </label>

      {type === 'textarea' ? (
        <div style={{ position: 'relative' }}>
          {hasDefault && <FieldDefaultBadge value={defaultValue!} forArea />}
          <textarea
            placeholder={placeholder}
            value={value}
            rows={rows}
            onChange={e => handleChange(e.target.value)}
            {...sharedProps}
          />
        </div>
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={e => handleChange(e.target.value)}
          style={baseStyle}
          onFocus={handleFocus}
          onBlur={e => {
            const el = e.target as HTMLElement
            el.style.borderColor = 'rgba(146, 140, 227, 0.2)'
            el.style.boxShadow   = 'none'
            el.style.background  = 'var(--bg-elevated)'
          }}
        >
          <option value="">Select...</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ position: 'relative' }}>
          {hasDefault && <FieldDefaultBadge value={defaultValue!} />}
          <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={e => handleChange(e.target.value)}
            {...sharedProps}
          />
        </div>
      )}

      {hint && (
        <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {hint}
        </p>
      )}

      {mounted && showDropdown &&
        createPortal(
          <SuggestionDropdown
            id={listboxId}
            suggestions={pageSuggestions}
            hasMore={suggestions.hasMore(filtered)}
            loading={suggestions.loading}
            style={dropdownPos}
            activeIndex={suggestions.activeIndex}
            onSelect={handleSelect}
            onShowMore={suggestions.showMore}
          />,
          document.body,
        )
      }
    </div>
  )
}
