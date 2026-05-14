'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Building2, MapPin, Check } from 'lucide-react'
import {
  getLocations,
  getSubLocations,
  getConfigurationsForRole,
  getConfigurationsForUser,
} from '@/lib/supabase/queries'

import {
  createLocationAction,
  createSubLocationAction,
  updateLocationAction,
} from '@/app/actions/session'

import ClientContactPanel, { type ContactPanelResult } from '@/components/form/ClientContactPanel'

import type {
  Location,
  SubLocation,
  Configuration,
  ConfigPhase,
  StaffIdentity,
  ConfigTarget,
  MBodyRole,
} from '@/types'
import type { PrefillIdentity } from '@/lib/admin/validateInitToken'

interface SessionSelectorProps {
  onStart: (
    identity:        StaffIdentity,
    target:          ConfigTarget,
    locationId?:     string,
    subLocationId?:  string,
    contact?:        ContactPanelResult['contact'],
    phase?:          ConfigPhase,
  ) => void
  onResume:        (configId: string) => void
  loading:         boolean
  prefillIdentity?: PrefillIdentity | null
}

const MBODY_ROLES: { value: MBodyRole; label: string }[] = [
  { value: 'sales',            label: 'Sales'            },
  { value: 'account_manager',  label: 'Account Manager'  },
  { value: 'operations',       label: 'Operations'       },
  { value: 'engineering',      label: 'Engineering'      },
  { value: 'finance',          label: 'Finance'          },
  { value: 'customer_success', label: 'Customer Success' },
  { value: 'admin',            label: 'Admin'            },
]

const CONFIG_TARGETS: { value: ConfigTarget; label: string; desc: string }[] = [
  { value: 'client',   label: 'A client',  desc: 'Configure Orchestrator for a specific location or site'  },
  { value: 'my_role',  label: 'My role',   desc: 'Default config for everyone in my role'                  },
  { value: 'personal', label: 'Just me',   desc: 'My personal Orchestrator configuration'                  },
]

const inputClass =
  'w-full bg-elevated border border-soft-lavender/20 rounded-md text-heading text-sm px-3.5 py-2.5 outline-none focus:border-soft-lavender transition-colors duration-150'

const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5'

// ── Sub-components ────────────────────────────────────────────

function StatusBadge({ status }: { status: Configuration['status'] }) {
  const map = {
    draft:           { label: 'Draft',          cls: 'bg-soft-lavender/10 text-soft-lavender' },
    client_complete: { label: 'Client complete', cls: 'bg-warning/10 text-warning'             },
    mbody_complete:  { label: 'MBody complete',  cls: 'bg-electric-blue/10 text-electric-blue' },
    live:            { label: 'Live',            cls: 'bg-success/10 text-success'             },
  }
  const s = map[status]
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  )
}

