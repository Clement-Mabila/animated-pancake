'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Check, X } from 'lucide-react'
import type { ConfigPerson, OrchestratorAccessScope, SubLocation } from '@/types'
import {
  getPersonsForConfigAction,
  upsertConfigPersonAction,
  updatePersonAmendAction,
  deleteConfigPersonAction,
  getSubLocationsAction,
  getClientContactsForLocationAction,
} from '@/app/actions/configPersons'
import type { ClientContactRow } from '@/app/actions/configPersons'

function ScopeBadge({ scope }: { scope: OrchestratorAccessScope | null }) {
  if (!scope) return null
  const map: Record<OrchestratorAccessScope, { label: string; bg: string; color: string }> = {
    fleet_wide:   { label: 'Fleet-wide',    bg: 'rgba(0,129,255,0.10)',   color: '#0057B8' },
    location:     { label: 'All floors',    bg: 'rgba(165,42,225,0.10)',  color: '#7B1FA2' },
    sub_location: { label: 'Site-specific', bg: 'rgba(245,124,0,0.10)',   color: '#BF360C' },
  }
  const s = map[scope]
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: s.bg, color: s.color, letterSpacing: '.04em' }}>
      {s.label}
    </span>
  )
}

interface Props {
  fieldKey:        string
  label?:          string | null
  configurationId: string
  locationId:      string
  value:           string[]        // IDs of persons with can_amend_schedules = true
  onChange:        (ids: string[]) => void
}

