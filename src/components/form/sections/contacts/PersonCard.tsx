'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { ALL_ROLES, CATEGORY_COLORS } from './data'
import type { Person } from './data'

interface PersonCardProps {
  person:   Person
  onEdit:   () => void
  onRemove: () => void
}

export default function PersonCard({ person, onEdit, onRemove }: PersonCardProps) {
  const assignedRoles = ALL_ROLES.filter(r => person.roles.includes(r.id))

  return (
    <div style={{
      border: 'var(--border-subtle)',
      borderRadius: '10px',
      padding: '14px 16px',
      background: 'var(--bg-elevated)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>

      {/* ── Top row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>

        {/* Gradient avatar — initials only, no emoji */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, color: 'white',
          flexShrink: 0, userSelect: 'none',
        }}>
          {person.name.trim().charAt(0).toUpperCase() || '?'}
        </div>

        {/* Name + contact details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {person.name || (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No name</span>
            )}
          </div>
          <div style={{
            fontSize: '11px', color: 'var(--text-muted)',
            marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap',
          }}>
            {person.email && <span>{person.email}</span>}
            {person.phone && <span style={{ opacity: 0.75 }}>{person.phone}</span>}
          </div>
        </div>

        {/* Edit / Remove */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={onEdit}
            title="Edit person"
            style={{
              padding: '5px 10px', borderRadius: '6px',
              background: 'transparent', border: 'var(--border-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer', transition: 'border-color 0.15s',
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 600,
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(146,140,227,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
          >
            <Pencil size={11} strokeWidth={2} />
            Edit
          </button>
          <button
            onClick={onRemove}
            title="Remove person"
            style={{
              padding: '5px 8px', borderRadius: '6px',
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.22)',
              color: 'rgba(239,68,68,0.65)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
              e.currentTarget.style.color = 'rgba(239,68,68,0.9)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.22)'
              e.currentTarget.style.color = 'rgba(239,68,68,0.65)'
            }}
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Role pills ── */}
      {assignedRoles.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {assignedRoles.map(role => {
            const c = CATEGORY_COLORS[role.category] ?? CATEGORY_COLORS['Fleet-wide']
            return (
              <span
                key={role.id}
                style={{
                  padding: '3px 9px', borderRadius: '20px',
                  fontSize: '10px', fontWeight: 600,
                  background: c.bg, color: c.color,
                  border: `1px solid ${c.border}`,
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}
              >
                {role.required && (
                  <span style={{
                    width: '4px', height: '4px', borderRadius: '50%',
                    background: c.color, display: 'inline-block', flexShrink: 0,
                  }} />
                )}
                {role.label}
              </span>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No roles assigned — click Edit to assign roles
        </div>
      )}
    </div>
  )
}