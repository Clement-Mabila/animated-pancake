'use client'

import { useState, useEffect } from 'react'
import { X, Users, UserPlus, Check } from 'lucide-react'
import type { ConfigPerson, OrchestratorAccessScope, SubLocation } from '@/types'
import {
  getPersonsForConfigAction,
  upsertConfigPersonAction,
  updatePersonScopeAction,
  deleteConfigPersonAction,
  getSubLocationsAction,
  getClientContactsForLocationAction,
} from '@/app/actions/configPersons'
import type { ClientContactRow } from '@/app/actions/configPersons'

function ScopeBadge({ scope, subLocations, ids }: {
  scope:        OrchestratorAccessScope
  subLocations: SubLocation[]
  ids:          string[]
}) {
  if (scope === 'fleet_wide') return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(0,129,255,0.10)', color: '#0057B8', letterSpacing: '.04em' }}>FLEET-WIDE</span>
  )
  if (scope === 'location') return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(165,42,225,0.10)', color: '#7B1FA2', letterSpacing: '.04em' }}>ALL FLOORS</span>
  )
  const names = ids.map(id => subLocations.find(s => s.id === id)?.name).filter(Boolean)
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(245,124,0,0.10)', color: '#BF360C', letterSpacing: '.04em' }}>
      {names.length > 0 ? names.join(', ') : 'SITE-SPECIFIC'}
    </span>
  )
}

interface Props {
  fieldKey:        string
  label?:          string | null
  configurationId: string
  locationId:      string
  value:           string[]
  onChange:        (ids: string[]) => void
}

