'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, ChevronDown, CheckCircle2 } from 'lucide-react'
import {
  createDraftTemplateAction,
  duplicateTemplateAction,
  updateTemplateMetadataAction,
  startOnboardingForTemplateAction,
} from '@/app/admin/actions/workflow'
import LocationPicker from './LocationPicker'
import { getSubLocations, getClientContactsForLocation } from '@/lib/supabase/queries'
import { PRIMARY_ROLES, ROLE_DEFINITIONS, ROLE_SUB_LOCATION_TIER, PHASE_ORDER, PHASE_LABELS, PHASE_DESCRIPTIONS, PHASE_ITEM_COUNTS } from '@/lib/phases'
import type { WorkflowTemplate, ContactRoleLabel, ConfigPhase, ClientContact } from '@/types'

export const DEPARTMENTS = [
  { value: 'operations',        label: 'Operations' },
  { value: 'engineering',       label: 'Engineering' },
  { value: 'customer_success',  label: 'Customer Success' },
  { value: 'enterprise',        label: 'Enterprise' },
  { value: 'sales',             label: 'Sales' },
  { value: 'finance',           label: 'Finance' },
  { value: 'general',           label: 'General' },
]

export const TEMPLATE_COLORS = [
  '#F97316', // orange
  '#3B82F6', // blue
  '#14B8A6', // teal
  '#8B5CF6', // violet
  '#A52AE1', // purple
  '#22C55E', // green
  '#EF4444', // red
  '#F59E0B', // amber
  '#6366F1', // indigo
  '#EC4899', // pink
]

interface Props {
  mode:      'create' | 'edit' | 'duplicate'
  template?: WorkflowTemplate
  onClose:   () => void
  onSaved:   () => void
}

const MODE_CONFIG = {
  create:    { title: 'New Template',        subtitle: 'Starts with default onboarding questions',  btn: 'Create Draft'  },
  edit:      { title: 'Edit Template',       subtitle: 'Update name, department and display settings', btn: 'Save Changes' },
  duplicate: { title: 'Duplicate Template',  subtitle: null,                                         btn: 'Create Copy'   },
}

