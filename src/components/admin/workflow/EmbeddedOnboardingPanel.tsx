'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, Circle, Clock, Lock, CirclePlus, ArrowRight, Info, Check, ChevronUp, ChevronDown } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import DynamicSection from '@/components/form/DynamicSection'
import FleetSection from '@/components/form/sections/FleetSection'
import ContactsSection from '@/components/form/sections/ContactsSection'
import IntegrationsSection from '@/components/form/sections/IntegrationsSection'
import LocationPicker from './LocationPicker'
import {
  PRIMARY_ROLES, ROLE_DEFINITIONS, ROLE_SUB_LOCATION_TIER,
  PHASE_ORDER, PHASE_LABELS, PHASE_DESCRIPTIONS, PHASE_ITEM_COUNTS,
  getPhaseDisplayStatus, getNextPhase, getPreviousPhase,
} from '@/lib/phases'
import { getConfigurationsForTemplate, getSubLocations, getClientContactsForLocation } from '@/lib/supabase/queries'
import { startOnboardingForTemplateAction } from '@/app/admin/actions/workflow'
import type {
  WorkflowQuestion, WorkflowSection,
  ConfigPhase, SectionId, StaffIdentity, ContactRoleLabel,
  ConfigurationWithRelations, ClientContact,
} from '@/types'

// ── Shared styles ─────────────────────────────────────────────

const inputClass =
  'w-full bg-surface border border-border rounded-2xl text-heading text-sm px-3 py-2 outline-none focus:border-bright-violet/50 transition-colors duration-150'

const labelClass =
  'block text-sm font-medium text-muted mb-1.5'

// ── Types ─────────────────────────────────────────────────────

interface Props {
  templateId:     string
  questions:      WorkflowQuestion[]
  sections:       WorkflowSection[]
  locationId?:    string
  contactRole?:   string
  startingPhase?: ConfigPhase | null
}

// ── Sub-component: phase selector (shared) ────────────────────

