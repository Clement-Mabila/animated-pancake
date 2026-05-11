'use client'

import { useState } from 'react'
import FormField from './shared/FormField'
import CheckpointList from './shared/CheckpointList'
import SectionDivider from './shared/SectionDivider'
import type { WorkflowQuestion, WorkflowQuestionOption, ConfigPhase } from '@/types'

interface DynamicSectionProps {
  sectionSlug:  string
  questions:    WorkflowQuestion[]
  phase:        ConfigPhase
  data:         Record<string, unknown>
  onSave:       (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?:  (data: Record<string, unknown>) => void
  isSaving?:    boolean
  isComplete?:  boolean
  industry?:    string | null
  description?: string | null
}

function MultiSelectField({
  label, options, value, hint, onChange,
}: {
  label:    string
  options:  WorkflowQuestionOption[]
  value:    Record<string, boolean>
  hint?:    string | null
  onChange: (v: Record<string, boolean>) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-label)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const selected = !!value[opt.value]
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...value, [opt.value]: !selected })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={selected
                ? { background: 'linear-gradient(135deg, #A52AE1, #3999FE)', color: 'white', borderColor: 'transparent' }
                : { color: 'var(--text-muted)', borderColor: 'rgba(146,140,227,0.2)', background: 'var(--bg-elevated)' }
              }
            >
              {opt.label}
              {opt.hint && (
                <span
                  className="text-[10px] px-1 py-0.5 rounded"
                  style={selected
                    ? { background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }
                    : { background: 'var(--bg-surface)', color: 'var(--text-muted)' }
                  }
                >
                  {opt.hint}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {hint && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{hint}</p>}
    </div>
  )
}

