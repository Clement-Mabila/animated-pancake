'use client'

import { useState, useEffect } from 'react'
import { Plus, User, Phone, Mail, ChevronDown, CheckCircle2, Circle, Clock } from 'lucide-react'
import { getClientContactsForLocation, getClientContactByEmail, getConfigurationsForLocationWithPhases } from '@/lib/supabase/queries'
import { PHASE_ORDER, PHASE_LABELS, PHASE_DESCRIPTIONS, PHASE_ITEM_COUNTS, PRIMARY_ROLES, ROLE_DEFINITIONS, getPhaseDisplayStatus } from '@/lib/phases'
import type { ClientContact, ContactRoleLabel, ConfigPhase, ConfigurationWithRelations } from '@/types'

// ── Shared styles ────────────────────────────────────────────

const inputClass =
  'w-full bg-elevated border border-soft-lavender/20 rounded-md text-heading text-sm px-3.5 py-2.5 outline-none focus:border-soft-lavender transition-colors duration-150'

const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5'

// ── Sub-components ───────────────────────────────────────────

function PhaseTimeline({ config }: { config: ConfigurationWithRelations }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '8px' }}>
      {PHASE_ORDER.map((phase, idx) => {
        const status = getPhaseDisplayStatus(config, phase)
        return (
          <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {idx > 0 && (
              <div style={{
                width: '16px', height: '1px',
                background: status === 'not_started'
                  ? 'rgba(146,140,227,0.2)'
                  : 'linear-gradient(90deg, #3999FE, #A52AE1)',
              }} />
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
              background: status === 'complete'
                ? 'linear-gradient(135deg, rgba(57,153,254,0.12), rgba(165,42,225,0.12))'
                : status === 'active'
                ? 'rgba(57,153,254,0.08)'
                : 'var(--bg-elevated)',
              border: status === 'active'
                ? '1px solid rgba(57,153,254,0.3)'
                : status === 'complete'
                ? '1px solid rgba(165,42,225,0.2)'
                : '1px solid rgba(146,140,227,0.15)',
              color: status === 'complete'
                ? 'var(--text-soft-lavender, #928CE3)'
                : status === 'active'
                ? '#3999FE'
                : 'var(--text-muted)',
            }}>
              {status === 'complete' && <CheckCircle2 size={9} />}
              {status === 'active'   && <Clock size={9} />}
              {status === 'not_started' && <Circle size={9} />}
              {PHASE_LABELS[phase].split(' ')[0]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ExistingContactCard({
  config,
  onResume,
}: {
  config: ConfigurationWithRelations
  onResume: (configId: string) => void
}) {
  const contact     = config.client_contact
  const activePhase = config.phase
  const activeLabel = PHASE_LABELS[activePhase]
  const isDraft     = config.status === 'draft'

  return (
    <div style={{
      padding: '14px 16px', borderRadius: '10px',
      background: 'var(--bg-elevated)',
      border: '1px solid rgba(146,140,227,0.2)',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>
              {contact?.full_name ?? 'Unknown contact'}
            </span>
            {contact && (
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '1px 7px',
                borderRadius: '20px', background: 'rgba(146,140,227,0.1)',
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {ROLE_DEFINITIONS[contact.role_label as ContactRoleLabel]?.label ?? contact.role_label}
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {activeLabel} · {isDraft ? 'In progress' : 'Complete'}
          </div>
        </div>

        <button
          onClick={() => onResume(config.id)}
          style={{
            padding: '6px 14px', borderRadius: '6px', border: 'none',
            background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
            color: 'white', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          Resume →
        </button>
      </div>

      <PhaseTimeline config={config} />
    </div>
  )
}

// ── New contact form ─────────────────────────────────────────

interface NewContactFormProps {
  locationId:   string
  onConfirmed:  (contact: { fullName: string; email: string; phone: string; roleLabel: ContactRoleLabel; roleLabelCustom: string; orchestratorUserId: string }) => void
}

function NewContactForm({ locationId, onConfirmed }: NewContactFormProps) {
  const [fullName,           setFullName]           = useState('')
  const [email,              setEmail]              = useState('')
  const [phone,              setPhone]              = useState('')
  const [roleLabel,          setRoleLabel]          = useState<ContactRoleLabel | ''>('')
  const [roleLabelCustom,    setRoleLabelCustom]    = useState('')
  const [linkOrchestrator,   setLinkOrchestrator]   = useState(false)
  const [orchestratorUserId, setOrchestratorUserId] = useState('')
  const [emailWarning,       setEmailWarning]       = useState<string | null>(null)
  const [checkingEmail,      setCheckingEmail]      = useState(false)

  async function handleEmailBlur() {
    if (!email.trim() || !locationId) return
    setCheckingEmail(true)
    const existing = await getClientContactByEmail(email, locationId)
    if (existing) {
      setFullName(existing.full_name)
      setPhone(existing.phone ?? '')
      setRoleLabel(existing.role_label)
      setEmailWarning(`Contact already exists — linked to their record.`)
    } else {
      setEmailWarning(null)
    }
    setCheckingEmail(false)
  }

  const isValid = fullName.trim() && email.trim() && roleLabel

  function handleConfirm() {
    if (!isValid || !roleLabel) return
    onConfirmed({
      fullName:            fullName.trim(),
      email:               email.trim(),
      phone:               phone.trim(),
      roleLabel:           roleLabel as ContactRoleLabel,
      roleLabelCustom:     roleLabelCustom.trim(),
      orchestratorUserId:  linkOrchestrator ? orchestratorUserId.trim() : '',
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Full name <span style={{ color: 'var(--error)' }}>*</span></label>
          <input
            type="text" placeholder="e.g. John Doe"
            value={fullName} onChange={e => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email <span style={{ color: 'var(--error)' }}>*</span></label>
          <input
            type="email" placeholder="john@client.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailWarning(null) }}
            onBlur={handleEmailBlur}
            className={inputClass}
          />
          {checkingEmail && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Checking...</p>
          )}
          {emailWarning && (
            <p style={{ fontSize: '11px', color: '#3999FE', marginTop: '4px' }}>{emailWarning}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Phone</label>
        <input
          type="tel" placeholder="+1 (555) 000-0000"
          value={phone} onChange={e => setPhone(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Role <span style={{ color: 'var(--error)' }}>*</span></label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {PRIMARY_ROLES.map(r => {
            const def = ROLE_DEFINITIONS[r]
            return (
              <button
                key={r}
                onClick={() => setRoleLabel(r)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  background: roleLabel === r ? 'rgba(57,153,254,0.06)' : 'var(--bg-elevated)',
                  outline: roleLabel === r ? '1.5px solid rgba(57,153,254,0.35)' : '1px solid rgba(146,140,227,0.18)',
                }}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', marginTop: '4px', flexShrink: 0,
                  background: roleLabel === r
                    ? 'linear-gradient(135deg, #A52AE1, #3999FE)'
                    : 'rgba(146,140,227,0.3)',
                }} />
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', fontWeight: 600,
                    color: roleLabel === r ? '#3999FE' : 'var(--text-heading)',
                  }}>
                    {def.label}
                    <span style={{
                      fontSize: '10px', padding: '1px 6px', borderRadius: '20px',
                      background: 'rgba(146,140,227,0.1)', color: 'var(--text-muted)',
                      fontWeight: 500,
                    }}>
                      {def.scope}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {def.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {roleLabel === 'other' && (
          <input
            type="text" placeholder="Describe the role..."
            value={roleLabelCustom} onChange={e => setRoleLabelCustom(e.target.value)}
            className={inputClass}
            style={{ marginTop: '8px' }}
          />
        )}
      </div>

      <div>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          cursor: 'pointer', userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={linkOrchestrator}
            onChange={e => setLinkOrchestrator(e.target.checked)}
            style={{ width: '14px', height: '14px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-body)' }}>
            Link to existing Orchestrator user account
          </span>
        </label>
        {linkOrchestrator && (
          <input
            type="text" placeholder="Orchestrator User UUID"
            value={orchestratorUserId} onChange={e => setOrchestratorUserId(e.target.value)}
            className={inputClass}
            style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '12px' }}
          />
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!isValid}
        style={{
          padding: '10px', borderRadius: '8px', border: 'none',
          background: isValid
            ? 'linear-gradient(135deg, #A52AE1, #3999FE)'
            : 'rgba(146,140,227,0.15)',
          color: isValid ? 'white' : 'var(--text-muted)',
          fontSize: '13px', fontWeight: 600,
          cursor: isValid ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s',
        }}
      >
        Confirm contact →
      </button>
    </div>
  )
}

// ── Phase selector ───────────────────────────────────────────

interface PhaseSelectorProps {
  value:    ConfigPhase
  onChange: (phase: ConfigPhase) => void
}

function PhaseSelector({ value, onChange }: PhaseSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {PHASE_ORDER.map((phase, idx) => {
        const { count: sectionCount, unit: sectionUnit } = PHASE_ITEM_COUNTS[phase]
        const isSelected   = value === phase
        return (
          <button
            key={phase}
            onClick={() => onChange(phase)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              background: isSelected ? 'rgba(57,153,254,0.06)' : 'var(--bg-elevated)',
              outline: isSelected ? '1.5px solid rgba(57,153,254,0.35)' : '1px solid rgba(146,140,227,0.18)',
            }}
          >
            {/* Phase number bubble */}
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, flexShrink: 0,
              background: isSelected
                ? 'linear-gradient(135deg, #A52AE1, #3999FE)'
                : 'rgba(146,140,227,0.12)',
              color: isSelected ? 'white' : 'var(--text-muted)',
            }}>
              {idx + 1}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px', fontWeight: 600,
                color: isSelected ? '#3999FE' : 'var(--text-heading)',
                marginBottom: '2px',
              }}>
                {PHASE_LABELS[phase]}
                <span style={{
                  marginLeft: '8px', fontSize: '10px', fontWeight: 500,
                  color: 'var(--text-muted)',
                }}>
                  {sectionCount} {sectionUnit}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {PHASE_DESCRIPTIONS[phase]}
              </div>
            </div>

            {isSelected && (
              <CheckCircle2 size={16} style={{ color: '#3999FE', flexShrink: 0 }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────

export interface ContactPanelResult {
  mode:    'resume' | 'new'
  configId?: string                      // set when mode = 'resume'
  contact?: {                            // set when mode = 'new'
    fullName:            string
    email:               string
    phone:               string
    roleLabel:           ContactRoleLabel
    roleLabelCustom:     string
    orchestratorUserId:  string
  }
  phase?: ConfigPhase                    // set when mode = 'new'
}

interface ClientContactPanelProps {
  locationId:  string
  onComplete:  (result: ContactPanelResult) => void
  onResume:    (configId: string) => void
}

export default function ClientContactPanel({
  locationId,
  onComplete,
  onResume,
}: ClientContactPanelProps) {
  const [contacts,       setContacts]       = useState<ClientContact[]>([])
  const [configs,        setConfigs]        = useState<ConfigurationWithRelations[]>([])
  const [loading,        setLoading]        = useState(false)
  const [contactMode,    setContactMode]    = useState<'select' | 'new'>('select')
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null)
  const [selectedPhase,  setSelectedPhase]  = useState<ConfigPhase>('early')
  const [confirmedContact, setConfirmedContact] = useState<ContactPanelResult['contact'] | null>(null)

  useEffect(() => {
    if (!locationId) return
    setLoading(true)
    Promise.all([
      getClientContactsForLocation(locationId),
      getConfigurationsForLocationWithPhases(locationId),
    ]).then(([c, cfgs]) => {
      setContacts(c)
      setConfigs(cfgs)
      setLoading(false)
    })
  }, [locationId])

  // Find the config that belongs to a specific contact
  function getConfigForContact(contact: ClientContact): ConfigurationWithRelations | undefined {
    return configs.find(c => c.client_contact_id === contact.id)
  }

  function handleContactSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (val === '__new__') {
      setContactMode('new')
      setSelectedContact(null)
      setConfirmedContact(null)
      return
    }
    setContactMode('select')
    const contact = contacts.find(c => c.id === val) ?? null
    setSelectedContact(contact)
    setConfirmedContact(null)
  }

  function handleNewContactConfirmed(contact: ContactPanelResult['contact']) {
    setConfirmedContact(contact ?? null)
  }

  // Contact selected + has existing config → show resume card
  const existingConfig = selectedContact ? getConfigForContact(selectedContact) : undefined

  // Ready to proceed to Start Configuration
  const readyToStart = confirmedContact !== null

  function handleStart() {
    if (!confirmedContact) return
    onComplete({ mode: 'new', contact: confirmedContact, phase: selectedPhase })
  }

  if (loading) {
    return (
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
        Loading contacts...
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Existing configurations at this location ── */}
      {configs.length > 0 && (
        <div>
          <label className={labelClass} style={{ marginBottom: '8px' }}>
            Existing configurations at this location
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {configs.map(cfg => (
              <ExistingContactCard
                key={cfg.id}
                config={cfg}
                onResume={onResume}
              />
            ))}
          </div>
          <div style={{
            margin: '16px 0 4px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(146,140,227,0.15)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              or start a new configuration
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(146,140,227,0.15)' }} />
          </div>
        </div>
      )}

      {/* ── Contact selector / new contact form ── */}
      <div>
        <label className={labelClass}>
          Client contact <span style={{ color: 'var(--error)' }}>*</span>
        </label>

        {contacts.length > 0 ? (
          <div style={{ position: 'relative' }}>
            <select
              value={selectedContact?.id ?? (contactMode === 'new' ? '__new__' : '')}
              onChange={handleContactSelect}
              className={inputClass}
              style={{ appearance: 'none', paddingRight: '32px' }}
            >
              <option value="">Select a contact...</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} — {ROLE_DEFINITIONS[c.role_label as ContactRoleLabel]?.label ?? c.role_label}
                  {getConfigForContact(c) ? ' (has config)' : ''}
                </option>
              ))}
              <option value="__new__">+ Add new contact</option>
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }}
            />
          </div>
        ) : (
          /* No contacts yet — go straight to new contact form */
          contactMode === 'select' && (
            <button
              onClick={() => setContactMode('new')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '12px 14px', borderRadius: '8px',
                background: 'var(--bg-elevated)', border: '1px dashed rgba(146,140,227,0.3)',
                color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Add first contact for this location
            </button>
          )
        )}

        {/* Show info about selected existing contact + their config */}
        {selectedContact && existingConfig && (
          <div style={{
            marginTop: '10px', padding: '12px 14px', borderRadius: '8px',
            background: 'rgba(57,153,254,0.05)',
            border: '1px solid rgba(57,153,254,0.2)',
          }}>
            <div style={{ fontSize: '12px', color: '#3999FE', fontWeight: 600, marginBottom: '6px' }}>
              This contact already has a configuration
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Current phase: {PHASE_LABELS[existingConfig.phase]} · Status: {existingConfig.status}
            </div>
            <PhaseTimeline config={existingConfig} />
            <button
              onClick={() => onResume(existingConfig.id)}
              style={{
                marginTop: '10px', padding: '7px 16px', borderRadius: '6px',
                background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
                border: 'none', color: 'white', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Resume configuration →
            </button>
          </div>
        )}

        {/* New contact form */}
        {(contactMode === 'new' || (!selectedContact && contacts.length === 0)) && !confirmedContact && (
          <div style={{ marginTop: '12px' }}>
            <NewContactForm
              locationId={locationId}
              onConfirmed={handleNewContactConfirmed}
            />
          </div>
        )}

        {/* Confirmed contact pill */}
        {confirmedContact && (
          <div style={{
            marginTop: '10px', padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(57,153,254,0.05)',
            border: '1px solid rgba(57,153,254,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={14} style={{ color: '#3999FE' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>
                  {confirmedContact.fullName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Mail size={10} />{confirmedContact.email}
                  </span>
                  {confirmedContact.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Phone size={10} />{confirmedContact.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setConfirmedContact(null)}
              style={{
                fontSize: '11px', color: 'var(--text-muted)', background: 'none',
                border: 'none', cursor: 'pointer',
              }}
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* ── Phase selector — only shown once contact is confirmed ── */}
      {confirmedContact && (
        <div>
          <label className={labelClass} style={{ marginBottom: '8px' }}>
            Starting phase
          </label>
          <PhaseSelector value={selectedPhase} onChange={setSelectedPhase} />

          <button
            onClick={handleStart}
            disabled={!readyToStart}
            style={{
              marginTop: '16px', width: '100%', padding: '11px',
              borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start configuration →
          </button>
        </div>
      )}
    </div>
  )
}
