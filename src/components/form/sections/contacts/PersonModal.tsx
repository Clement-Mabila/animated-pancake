'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { ALL_ROLES, CATEGORY_COLORS } from './data'
import type { Person, RoleDef } from './data'

interface PersonModalProps {
  person?:    Person | null
  allPersons: Person[]
  roles?:     RoleDef[]
  onSave:     (person: Person) => void
  onClose:    () => void
}

export default function PersonModal({ person, allPersons, roles, onSave, onClose }: PersonModalProps) {
  const effectiveRoles = roles ?? ALL_ROLES
  const categories = [...new Set(effectiveRoles.map(r => r.category))]
  const [name,          setName]          = useState(person?.name  ?? '')
  const [email,         setEmail]         = useState(person?.email ?? '')
  const [phone,         setPhone]         = useState(person?.phone ?? '')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(person?.roles ?? [])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Map of roleId → name of person already holding it (excluding the person being edited)
  const roleAssignments: Record<string, string> = {}
  allPersons.forEach(p => {
    if (p.id === person?.id) return
    p.roles.forEach(r => { roleAssignments[r] = p.name || 'someone' })
  })

  function toggleRole(roleId: string) {
    if (roleAssignments[roleId]) return
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId],
    )
  }

  function handleSave() {
    if (!name.trim() || !email.trim()) return
    onSave({
      id:    person?.id ?? crypto.randomUUID(),
      name:  name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      roles: selectedRoles,
    })
  }

  const isValid = name.trim() && email.trim()

  // ── Styles ─────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid rgba(146,140,227,0.2)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-family)',
    fontSize: '13px',
    padding: '9px 12px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    display: 'block', marginBottom: '5px',
  }

  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = '#928CE3'
      e.target.style.boxShadow   = '0 0 0 3px rgba(146,140,227,0.15)'
      e.target.style.background  = 'var(--bg-surface)'
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = 'rgba(146,140,227,0.2)'
      e.target.style.boxShadow   = 'none'
      e.target.style.background  = 'var(--bg-elevated)'
    },
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-surface)',
        border: 'var(--border-subtle)',
        borderRadius: '14px',
        width: '100%', maxWidth: '560px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: 'var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {person ? 'Edit person' : 'Add person'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Enter their details then select which roles they cover
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-elevated)', border: 'var(--border-subtle)',
              borderRadius: '6px', color: 'var(--text-muted)',
              width: '30px', height: '30px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>

          {/* Name + Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>
                Full name <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                type="text" placeholder="Jane Smith"
                value={name} onChange={e => setName(e.target.value)}
                style={inputStyle} {...focusHandlers}
              />
            </div>
            <div>
              <label style={labelStyle}>
                Email <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                type="email" placeholder="jane@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inputStyle} {...focusHandlers}
              />
            </div>
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '22px' }}>
            <label style={labelStyle}>Phone</label>
            <input
              type="tel" placeholder="+1 555 000 0000"
              value={phone} onChange={e => setPhone(e.target.value)}
              style={inputStyle} {...focusHandlers}
            />
          </div>

          {/* Role picker heading */}
          <div style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '14px',
          }}>
            Assign roles
          </div>

          {/* Roles by category */}
          {categories.map(cat => {
            const catRoles = effectiveRoles.filter(r => r.category === cat)
            const c        = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['Fleet-wide']
            return (
              <div key={cat} style={{ marginBottom: '18px' }}>
                <div style={{
                  fontSize: '10px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.10em',
                  color: c.color, marginBottom: '8px',
                }}>
                  {cat}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {catRoles.map(role => {
                    const isSelected = selectedRoles.includes(role.id)
                    const assignedTo = roleAssignments[role.id]
                    const isDisabled = !!assignedTo

                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleRole(role.id)}
                        disabled={isDisabled}
                        title={isDisabled ? `Assigned to ${assignedTo}` : undefined}
                        style={{
                          padding: '5px 11px', borderRadius: '20px',
                          fontSize: '11px', fontWeight: 600,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          border: isSelected
                            ? `1.5px solid ${c.color}`
                            : `1px solid ${c.border}`,
                          background: isSelected ? c.bg : 'transparent',
                          color: isSelected
                            ? c.color
                            : isDisabled
                            ? 'var(--text-muted)'
                            : 'var(--text-body)',
                          opacity: isDisabled ? 0.40 : 1,
                          transition: 'all 0.12s',
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                        }}
                      >
                        {/* Required indicator dot */}
                        {role.required && (
                          <span style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: isSelected ? c.color : '#F59E0B',
                            flexShrink: 0, display: 'inline-block',
                            transition: 'background 0.12s',
                          }} />
                        )}
                        {role.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Legend */}
          <div style={{
            fontSize: '11px', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px',
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: '#F59E0B', display: 'inline-block', flexShrink: 0,
            }} />
            Required role
            <span style={{ marginLeft: '6px', opacity: 0.5 }}>·</span>
            <span style={{ marginLeft: '2px', opacity: 0.7 }}>
              Greyed out = already assigned to someone else
            </span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '16px 24px',
          borderTop: 'var(--border-subtle)',
          display: 'flex', gap: '10px',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              background: 'transparent', border: 'var(--border-subtle)',
              color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            style={{
              flex: 2, padding: '10px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
              border: 'none', color: 'white',
              fontSize: '13px', fontWeight: 600,
              cursor: isValid ? 'pointer' : 'not-allowed',
              opacity: isValid ? 1 : 0.45,
              transition: 'opacity 0.15s',
            }}
          >
            {person ? 'Save changes' : 'Add person'} →
          </button>
        </div>
      </div>
    </div>
  )
}