function BooleanField({
  label, value, hint, onChange,
}: {
  label:    string
  value:    boolean
  hint?:    string | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          value ? 'bg-violet-600' : 'bg-border'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}

export default function DynamicSection({
  sectionSlug,
  questions,
  phase,
  data,
  onSave,
  onAutoSave,
  isSaving,
  isComplete,
  industry,
  description,
}: DynamicSectionProps) {
  const { checkpoints: initCheckpoints, ...initFields } = data as {
    checkpoints?: Record<string, boolean>
    [key: string]: unknown
  }

  const [fields, setFields]   = useState<Record<string, unknown>>(initFields ?? {})
  const [checked, setChecked] = useState<Record<string, boolean>>(initCheckpoints ?? {})

  function getCurrentData(): Record<string, unknown> {
    return { ...fields, checkpoints: checked }
  }

  function handleChange(key: string, value: unknown) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.({ ...updated, checkpoints: checked })
  }

  function handleCheckpointChange(id: string, value: boolean) {
    const updated = { ...checked, [id]: value }
    setChecked(updated)
    onAutoSave?.({ ...fields, checkpoints: updated })
  }

  const visible      = questions.filter(q => q.active && q.field_key !== '__all__' && q.visible_in_phases.includes(phase))
  const regularQs    = [...visible.filter(q => q.field_type !== 'checkpoint')].sort((a, b) => a.sort_order - b.sort_order)
  const checkpointQs = [...visible.filter(q => q.field_type === 'checkpoint')].sort((a, b) => a.sort_order - b.sort_order)

  function renderField(q: WorkflowQuestion) {
    const rawVal = fields[q.field_key]
    const hint   = phase === 'post' ? q.instruction_post_deploy : q.instruction_pre_deploy

    if (q.is_partial && phase === 'pre_deploy') {
      return (
        <div key={q.id} className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-label)' }}>
            {q.label ?? q.field_key}
          </p>
          <div
            className="w-full rounded-lg px-3 py-2 text-sm cursor-not-allowed select-none"
            style={{ border: '1px solid rgba(146,140,227,0.15)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', opacity: 0.6 }}
            title={q.dummy_tooltip ?? undefined}
          >
            {q.dummy_value ?? '—'}
          </div>
          {q.instruction_pre_deploy && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{q.instruction_pre_deploy}</p>
          )}
        </div>
      )
    }

    switch (q.field_type) {
      case 'text':
      case 'textarea':
      case 'select':
      case 'number':
        return (
          <FormField
            key={q.id}
            label={q.label ?? q.field_key}
            type={q.field_type as 'text' | 'textarea' | 'select' | 'number'}
            placeholder={q.placeholder ?? undefined}
            defaultValue={q.dummy_value ?? undefined}
            value={String(rawVal ?? '')}
            onChange={v => handleChange(q.field_key, v)}
            options={q.options?.map(o => ({ value: o.value, label: o.label })) ?? undefined}
            hint={hint ?? undefined}
            sectionId={sectionSlug}
            fieldKey={q.field_key}
            industry={industry}
          />
        )

      case 'boolean':
        return (
          <BooleanField
            key={q.id}
            label={q.label ?? q.field_key}
            value={!!rawVal}
            hint={hint}
            onChange={v => handleChange(q.field_key, v)}
          />
        )

      case 'multiselect':
        return (
          <MultiSelectField
            key={q.id}
            label={q.label ?? q.field_key}
            options={(q.options as WorkflowQuestionOption[]) ?? []}
            value={(rawVal ?? {}) as Record<string, boolean>}
            hint={hint}
            onChange={v => handleChange(q.field_key, v)}
          />
        )

      default:
        return null
    }
  }

  // Build render items: group questions with the same display_group into grid rows
  type RenderItem =
    | { type: 'solo';  q:  WorkflowQuestion }
    | { type: 'group'; qs: WorkflowQuestion[] }

  const renderItems: RenderItem[] = []
  const seenGroups = new Set<string>()

  for (const q of regularQs) {
    if (!q.display_group) {
      renderItems.push({ type: 'solo', q })
    } else if (!seenGroups.has(q.display_group)) {
      seenGroups.add(q.display_group)
      renderItems.push({ type: 'group', qs: regularQs.filter(x => x.display_group === q.display_group) })
    }
  }

  return (
    <div>

      {description && (
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          padding: '14px 0 16px',
          borderBottom: '1px solid rgba(165,42,225,0.10)',
          marginBottom: '16px',
        }}>
          {description}
        </p>
      )}

      {regularQs.length === 0 && checkpointQs.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
          No questions configured for this phase.
        </p>
      )}

      {renderItems.map((item, i) => {
        const firstQ = item.type === 'solo' ? item.q : item.qs[0]
        const showDivider = firstQ.divider_before && !(i === 0 && description)
        return (
          <div key={i}>
            {showDivider && <SectionDivider label={firstQ.divider_before!} />}
            {item.type === 'solo'
              ? renderField(item.q)
              : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${item.qs.length}, 1fr)`,
                  gap: '12px',
                }}>
                  {item.qs.map(q => renderField(q))}
                </div>
              )
            }
          </div>
        )
      })}

      {checkpointQs.length > 0 && (
        <CheckpointList
          checkpoints={checkpointQs.map(q => ({ id: q.field_key, label: q.label ?? q.field_key }))}
          checked={checked}
          onChange={handleCheckpointChange}
        />
      )}

      {/* Save draft */}
      {!isComplete && (
        <button
          onClick={() => onSave(getCurrentData(), false)}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            background: 'transparent',
            border: 'var(--border-subtle)',
            color: 'var(--text-muted)',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            marginBottom: '8px',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-family)',
          }}
        >
          {isSaving ? 'Saving...' : 'Save draft'}
        </button>
      )}

      {/* Mark complete */}
      <button
        onClick={() => onSave(getCurrentData(), true)}
        disabled={isSaving || isComplete}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'var(--font-family)',
          transition: 'all 0.2s',
          ...(isComplete
            ? {
                background: 'rgba(0,129,255,0.08)',
                border: '1px solid rgba(0,129,255,0.25)',
                color: 'var(--electric-blue)',
                cursor: 'default',
              }
            : {
                background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
                border: 'none',
                color: 'white',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: '0 2px 12px rgba(0,129,255,0.25)',
              }
          ),
        }}
      >
        {isSaving ? 'Saving...' : isComplete ? '✓ Section complete' : 'Mark section complete →'}
      </button>

    </div>
  )
}
