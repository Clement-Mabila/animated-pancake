'use client'

import { useState, useEffect } from 'react'
import FormField from '@/components/form/shared/FormField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'

import type { ConfigPhase, WorkflowQuestion, IntegrationBlockOptions } from '@/types'
import { ArrowRight, Loader2 } from 'lucide-react'

interface IntegrationsSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  industry?: string | null
  phase?: ConfigPhase
  questions?: WorkflowQuestion[]
}

type IntegrationStatus = 'not-required' | 'required' | 'in-scope'

const STATUS_OPTIONS: { val: IntegrationStatus; label: string; bg: string; color: string; border: string }[] = [
  {
    val:    'required',
    label:  'Required',
    bg:     'rgba(0,129,255,0.08)',
    color:  'var(--electric-blue)',
    border: '1px solid rgba(0,129,255,0.35)',
  },
  {
    val:    'in-scope',
    label:  'In scope — TBC',
    bg:     'rgba(245,124,0,0.08)',
    color:  '#E65100',
    border: '1px solid rgba(245,124,0,0.35)',
  },
  {
    val:    'not-required',
    label:  'Not required',
    bg:     'var(--bg-elevated)',
    color:  'var(--text-muted)',
    border: '1px solid rgba(146,140,227,0.2)',
  },
]

