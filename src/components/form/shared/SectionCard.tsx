'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import type { ConfigPhase } from '@/types'

const PHASE_PILL: Record<ConfigPhase, { label: string; bg: string; border: string; color: string }> = {
  early:      { label: 'Early Onboarding', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)',  color: '#D97706' },
  pre_deploy: { label: 'Pre-Deploy',  bg: 'rgba(57,153,254,0.08)',  border: 'rgba(57,153,254,0.3)',  color: '#3999FE' },
  deploy:     { label: 'Deploy',      bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.3)',  color: '#059669' },
  post:       { label: 'Post-Deploy', bg: 'rgba(165,42,225,0.08)', border: 'rgba(165,42,225,0.3)', color: '#A52AE1' },
}

interface SectionCardProps {
  id: string
  number: number
  title: string
  subtitle: string
  checkpointCount?: number
  isComplete?: boolean
  defaultOpen?: boolean
  open?: boolean
  onToggle?: () => void
  phasePills?: ConfigPhase[]
  children: React.ReactNode
}

export default function SectionCard({
  id,
  number,
  title,
  subtitle,
  checkpointCount,
  isComplete = false,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  phasePills,
  children,
}: SectionCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)

  useEffect(() => {
    if (controlledOpen === undefined && defaultOpen) setInternalOpen(true)
  }, [defaultOpen, controlledOpen])

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen

  function handleToggle() {
    if (onToggle) {
      onToggle()
    } else {
      setInternalOpen(o => !o)
    }
  }

  return (
    <div
      id={`sec-${id}`}
      style={{
        background: 'var(--bg-surface)',
        border: open
          ? 'var(--border-active)'
          : isComplete
          ? '1px solid rgba(0,129,255,0.28)'
          : 'var(--border-subtle)',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: open
          ? '0 4px 24px rgba(165,42,225,0.10)'
          : isComplete
          ? '0 2px 12px rgba(0,129,255,0.06)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        marginBottom: '0',
      }}
    >
      {/* ── Header ── */}
      <button
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(165,42,225,0.025)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        {/* Number bubble */}
        <div style={{
          width: '32px', height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 600,
          flexShrink: 0,
          transition: 'all 0.3s',
          ...(isComplete
            ? {
                background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
                color: 'white',
                border: 'none',
              }
            : open
            ? {
                background: 'rgba(0,129,255,0.06)',
                color: 'var(--electric-blue)',
                border: '1.5px solid var(--electric-blue)',
              }
            : {
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                border: '1.5px solid rgba(146,140,227,0.2)',
              }
          ),
        }}>
          {isComplete ? (
            <Check size={15} strokeWidth={2.5} aria-hidden />
          ) : (
            number
          )}
        </div>

        {/* Title block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '1px',
          }}>
            {subtitle}
          </div>
        </div>

        {/* Checkpoint badge */}
        {checkpointCount !== undefined && (
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            padding: '3px 9px',
            borderRadius: '20px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            ...(isComplete
              ? {
                  background: 'rgba(0,129,255,0.08)',
                  border: '1px solid rgba(0,129,255,0.25)',
                  color: 'var(--electric-blue)',
                }
              : {
                  background: 'var(--bg-elevated)',
                  border: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }
            ),
          }}>
            {isComplete ? 'Complete' : `${checkpointCount} checkpoints`}
          </span>
        )}

        {/* Phase pills — only shown in "show all sections" mode; one pill per phase */}
        {phasePills && phasePills.map(phase => {
          const p = PHASE_PILL[phase]
          return (
            <span key={phase} style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: '20px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              background: p.bg,
              border: `1px solid ${p.border}`,
              color: p.color,
            }}>
              {p.label}
            </span>
          )
        })}

        {/* Chevron */}
        <svg
          width="16" height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s',
            color: 'var(--text-muted)',
          }}
        >
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* ── Body ── */}
      {open && (
        <div style={{
          padding: '0 24px 28px',
          borderTop: 'var(--border-subtle)',
        }}>
          <div style={{ paddingTop: '20px' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}