export default function ScheduleAmendSelector({
  label, configurationId, locationId, value, onChange,
}: Props) {
  const [allPersons,    setAllPersons]    = useState<ConfigPerson[]>([])
  const [clientContacts, setClientContacts] = useState<ClientContactRow[]>([])
  const [subLocations,  setSubLocations]  = useState<SubLocation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showAdd,       setShowAdd]       = useState(false)
  const [addMode,       setAddMode]       = useState<'form' | 'contacts'>('form')
  const [saving,        setSaving]        = useState<string | null>(null)  // id being saved, or 'new'
  const [error,         setError]         = useState<string | null>(null)

  // New person form
  const [fName,    setFName]    = useState('')
  const [fEmail,   setFEmail]   = useState('')
  const [fPhone,   setFPhone]   = useState('')
  const [fScope,   setFScope]   = useState<OrchestratorAccessScope>('fleet_wide')
  const [fSubLocs, setFSubLocs] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      try {
        const [persons, sls, clientCs] = await Promise.all([
          getPersonsForConfigAction(configurationId),
          getSubLocationsAction(locationId),
          getClientContactsForLocationAction(locationId),
        ])
        const personEmails = new Set(persons.map(p => p.email.toLowerCase()))
        setAllPersons(persons)
        setSubLocations(sls)
        setClientContacts(clientCs.filter(c => !personEmails.has(c.email.toLowerCase())))

        const amendIds = persons.filter(p => p.can_amend_schedules).map(p => p.id)
        if (JSON.stringify(amendIds) !== JSON.stringify(value)) onChange(amendIds)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configurationId, locationId])

  function syncParent(persons: ConfigPerson[]) {
    setAllPersons(persons)
    onChange(persons.filter(p => p.can_amend_schedules).map(p => p.id))
  }

  async function toggleAmend(person: ConfigPerson) {
    setSaving(person.id)
    const next = !person.can_amend_schedules
    const res = await updatePersonAmendAction(person.id, next)
    setSaving(null)
    if (!res.ok) return
    syncParent(allPersons.map(p => p.id === person.id ? res.person : p))
  }

  async function handleSelectClientContact(contact: ClientContactRow) {
    setSaving('new'); setError(null)
    const res = await upsertConfigPersonAction({
      configurationId,
      fullName:          contact.full_name,
      email:             contact.email,
      phone:             contact.phone,
      contactRoles:      [],
      accessScope:       null,
      canAmendSchedules: true,
    })
    setSaving(null)
    if (!res.ok) { setError(res.error); return }
    setClientContacts(prev => prev.filter(c => c.id !== contact.id))
    syncParent([...allPersons, res.person])
    setShowAdd(false)
  }

  async function handleAddNew() {
    setSaving('new'); setError(null)
    const res = await upsertConfigPersonAction({
      configurationId,
      fullName:          fName,
      email:             fEmail,
      phone:             fPhone || null,
      contactRoles:      [],
      accessScope:       fScope,
      subLocationIds:    fScope === 'sub_location' ? fSubLocs : [],
      canAmendSchedules: true,
    })
    setSaving(null)
    if (!res.ok) { setError(res.error); return }
    syncParent([...allPersons, res.person])
    setFName(''); setFEmail(''); setFPhone(''); setFScope('fleet_wide'); setFSubLocs([])
    setShowAdd(false)
  }

  async function handleRemoveAmender(person: ConfigPerson) {
    if (person.contact_roles.length > 0 || person.access_scope !== null) {
      // Person has other roles — just revoke amendment permission
      const res = await updatePersonAmendAction(person.id, false)
      if (!res.ok) return
      syncParent(allPersons.map(p => p.id === person.id ? res.person : p))
    } else {
      // Schedule-only person with no other ties — remove entirely
      const res = await deleteConfigPersonAction(person.id)
      if (!res.ok) return
      syncParent(allPersons.filter(p => p.id !== person.id))
    }
  }

  const amenders   = allPersons.filter(p => p.can_amend_schedules)
  const otherPeople = allPersons.filter(p => !p.can_amend_schedules)
  const hasPickable = clientContacts.length > 0

  if (loading) return (
    <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Loading…</div>
  )

  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '8px' }}>
        {label ?? 'Schedule amendment access'}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        People who can modify robot schedules and settings in Orchestrator.
      </p>

      {/* ── Current amenders ── */}
      {amenders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {amenders.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '8px',
              border: '1px solid rgba(27,138,90,0.2)',
              background: 'rgba(27,138,90,0.04)',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #1B8A5A 0%, #1565C0 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: 'white',
              }}>
                {p.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{p.full_name}</span>
                  <ScopeBadge scope={p.access_scope} />
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(27,138,90,0.12)', color: '#1B5E20', letterSpacing: '.04em' }}>
                    CAN AMEND
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {p.email}{p.phone ? ` · ${p.phone}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => handleRemoveAmender(p)} disabled={saving === p.id} style={{
                width: '24px', height: '24px', borderRadius: '6px', border: 'none',
                background: 'rgba(229,57,53,0.08)', color: '#C62828',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Grant access to existing config persons ── */}
      {otherPeople.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>
            Grant access to existing contacts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {otherPeople.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '7px 10px', borderRadius: '7px',
                border: '1px solid rgba(146,140,227,0.12)', background: 'var(--bg-elevated)',
              }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(146,140,227,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)',
                }}>
                  {p.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>{p.full_name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>{p.email}</span>
                </div>
                <ScopeBadge scope={p.access_scope} />
                <button
                  type="button"
                  onClick={() => toggleAmend(p)}
                  disabled={saving === p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: 'none',
                    background: saving === p.id ? 'rgba(27,138,90,0.2)' : 'rgba(27,138,90,0.12)',
                    color: '#1B5E20', cursor: saving === p.id ? 'wait' : 'pointer', flexShrink: 0,
                  }}
                >
                  <Check size={10} strokeWidth={2.5} />
                  {saving === p.id ? '…' : 'Grant'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {amenders.length === 0 && otherPeople.length === 0 && !showAdd && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          No people added to this configuration yet. Add contacts in section 4 first, or add someone below.
        </p>
      )}

      {/* ── Add new person ── */}
      {!showAdd && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {hasPickable && (
            <button type="button" onClick={() => { setShowAdd(true); setAddMode('contacts') }} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              border: '1px solid rgba(0,129,255,0.3)', color: '#0057B8',
              background: 'rgba(0,129,255,0.06)', cursor: 'pointer',
            }}>
              Client contacts
            </button>
          )}
          <button type="button" onClick={() => { setShowAdd(true); setAddMode('form') }} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            border: '1px solid rgba(146,140,227,0.25)', color: 'var(--text-secondary)',
            background: 'var(--bg-elevated)', cursor: 'pointer',
          }}>
            <UserPlus size={12} /> Add new person
          </button>
        </div>
      )}

      {showAdd && (
        <div style={{
          marginTop: '8px', padding: '14px', borderRadius: '10px',
          border: '1px solid rgba(146,140,227,0.2)', background: 'var(--bg-surface)',
        }}>
          {hasPickable && (
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {(['contacts', 'form'] as const).map(m => (
                <button key={m} type="button" onClick={() => setAddMode(m)} style={{
                  padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: addMode === m ? '#0081FF' : 'transparent',
                  color: addMode === m ? 'white' : 'var(--text-muted)',
                }}>
                  {m === 'contacts' ? 'Client contacts' : 'New person'}
                </button>
              ))}
            </div>
          )}

          {/* Client contacts picker */}
          {addMode === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {clientContacts.map(c => (
                <button key={c.id} type="button" onClick={() => handleSelectClientContact(c)} disabled={saving === 'new'} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                  padding: '8px 10px', borderRadius: '7px', cursor: saving === 'new' ? 'wait' : 'pointer',
                  border: '1px solid rgba(0,129,255,0.15)', background: 'rgba(0,129,255,0.03)',
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(0,129,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700, color: '#0057B8',
                  }}>
                    {c.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{c.full_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {c.email}
                      <span style={{ marginLeft: '5px', opacity: 0.7, textTransform: 'capitalize' }}>
                        · {(c.role_label_custom || c.role_label).replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* New person form */}
          {addMode === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '4px' }}>Full name *</label>
                  <input type="text" value={fName} onChange={e => setFName(e.target.value)} placeholder="e.g. Jane Smith"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', outline: 'none', border: '1px solid rgba(146,140,227,0.2)', background: 'var(--bg-elevated)', color: 'var(--text-heading)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '4px' }}>Email *</label>
                  <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="jane@company.com"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', outline: 'none', border: '1px solid rgba(146,140,227,0.2)', background: 'var(--bg-elevated)', color: 'var(--text-heading)' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '4px' }}>Phone</label>
                <input type="text" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+1 555 000 0000"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', outline: 'none', border: '1px solid rgba(146,140,227,0.2)', background: 'var(--bg-elevated)', color: 'var(--text-heading)' }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '6px' }}>Access scope</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {([
                    { value: 'fleet_wide',   label: 'Fleet-wide' },
                    { value: 'location',     label: 'All floors' },
                    { value: 'sub_location', label: 'Specific floors' },
                  ] as { value: OrchestratorAccessScope; label: string }[]).map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => { setFScope(opt.value); if (opt.value !== 'sub_location') setFSubLocs([]) }}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        border: fScope === opt.value ? '1px solid rgba(165,42,225,0.4)' : '1px solid rgba(146,140,227,0.2)',
                        background: fScope === opt.value ? 'rgba(165,42,225,0.08)' : 'transparent',
                        color: fScope === opt.value ? '#A52AE1' : 'var(--text-muted)', cursor: 'pointer',
                      }}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>
              {fScope === 'sub_location' && subLocations.length > 0 && (
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '6px' }}>Floors / zones</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {subLocations.map(sl => {
                      const sel = fSubLocs.includes(sl.id)
                      return (
                        <button key={sl.id} type="button"
                          onClick={() => setFSubLocs(prev => sel ? prev.filter(id => id !== sl.id) : [...prev, sl.id])}
                          style={{
                            padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                            border: sel ? '1px solid rgba(165,42,225,0.4)' : '1px solid rgba(146,140,227,0.2)',
                            background: sel ? 'rgba(165,42,225,0.08)' : 'transparent',
                            color: sel ? '#A52AE1' : 'var(--text-muted)', cursor: 'pointer',
                          }}
                        >{sl.name}</button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p style={{ fontSize: '12px', color: '#C62828', marginTop: '8px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowAdd(false); setError(null) }} style={{
              padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
              border: '1px solid rgba(146,140,227,0.2)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}>Cancel</button>
            {addMode === 'form' && (
              <button type="button" onClick={handleAddNew} disabled={saving === 'new' || !fName.trim() || !fEmail.trim()} style={{
                padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, border: 'none',
                background: (saving === 'new' || !fName.trim() || !fEmail.trim()) ? 'rgba(27,138,90,0.3)' : 'linear-gradient(135deg, #1B8A5A, #1565C0)',
                color: 'white', cursor: (saving === 'new' || !fName.trim() || !fEmail.trim()) ? 'not-allowed' : 'pointer',
              }}>
                {saving === 'new' ? 'Adding…' : 'Add & grant access'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