export default function TemplateMetadataModal({ mode, template, onClose, onSaved }: Props) {
  const config = MODE_CONFIG[mode]

  const [name,        setName]        = useState(
    mode === 'duplicate' ? `${template?.name ?? ''} (copy)` : (template?.name ?? '')
  )
  const [department,  setDepartment]  = useState(template?.department ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [version,     setVersion]     = useState(mode === 'edit' ? (template?.version ?? '') : '')
  const [color,       setColor]       = useState(template?.color ?? '#EF4444')
  const [fieldError,  setFieldError]  = useState<string | null>(null)
  const [pending,     startTransition] = useTransition()

  // Starting phase (shown only when location + role are both set)
  const [startingPhase, setStartingPhase] = useState<ConfigPhase>(
    (mode === 'edit' ? template?.starting_phase : null) ?? 'early'
  )

  // Location binding state
  const [locationBindingOpen, setLocationBindingOpen] = useState(
    mode === 'edit' && !!(template?.location_id)
  )
  const [locationId,          setLocationId]          = useState<string>(
    mode === 'edit' ? (template?.location_id ?? '') : ''
  )
  const [contactRole,         setContactRole]         = useState<ContactRoleLabel | ''>(
    mode === 'edit' ? (template?.contact_role ?? '') : ''
  )
  const [subLocationGroup,    setSubLocationGroup]    = useState<string[]>(
    mode === 'edit' ? (template?.sub_location_group ?? []) : []
  )
  const [availableSubLocations, setAvailableSubLocations] = useState<{ id: string; name: string }[]>([])

  // Client contact quick-start
  const [existingContacts,    setExistingContacts]    = useState<ClientContact[]>([])
  const [contactFetchDone,    setContactFetchDone]    = useState(false)
  const [selectedContactId,   setSelectedContactId]   = useState<string | null>(null)
  const [showNewContact,      setShowNewContact]      = useState(false)
  const [newContactName,      setNewContactName]      = useState('')
  const [newContactEmail,     setNewContactEmail]     = useState('')
  const [newContactSubLocId,  setNewContactSubLocId]  = useState('')

  // On edit mode with an existing location_id, load the sub-locations for the checkboxes once
  useEffect(() => {
    if (mode === 'edit' && template?.location_id) {
      getSubLocations(template.location_id).then(subs => {
        setAvailableSubLocations(subs.map(s => ({ id: s.id, name: s.name })))
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch existing contacts for this location+role whenever both change
  useEffect(() => {
    if (!locationId || !contactRole) {
      setExistingContacts([])
      setContactFetchDone(false)
      return
    }
    setContactFetchDone(false)
    getClientContactsForLocation(locationId).then(all => {
      setExistingContacts(all.filter(c => c.role_label === contactRole))
      setContactFetchDone(true)
    })
  }, [locationId, contactRole])

  async function handleSubmit() {
    if (!name.trim()) { setFieldError('Name is required'); return }
    setFieldError(null)

    const metadata = {
      name:               name.trim(),
      department:         department || null,
      description:        description.trim() || null,
      version:            version.trim() || null,
      color:              color || null,
      location_id:        locationId || null,
      contact_role:       contactRole || null,
      sub_location_group: subLocationGroup.length > 0 ? subLocationGroup : null,
      starting_phase:     (locationId && contactRole) ? startingPhase : null,
    }

    startTransition(async () => {
      let result: { ok: boolean; error?: string }

      if (mode === 'create') {
        result = await createDraftTemplateAction(metadata)
      } else if (mode === 'duplicate' && template) {
        result = await duplicateTemplateAction(template.id, metadata)
      } else if (mode === 'edit' && template) {
        result = await updateTemplateMetadataAction(template.id, metadata)
      } else {
        result = { ok: false, error: 'Invalid operation' }
      }

      if (!result.ok) { setFieldError(result.error ?? 'Something went wrong'); return }
      onSaved()
    })
  }

  async function handleSaveAndStart() {
    if (!name.trim()) { setFieldError('Name is required'); return }

    const useExisting = !!selectedContactId
    const useNew      = showNewContact && !!newContactName.trim() && !!newContactEmail.trim()

    if (!useExisting && !useNew) {
      setFieldError('Select an existing contact or fill in the new contact form')
      return
    }
    setFieldError(null)

    const metadata = {
      name:               name.trim(),
      department:         department || null,
      description:        description.trim() || null,
      version:            version.trim() || null,
      color:              color || null,
      location_id:        locationId || null,
      contact_role:       contactRole || null,
      sub_location_group: subLocationGroup.length > 0 ? subLocationGroup : null,
      starting_phase:     (locationId && contactRole) ? startingPhase : null,
    }

    startTransition(async () => {
      let tmplId: string | null = null

      if (mode === 'edit' && template) {
        const r = await updateTemplateMetadataAction(template.id, metadata)
        if (!r.ok) { setFieldError(r.error); return }
        tmplId = template.id
      } else if (mode === 'create') {
        const r = await createDraftTemplateAction(metadata)
        if (!r.ok) { setFieldError(r.error); return }
        tmplId = r.draft.id
      } else if (mode === 'duplicate' && template) {
        const r = await duplicateTemplateAction(template.id, metadata)
        if (!r.ok) { setFieldError(r.error); return }
        tmplId = r.draft.id
      }

      if (!tmplId) { setFieldError('Could not determine template ID'); return }

      let contactData: { fullName: string; email: string; subLocationId?: string }

      if (useExisting) {
        const c = existingContacts.find(x => x.id === selectedContactId)
        if (!c) { setFieldError('Selected contact not found'); return }
        contactData = { fullName: c.full_name, email: c.email, subLocationId: c.sub_location_id ?? undefined }
      } else {
        const tier = ROLE_SUB_LOCATION_TIER[contactRole as ContactRoleLabel]
        contactData = {
          fullName:      newContactName.trim(),
          email:         newContactEmail.trim(),
          subLocationId: tier === 'single_sub' ? newContactSubLocId || undefined : undefined,
        }
      }

      const startResult = await startOnboardingForTemplateAction(tmplId, contactData, startingPhase)
      if (!startResult.ok) { setFieldError(startResult.error); return }

      window.open(`/onboarding?config=${startResult.configId}`, '_blank')
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal shell — fixed width, capped height, flex column */}
      <div className="relative z-10 flex flex-col w-full max-w-[520px] max-h-[88vh] bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden">

        {/* ── Pinned header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <div>
              <h2 className="text-sm font-semibold text-heading">{config.title}</h2>
              <p className="text-xs text-muted mt-0.5">
                {mode === 'duplicate' && template
                  ? `Cloning "${template.name}"`
                  : config.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-elevated transition-colors shrink-0 ml-4"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Scrollable body (invisible scrollbar) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Enterprise Onboarding 2025"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-elevated text-sm text-heading placeholder-muted focus:outline-none focus:border-bright-violet/50 transition-colors"
              autoFocus
            />
          </div>

          {/* Department + Version row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-elevated text-sm text-heading focus:outline-none focus:border-bright-violet/50 transition-colors"
              >
                <option value="">Select…</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Version</label>
              <input
                type="text"
                value={version}
                onChange={e => setVersion(e.target.value)}
                placeholder="e.g. v1.0"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-elevated text-sm text-heading placeholder-muted focus:outline-none focus:border-bright-violet/50 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional — what is this template designed for?"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-elevated text-sm text-heading placeholder-muted focus:outline-none focus:border-bright-violet/50 transition-colors resize-none"
            />
          </div>

          {/* Color palette */}
          <div>
            <label className="text-xs font-medium text-muted mb-2 block">Card color</label>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-all duration-150 hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${c}` : undefined,
                    transform: color === c ? 'scale(1.18)' : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Location binding (collapsible) ── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setLocationBindingOpen(v => !v)}
              className="flex items-center justify-between w-full px-3.5 py-2.5 bg-elevated hover:bg-elevated/70 transition-colors"
            >
              <span className="text-xs font-medium text-muted">
                Location binding
                {locationId && <span className="ml-2 text-bright-violet">· bound</span>}
              </span>
              <ChevronDown
                size={13}
                className={`text-muted transition-transform duration-200 ${locationBindingOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {locationBindingOpen && (
              <div className="px-3.5 pb-4 pt-3 border-t border-border space-y-3">
                <LocationPicker
                  onLocationSet={async (locId) => {
                    setLocationId(locId)
                    setContactRole('')
                    setSubLocationGroup([])
                    if (locId) {
                      const subs = await getSubLocations(locId)
                      setAvailableSubLocations(subs.map(s => ({ id: s.id, name: s.name })))
                    } else {
                      setAvailableSubLocations([])
                    }
                  }}
                />

                {/* Contact role */}
                {locationId && (
                  <div>
                    <label className="text-xs font-medium text-muted mb-1.5 block">
                      Contact role <span className="font-normal">(optional)</span>
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {PRIMARY_ROLES.map(r => {
                        const def = ROLE_DEFINITIONS[r]
                        const isSelected = contactRole === r
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => { setContactRole(isSelected ? '' : r); setSubLocationGroup([]) }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '8px 10px', borderRadius: '8px', border: 'none',
                              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                              background: isSelected ? 'rgba(57,153,254,0.06)' : 'var(--bg-elevated)',
                              outline: isSelected ? '1.5px solid rgba(57,153,254,0.35)' : '1px solid rgba(146,140,227,0.18)',
                            }}
                          >
                            <div style={{
                              width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                              background: isSelected ? 'linear-gradient(135deg,#A52AE1,#3999FE)' : 'rgba(146,140,227,0.3)',
                            }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#3999FE' : 'var(--text-heading)', flex: 1 }}>
                              {def.label}
                            </span>
                            <span style={{
                              fontSize: '10px', padding: '1px 6px', borderRadius: '20px',
                              background: 'rgba(146,140,227,0.1)', color: 'var(--text-muted)', fontWeight: 500,
                            }}>
                              {def.scope}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-location group */}
                {locationId && contactRole && availableSubLocations.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted mb-1.5 block">
                      Sub-locations this role covers
                      <span className="font-normal ml-1">(all = leave unchecked)</span>
                    </label>
                    <div className="flex flex-col gap-1">
                      {availableSubLocations.map(sl => (
                        <label key={sl.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            checked={subLocationGroup.includes(sl.id)}
                            onChange={e => setSubLocationGroup(prev =>
                              e.target.checked ? [...prev, sl.id] : prev.filter(id => id !== sl.id)
                            )}
                            className="w-3.5 h-3.5 accent-bright-violet"
                          />
                          <span className="text-xs text-body-text">{sl.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Starting phase — shown once location + role are both set */}
                {locationId && contactRole && (
                  <div>
                    <label className="text-xs font-medium text-muted mb-1.5 block">
                      Starting phase
                      <span className="font-normal ml-1">— default phase for onboarding this contact</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {/* Deploy phase excluded — it is an internal MBody checklist, not a client-facing starting point */}
                      {(PHASE_ORDER.filter(p => p !== 'deploy') as ConfigPhase[]).map((p, idx) => {
                        const { count, unit } = PHASE_ITEM_COUNTS[p]
                        const isSel = startingPhase === p
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setStartingPhase(p)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '9px 11px', borderRadius: '8px', border: 'none',
                              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                              background: isSel ? 'rgba(57,153,254,0.06)' : 'var(--bg-elevated)',
                              outline: isSel ? '1.5px solid rgba(57,153,254,0.35)' : '1px solid rgba(146,140,227,0.18)',
                            }}
                          >
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '10px', fontWeight: 700,
                              background: isSel ? 'linear-gradient(135deg,#A52AE1,#3999FE)' : 'rgba(146,140,227,0.12)',
                              color: isSel ? 'white' : 'var(--text-muted)',
                            }}>
                              {idx + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: isSel ? '#3999FE' : 'var(--text-heading)', marginBottom: '1px' }}>
                                {PHASE_LABELS[p]}
                                <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)' }}>
                                  {count} {unit}
                                </span>
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                                {PHASE_DESCRIPTIONS[p]}
                              </div>
                            </div>
                            {isSel && <CheckCircle2 size={13} style={{ color: '#3999FE', flexShrink: 0 }} />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Client contact quick-start — shown when location + role are set */}
                {locationId && contactRole && (
                  <div>
                    <label className="text-xs font-medium text-muted mb-1.5 block">
                      Client contacts
                      {contactFetchDone && existingContacts.length > 0 && (
                        <span className="ml-1.5 font-normal text-muted">· {existingContacts.length} at this location</span>
                      )}
                    </label>

                    {!contactFetchDone && (
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Loading contacts…</p>
                    )}

                    {/* Selectable existing contacts */}
                    {contactFetchDone && existingContacts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        {existingContacts.map(c => {
                          const isSel     = selectedContactId === c.id
                          const tier      = ROLE_SUB_LOCATION_TIER[contactRole as ContactRoleLabel]
                          const subLocName = c.sub_location_id
                            ? availableSubLocations.find(s => s.id === c.sub_location_id)?.name
                            : null
                          const scopeLabel = subLocName
                            ?? (tier === 'fleet_wide' ? 'Fleet-wide' : tier === 'single_sub' ? 'Sub-location' : 'Location')
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedContactId(isSel ? null : c.id)
                                if (!isSel) { setShowNewContact(false); setNewContactName(''); setNewContactEmail('') }
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '9px',
                                padding: '8px 10px', borderRadius: '8px',
                                border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                background: isSel ? 'rgba(57,153,254,0.07)' : 'var(--bg-surface)',
                                outline: isSel ? '1.5px solid rgba(57,153,254,0.4)' : '1px solid rgba(146,140,227,0.15)',
                              }}
                            >
                              {/* Selection indicator */}
                              <div style={{
                                width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isSel ? 'linear-gradient(135deg,#A52AE1,#3999FE)' : 'rgba(146,140,227,0.15)',
                              }}>
                                {isSel && <CheckCircle2 size={10} style={{ color: 'white' }} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: isSel ? '#3999FE' : 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {c.full_name}
                                  <span style={{
                                    fontSize: '9px', fontWeight: 500, padding: '1px 5px', borderRadius: '20px',
                                    background: 'rgba(146,140,227,0.1)', color: 'var(--text-muted)',
                                  }}>
                                    {scopeLabel}
                                  </span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c.email}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* New contact form toggle */}
                    {!showNewContact ? (
                      <button
                        type="button"
                        onClick={() => { setShowNewContact(true); setSelectedContactId(null) }}
                        style={{
                          width: '100%', padding: '7px', borderRadius: '7px',
                          border: '1px dashed rgba(146,140,227,0.3)',
                          background: 'transparent', color: 'var(--text-muted)',
                          fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        + New contact
                      </button>
                    ) : (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        padding: '10px', borderRadius: '8px',
                        border: '1.5px solid rgba(57,153,254,0.3)',
                        background: 'rgba(57,153,254,0.04)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#3999FE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            New contact
                          </span>
                          <button
                            type="button"
                            onClick={() => { setShowNewContact(false); setNewContactName(''); setNewContactEmail(''); setNewContactSubLocId('') }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', lineHeight: 1 }}
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label className="text-xs font-medium text-muted mb-1 block">Full name *</label>
                            <input
                              type="text"
                              value={newContactName}
                              onChange={e => setNewContactName(e.target.value)}
                              placeholder="Contact name"
                              className="w-full px-3 py-2 rounded-lg border border-border bg-elevated text-sm text-heading placeholder-muted focus:outline-none focus:border-bright-violet/50 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted mb-1 block">Email *</label>
                            <input
                              type="email"
                              value={newContactEmail}
                              onChange={e => setNewContactEmail(e.target.value)}
                              placeholder="contact@client.com"
                              className="w-full px-3 py-2 rounded-lg border border-border bg-elevated text-sm text-heading placeholder-muted focus:outline-none focus:border-bright-violet/50 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Sub-location picker for single_sub tier roles */}
                        {ROLE_SUB_LOCATION_TIER[contactRole as ContactRoleLabel] === 'single_sub' && availableSubLocations.length > 0 && (
                          <div>
                            <label className="text-xs font-medium text-muted mb-1 block">Sub-location</label>
                            <select
                              value={newContactSubLocId}
                              onChange={e => setNewContactSubLocId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-elevated text-sm text-heading focus:outline-none focus:border-bright-violet/50 transition-colors"
                            >
                              <option value="">Select sub-location…</option>
                              {availableSubLocations.map(sl => (
                                <option key={sl.id} value={sl.id}>{sl.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* ── Pinned footer ── */}
        <div className="shrink-0 px-6 pt-3 pb-5 border-t border-border space-y-3">
          {fieldError && (
            <div className="px-3 py-2 rounded-xl border border-error/30 bg-error/10 text-xs text-error">
              {fieldError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm text-body-text hover:bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {pending ? 'Saving…' : config.btn}
            </button>
          </div>

          {/* Save & Start Onboarding — always shown when template has location + role binding */}
          {locationId && contactRole && (
            <button
              type="button"
              onClick={handleSaveAndStart}
              disabled={pending || (!selectedContactId && !(showNewContact && newContactName.trim() && newContactEmail.trim()))}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:cursor-not-allowed"
              style={(() => {
                const ready = !!selectedContactId || (showNewContact && !!newContactName.trim() && !!newContactEmail.trim())
                return {
                  background: ready ? 'linear-gradient(135deg,#A52AE1,#3999FE)' : 'rgba(146,140,227,0.12)',
                  color:      ready ? 'white' : 'var(--text-muted)',
                  opacity:    pending ? 0.5 : 1,
                }
              })()}
            >
              {pending ? 'Saving…' : selectedContactId
                ? `Save & Start Onboarding for ${existingContacts.find(c => c.id === selectedContactId)?.full_name ?? 'contact'} →`
                : 'Save & Start Onboarding →'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
