'use client'

import { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react'
import FormField from './shared/FormField'
import MultiEntryField from './shared/MultiEntryField'
import CheckpointList from './shared/CheckpointList'
import SectionDivider from './shared/SectionDivider'
import OrchestratorUserSelector from './sections/roles/OrchestratorUserSelector'
import ScheduleAmendSelector from './sections/roles/ScheduleAmendSelector'
import ConfigPersonPickerField from './shared/ConfigPersonPickerField'
import FleetRobotRegisterBlock from './sections/fleet/FleetRobotRegisterBlock'
import { parseModels } from './sections/fleet/parseModels'
import OnboardingDocumentCard from './documents/OnboardingDocumentCard'
import type { DocStatus } from './documents/OnboardingDocumentCard'
import {
  uploadOnboardingDocumentAction,
  removeOnboardingDocumentAction,
  getOnboardingDocumentSignedUrlAction,
} from '@/app/actions/onboardingDocuments'
import type { OnboardingDocumentUploadMeta } from '@/app/actions/onboardingDocuments'
import type { WorkflowQuestion, WorkflowQuestionOption, ConfigPhase } from '@/types'
import { Check, Loader2, ArrowRight } from "lucide-react";

interface DynamicSectionProps {
  sectionSlug:      string
  questions:        WorkflowQuestion[]
  phase:            ConfigPhase
  data:             Record<string, unknown>
  onSave:           (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?:      (data: Record<string, unknown>) => void
  isSaving?:        boolean
  isComplete?:      boolean
  industry?:        string | null
  description?:     string | null
  configurationId?: string
  locationId?:      string
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
  configurationId,
  locationId,
}: DynamicSectionProps) {
  type DocsBundle = {
    statuses: Record<string, DocStatus>
    notes: Record<string, string>
    uploads: Record<string, OnboardingDocumentUploadMeta | undefined>
  }
  const emptyDocs = (): DocsBundle => ({ statuses: {}, notes: {}, uploads: {} })

  const { checkpoints: initCheckpoints, ...initFields } = data as {
    checkpoints?: Record<string, boolean>
    statuses?: Record<string, DocStatus>
    notes?: Record<string, string>
    document_uploads?: Record<string, OnboardingDocumentUploadMeta | undefined>
    [key: string]: unknown
  }

  const [fields, setFields]   = useState<Record<string, unknown>>(() => {
    if (sectionSlug === 'docs') {
      const { statuses: _s, notes: _n, document_uploads: _u, ...rest } = initFields as Record<string, unknown>
      return rest ?? {}
    }
    return initFields ?? {}
  })
  const [checked, setChecked] = useState<Record<string, boolean>>(initCheckpoints ?? {})
  const [docsBundle, setDocsBundle] = useState<DocsBundle>(() => {
    if (sectionSlug !== 'docs') return emptyDocs()
    return {
      statuses: (initFields as { statuses?: Record<string, DocStatus> }).statuses ?? {},
      notes: (initFields as { notes?: Record<string, string> }).notes ?? {},
      uploads: (initFields as { document_uploads?: Record<string, OnboardingDocumentUploadMeta | undefined> }).document_uploads ?? {},
    }
  })
  const [docUploadingKey, setDocUploadingKey] = useState<string | null>(null)
  const [docUploadError, setDocUploadError] = useState<string | null>(null)

  const fieldsRef = useRef(fields)
  const checkedRef = useRef(checked)
  const docsBundleRef = useRef(docsBundle)
  useLayoutEffect(() => {
    fieldsRef.current = fields
    checkedRef.current = checked
    docsBundleRef.current = docsBundle
  }, [fields, checked, docsBundle])

  useEffect(() => {
    const d = (data ?? {}) as Record<string, unknown>
    const cp = d.checkpoints as Record<string, boolean> | undefined
    setChecked(cp ?? {})
    if (sectionSlug === 'docs') {
      const { checkpoints: _c, statuses, notes, document_uploads, ...rest } = d
      setFields((rest ?? {}) as Record<string, unknown>)
      setDocsBundle({
        statuses: (statuses as Record<string, DocStatus>) ?? {},
        notes: (notes as Record<string, string>) ?? {},
        uploads: (document_uploads as Record<string, OnboardingDocumentUploadMeta | undefined>) ?? {},
      })
    } else {
      const { checkpoints: _c2, ...rest } = d
      setFields((rest ?? {}) as Record<string, unknown>)
    }
  }, [data, sectionSlug])

  const templateContentKey = useMemo(
    () => questions.map(q => `${q.id}:${q.field_key}:${q.field_type}`).join('|'),
    [questions],
  )

  /** Drop saved keys that no longer exist on the template (fixes ghost doc cards / checklist state). */
  useEffect(() => {
    const docKeys = new Set(
      questions.filter(q => q.field_type === 'onboarding_document').map(q => q.field_key),
    )
    const ckKeys = new Set(
      questions.filter(q => q.field_type === 'checkpoint').map(q => q.field_key),
    )

    if (sectionSlug === 'docs') {
      setDocsBundle(prev => {
        const statuses: Record<string, DocStatus> = {}
        const notes: Record<string, string> = {}
        const uploads: Record<string, OnboardingDocumentUploadMeta | undefined> = {}
        for (const k of docKeys) {
          if (k in prev.statuses) statuses[k] = prev.statuses[k]!
          if (k in prev.notes) notes[k] = prev.notes[k]!
          if (k in prev.uploads) uploads[k] = prev.uploads[k]
        }
        const strayDoc =
          Object.keys(prev.statuses).some(k => !docKeys.has(k))
          || Object.keys(prev.notes).some(k => !docKeys.has(k))
          || Object.keys(prev.uploads).some(k => !docKeys.has(k))
        if (!strayDoc
          && Object.keys(statuses).length === Object.keys(prev.statuses).length
          && Object.keys(notes).length === Object.keys(prev.notes).length
          && Object.keys(uploads).length === Object.keys(prev.uploads).length) {
          return prev
        }
        return { statuses, notes, uploads }
      })
    }

    setChecked(prev => {
      const next: Record<string, boolean> = {}
      for (const k of Object.keys(prev)) {
        if (ckKeys.has(k)) next[k] = prev[k]!
      }
      const strayCk = Object.keys(prev).some(k => !ckKeys.has(k))
      if (!strayCk && Object.keys(next).length === Object.keys(prev).length) return prev
      return next
    })
  }, [templateContentKey, sectionSlug, questions, data])

  function mergeDocsInto(payload: Record<string, unknown>): Record<string, unknown> {
    if (sectionSlug !== 'docs') return payload
    const b = docsBundleRef.current
    return {
      ...payload,
      statuses: b.statuses,
      notes: b.notes,
      document_uploads: b.uploads,
    }
  }

  function getCurrentData(): Record<string, unknown> {
    return mergeDocsInto({ ...fields, checkpoints: checked })
  }

  function handleChange(key: string, value: unknown) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.(mergeDocsInto({ ...updated, checkpoints: checked }))
  }

  function handleCheckpointChange(id: string, value: boolean) {
    const updated = { ...checked, [id]: value }
    setChecked(updated)
    onAutoSave?.(mergeDocsInto({ ...fields, checkpoints: updated }))
  }

  function mergeFields(patch: Record<string, unknown>) {
    const updated = { ...fields, ...patch }
    setFields(updated)
    onAutoSave?.(mergeDocsInto({ ...updated, checkpoints: checked }))
  }

  const patchDocKey = useCallback((key: string, patch: { status?: DocStatus; note?: string; upload?: OnboardingDocumentUploadMeta | null }) => {
    setDocsBundle(prev => {
      const next: DocsBundle = {
        statuses: patch.status !== undefined ? { ...prev.statuses, [key]: patch.status } : prev.statuses,
        notes: patch.note !== undefined ? { ...prev.notes, [key]: patch.note } : prev.notes,
        uploads: patch.upload !== undefined
          ? { ...prev.uploads, [key]: patch.upload === null ? undefined : patch.upload }
          : prev.uploads,
      }
      queueMicrotask(() => {
        onAutoSave?.({
          ...fieldsRef.current,
          statuses: next.statuses,
          notes: next.notes,
          document_uploads: next.uploads,
          checkpoints: checkedRef.current,
        })
      })
      return next
    })
  }, [onAutoSave])

  const handleDocPick = useCallback(async (fieldKey: string, files: FileList | null) => {
    const file = files?.[0]
    if (!file || !configurationId) return
    setDocUploadError(null)
    setDocUploadingKey(fieldKey)
    try {
      const prev = docsBundleRef.current.uploads[fieldKey]?.path
      const fd = new FormData()
      fd.set('configurationId', configurationId)
      fd.set('docKey', fieldKey)
      if (prev) fd.set('previousStoragePath', prev)
      fd.set('file', file)
      const res = await uploadOnboardingDocumentAction(fd)
      if (!res.ok) {
        setDocUploadError(res.error)
        return
      }
      patchDocKey(fieldKey, { upload: res.meta })
    } finally {
      setDocUploadingKey(null)
    }
  }, [configurationId, patchDocKey])

  const handleDocRemove = useCallback(async (fieldKey: string) => {
    const meta = docsBundleRef.current.uploads[fieldKey]
    if (!meta?.path || !configurationId) return
    setDocUploadError(null)
    setDocUploadingKey(fieldKey)
    try {
      const r = await removeOnboardingDocumentAction({ configurationId, storagePath: meta.path })
      if (!r.ok) {
        setDocUploadError(r.error)
        return
      }
      patchDocKey(fieldKey, { upload: null })
    } finally {
      setDocUploadingKey(null)
    }
  }, [configurationId, patchDocKey])

  const handleDocDownload = useCallback(async (meta: OnboardingDocumentUploadMeta) => {
    if (!configurationId) return
    const res = await getOnboardingDocumentSignedUrlAction({
      configurationId,
      storagePath: meta.path,
      expiresIn: 120,
    })
    if (!res.ok) {
      setDocUploadError(res.error)
      return
    }
    window.open(res.url, '_blank', 'noopener,noreferrer')
  }, [configurationId])

  const visible      = questions.filter(q => q.active && q.field_key !== '__all__' && q.visible_in_phases.includes(phase))
  const regularQs    = [...visible.filter(q => q.field_type !== 'checkpoint')].sort((a, b) => a.sort_order - b.sort_order)
  const checkpointQs = [...visible.filter(q => q.field_type === 'checkpoint')].sort((a, b) => a.sort_order - b.sort_order)

  function renderField(q: WorkflowQuestion) {
    const rawVal = fields[q.field_key]
    const hint   = phase === 'post' ? q.instruction_post_deploy : q.instruction_pre_deploy

    if (q.is_partial && phase === 'pre_deploy' && q.field_type !== 'onboarding_document') {
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

      case 'multi_entry': {
        const entries = parseModels(rawVal)
        return (
          <MultiEntryField
            key={q.id}
            label={q.label ?? q.field_key}
            placeholder={q.placeholder ?? undefined}
            entries={entries}
            onChange={next => handleChange(q.field_key, JSON.stringify(next))}
            sectionId={sectionSlug}
            fieldKey={q.field_key}
            industry={industry}
          />
        )
      }

      case 'fleet_robot_register':
        return (
          <FleetRobotRegisterBlock
            key={q.id}
            label={q.label}
            hint={hint ?? null}
            locationId={locationId}
            industry={industry}
            robotCorrect={(fields.robot_correct as Record<string, boolean>) ?? {}}
            onPatch={mergeFields}
          />
        )

      case 'onboarding_document':
        return (
          <OnboardingDocumentCard
            key={q.id}
            question={q}
            phase={phase}
            fieldKey={q.field_key}
            status={docsBundle.statuses[q.field_key] ?? 'not_requested'}
            note={docsBundle.notes[q.field_key] ?? ''}
            upload={docsBundle.uploads[q.field_key]}
            uploadingKey={docUploadingKey}
            onPatch={patch => patchDocKey(q.field_key, patch)}
            onPickFile={handleDocPick}
            onRemoveFile={handleDocRemove}
            onDownload={handleDocDownload}
          />
        )

      case 'orchestrator_user_selector':
        if (!configurationId || !locationId) return null
        return (
          <OrchestratorUserSelector
            key={q.id}
            fieldKey={q.field_key}
            label={q.label}
            configurationId={configurationId}
            locationId={locationId}
            value={(rawVal as string[]) ?? []}
            onChange={v => handleChange(q.field_key, v)}
          />
        )

      case 'schedule_amend_selector':
        if (!configurationId || !locationId) return null
        return (
          <ScheduleAmendSelector
            key={q.id}
            fieldKey={q.field_key}
            label={q.label}
            configurationId={configurationId}
            locationId={locationId}
            value={(rawVal as string[]) ?? []}
            onChange={v => handleChange(q.field_key, v)}
          />
        )

      case 'contact_picker':
        // Contacts section uses ContactsSection for the role matrix; `contact_picker` elsewhere = one directory person (config_persons id).
        if (sectionSlug === 'contacts') return null
        if (!configurationId) return null
        return (
          <ConfigPersonPickerField
            key={q.id}
            label={q.label}
            hint={hint ?? null}
            placeholder={q.placeholder ?? null}
            configurationId={configurationId}
            locationId={locationId}
            value={String(rawVal ?? '')}
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

  const docFieldKeys = sectionSlug === 'docs'
    ? regularQs.filter(q => q.field_type === 'onboarding_document').map(q => q.field_key)
    : []
  const allDocsReceived = docFieldKeys.length > 0
    && docFieldKeys.every(k => docsBundle.statuses[k] === 'received')
  const docsMarkCompleteBlocked = sectionSlug === 'docs' && docFieldKeys.length > 0 && !allDocsReceived

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

      {sectionSlug === 'docs' && docFieldKeys.length > 0 && (() => {
        const received = docFieldKeys.filter(k => docsBundle.statuses[k] === 'received').length
        const total = docFieldKeys.length
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px', borderRadius: '8px', marginBottom: '20px',
            background: received === total ? 'rgba(34,197,94,0.07)' : 'rgba(245,124,0,0.06)',
            border: received === total ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(245,124,0,0.25)',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700,
              background: received === total ? 'rgba(34,197,94,0.15)' : 'rgba(245,124,0,0.15)',
              color: received === total ? '#16A34A' : '#E65100',
            }}>
              {received}/{total}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>
                {received === total
                  ? 'All listed documents marked received'
                  : `${total - received} document${total - received !== 1 ? 's' : ''} not marked received yet`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Mark each document &ldquo;Received&rdquo; when you are satisfied (upload and notes are optional).
              </div>
            </div>
          </div>
        )
      })()}

      {docUploadError && sectionSlug === 'docs' && (
        <p className="text-xs text-red-600 mb-3 px-1" role="alert">{docUploadError}</p>
      )}

      {regularQs.length === 0 && checkpointQs.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
          No questions configured for this phase.
        </p>
      )}

      {renderItems.map((item, i) => {
        const firstQ = item.type === 'solo' ? item.q : item.qs[0]
        const rowKey = item.type === 'solo' ? item.q.id : item.qs.map(q => q.id).join('-')
        const showDivider = firstQ.divider_before && !(i === 0 && description)
        return (
          <div key={rowKey}>
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
          className={`
            w-full
            py-2.5
            rounded-2xl
            text-sm
            font-semibold
            border
            border-slate-500
            text-heading
            bg-transparent
            transition-all
            mb-2
            flex
            items-center
            justify-center
            gap-2
            ${isSaving ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            "Save draft"
          )}
        </button>
      )}

      {/* Mark complete */}
      <button
        onClick={() => onSave(getCurrentData(), true)}
        disabled={isSaving || isComplete || docsMarkCompleteBlocked}
        title={docsMarkCompleteBlocked ? 'Mark every document as Received first' : undefined}
        className={`
          w-full
          py-3
          rounded-2xl
          font-semibold
          text-sm
          flex
          items-center
          justify-center
          gap-2
          transition-all
          ${isComplete
            ? `
              bg-blue-100
              border
              border-blue-300
              text-blue-600
              cursor-default
            `
            : docsMarkCompleteBlocked
              ? `
              bg-violet-300
              text-white
              cursor-not-allowed
            `
            : `
              bg-violet-500
              hover:bg-violet-700
              text-white
              shadow-md
              ${isSaving ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
            `
          }
        `}
      >
        {isSaving && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        )}

        {!isSaving && isComplete && (
          <>
            <Check className="h-4 w-4" />
            Section complete
          </>
        )}

        {!isSaving && !isComplete && docsMarkCompleteBlocked && (
          <>
            {docFieldKeys.filter(k => docsBundle.statuses[k] !== 'received').length} document
            {docFieldKeys.filter(k => docsBundle.statuses[k] !== 'received').length !== 1 ? 's' : ''} still not &ldquo;Received&rdquo;
          </>
        )}

        {!isSaving && !isComplete && !docsMarkCompleteBlocked && (
          <>
            Mark section complete
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

    </div>
  )
}