function PhaseSelector({
  value,
  onChange,
}: {
  value: ConfigPhase
  onChange: (p: ConfigPhase) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {(PHASE_ORDER.filter(p => p !== "deploy") as ConfigPhase[]).map(p => {
        const { count, unit } = PHASE_ITEM_COUNTS[p]
        const isSel = value === p

        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`
              flex items-center gap-2.5
              px-3 py-2.5
              rounded-lg
              cursor-pointer text-left transition-all
              border

              ${isSel
                ? "bg-violet-50 border-violet-300"
                : "bg-elevated border-violet-200"
              }
            `}
          >
            {/* Circle count */}
            <div
              className={`
                w-7 h-7
                rounded-full
                flex items-center justify-center
                text-xs font-bold
                flex-shrink-0

                ${isSel
                  ? "bg-violet-500 text-white"
                  : "bg-violet-100 text-violet-700"
                }
              `}
            >
              {count}
            </div>

            {/* Text */}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-violet-900">
                {PHASE_LABELS[p]}
              </span>

              <span className="text-xs text-violet-500">
                {PHASE_DESCRIPTIONS[p]}
              </span>

              <span className="text-xs text-violet-500">
                {count} {unit}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Sub-component: phase timeline (resume cards) ──────────────

function MiniPhaseTimeline({ config }: { config: ConfigurationWithRelations }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '6px' }}>
      {PHASE_ORDER.map((phase, idx) => {
        const status = getPhaseDisplayStatus(config, phase)
        return (
          <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {idx > 0 && (
              <div style={{
                width: '12px', height: '1px',
                background: status === 'not_started' ? 'rgba(146,140,227,0.2)' : '#928CE3',
              }} />
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '2px',
              padding: '2px 6px', borderRadius: '20px', fontSize: '9px', fontWeight: 600,
              background: status === 'complete'
                ? 'rgba(146,140,227,0.15)'
                : status === 'active' ? 'rgba(146,140,227,0.08)' : 'var(--bg-elevated)',
              border: status === 'active'
                ? '1px solid rgba(146,140,227,0.4)'
                : status === 'complete' ? '1px solid rgba(146,140,227,0.3)' : '1px solid rgba(146,140,227,0.15)',
              color: status === 'complete' ? '#928CE3' : status === 'active' ? '#928CE3' : 'var(--text-muted)',
            }}>
              {status === 'complete'     && <CheckCircle2 size={8} />}
              {status === 'active'       && <Clock size={8} />}
              {status === 'not_started'  && <Circle size={8} />}
              {PHASE_LABELS[phase].split(' ')[0]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Sub-component: bound template start screen ────────────────
// Shows all existing contacts at this location+role, with Resume/Start
// buttons per contact. New-contact form only shown when none exist.

interface BoundStartScreenProps {
  templateId:    string
  locationId:    string
  contactRole:   ContactRoleLabel
  startingPhase: ConfigPhase
  onStart:  (identity: StaffIdentity, locationId: string, role: ContactRoleLabel, phase: ConfigPhase, subLocationId?: string) => void
  onResume: (configId: string) => void
}

function BoundStartScreen({ templateId, locationId, contactRole, startingPhase, onStart, onResume }: BoundStartScreenProps) {
  const [contacts,     setContacts]     = useState<ClientContact[]>([])
  const [configs,      setConfigs]      = useState<ConfigurationWithRelations[]>([])
  const [fetchDone,    setFetchDone]    = useState(false)
  const [showNewForm,  setShowNewForm]  = useState(false)
  const [fullName,     setFullName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [phase,        setPhase]        = useState<ConfigPhase>(startingPhase)
  const [subLocations, setSubLocations] = useState<{ id: string; name: string }[]>([])
  const [subLocId,     setSubLocId]     = useState('')
  const [startingId,   setStartingId]   = useState<string | null>(null)

  const tier        = ROLE_SUB_LOCATION_TIER[contactRole]
  const needsSubLoc = tier === 'single_sub'

  useEffect(() => {
    Promise.all([
      getConfigurationsForTemplate(templateId),
      getClientContactsForLocation(locationId),
    ]).then(([cfgs, allContacts]) => {
      const roleContacts = allContacts.filter(c => c.role_label === contactRole)
      setConfigs(cfgs)
      setContacts(roleContacts)
      setFetchDone(true)
      if (roleContacts.length === 0) setShowNewForm(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (needsSubLoc) {
      getSubLocations(locationId).then(subs =>
        setSubLocations(subs.map(s => ({ id: s.id, name: s.name })))
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSubLoc, locationId])

  function configForContact(contact: ClientContact): ConfigurationWithRelations | null {
    return configs.find(c =>
      c.client_contact_id === contact.id || c.client_contact?.email === contact.email
    ) ?? null
  }

  async function handleStartExisting(contact: ClientContact) {
    setStartingId(contact.id)
    try {
      const result = await startOnboardingForTemplateAction(
        templateId,
        { fullName: contact.full_name, email: contact.email, subLocationId: contact.sub_location_id ?? undefined },
        startingPhase,
      )
      if (result.ok) onResume(result.configId)
    } finally {
      setStartingId(null)
    }
  }

  const isNewFormValid = fullName.trim() && email.trim() && (!needsSubLoc || subLocId)

  function handleStartNew() {
    if (!isNewFormValid) return
    onStart(
      { fullName: fullName.trim(), email: email.trim(), role: 'account_manager' },
      locationId,
      contactRole,
      phase,
      needsSubLoc ? subLocId || undefined : undefined,
    )
  }

  if (!fetchDone) {
    return <div className="flex items-center justify-center h-32 text-xs text-muted">Loading…</div>
  }

  const roleLabel = ROLE_DEFINITIONS[contactRole]?.label ?? contactRole

  return (
    <div className="flex flex-col gap-3 p-4">

      {/* ── Existing contacts ── */}
      {contacts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold  text-heading">
            {roleLabel} contacts
          </p>

          {contacts.map(contact => {
            const cfg        = configForContact(contact)
            const isStarting = startingId === contact.id
            const subLocName = contact.sub_location_id
              ? subLocations.find(s => s.id === contact.sub_location_id)?.name ?? null
              : null

            return (
              <div key={contact.id} style={{
                padding: '11px 13px', borderRadius: '9px',
                background: 'var(--bg-surface)',
                border: cfg
                  ? '1px solid rgba(57,153,254,0.22)'
                  : '1px solid rgba(146,140,227,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>
                        {contact.full_name}
                      </span>
                      {subLocName && (
                        <span style={{
                          fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '20px',
                          background: 'rgba(146,140,227,0.1)', color: 'var(--text-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
                        }}>
                          {subLocName}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: cfg ? '4px' : 0 }}>
                      {contact.email}
                    </div>
                    {cfg && (
                      <>
                        <MiniPhaseTimeline config={cfg} />
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {PHASE_LABELS[cfg.phase]} · {cfg.status === 'draft' ? 'In progress' : 'Complete'}
                        </div>
                      </>
                    )}
                  </div>

                  {cfg ? (
                  <button
                    type="button"
                    onClick={() => onResume(cfg.id)}
                    className="
                      flex items-center justify-center gap-1
                      rounded-2xl
                      bg-violet-600
                      text-white
                      text-xs font-semibold
                      px-2.5 py-1
                      hover:bg-violet-700
                      transition-colors
                    "
                  >
                    Resume
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartExisting(contact)}
                      disabled={!!startingId}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', flexShrink: 0,
                        background: isStarting ? 'rgba(146,140,227,0.15)' : 'rgba(57,153,254,0.1)',
                        border: '1px solid rgba(57,153,254,0.28)',
                        color: isStarting ? 'var(--text-muted)' : '#3999FE',
                        fontSize: '11px', fontWeight: 600,
                        cursor: startingId ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isStarting ? '…' : 'Start →'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-[rgba(146,140,227,0.15)]" />
          <span className="text-[10px] text-muted whitespace-nowrap">
            or add a new contact
          </span>
          <div className="flex-1 h-px bg-[rgba(146,140,227,0.15)]" />
        </div>

        {!showNewForm && (
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="
            flex items-center justify-center gap-1
            px-3 py-2
            rounded-2xl
            cursor-pointer
            bg-elevated
            border border-dashed border-muted
            text-xs font-medium text-muted
            transition-all
            hover:bg-elevated/80 hover:border-muted/80
          "
        >
          <CirclePlus className="h-4 w-4" strokeWidth={2} />
          New contact
        </button>

          )}
        </div>
      )}

      {/* ── New contact form ── */}
      {showNewForm && (
        <div className="flex flex-col gap-3">
          {contacts.length > 0 && (
            <label className="text-sm flex items-center gap-1 text-heading font-semibold mb-3.5 mt-3.5">
              <Info className="w-3.5 h-3.5" />New contact</label>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Full name *</label>
              <input type="text" placeholder="Contact name"
                value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" placeholder="contact@client.com"
                value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Locked role — determined by the template binding */}
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-2xl bg-surface border border-border">
            <Lock size={11} className="text-muted shrink-0" />
            <span className="text-xs font-semibold text-heading flex-1">
              {ROLE_DEFINITIONS[contactRole]?.label ?? contactRole}
            </span>
            <span style={{
              fontSize: '9px', fontWeight: 600, padding: '1px 6px', borderRadius: '20px',
              background: 'rgba(146,140,227,0.1)', color: 'var(--text-muted)',
              letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
            }}>
              Template role
            </span>
          </div>

          {needsSubLoc && subLocations.length > 0 && (
            <div>
              <label className={labelClass}>Sub-location *</label>
              <select value={subLocId} onChange={e => setSubLocId(e.target.value)} className={inputClass}>
                <option value="">Select sub-location…</option>
                {subLocations.map(sl => <option key={sl.id} value={sl.id}>{sl.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm flex items-center gap-1 text-heading font-semibold mb-3.5">
              <Info className="w-3.5 h-3.5" />
              Starting phase
            </label>
            <PhaseSelector value={phase} onChange={setPhase} />
          </div>

          <button
            type="button"
            onClick={handleStartNew}
            disabled={!isNewFormValid}
            className={`
              w-full
              py-3
              rounded-2xl
              text-xs font-semibold
              transition-all
              flex items-center justify-center gap-2

              ${isNewFormValid
                ? "bg-violet-600 text-white hover:bg-violet-500 cursor-pointer"
                : "bg-muted text-white cursor-not-allowed"
              }
            `}
          >
            <span>Start configuration</span>
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sub-component: unbound template start form ────────────────
// Shown when template has no locationId/contactRole — full form.

interface StartFormProps {
  locationId?: string
  onStart: (identity: StaffIdentity, locationId: string, contactRole: ContactRoleLabel, phase: ConfigPhase, subLocationId?: string) => void
}

function SessionStartForm({ locationId: presetLocationId, onStart }: StartFormProps) {
  const [fullName,      setFullName]      = useState('')
  const [email,         setEmail]         = useState('')
  const [resolvedLocId, setResolvedLocId] = useState(presetLocationId ?? '')
  const [contactRole,   setContactRole]   = useState<ContactRoleLabel | ''>('')
  const [phase,         setPhase]         = useState<ConfigPhase>('early')

  const isValid = fullName.trim() && email.trim() && resolvedLocId && contactRole

  function handleStart() {
    if (!isValid || !contactRole) return
    onStart(
      { fullName: fullName.trim(), email: email.trim(), role: 'account_manager' },
      resolvedLocId,
      contactRole as ContactRoleLabel,
      phase,
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold  text-heading">Who are you onboarding?</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Full name *</label>
          <input
            type="text" placeholder="Contact name"
            value={fullName} onChange={e => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input
            type="email" placeholder="contact@client.com"
            value={email} onChange={e => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {!presetLocationId && (
        <div>
          <label className={labelClass}>Location *</label>
          <LocationPicker onLocationSet={locId => setResolvedLocId(locId)} />
        </div>
      )}

      <div>
        <label className={labelClass}>Role *</label>
        <div className="flex flex-col gap-1">
          {PRIMARY_ROLES.map(r => {
            const def = ROLE_DEFINITIONS[r]
            const sel = contactRole === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => setContactRole(sel ? '' : r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px', borderRadius: '7px', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  background: sel ? 'rgba(57,153,254,0.06)' : 'var(--bg-elevated)',
                  outline: sel ? '1.5px solid rgba(57,153,254,0.35)' : '1px solid rgba(146,140,227,0.18)',
                }}
              >
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                  background: sel ? '#928CE3' : 'rgba(146,140,227,0.3)',
                }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: sel ? '#3999FE' : 'var(--text-heading)' }}>
                  {def.label}
                </span>
                <span style={{
                  fontSize: '10px', padding: '1px 5px', borderRadius: '20px',
                  background: 'rgba(146,140,227,0.1)', color: 'var(--text-muted)', fontWeight: 500,
                }}>
                  {def.scope}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className={labelClass}>Starting phase</label>
        <PhaseSelector value={phase} onChange={setPhase} />
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={!isValid}
        style={{
          padding: '9px', borderRadius: '8px', border: 'none',
          background: isValid ? '#928CE3' : 'rgba(146,140,227,0.15)',
          color: isValid ? 'white' : 'var(--text-muted)',
          fontSize: '12px', fontWeight: 600,
          cursor: isValid ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s',
        }}
      >
        Start session →
      </button>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────

export default function EmbeddedOnboardingPanel({
  templateId,
  questions,
  sections,
  locationId,
  contactRole,
  startingPhase,
}: Props) {
  const [openSectionId,       setOpenSectionId]       = useState<string | null>(null)
  const initializedRef                              = useRef(false)
  const [autoSaveIndicator,   setAutoSaveIndicator]   = useState(false)
  const [showAll,             setShowAll]             = useState(false)
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false)

  // Build phaseSections from questions
  const phaseSections: Record<ConfigPhase, SectionId[]> = { early: [], pre_deploy: [], deploy: [], post: [] }
  questions
    .filter(q => q.field_key === '__all__')
    .forEach(q => {
      ;(q.visible_in_phases as ConfigPhase[]).forEach(phase => {
        if (phase !== 'deploy') {
          const slug = q.section_slug as SectionId
          if (!phaseSections[phase].includes(slug)) phaseSections[phase].push(slug)
        }
      })
    })

  function handleAutoSave() {
    setAutoSaveIndicator(true)
    setTimeout(() => setAutoSaveIndicator(false), 2000)
  }

  const {
    configuration,
    sections: configSections,
    loading,
    saving,
    identity,
    activeSectionIds,
    startConfiguration,
    resumeConfiguration,
    saveSection,
    queueAutoSave,
    advancePhase,
    completedSections,
  } = useSession({
    onAutoSave: handleAutoSave,
    phaseSections,
    templateId,
    noNavigate: true,
  })

  // Open first incomplete section after session loads
  useEffect(() => {
    if (!configuration || initializedRef.current) return
    initializedRef.current = true
    const activeSecs = sections.filter(s => activeSectionIds.includes(s.slug as SectionId))
    const first = activeSecs.find(s => !configSections[s.slug]?.is_complete)
    setOpenSectionId(first?.slug ?? activeSecs[0]?.slug ?? null)
  }, [configuration, configSections, sections, activeSectionIds])

  async function handleStart(
    id:              StaffIdentity,
    resolvedLocId:   string,
    role:            ContactRoleLabel,
    phase:           ConfigPhase,
    subLocationId?:  string,
  ) {
    await startConfiguration(
      id,
      'client',
      resolvedLocId,
      subLocationId,
      {
        fullName:           id.fullName,
        email:              id.email,
        phone:              '',
        roleLabel:          role,
        roleLabelCustom:    '',
        orchestratorUserId: '',
      },
      phase,
    )
  }

  function handleSave(sectionId: SectionId, data: Record<string, unknown>, isComplete: boolean) {
    saveSection(sectionId, data, isComplete, identity?.email ?? 'preview@admin')
  }

  function handleAutoSaveSection(sectionId: SectionId, data: Record<string, unknown>) {
    queueAutoSave(sectionId, data, identity?.email ?? 'preview@admin')
  }

  const allSections    = [...sections].sort((a, b) => a.sort_order - b.sort_order)
  const activeSections = allSections.filter(s => activeSectionIds.includes(s.slug as SectionId))
  const displaySections = showAll ? allSections : activeSections

  const isBound = !!(locationId && contactRole)

  return (
    <div
      className="rounded-2xl border border-border bg-elevated flex flex-col"
      style={{ maxHeight: 'calc(100vh - 160px)', overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <p className="text-sm font-semibold text-heading">Live Preview &amp; Onboarding</p>
          {configuration && (
            <p className="text-[10px] text-muted mt-0.5">
              ID: {configuration.id.slice(0, 8)}…
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {autoSaveIndicator && (
            <span className="text-[10px] text-bright-violet">Saved</span>
          )}
          {saving && (
            <span className="text-[10px] text-muted">Saving…</span>
          )}
          {configuration && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              configuration.status === 'client_complete' || configuration.status === 'mbody_complete' || configuration.status === 'live'
                ? 'bg-success/10 text-success'
                : 'bg-soft-lavender/10 text-soft-lavender'
            }`}>
              {configuration.status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-muted">
            Loading…
          </div>
        ) : !configuration ? (
          isBound ? (
            <BoundStartScreen
              templateId={templateId}
              locationId={locationId!}
              contactRole={contactRole as ContactRoleLabel}
              startingPhase={startingPhase ?? 'early'}
              onStart={handleStart}
              onResume={resumeConfiguration}
            />
          ) : (
            <SessionStartForm
              locationId={locationId}
              onStart={handleStart}
            />
          )
        ) : (() => {
          const nextPhase  = getNextPhase(configuration.phase)
          const prevPhase  = getPreviousPhase(configuration.phase)
          const allDone    = completedSections === activeSections.length && activeSections.length > 0
          const isLastPhase = nextPhase === null

          return (
            <div className="flex flex-col">

              {/* ── Progress dots ── */}
              {activeSections.length > 0 && (
                <div className="px-3 pt-3 pb-2 flex gap-1.5 flex-wrap border-b border-border shrink-0">
                  {activeSections.map((s, i) => {
                    const done = configSections[s.slug]?.is_complete ?? false
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => setOpenSectionId(s.slug)}
                        title={s.title}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '3px 7px', borderRadius: '20px', border: 'none',
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: done
                            ? 'rgba(146,140,227,0.15)'
                            : openSectionId === s.slug
                              ? 'rgba(146,140,227,0.15)'
                              : 'var(--bg-surface)',
                          outline: done
                            ? '1px solid rgba(146,140,227,0.35)'
                            : openSectionId === s.slug
                              ? '1px solid rgba(146,140,227,0.35)'
                              : '1px solid rgba(146,140,227,0.15)',
                        }}
                      >
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: 700,
                          background: done ? '#928CE3' : 'rgba(146,140,227,0.15)',
                          color: done ? 'white' : 'var(--text-muted)',
                        }}>
                          {done ? (
                            <Check size={10} strokeWidth={2.5} aria-hidden />
                          ) : (
                            i + 1
                          )}
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: done ? '#928CE3' : 'var(--text-muted)', maxWidth: '52px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.title.split(' ')[0]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* ── Sections list ── */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {displaySections.map(section => {
                  const sectionId   = section.slug as SectionId
                  const sectionData = configSections[sectionId]
                  const phase       = configuration.phase
                  const sectionQs   = questions.filter(q => q.section_slug === sectionId && q.field_key !== '__all__')
                  const isOpen      = openSectionId === sectionId
                  const isInPhase   = activeSectionIds.includes(sectionId)

                  const dynProps = {
                    data:       sectionData?.data ?? {},
                    onSave:     (d: Record<string, unknown>, c: boolean) => handleSave(sectionId, d, c),
                    onAutoSave: (d: Record<string, unknown>) => handleAutoSaveSection(sectionId, d),
                    isSaving:   saving,
                    isComplete: sectionData?.is_complete ?? false,
                    industry:   (configuration as { location?: { industry?: string | null } | null }).location?.industry ?? null,
                    configurationId: configuration.id,
                    locationId: configuration.location_id ?? undefined,
                  }

                  const child = (() => {
                    switch (sectionId) {
                      case 'fleet':        return <FleetSection        {...dynProps} questions={sectionQs} phase={phase} description={section.description ?? null} locationId={configuration.location_id ?? undefined} configurationId={configuration.id} />
                      case 'contacts':     return <ContactsSection     {...dynProps} questions={sectionQs} configurationId={configuration.id} />
                      case 'integrations': return <IntegrationsSection {...dynProps} questions={sectionQs} phase={phase} />
                      default:             return (
                        <DynamicSection
                          key={sectionId}
                          sectionSlug={sectionId}
                          questions={sectionQs}
                          phase={phase}
                          description={section.description ?? null}
                          {...dynProps}
                        />
                      )
                    }
                  })()

                  return (
                    <div
                      key={sectionId}
                      className="rounded-xl border border-border bg-surface overflow-hidden"
                      style={!isInPhase ? { opacity: 0.6 } : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenSectionId(isOpen ? null : sectionId)}
                        className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-elevated/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            sectionData?.is_complete ? 'bg-success' : 'bg-muted/30'
                          }`} />
                          <span className="text-xs font-semibold text-heading">{section.title}</span>
                          {!isInPhase && (
                            <span className="text-[9px] text-muted px-1.5 py-0.5 rounded-full bg-elevated border border-border">
                              other phase
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted flex items-center">
                          {isOpen ? <ChevronUp size={12} strokeWidth={2} aria-hidden /> : <ChevronDown size={12} strokeWidth={2} aria-hidden />}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border px-3 py-3">
                          {child}
                        </div>
                      )}
                    </div>
                  )
                })}

                {activeSections.length === 0 && (
                  <p className="text-xs text-muted text-center py-6">
                    No sections configured for the current phase.
                  </p>
                )}
              </div>

              {/* ── Phase advancement bar ── */}
              <div
                className="shrink-0 border-t border-border px-3 py-3"
                style={{
                  background: allDone ? 'rgba(146,140,227,0.06)' : undefined,
                }}
              >
                {/* Progress + advance row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-[11px] font-semibold text-heading inline-flex items-center gap-1">
                      {allDone && (
                        <Check size={12} strokeWidth={2.5} className="shrink-0 text-success" aria-hidden />
                      )}
                      {allDone && isLastPhase
                        ? 'Configuration complete'
                        : allDone
                          ? `All ${activeSections.length} sections done`
                          : `${completedSections} / ${activeSections.length} sections`}
                    </p>
                    {!isLastPhase && nextPhase && (
                      <p className="text-[10px] text-muted">
                        Next: {PHASE_LABELS[nextPhase]}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* All sections / Phase view toggle */}
                    <button
                      type="button"
                      onClick={() => setShowAll(v => !v)}
                      style={{
                        padding: '5px 10px', borderRadius: '7px', fontSize: '10px', fontWeight: 600,
                        border: showAll ? '1px solid rgba(165,42,225,0.4)' : '1px solid rgba(146,140,227,0.2)',
                        background: showAll ? 'rgba(165,42,225,0.08)' : 'transparent',
                        color: showAll ? '#A52AE1' : 'var(--text-muted)',
                        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                      }}
                    >
                      {showAll ? 'Phase view' : 'All sections'}
                    </button>

                    {/* Advance phase button */}
                    {!isLastPhase && nextPhase && (
                      <button
                        type="button"
                        onClick={() => advancePhase(nextPhase)}
                        disabled={!allDone || loading}
                        title={!allDone ? 'Complete all sections to advance' : undefined}
                        style={{
                          padding: '5px 10px', borderRadius: '7px', border: 'none',
                          background: allDone ? '#928CE3' : 'rgba(146,140,227,0.15)',
                          color: allDone ? 'white' : 'var(--text-muted)',
                          fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap',
                          cursor: allDone ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s',
                        }}
                      >
                        {PHASE_LABELS[nextPhase]} →
                      </button>
                    )}
                  </div>
                </div>

                {/* Rollback row */}
                {prevPhase && (
                  <div className="mt-2 pt-2 border-t border-border">
                    {showRollbackConfirm ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted flex-1">
                          Roll back to {PHASE_LABELS[prevPhase]}? Data preserved.
                        </span>
                        <button
                          type="button"
                          onClick={async () => { setShowRollbackConfirm(false); await advancePhase(prevPhase) }}
                          style={{
                            padding: '3px 10px', borderRadius: '5px',
                            border: '1px solid rgba(239,68,68,0.4)',
                            background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.85)',
                            fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRollbackConfirm(false)}
                          style={{ background: 'none', border: 'none', fontSize: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowRollbackConfirm(true)}
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          fontSize: '10px', color: 'var(--text-muted)',
                          cursor: 'pointer', textDecoration: 'underline',
                          textDecorationStyle: 'dotted',
                        }}
                      >
                        ← Roll back to {PHASE_LABELS[prevPhase]}
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          )
        })()}
      </div>
    </div>
  )
}
