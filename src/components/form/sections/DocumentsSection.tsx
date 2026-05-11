'use client'

import { useState, useEffect } from 'react'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'

interface DocumentsSectionProps {
  data?:        Record<string, unknown>
  onSave:       (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?:  (data: Record<string, unknown>) => void
  isSaving?:    boolean
  isComplete?:  boolean
  phase?:       string
  industry?:    string | null
}

type DocStatus = 'not_requested' | 'requested' | 'received'

const STATUS_OPTIONS: { value: DocStatus; label: string; color: string; bg: string; border: string }[] = [
  { value: 'not_requested', label: 'Not requested', color: 'var(--text-muted)',  bg: 'var(--bg-elevated)',         border: 'rgba(146,140,227,0.2)' },
  { value: 'requested',     label: 'Requested',     color: '#E65100',            bg: 'rgba(245,124,0,0.08)',       border: 'rgba(245,124,0,0.35)'  },
  { value: 'received',      label: 'Received ✓',    color: '#16A34A',            bg: 'rgba(34,197,94,0.08)',       border: 'rgba(34,197,94,0.35)'  },
]

const DOCUMENTS = [
  {
    key:      'facility_map',
    title:    'Facility map',
    priority: 'HIGH — Blocking',
    desc:     'Site floor plan with time-of-day restrictions per area, go / no-go zones, and access overlay. Source of truth for routing, scheduling, and zone design.',
    format:   'CAD file, PDF, or image — can be sketched if CAD is unavailable',
    why:      'Without this, robots cannot be correctly mapped, zones cannot be defined, and go / no-go rules cannot be enforced before Day 1.',
  },
  {
    key:      'org_chart',
    title:    'Org chart / reporting structure',
    priority: 'HIGH — Blocking',
    desc:     'Customer organisational chart showing reporting hierarchy across properties and roles.',
    format:   'PDF, image, or org chart export',
    why:      'Drives Orchestrator reporting access tiers, escalation chains, and alert routing. Without it, dashboards cannot be correctly filtered and P1 alerts cannot escalate correctly.',
  },
  {
    key:      'vendor_w9',
    title:    'Vendor W-9 / banking details',
    priority: 'HIGH — Blocking',
    desc:     'Completed W-9 tax form plus ACH banking details for invoice payment.',
    format:   'W-9 PDF + ACH / direct debit form',
    why:      'AR cannot invoice without these. Common deployment blocker — collect early as it often requires procurement approval on the customer side.',
  },
]

const CHECKPOINTS = [
  { id: 'facility_map_reviewed',   label: 'Facility map received, reviewed, and floor plans imported into Orchestrator' },
  { id: 'org_chart_mapped',        label: 'Org chart received and reporting hierarchy mapped in Orchestrator' },
  { id: 'vendor_w9_received',      label: 'Vendor W-9 and banking / ACH details received by MBody Finance' },
]

export default function DocumentsSection({
  data = {},
  onSave,
  onAutoSave,
  isSaving,
  isComplete,
}: DocumentsSectionProps) {
  const [statuses, setStatuses] = useState<Record<string, DocStatus>>(
    (data.statuses as Record<string, DocStatus>) ?? {}
  )
  const [notes, setNotes] = useState<Record<string, string>>(
    (data.notes as Record<string, string>) ?? {}
  )
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setStatuses((data.statuses as Record<string, DocStatus>) ?? {})
    setNotes((data.notes   as Record<string, string>)    ?? {})
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  function buildPayload(
    s: Record<string, DocStatus>,
    n: Record<string, string>,
    c: Record<string, boolean>,
  ): Record<string, unknown> {
    return { statuses: s, notes: n, checkpoints: c }
  }

  function setStatus(key: string, val: DocStatus) {
    const updated = { ...statuses, [key]: val }
    setStatuses(updated)
    onAutoSave?.(buildPayload(updated, notes, checked))
  }

  function setNote(key: string, val: string) {
    const updated = { ...notes, [key]: val }
    setNotes(updated)
    onAutoSave?.(buildPayload(statuses, updated, checked))
  }

  const receivedCount = DOCUMENTS.filter(d => statuses[d.key] === 'received').length

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '16px' }}>
        Three mandatory documents must be received before go-live. All are HIGH priority and
        blocking — track status and reference details for each below.
      </p>

      {/* Progress summary */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 14px', borderRadius: '8px', marginBottom: '20px',
        background: receivedCount === 3
          ? 'rgba(34,197,94,0.07)'
          : 'rgba(245,124,0,0.06)',
        border: receivedCount === 3
          ? '1px solid rgba(34,197,94,0.25)'
          : '1px solid rgba(245,124,0,0.25)',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700,
          background: receivedCount === 3
            ? 'rgba(34,197,94,0.15)'
            : 'rgba(245,124,0,0.15)',
          color: receivedCount === 3 ? '#16A34A' : '#E65100',
        }}>
          {receivedCount}/3
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>
            {receivedCount === 3
              ? 'All documents received — go-live unblocked'
              : `${3 - receivedCount} document${3 - receivedCount !== 1 ? 's' : ''} outstanding — go-live blocked`}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Update each document status below as items are received
          </div>
        </div>
      </div>

      {DOCUMENTS.map((doc, idx) => {
        const status      = statuses[doc.key] ?? 'not_requested'
        const statusMeta  = STATUS_OPTIONS.find(s => s.value === status)!
        const note        = notes[doc.key] ?? ''

        return (
          <div key={doc.key} style={{ marginBottom: idx < DOCUMENTS.length - 1 ? '12px' : '20px' }}>
            {/* Document card */}
            <div style={{
              borderRadius: '10px', overflow: 'hidden',
              border: status === 'received'
                ? '1px solid rgba(34,197,94,0.3)'
                : status === 'requested'
                ? '1px solid rgba(245,124,0,0.25)'
                : 'var(--border-subtle)',
              transition: 'border-color 0.2s',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: '12px', padding: '14px 16px',
                background: 'var(--bg-surface)',
                borderBottom: 'var(--border-subtle)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)' }}>
                      {doc.title}
                    </span>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em',
                      padding: '2px 7px', borderRadius: '10px', textTransform: 'uppercase',
                      background: 'rgba(239,68,68,0.1)', color: '#DC2626',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                      {doc.priority}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    {doc.desc}
                  </p>
                </div>

                {/* Status badge */}
                <div style={{
                  padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
                  fontSize: '11px', fontWeight: 600, flexShrink: 0,
                  color: statusMeta.color,
                  background: statusMeta.bg,
                  border: `1px solid ${statusMeta.border}`,
                }}>
                  {statusMeta.label}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)' }}>
                {/* Format hint */}
                <div style={{
                  fontSize: '11px', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'flex-start', gap: '6px',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--electric-blue)', flexShrink: 0 }}>
                    Format:
                  </span>
                  {doc.format}
                </div>

                {/* Why we need it */}
                <div style={{
                  fontSize: '11px', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'flex-start', gap: '6px',
                  marginBottom: '14px',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--soft-lavender)', flexShrink: 0 }}>
                    Why:
                  </span>
                  {doc.why}
                </div>

                {/* Status selector */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(doc.key, opt.value)}
                      style={{
                        fontSize: '11px', fontWeight: 600,
                        padding: '5px 12px', borderRadius: '20px',
                        cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: 'var(--font-family)',
                        color:      status === opt.value ? opt.color      : 'var(--text-muted)',
                        background: status === opt.value ? opt.bg         : 'var(--bg-surface)',
                        border:     status === opt.value
                          ? `1.5px solid ${opt.border}`
                          : '1.5px solid rgba(146,140,227,0.15)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Reference / notes */}
                <textarea
                  rows={2}
                  placeholder="Reference link, storage location, or notes (e.g. 'Received 02 May, filed in SharePoint /onboarding/...')"
                  value={note}
                  onChange={e => setNote(doc.key, e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--bg-surface)',
                    border: '1px solid rgba(146,140,227,0.2)',
                    borderRadius: '6px', padding: '8px 10px',
                    fontSize: '12px', color: 'var(--text-primary)',
                    fontFamily: 'var(--font-family)', lineHeight: 1.5,
                    resize: 'vertical', outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}

      <SectionDivider label="Completion checkpoints" />

      <CheckpointList
        checkpoints={CHECKPOINTS}
        checked={checked}
        onChange={(id, value) => {
          const updated = { ...checked, [id]: value }
          setChecked(updated)
          onAutoSave?.(buildPayload(statuses, notes, updated))
        }}
      />

      <button
        onClick={() => onSave(buildPayload(statuses, notes, checked), false)}
        disabled={isSaving}
        style={{
          width: '100%', padding: '10px', borderRadius: '8px',
          fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em',
          textTransform: 'uppercase', background: 'transparent',
          border: 'var(--border-subtle)', color: 'var(--text-muted)',
          cursor: isSaving ? 'not-allowed' : 'pointer', marginBottom: '8px',
        }}
      >
        {isSaving ? 'Saving...' : 'Save draft'}
      </button>

      <button
        onClick={() => onSave(buildPayload(statuses, notes, checked), true)}
        disabled={isSaving || receivedCount < 3}
        title={receivedCount < 3 ? 'Mark all 3 documents as Received before completing' : undefined}
        style={{
          width: '100%', padding: '12px', borderRadius: '8px',
          fontSize: '13px', fontWeight: 600, color: 'white',
          background: receivedCount === 3 && !isSaving
            ? 'linear-gradient(135deg, #A52AE1, #3999FE)'
            : 'rgba(146,140,227,0.2)',
          border: 'none',
          cursor: isSaving || receivedCount < 3 ? 'not-allowed' : 'pointer',
          opacity: isSaving ? 0.7 : 1,
          boxShadow: receivedCount === 3 ? '0 2px 12px rgba(0,129,255,0.25)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        {isSaving
          ? 'Saving...'
          : receivedCount < 3
          ? `${3 - receivedCount} document${3 - receivedCount !== 1 ? 's' : ''} still outstanding`
          : 'Save & mark complete →'}
      </button>
    </div>
  )
}