export default function OrchestratorUserSelector({
  fieldKey, label, configurationId, locationId, value, onChange,
}: Props) {
  const isFleetWide = fieldKey === 'fleet_wide_recipients'
  const scopeFilter: OrchestratorAccessScope[] = isFleetWide
    ? ['fleet_wide']
    : ['location', 'sub_location']

  const [recipients,    setRecipients]    = useState<ConfigPerson[]>([])
  // Section-4 persons not yet assigned as recipients
  const [section4,      setSection4]      = useState<ConfigPerson[]>([])
  // Client contacts for this location
  const [clientContacts, setClientContacts] = useState<ClientContactRow[]>([])
  const [subLocations,  setSubLocations]  = useState<SubLocation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showAdd,       setShowAdd]       = useState(false)
  const [addMode,       setAddMode]       = useState<'form' | 'contacts'>('form')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  // New person form state
  const [fName,    setFName]    = useState('')
  const [fEmail,   setFEmail]   = useState('')
  const [fPhone,   setFPhone]   = useState('')
  const [fScope,   setFScope]   = useState<OrchestratorAccessScope>(isFleetWide ? 'fleet_wide' : 'location')
  const [fSubLocs, setFSubLocs] = useState<string[]>([])
  const [fAmend,   setFAmend]   = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [allPersons, sls, clientCs] = await Promise.all([
          getPersonsForConfigAction(configurationId),
          getSubLocationsAction(locationId),
          getClientContactsForLocationAction(locationId),
        ])

        const recs = allPersons.filter(p => p.access_scope !== null && scopeFilter.includes(p.access_scope))
        const sec4 = allPersons.filter(p => p.access_scope === null && p.contact_roles.length > 0)

        // Client contacts not already in config_persons (by email)
        const personEmails = new Set(allPersons.map(p => p.email.toLowerCase()))
        const availableClients = clientCs.filter(c => !personEmails.has(c.email.toLowerCase()))

        setRecipients(recs)
        setSection4(sec4)
        setClientContacts(availableClients)
        setSubLocations(sls)

        const newIds = recs.map(p => p.id)
        if (JSON.stringify(newIds) !== JSON.stringify(value)) onChange(newIds)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configurationId, locationId])

  function syncToParent(updated: ConfigPerson[]) {
    setRecipients(updated)
    onChange(updated.map(p => p.id))
  }

  async function handleRemove(person: ConfigPerson) {
    if (person.contact_roles.length > 0) {
      const res = await updatePersonScopeAction({ id: person.id, accessScope: null })
      if (!res.ok) return
      setSection4(prev => [...prev, res.person])
    } else {
      const res = await deleteConfigPersonAction(person.id)
      if (!res.ok) return
    }
    syncToParent(recipients.filter(p => p.id !== person.id))
  }

  // Promote a section-4 person to recipient
  async function handleSelectSection4(person: ConfigPerson) {
    setSaving(true); setError(null)
    const scope: OrchestratorAccessScope = isFleetWide ? 'fleet_wide' : 'location'
    const res = await updatePersonScopeAction({ id: person.id, accessScope: scope })
    setSaving(false)
    if (!res.ok) { setError(res.error); return }
    setSection4(prev => prev.filter(p => p.id !== person.id))
    syncToParent([...recipients, res.person])
    setShowAdd(false)
  }

  // Import a client_contact — creates a new config_persons row with scope set
  async function handleSelectClientContact(contact: ClientContactRow) {
    setSaving(true); setError(null)
    const scope: OrchestratorAccessScope = isFleetWide ? 'fleet_wide' : 'location'
    const res = await upsertConfigPersonAction({
      configurationId,
      fullName:      contact.full_name,
      email:         contact.email,
      phone:         contact.phone,
      contactRoles:  [],
      accessScope:   scope,
    })
    setSaving(false)
    if (!res.ok) { setError(res.error); return }
    setClientContacts(prev => prev.filter(c => c.id !== contact.id))
    syncToParent([...recipients, res.person])
    setShowAdd(false)
  }

  async function handleAddNew() {
    setSaving(true); setError(null)
    const scope: OrchestratorAccessScope = isFleetWide ? 'fleet_wide' : fScope
    const res = await upsertConfigPersonAction({
      configurationId,
      fullName:          fName,
      email:             fEmail,
      phone:             fPhone || null,
      contactRoles:      [],
      accessScope:       scope,
      subLocationIds:    scope === 'sub_location' ? fSubLocs : [],
      canAmendSchedules: fAmend,
    })
    setSaving(false)
    if (!res.ok) { setError(res.error); return }
    syncToParent([...recipients, res.person])
    setFName(''); setFEmail(''); setFPhone('')
    setFScope(isFleetWide ? 'fleet_wide' : 'location')
    setFSubLocs([]); setFAmend(false); setShowAdd(false)
  }

  const hasPickableContacts = section4.length > 0 || clientContacts.length > 0

  if (loading) return (
    <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Loading…</div>
  )

  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '8px' }}>
        {label ?? (isFleetWide ? 'Fleet-wide report recipients' : 'Site-specific report recipients')}
      </p>

      {/* Existing recipient cards */}
      {recipients.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
          {recipients.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '8px',
              border: '1px solid rgba(146,140,227,0.15)', background: 'var(--bg-elevated)',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #A52AE1 0%, #3999FE 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: 'white',
              }}>
                {p.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{p.full_name}</span>
                  {p.access_scope && <ScopeBadge scope={p.access_scope} subLocations={subLocations} ids={p.sub_location_ids} />}
                  {p.can_amend_schedules && (
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(27,138,90,0.10)', color: '#1B5E20', letterSpacing: '.04em' }}>CAN AMEND</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {p.email}{p.phone ? ` · ${p.phone}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => handleRemove(p)} style={{
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

      {recipients.length === 0 && !showAdd && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          No {isFleetWide ? 'fleet-wide' : 'site-specific'} recipients added yet.
        </p>
      )}

      {/* Add buttons */}
      {!showAdd && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {hasPickableContacts && (
            <button type="button" onClick={() => { setShowAdd(true); setAddMode('contacts') }} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              border: '1px solid rgba(0,129,255,0.3)', color: '#0057B8',
              background: 'rgba(0,129,255,0.06)', cursor: 'pointer',
            }}>
              <Users size={12} /> Select from contacts
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

      {/* Add panel */}
      {showAdd && (
        <div style={{
          marginTop: '8px', padding: '14px', borderRadius: '10px',
          border: '1px solid rgba(146,140,227,0.2)', background: 'var(--bg-surface)',
        }}>
          {/* Mode tabs */}
          {hasPickableContacts && (
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              {(['contacts', 'form'] as const).map(m => (
                <button key={m} type="button" onClick={() => setAddMode(m)} style={{
                  padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: addMode === m ? '#0081FF' : 'transparent',
                  color: addMode === m ? 'white' : 'var(--text-muted)',
                }}>
                  {m === 'contacts' ? 'From contacts' : 'New person'}
                </button>
              ))}
            </div>
          )}

          {/* Contact picker — two groups */}
          {addMode === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {section4.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }}>
                    From section 4 — contacts by role
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {section4.map(p => (
                      <button key={p.id} type="button" onClick={() => handleSelectSection4(p)} disabled={saving} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                        padding: '8px 10px', borderRadius: '7px', cursor: saving ? 'wait' : 'pointer',
                        border: '1px solid rgba(146,140,227,0.15)', background: 'var(--bg-elevated)',
                      }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(165,42,225,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700, color: '#A52AE1',
                        }}>
                          {p.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{p.full_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {p.email}
                            {p.contact_roles.length > 0 && (
                              <span style={{ marginLeft: '5px', opacity: 0.7 }}>
                                · {p.contact_roles.map(r => r.replace(/_/g, ' ')).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {clientContacts.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }}>
                    Client contacts for this location
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {clientContacts.map(c => (
                      <button key={c.id} type="button" onClick={() => handleSelectClientContact(c)} disabled={saving} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                        padding: '8px 10px', borderRadius: '7px', cursor: saving ? 'wait' : 'pointer',
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
                </div>
              )}
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

              {!isFleetWide && (
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '6px' }}>Access scope</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {([
                      { value: 'location',     label: 'All floors / zones' },
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
              )}

              {!isFleetWide && fScope === 'sub_location' && subLocations.length > 0 && (
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '6px' }}>Floors / zones</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {subLocations.map(sl => {
                      const selected = fSubLocs.includes(sl.id)
                      return (
                        <button key={sl.id} type="button"
                          onClick={() => setFSubLocs(prev => selected ? prev.filter(id => id !== sl.id) : [...prev, sl.id])}
                          style={{
                            padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                            border: selected ? '1px solid rgba(165,42,225,0.4)' : '1px solid rgba(146,140,227,0.2)',
                            background: selected ? 'rgba(165,42,225,0.08)' : 'transparent',
                            color: selected ? '#A52AE1' : 'var(--text-muted)', cursor: 'pointer',
                          }}
                        >{sl.name}</button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button type="button" onClick={() => setFAmend(v => !v)} style={{
                  width: '17px', height: '17px', borderRadius: '4px', flexShrink: 0,
                  border: fAmend ? 'none' : '1.5px solid rgba(146,140,227,0.3)',
                  background: fAmend ? 'linear-gradient(135deg, #0081FF, #A52AE1)' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                  {fAmend && <Check size={10} color="white" strokeWidth={3} />}
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Can amend robot schedules / settings</span>
              </div>
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
              <button type="button" onClick={handleAddNew} disabled={saving || !fName.trim() || !fEmail.trim()} style={{
                padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, border: 'none',
                background: (saving || !fName.trim() || !fEmail.trim()) ? 'rgba(165,42,225,0.3)' : 'linear-gradient(135deg, #0081FF, #A52AE1)',
                color: 'white', cursor: (saving || !fName.trim() || !fEmail.trim()) ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Adding…' : 'Add person'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