export default function IntegrationsSection({
  data = {},
  onSave,
  onAutoSave,
  isSaving,
  phase,
  questions = [],
}: IntegrationsSectionProps) {
  // ── Derive integration blocks from questions ────────────────────────────────
  const integrationBlocks = questions
    .filter(q => q.field_type === 'integration_block' && q.active)
    .sort((a, b) => a.sort_order - b.sort_order)

  // ── Derive overall checkpoints from questions ───────────────────────────────
  const overallCheckpoints = questions
    .filter(q => q.field_type === 'checkpoint' && q.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(q => ({ id: q.field_key, label: q.label ?? q.field_key }))

  const isPost = phase === 'post'

  // ── State ───────────────────────────────────────────────────────────────────
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>(
    (data.statuses as Record<string, IntegrationStatus>) ?? {}
  )
  const [intFields, setIntFields] = useState<Record<string, Record<string, string>>>(
    (data.int_fields as Record<string, Record<string, string>>) ?? {}
  )
  const [intChecked, setIntChecked] = useState<Record<string, Record<string, boolean>>>(
    (data.int_checked as Record<string, Record<string, boolean>>) ?? {}
  )
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setStatuses((data.statuses as Record<string, IntegrationStatus>) ?? {})
    setIntFields((data.int_fields as Record<string, Record<string, string>>) ?? {})
    setIntChecked((data.int_checked as Record<string, Record<string, boolean>>) ?? {})
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  // ── Handlers ────────────────────────────────────────────────────────────────
  function setStatus(fieldKey: string, status: IntegrationStatus) {
    const updated = { ...statuses, [fieldKey]: status }
    setStatuses(updated)
    onAutoSave?.({ statuses: updated, int_fields: intFields, int_checked: intChecked, checkpoints: checked })
  }

  function setIntField(fieldKey: string, subKey: string, value: string) {
    const updated = { ...intFields, [fieldKey]: { ...(intFields[fieldKey] ?? {}), [subKey]: value } }
    setIntFields(updated)
    onAutoSave?.({ statuses, int_fields: updated, int_checked: intChecked, checkpoints: checked })
  }

  function toggleIntCheck(fieldKey: string, checkKey: string, value: boolean) {
    const updated = { ...intChecked, [fieldKey]: { ...(intChecked[fieldKey] ?? {}), [checkKey]: value } }
    setIntChecked(updated)
    onAutoSave?.({ statuses, int_fields: intFields, int_checked: updated, checkpoints: checked })
  }

  function handleSave(isComplete: boolean) {
    onSave({ statuses, int_fields: intFields, int_checked: intChecked, checkpoints: checked }, isComplete)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Document every third-party system Orchestrator needs to connect with — authentication,
        task management, facilities, and any other client-requested platforms.
      </p>

      {integrationBlocks.length === 0 ? (
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          background: 'var(--bg-elevated)',
          border: '1px solid rgba(146,140,227,0.2)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            No integrations configured
          </p>
        </div>
      ) : (
        integrationBlocks.map(question => {
          const opts = question.options as unknown as IntegrationBlockOptions
          const fieldKey = question.field_key
          const status = statuses[fieldKey] ?? 'not-required'
          const isActive = status !== 'not-required'

          return (
            <div
              key={question.id}
              style={{
                border: `1px solid rgba(146,140,227,0.2)`,
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                marginBottom: '10px',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Integration header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderBottom: isActive ? '1px solid rgba(146,140,227,0.12)' : 'none',
                background: 'var(--bg-surface)',
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  color: opts?.color ?? 'var(--text-muted)',
                  background: opts?.bg ?? 'var(--bg-elevated)',
                  border: `1px solid ${opts?.border ?? 'rgba(146,140,227,0.2)'}`,
                }}>
                  {question.label}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-body)', flex: 1 }}>
                  {opts?.description ?? ''}
                </span>
              </div>

              {/* Status buttons */}
              <div style={{ padding: '12px 14px 4px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                }}>
                  Integration required?
                </label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.map(btn => {
                    const isSelected = status === btn.val
                    return (
                      <button
                        key={btn.val}
                        onClick={() => setStatus(fieldKey, btn.val)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.03em',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-family)',
                          transition: 'all 0.15s',
                          background: isSelected ? btn.bg : 'var(--bg-surface)',
                          border: isSelected ? btn.border : '1.5px solid rgba(146,140,227,0.2)',
                          color: isSelected ? btn.color : 'var(--text-muted)',
                        }}
                      >
                        {btn.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Integration body */}
              {isActive && (
                <div style={{ padding: '0 14px 14px' }}>
                  {isPost ? (
                    <>
                      {(opts?.fields ?? []).map(f => (
                        f.type === 'textarea' ? (
                          <FormField
                            key={f.key}
                            label={f.label}
                            type="textarea"
                            rows={2}
                            value={intFields[fieldKey]?.[f.key] ?? ''}
                            onChange={v => setIntField(fieldKey, f.key, v)}
                          />
                        ) : f.type === 'select' ? (
                          <FormField
                            key={f.key}
                            label={f.label}
                            type="select"
                            options={(f.options ?? []).map(o => ({ value: o, label: o }))}
                            value={intFields[fieldKey]?.[f.key] ?? ''}
                            onChange={v => setIntField(fieldKey, f.key, v)}
                          />
                        ) : (
                          <FormField
                            key={f.key}
                            label={f.label}
                            value={intFields[fieldKey]?.[f.key] ?? ''}
                            onChange={v => setIntField(fieldKey, f.key, v)}
                          />
                        )
                      ))}

                      {(opts?.checkpoints ?? []).length > 0 && (
                        <CheckpointList
                          label="Integration checkpoints"
                          checkpoints={(opts.checkpoints).map(cp => ({ id: cp.key, label: cp.label }))}
                          checked={intChecked[fieldKey] ?? {}}
                          onChange={(id, value) => toggleIntCheck(fieldKey, id, value)}
                        />
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '10px 2px 4px' }}>
                      <p style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        margin: 0,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(57,153,254,0.05)',
                        border: '1px solid rgba(57,153,254,0.18)',
                      }}>
                        <span style={{ fontWeight: 600, color: 'var(--electric-blue)' }}>Scoped for Post-Deploy: </span>
                        Full configuration details (credentials, endpoints, mappings) are collected
                        in the Post-Deployment phase. Marking this as Required ensures it is prioritised.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {overallCheckpoints.length > 0 && (
        <>
          <SectionDivider label="Overall sign-off" />

          <CheckpointList
            label="Overall integration sign-off"
            checkpoints={overallCheckpoints}
            checked={checked}
            onChange={(id, value) => {
              const updated = { ...checked, [id]: value }
              setChecked(updated)
              onAutoSave?.({ statuses, int_fields: intFields, int_checked: intChecked, checkpoints: updated })
            }}
          />
        </>
      )}

      {/* Save actions */}
      <div className="flex flex-col">

        {/* Save draft */}
        <button
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className={`
            w-full
            py-2.5
            rounded-2xl
            text-sm
            font-semibold
            tracking-wide
            uppercase
            border
            border-slate-500
            text-slate-300
            bg-transparent
            transition-all
            mb-2
            flex
            items-center
            justify-center
            gap-2
            ${isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'}
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            'Save draft'
          )}
        </button>

        {/* Save & mark complete */}
        <button
          onClick={() => handleSave(true)}
          disabled={isSaving}
          className={`
            w-full
            py-3
            rounded-2xl
            text-sm
            font-semibold
            flex
            items-center
            justify-center
            gap-2
            transition-all
            text-white
            shadow-md
            bg-violet-500
            hover:bg-violet-700
            ${isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save & mark complete
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

      </div>
    </div>
  )
}