function StepBubble({ n, done }: { n: number; done: boolean }) {
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-300 ${
      done
        ? 'bg-gradient-to-br from-bright-violet to-electric-blue text-white border-0'
        : 'bg-elevated text-muted border border-soft-lavender/20'
    }`}>
      {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden /> : n}
    </div>
  )
}

// Small toggle pill used for Existing / New
function ModeToggle({
  value, onChange,
  options,
}: {
  value:    string
  onChange: (v: string) => void
  options:  { value: string; label: string; icon: React.ReactNode }[]
}) {
  return (
    <div
      style={{
        display: 'flex', gap: '3px',
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(146,140,227,0.18)',
        borderRadius: '8px',
        padding: '3px',
        width: 'fit-content',
        marginBottom: '16px',
      }}
    >
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 12px', borderRadius: '6px', border: 'none',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            letterSpacing: '0.02em',
            background: value === o.value ? 'var(--bg-surface)' : 'transparent',
            color:      value === o.value ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow:  value === o.value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Inline sub-location name builder used in "New client" mode
function SubLocationBuilder({
  items,
  onChange,
}: {
  items:    string[]
  onChange: (items: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChange([...items, trimmed])
    setDraft('')
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div>
      {/* Existing items */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
          {items.map((name, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(146,140,227,0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <MapPin size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{name}</span>
              </div>
              <button
                onClick={() => remove(idx)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center',
                  padding: '2px', borderRadius: '4px', transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.85)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.5)')}
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add input */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text"
          placeholder="Sub-location name, e.g. Floor 2"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          className={inputClass}
          style={{ flex: 1 }}
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          style={{
            padding: '0 12px', borderRadius: '6px',
            background: draft.trim()
              ? 'linear-gradient(135deg, #A52AE1, #3999FE)'
              : 'rgba(146,140,227,0.15)',
            border: 'none', color: 'white',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', fontWeight: 600,
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          <Plus size={13} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted mt-1.5">
          Optional — leave blank to configure at location level only.
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

function initialStaffRoleFromPrefill(prefillIdentity: SessionSelectorProps['prefillIdentity']): MBodyRole | '' {
  if (prefillIdentity?.role) return prefillIdentity.role
  // Admin init-token path: staff_users row is often missing; use a safe default for onboarding identity only.
  if (prefillIdentity?.fromAdminInitToken) return 'admin'
  return ''
}

export default function SessionSelector({ onStart, onResume, loading, prefillIdentity }: SessionSelectorProps) {
  // When identity is complete from a validated admin token, skip step 1 and open at step 2.
  // `fromAdminInitToken` may omit DB-resolved `role`; we still default staff role server-side in initial state.
  const isFullyPrefilled = !!(
    prefillIdentity?.email &&
    prefillIdentity?.name &&
    (prefillIdentity?.role || prefillIdentity?.fromAdminInitToken)
  )

  const [step, setStep] = useState<1 | 2 | 3>(isFullyPrefilled ? 2 : 1)

  // ── Step 1 — identity (initialised from admin token when present)
  const [fullName, setFullName] = useState(prefillIdentity?.name  ?? '')
  const [email,    setEmail]    = useState(prefillIdentity?.email ?? '')
  const [role,     setRole]     = useState<MBodyRole | ''>(() => initialStaffRoleFromPrefill(prefillIdentity))

  // ── Step 2 — target
  const [target, setTarget] = useState<ConfigTarget | ''>('')

  // ── Step 3 — location mode toggle
  const [locationMode, setLocationMode] = useState<'existing' | 'new'>('existing')

  // Existing location fields
  const [locations,            setLocations]            = useState<Location[]>([])
  const [selectedLocation,     setSelectedLocation]     = useState('')
  const [subLocations,         setSubLocations]         = useState<SubLocation[]>([])
  const [selectedSubLocation,  setSelectedSubLocation]  = useState('')

  // Add-new-sublocation to an existing location
  const [addingSubToExisting,  setAddingSubToExisting]  = useState(false)
  const [newSubToExistingName, setNewSubToExistingName] = useState('')

  // New location fields
  const [newLocName,     setNewLocName]     = useState('')
  const [newLocIndustry, setNewLocIndustry] = useState('')
  const [newLocCountry,  setNewLocCountry]  = useState('')
  const [newLocCity,     setNewLocCity]     = useState('')
  const [newLocSubNames, setNewLocSubNames] = useState<string[]>([])

  // Saved new location state — set once location is persisted to DB
  const [savedNewLocationId,    setSavedNewLocationId]    = useState('')
  const [savedSubLocNames,      setSavedSubLocNames]      = useState<string[]>([])
  const [savingNewLocation,     setSavingNewLocation]     = useState(false)
  const [editingNewLocation,    setEditingNewLocation]    = useState(false)

  // Existing configs + creating state
  const [existingConfigs, setExistingConfigs] = useState<Configuration[]>([])
  const [loadingConfigs,  setLoadingConfigs]  = useState(false)
  const [creating,        setCreating]        = useState(false)

  // Load locations when target = client
  useEffect(() => {
    if (target === 'client') getLocations().then(setLocations)
  }, [target])

  // Load sub-locations when existing location selected
  useEffect(() => {
    if (!selectedLocation) { setSubLocations([]); return }
    getSubLocations(selectedLocation).then(setSubLocations)
    setSelectedSubLocation('')
    setAddingSubToExisting(false)
    setNewSubToExistingName('')
  }, [selectedLocation])

  // Load existing configs — client target handled by ClientContactPanel
  useEffect(() => {
    if (!target || !role || target === 'client') return
    setLoadingConfigs(true)
    const fetch = async () => {
      let configs: Configuration[] = []
      if (target === 'my_role' && role) {
        configs = await getConfigurationsForRole(role as MBodyRole)
      } else if (target === 'personal' && email) {
        configs = await getConfigurationsForUser(email)
      }
      setExistingConfigs(configs)
      setLoadingConfigs(false)
    }
    fetch()
  }, [target, role, email])

  // ── Validation ────────────────────────────────────────────

  const step1Done = !!(fullName.trim() && email.trim() && role)
  const step2Done = !!target

  const step3Done = target !== 'client' || (
    locationMode === 'existing'
      ? !!selectedLocation
      : !!savedNewLocationId   // new location must be saved to DB first
  )

  const canStart = step1Done && step2Done && step3Done

  // ── New location save / update handlers ─────────────────────

  async function handleSaveNewLocation() {
    if (!newLocName.trim()) return
    setSavingNewLocation(true)
    try {
      const loc = await createLocationAction({
        name:     newLocName,
        industry: newLocIndustry || undefined,
        country:  newLocCountry  || undefined,
        city:     newLocCity     || undefined,
      })
      if (newLocSubNames.length > 0) {
        await Promise.all(
          newLocSubNames.map(name => createSubLocationAction({ locationId: loc.id, name }))
        )
      }
      setSavedNewLocationId(loc.id)
      setSavedSubLocNames([...newLocSubNames])
      setEditingNewLocation(false)
      // Refresh locations list so this appears if user switches to "existing"
      getLocations().then(setLocations)
    } finally {
      setSavingNewLocation(false)
    }
  }

  async function handleUpdateNewLocation() {
    if (!savedNewLocationId || !newLocName.trim()) return
    setSavingNewLocation(true)
    try {
      await updateLocationAction({
        id:       savedNewLocationId,
        name:     newLocName,
        industry: newLocIndustry || undefined,
        country:  newLocCountry  || undefined,
        city:     newLocCity     || undefined,
      })
      // Create any sub-locations added since the initial save
      const alreadySaved = new Set(savedSubLocNames)
      const toCreate = newLocSubNames.filter(n => !alreadySaved.has(n))
      if (toCreate.length > 0) {
        await Promise.all(
          toCreate.map(name => createSubLocationAction({ locationId: savedNewLocationId, name }))
        )
        setSavedSubLocNames(prev => [...prev, ...toCreate])
      }
      setEditingNewLocation(false)
      getLocations().then(setLocations)
    } finally {
      setSavingNewLocation(false)
    }
  }

  // ── Start handlers ───────────────────────────────────────────

  // Called by ClientContactPanel once contact + phase are confirmed
  async function handleClientStart(panelResult: ContactPanelResult) {
    if (!canStart || !role || panelResult.mode !== 'new' || !panelResult.contact || !panelResult.phase) return
    setCreating(true)
    try {
      let resolvedLocationId:    string | undefined
      let resolvedSubLocationId: string | undefined

      if (locationMode === 'new') {
        // Location already saved to DB via "Save location" button
        resolvedLocationId = savedNewLocationId || undefined
      } else {
        resolvedLocationId = selectedLocation || undefined

        if (addingSubToExisting && newSubToExistingName.trim() && selectedLocation) {
          const sub = await createSubLocationAction({
            locationId: selectedLocation,
            name:       newSubToExistingName,
          })
          resolvedSubLocationId = sub.id
        } else {
          resolvedSubLocationId = selectedSubLocation || undefined
        }
      }

      onStart(
        { fullName, email, role: role as MBodyRole },
        'client',
        resolvedLocationId,
        resolvedSubLocationId,
        panelResult.contact,
        panelResult.phase,
      )
    } finally {
      setCreating(false)
    }
  }

  // Called for non-client targets (my_role, personal)
  async function handleStart() {
    if (!canStart || !role || target === 'client') return
    setCreating(true)
    try {
      onStart(
        { fullName, email, role: role as MBodyRole },
        target as ConfigTarget,
      )
    } finally {
      setCreating(false)
    }
  }

  const isStarting = loading || creating

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="max-w-lg">

      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-bright-violet to-electric-blue" />
          <span className="text-xs font-semibold uppercase tracking-widest text-electric-blue">
            Orchestrator · System Configuration
          </span>
        </div>
        <h1 className="text-4xl font-semibold leading-tight mb-3 text-heading">
          User<br />
          <span className="bg-gradient-to-r from-bright-violet to-electric-blue bg-clip-text text-transparent">
            Onboarding
          </span>
        </h1>
        <p className="text-sm leading-relaxed text-body-text">
          Identify yourself, choose what you are configuring for, then fill in the relevant sections.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">

        {/* ══════════════════════════════════════════════════
            STEP 1 — Identity
        ══════════════════════════════════════════════════ */}
        <div className={`rounded-lg p-5 bg-surface transition-all duration-200 ${
          step === 1
            ? 'border border-soft-lavender/35 shadow-lg shadow-bright-violet/10'
            : 'border border-soft-lavender/15'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <StepBubble n={1} done={step1Done} />
              <span className="text-sm font-semibold text-heading">Who are you?</span>
            </div>
            {step1Done && step !== 1 && !prefillIdentity && (
              <button onClick={() => setStep(1)} className="text-xs text-electric-blue bg-transparent border-0 cursor-pointer">
                Edit
              </button>
            )}
          </div>

          {step1Done && step !== 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-body-text">
                {fullName} · {email} · {MBODY_ROLES.find(r => r.value === role)?.label}
              </p>
              {/* Hide edit when identity came from a verified admin session */}
              {!prefillIdentity && (
                <button onClick={() => setStep(1)} className="text-xs text-electric-blue bg-transparent border-0 cursor-pointer">
                  Edit
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">

              {/* Admin-session banner — shown when identity is pre-filled */}
              {prefillIdentity && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-electric-blue/6 border border-electric-blue/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-electric-blue flex-shrink-0" />
                  <p className="text-xs text-electric-blue font-medium">
                    Signed in as admin — identity verified from your session
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Full name</label>
                  {prefillIdentity ? (
                    <div className={`${inputClass} text-heading opacity-70 cursor-not-allowed select-none`}>
                      {fullName}
                    </div>
                  ) : (
                    <input type="text" placeholder="e.g. Alex Johnson" value={fullName}
                      onChange={e => setFullName(e.target.value)} className={inputClass} />
                  )}
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  {prefillIdentity ? (
                    <div className={`${inputClass} text-heading opacity-70 cursor-not-allowed select-none`}>
                      {email}
                    </div>
                  ) : (
                    <input type="email" placeholder="you@mbody.ai" value={email}
                      onChange={e => setEmail(e.target.value)} className={inputClass} />
                  )}
                </div>
              </div>
              {!prefillIdentity?.fromAdminInitToken && (
              <div>
                <label className={labelClass}>Your role at MBody AI</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {MBODY_ROLES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={`py-2 px-2.5 rounded-md text-xs font-semibold cursor-pointer border transition-all duration-150 ${
                        role === r.value
                          ? 'bg-electric-blue/8 border-electric-blue/35 text-electric-blue'
                          : 'bg-elevated border-soft-lavender/20 text-body-text'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              )}
              {step1Done && (
                <div className="flex justify-end">
                  <button onClick={() => setStep(2)}
                    className="py-2 px-4 rounded-md text-xs font-semibold text-white border-0 bg-gradient-to-br from-bright-violet to-electric-blue cursor-pointer">
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            STEP 2 — Config target
        ══════════════════════════════════════════════════ */}
        <div className={`rounded-lg p-5 bg-surface transition-all duration-200 ${
          step < 2 ? 'opacity-50 pointer-events-none border border-soft-lavender/15' :
          step === 2
            ? 'border border-soft-lavender/35 shadow-lg shadow-bright-violet/10'
            : 'border border-soft-lavender/15'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <StepBubble n={2} done={step2Done} />
              <span className="text-sm font-semibold text-heading">What are you configuring for?</span>
            </div>
            {step2Done && step !== 2 && (
              <button onClick={() => setStep(2)} className="text-xs text-electric-blue bg-transparent border-0 cursor-pointer">
                Edit
              </button>
            )}
          </div>

          {step2Done && step !== 2 ? (
            <p className="text-sm text-body-text">
              {CONFIG_TARGETS.find(t => t.value === target)?.label}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {CONFIG_TARGETS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTarget(t.value)}
                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer text-left border transition-all duration-150 ${
                    target === t.value
                      ? 'bg-electric-blue/6 border-electric-blue/35'
                      : 'bg-elevated border-soft-lavender/20'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-150 ${
                    target === t.value
                      ? 'bg-gradient-to-br from-bright-violet to-electric-blue'
                      : 'bg-soft-lavender/30'
                  }`} />
                  <div>
                    <div className={`text-sm font-semibold ${target === t.value ? 'text-electric-blue' : 'text-heading'}`}>
                      {t.label}
                    </div>
                    <div className="text-xs text-muted mt-0.5">{t.desc}</div>
                  </div>
                </button>
              ))}
              {step2Done && (
                <div className="flex justify-end mt-1">
                  <button onClick={() => setStep(3)}
                    className="py-2 px-4 rounded-md text-xs font-semibold text-white border-0 bg-gradient-to-br from-bright-violet to-electric-blue cursor-pointer">
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            STEP 3 — Client location (only when target = client)
        ══════════════════════════════════════════════════ */}
        {target === 'client' && step >= 3 && (
          <div className={`rounded-lg p-5 bg-surface transition-all duration-200 ${
            step3Done
              ? 'border border-soft-lavender/15'
              : 'border border-soft-lavender/35 shadow-lg shadow-bright-violet/10'
          }`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <StepBubble n={3} done={step3Done} />
                <span className="text-sm font-semibold text-heading">Client location</span>
              </div>
              {savedNewLocationId && !editingNewLocation && locationMode === 'new' && (
                <button
                  onClick={() => setEditingNewLocation(true)}
                  className="text-xs text-electric-blue bg-transparent border-0 cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Existing / New toggle — hidden once a new location is saved */}
            {!savedNewLocationId && <ModeToggle
              value={locationMode}
              onChange={v => {
                setLocationMode(v as 'existing' | 'new')
                setSelectedLocation('')
                setSelectedSubLocation('')
                setAddingSubToExisting(false)
                setNewSubToExistingName('')
                setNewLocName('')
                setNewLocIndustry('')
                setNewLocCountry('')
                setNewLocCity('')
                setNewLocSubNames([])
                setSavedNewLocationId('')
                setSavedSubLocNames([])
                setEditingNewLocation(false)
              }}
              options={[
                { value: 'existing', label: 'Existing client',  icon: <Building2 size={11} /> },
                { value: 'new',      label: 'New client',       icon: <Plus size={11} strokeWidth={2.5} /> },
              ]}
            />}

            {/* ── Existing client ── */}
            {locationMode === 'existing' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelClass}>Location (client)</label>
                  <select
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a client...</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {selectedLocation && (
                  <div>
                    <label className={labelClass}>Sub-location</label>

                    {!addingSubToExisting ? (
                      <>
                        <select
                          value={selectedSubLocation}
                          onChange={e => {
                            if (e.target.value === '__new__') {
                              setAddingSubToExisting(true)
                              setSelectedSubLocation('')
                            } else {
                              setSelectedSubLocation(e.target.value)
                            }
                          }}
                          className={inputClass}
                        >
                          <option value="">All sub-locations (location-wide config)</option>
                          {subLocations.map(sl => (
                            <option key={sl.id} value={sl.id}>{sl.name}</option>
                          ))}
                          <option value="__new__">+ Add new sub-location...</option>
                        </select>
                        {!selectedSubLocation && (
                          <p className="text-xs text-muted mt-1.5">
                            Leave blank to configure all sub-locations. Sub-locations without their own config inherit this one.
                          </p>
                        )}
                      </>
                    ) : (
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid rgba(146,140,227,0.2)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.07em',
                            color: 'var(--text-muted)', marginBottom: '8px',
                          }}
                        >
                          New sub-location
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="e.g. Floor 3 North"
                            value={newSubToExistingName}
                            onChange={e => setNewSubToExistingName(e.target.value)}
                            className={inputClass}
                            style={{ flex: 1 }}
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              setAddingSubToExisting(false)
                              setNewSubToExistingName('')
                            }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                              padding: '4px', flexShrink: 0,
                            }}
                            title="Cancel"
                          >
                            <X size={14} strokeWidth={2} />
                          </button>
                        </div>
                        <p className="text-xs text-muted mt-1.5">
                          This sub-location will be created under{' '}
                          <strong>{locations.find(l => l.id === selectedLocation)?.name ?? 'the selected location'}</strong>{' '}
                          when you start the configuration.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── New client ── */}
            {locationMode === 'new' && (
              savedNewLocationId && !editingNewLocation ? (
                /* ── Collapsed summary after save ── */
                <div
                  style={{
                    padding: '12px 14px', borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid rgba(146,140,227,0.18)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Building2 size={13} style={{ color: 'var(--electric-blue)', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>
                      {newLocName}
                    </span>
                  </div>
                  {(newLocIndustry || newLocCountry || newLocCity) && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', paddingLeft: '21px' }}>
                      {[newLocIndustry, newLocCity, newLocCountry].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {savedSubLocNames.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingLeft: '21px' }}>
                      {savedSubLocNames.map((name, i) => (
                        <span
                          key={i}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 9px', borderRadius: '12px',
                            background: 'rgba(146,140,227,0.1)',
                            border: '1px solid rgba(146,140,227,0.2)',
                            fontSize: '11px', color: 'var(--text-muted)',
                          }}
                        >
                          <MapPin size={9} />
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Create / edit form ── */
                <div className="flex flex-col gap-3">
                  {/* Location name */}
                  <div>
                    <label className={labelClass}>
                      Location name <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Caesars Palace Las Vegas"
                      value={newLocName}
                      onChange={e => setNewLocName(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* Industry / Country / City */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className={labelClass}>Industry</label>
                      <input
                        type="text"
                        placeholder="e.g. Hospitality"
                        value={newLocIndustry}
                        onChange={e => setNewLocIndustry(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Country</label>
                      <input
                        type="text"
                        placeholder="e.g. USA"
                        value={newLocCountry}
                        onChange={e => setNewLocCountry(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>City</label>
                      <input
                        type="text"
                        placeholder="e.g. Las Vegas"
                        value={newLocCity}
                        onChange={e => setNewLocCity(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Sub-locations */}
                  <div>
                    <label className={labelClass}>Sub-locations</label>

                    {/* Saved sub-locations shown as locked badges during edit */}
                    {editingNewLocation && savedSubLocNames.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
                        {savedSubLocNames.map((name, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '7px 10px', borderRadius: '6px',
                              background: 'var(--bg-elevated)',
                              border: '1px solid rgba(146,140,227,0.15)',
                              opacity: 0.65,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <MapPin size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{name}</span>
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>saved</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Builder for new additions (or all if first-time create) */}
                    <SubLocationBuilder
                      items={
                        editingNewLocation
                          ? newLocSubNames.filter(n => !savedSubLocNames.includes(n))
                          : newLocSubNames
                      }
                      onChange={items =>
                        editingNewLocation
                          ? setNewLocSubNames([...savedSubLocNames, ...items])
                          : setNewLocSubNames(items)
                      }
                    />
                  </div>

                  {/* Save / Cancel buttons */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    {editingNewLocation && (
                      <button
                        onClick={() => setEditingNewLocation(false)}
                        style={{
                          padding: '8px 16px', borderRadius: '6px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid rgba(146,140,227,0.2)',
                          color: 'var(--text-muted)',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={editingNewLocation ? handleUpdateNewLocation : handleSaveNewLocation}
                      disabled={!newLocName.trim() || savingNewLocation}
                      style={{
                        padding: '8px 18px', borderRadius: '6px',
                        background: newLocName.trim() && !savingNewLocation
                          ? 'linear-gradient(135deg, #A52AE1, #3999FE)'
                          : 'rgba(146,140,227,0.2)',
                        border: 'none', color: 'white',
                        fontSize: '12px', fontWeight: 600,
                        cursor: newLocName.trim() && !savingNewLocation ? 'pointer' : 'not-allowed',
                        transition: 'background 0.15s',
                      }}
                    >
                      {savingNewLocation
                        ? 'Saving...'
                        : editingNewLocation ? 'Save changes' : 'Save location →'
                      }
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ── Step 4: Client contact + phase (client target only) ── */}
        {target === 'client' && step3Done && step >= 3 && (
          <div className="rounded-lg p-5 bg-surface border border-soft-lavender/35 shadow-lg shadow-bright-violet/10">
            <div className="flex items-center gap-2.5 mb-5">
              <StepBubble n={4} done={false} />
              <span className="text-sm font-semibold text-heading">Client contact &amp; phase</span>
            </div>
            <ClientContactPanel
              locationId={locationMode === 'existing' ? selectedLocation : savedNewLocationId}
              onComplete={handleClientStart}
              onResume={onResume}
            />
            {creating && (
              <p className="text-xs text-muted mt-3">Creating configuration...</p>
            )}
          </div>
        )}

        {/* ── Existing configs (non-client targets) ── */}
        {canStart && target !== 'client' && existingConfigs.length > 0 && (
          <div>
            <label className={`${labelClass} mt-2`}>Resume existing configuration</label>
            <div className="flex flex-col gap-2">
              {existingConfigs.map(c => (
                <button
                  key={c.id}
                  onClick={() => onResume(c.id)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-md bg-elevated border border-soft-lavender/20 cursor-pointer text-left transition-opacity duration-150 hover:opacity-80"
                >
                  <span className="text-sm text-body-text">
                    {c.last_edited_by
                      ? `Last edited by ${c.last_edited_by}`
                      : 'Untouched configuration'}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-muted">
                      {new Date(c.updated_at).toLocaleDateString()}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-2 mb-1">Or start a new configuration below</p>
          </div>
        )}

        {loadingConfigs && (
          <p className="text-xs text-muted">Checking for existing configurations...</p>
        )}

        {/* ── Start button (non-client targets only) ── */}
        {canStart && target !== 'client' && (
          <button
            onClick={handleStart}
            disabled={isStarting}
            className={`w-full py-3 rounded-md text-sm font-semibold text-white border-0 bg-gradient-to-br from-bright-violet to-electric-blue transition-opacity duration-200 ${
              isStarting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {loading ? 'Creating configuration...' : 'Start configuration →'}
          </button>
        )}

      </div>
    </div>
  )
}