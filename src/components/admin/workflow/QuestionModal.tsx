'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { upsertWorkflowQuestionAction } from '@/app/admin/actions/workflow'
import type { WorkflowQuestion, WorkflowQuestionOption, ConfigPhase, ContactPickerOption } from '@/types'

const PHASES: { value: ConfigPhase; label: string; color: string }[] = [
  { value: 'early',      label: 'Early Onboarding', color: 'text-amber-600  bg-amber-50  border-amber-200'  },
  { value: 'pre_deploy', label: 'Pre-Deploy',        color: 'text-blue-600   bg-blue-50   border-blue-200'   },
  { value: 'post',       label: 'Post-Deploy',       color: 'text-violet-600 bg-violet-50 border-violet-200' },
]

const FIELD_TYPES = ['text', 'textarea', 'select', 'multiselect', 'boolean', 'number', 'multi_entry', 'onboarding_document', 'checkpoint', 'orchestrator_user_selector', 'schedule_amend_selector', 'integration_block', 'contact_picker', 'fleet_robot_register'] as const

interface Props {
  templateId:  string
  sectionSlug: string
  question:    WorkflowQuestion | null  // null = add mode
  onClose:     () => void
  onSaved:     () => void
}

export default function QuestionModal({ templateId, sectionSlug, question, onClose, onSaved }: Props) {
  const [fieldKey,               setFieldKey]               = useState(question?.field_key               ?? '')
  const [label,                  setLabel]                  = useState(question?.label                   ?? '')
  const [placeholder,            setPlaceholder]            = useState(question?.placeholder             ?? '')
  const [fieldType,              setFieldType]              = useState(question?.field_type              ?? 'text')
  const [visibleInPhases,        setVisibleInPhases]        = useState<ConfigPhase[]>(question?.visible_in_phases ?? ['pre_deploy'])
  const [options,                setOptions]                = useState<WorkflowQuestionOption[]>(
    (fieldType !== 'contact_picker' ? question?.options : null) ?? []
  )
  const [roleOptions,            setRoleOptions]            = useState<ContactPickerOption[]>(
    fieldType === 'contact_picker' && sectionSlug === 'contacts' && question?.options
      ? (question.options as unknown as ContactPickerOption[])
      : []
  )
  const [isPartial,              setIsPartial]              = useState(question?.is_partial              ?? false)
  const [instructionPreDeploy,   setInstructionPreDeploy]   = useState(question?.instruction_pre_deploy  ?? '')
  const [instructionPostDeploy,  setInstructionPostDeploy]  = useState(question?.instruction_post_deploy ?? '')
  const [dummyValue,             setDummyValue]             = useState(question?.dummy_value             ?? '')
  const [dummyTooltip,           setDummyTooltip]           = useState(question?.dummy_tooltip           ?? '')
  const [active,                 setActive]                 = useState(question?.active                  ?? true)
  const [saving,                 setSaving]                 = useState(false)
  const [error,                  setError]                  = useState<string | null>(null)

  const needsOptions = fieldType === 'select' || fieldType === 'multiselect'

  const isAll = question?.field_key === '__all__'

  function togglePhase(phase: ConfigPhase) {
    setVisibleInPhases(prev =>
      prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (visibleInPhases.length === 0) { setError('Select at least one phase'); return }
    setSaving(true)
    setError(null)
    const resolvedOptions =
      fieldType === 'contact_picker'
        ? (sectionSlug === 'contacts' && roleOptions.length > 0 ? roleOptions : null)
        : (needsOptions && options.length > 0 ? options : null)

    const result = await upsertWorkflowQuestionAction({
      id:                    question?.id,
      templateId,
      sectionSlug,
      fieldKey:              isAll ? '__all__' : fieldKey,
      label:                 label       || null,
      placeholder:           placeholder || null,
      fieldType,
      visibleInPhases,
      options:               resolvedOptions as WorkflowQuestionOption[] | null,
      isPartial,
      instructionPreDeploy:  instructionPreDeploy  || null,
      instructionPostDeploy: instructionPostDeploy || null,
      dummyValue:            dummyValue            || null,
      dummyTooltip:          dummyTooltip          || null,
      active,
    })
    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <h2 className="text-sm font-semibold text-heading">
              {question ? (isAll ? 'Edit section visibility' : 'Edit question') : 'Add question'}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Section: <span className="font-mono">{sectionSlug}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-heading transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* field_key — locked for __all__ and edit mode */}
          {!isAll && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Field key {question && <span className="text-muted/60">(locked)</span>}
              </label>
              <input
                value={fieldKey}
                onChange={e => setFieldKey(e.target.value)}
                readOnly={!!question}
                required
                className={`w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${
                  question ? 'bg-elevated/50 text-muted cursor-not-allowed' : 'bg-elevated text-heading'
                }`}
                placeholder="e.g. kpi_targets"
              />
            </div>
          )}

          {!isAll && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Label</label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                placeholder="Human-readable field label"
              />
            </div>
          )}

          {!isAll && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Field type</label>
              <select
                value={fieldType}
                onChange={e => setFieldType(e.target.value)}
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {fieldType === 'checkpoint' && (
                <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 rounded px-2 py-1">
                  Checkpoint questions appear in the completion checklist at the bottom of the section.
                </p>
              )}
              {fieldType === 'integration_block' && (
                <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 rounded px-2 py-1">
                  Integration block options (description, color, fields, checkpoints) must be configured via Supabase SQL. Create the question here first, then seed the options JSON directly.
                </p>
              )}
              {fieldType === 'contact_picker' && sectionSlug === 'contacts' && (
                <p className="text-xs text-violet-600 mt-1.5 bg-violet-50 rounded px-2 py-1">
                  On the Contacts section, this type defines the role columns for the directory. Add each role below — they replace the default hardcoded role list.
                </p>
              )}
              {fieldType === 'contact_picker' && sectionSlug !== 'contacts' && (
                <p className="text-xs text-violet-600 mt-1.5 bg-violet-50 rounded px-2 py-1">
                  Outside Contacts, <span className="font-medium">contact picker</span> means a single person from the configuration directory (<code className="text-[11px]">config_persons</code>). Users can pick someone already added in Contacts or add a new person inline (no Orchestrator access change).
                </p>
              )}
            </div>
          )}

          {!isAll && (fieldType === 'text' || fieldType === 'textarea' || fieldType === 'number' || (fieldType === 'contact_picker' && sectionSlug !== 'contacts')) && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Placeholder text
                <span className="ml-1.5 text-muted/60 font-normal">shown inside the input</span>
              </label>
              <input
                value={placeholder}
                onChange={e => setPlaceholder(e.target.value)}
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                placeholder="e.g. e.g. 18 months"
              />
            </div>
          )}

          {/* Options editor — select / multiselect only */}
          {!isAll && needsOptions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-muted">Options</label>
                <button
                  type="button"
                  onClick={() => setOptions(prev => [...prev, { value: '', label: '' }])}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                >
                  <Plus size={12} /> Add option
                </button>
              </div>
              {options.length === 0 && (
                <p className="text-xs text-muted">No options yet — add at least one.</p>
              )}
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <input
                      value={opt.value}
                      onChange={e => setOptions(prev => prev.map((o, j) => j === i ? { ...o, value: e.target.value.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '') } : o))}
                      placeholder="value (snake_case)"
                      className="w-full rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs font-mono text-heading placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                    />
                    <input
                      value={opt.label}
                      onChange={e => setOptions(prev => prev.map((o, j) => j === i ? { ...o, label: e.target.value } : o))}
                      placeholder="Label (shown to user)"
                      className="w-full rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs text-heading placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                    />
                    <input
                      value={opt.hint ?? ''}
                      onChange={e => setOptions(prev => prev.map((o, j) => j === i ? { ...o, hint: e.target.value || null } : o))}
                      placeholder="Hint / badge (optional)"
                      className="w-full rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs text-muted placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}
                    className="mt-1 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Role editor — contact_picker on Contacts section only (defines role columns) */}
          {!isAll && fieldType === 'contact_picker' && sectionSlug === 'contacts' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-muted">Roles</label>
                <button
                  type="button"
                  onClick={() => setRoleOptions(prev => [...prev, { id: '', label: '', category: 'Fleet-wide', required: false }])}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                >
                  <Plus size={12} /> Add role
                </button>
              </div>
              {roleOptions.length === 0 && (
                <p className="text-xs text-muted">No roles defined — will fall back to the default hardcoded role list.</p>
              )}
              {roleOptions.map((role, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        value={role.id}
                        onChange={e => setRoleOptions(prev => prev.map((r, j) => j === i ? { ...r, id: e.target.value.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '') } : r))}
                        placeholder="id (snake_case)"
                        className="rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs font-mono text-heading placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                      />
                      <input
                        value={role.label}
                        onChange={e => setRoleOptions(prev => prev.map((r, j) => j === i ? { ...r, label: e.target.value } : r))}
                        placeholder="Label (e.g. Site Manager)"
                        className="rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs text-heading placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1 items-center">
                      <input
                        value={role.category}
                        onChange={e => setRoleOptions(prev => prev.map((r, j) => j === i ? { ...r, category: e.target.value } : r))}
                        placeholder="Category (e.g. Fleet-wide)"
                        className="rounded-md border border-border bg-elevated px-2.5 py-1.5 text-xs text-heading placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={role.required}
                          onChange={e => setRoleOptions(prev => prev.map((r, j) => j === i ? { ...r, required: e.target.checked } : r))}
                          className="rounded border-border"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoleOptions(prev => prev.filter((_, j) => j !== i))}
                    className="mt-1 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Phase visibility */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Visible in phases</label>
            <div className="flex flex-wrap gap-2">
              {PHASES.map(({ value, label: pLabel, color }) => {
                const checked = visibleInPhases.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => togglePhase(value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      checked ? color : 'text-muted bg-elevated border-border'
                    }`}
                  >
                    {pLabel}
                  </button>
                )
              })}
            </div>
            {visibleInPhases.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Select at least one phase</p>
            )}
          </div>

          {/* Partial question toggle — not available for __all__ */}
          {!isAll && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-heading">Partial question</p>
                  <p className="text-xs text-muted">Shows a dummy value pre-deploy, full answer post-deploy</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPartial(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPartial ? 'bg-violet-600' : 'bg-border'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isPartial ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {isPartial && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Instruction — Pre-Deploy</label>
                    <input
                      value={instructionPreDeploy}
                      onChange={e => setInstructionPreDeploy(e.target.value)}
                      className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      placeholder="e.g. Use industry benchmark dummy targets for now."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Instruction — Post-Deploy</label>
                    <input
                      value={instructionPostDeploy}
                      onChange={e => setInstructionPostDeploy(e.target.value)}
                      className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      placeholder="e.g. Refine using 2 weeks of live operational data."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Dummy value</label>
                      <input
                        value={dummyValue}
                        onChange={e => setDummyValue(e.target.value)}
                        className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none"
                        placeholder="Placeholder text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Dummy tooltip</label>
                      <input
                        value={dummyTooltip}
                        onChange={e => setDummyTooltip(e.target.value)}
                        className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none"
                        placeholder="Tooltip text"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-heading">Active</p>
              <p className="text-xs text-muted">Inactive questions are hidden in the onboarding form</p>
            </div>
            <button
              type="button"
              onClick={() => setActive(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                active ? 'bg-violet-600' : 'bg-border'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || visibleInPhases.length === 0}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : question ? 'Save changes' : 'Add question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
