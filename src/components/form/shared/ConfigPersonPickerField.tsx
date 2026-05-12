'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Users, UserPlus } from 'lucide-react'
import type { ConfigPerson, OrchestratorAccessScope, SubLocation } from '@/types'
import {
  getPersonsForConfigAction,
  upsertConfigPersonAction,
  getClientContactsForLocationAction,
  getSubLocationsAction,
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface Props {
  label?:           string | null
  hint?:            string | null
  placeholder?:     string | null
  configurationId: string
  locationId?:      string
  value:            string
  onChange:         (personId: string) => void
}

export default function ConfigPersonPickerField({
  label,
  hint,
  placeholder,
  configurationId,
  locationId,
  value,
  onChange,
}: Props) {
  const [persons,         setPersons]         = useState<ConfigPerson[]>([])
  const [clientContacts, setClientContacts] = useState<ClientContactRow[]>([])
  const [subLocations,   setSubLocations]   = useState<SubLocation[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showAdd,       setShowAdd]        = useState(false)
  const [addMode,       setAddMode]        = useState<'form' | 'contacts'>('form')
  const [saving,        setSaving]         = useState(false)
  const [error,         setError]          = useState<string | null>(null)

  const [fName,  setFName]  = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fPhone, setFPhone] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [all, sls, rawClients] = await Promise.all([
          getPersonsForConfigAction(configurationId),
          locationId ? getSubLocationsAction(locationId) : Promise.resolve([] as SubLocation[]),
          locationId ? getClientContactsForLocationAction(locationId) : Promise.resolve([] as ClientContactRow[]),
        ])
        if (cancelled) return
        const personEmails = new Set(all.map(p => p.email.toLowerCase()))
        const clients = rawClients.filter(c => !personEmails.has(c.email.toLowerCase()))
        setPersons(all)
        setSubLocations(sls)
        setClientContacts(clients)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [configurationId, locationId])

  const section4 = useMemo(
    () => persons.filter(p => p.access_scope === null && p.contact_roles.length > 0),
    [persons],
  )
  const withReportAccess = useMemo(
    () => persons.filter(p => p.access_scope !== null),
    [persons],
  )

  const selected = persons.find(p => p.id === value)
  const staleId    = Boolean(value && !selected && UUID_RE.test(value))

  const hasPickableContacts = section4.length > 0 || clientContacts.length > 0 || withReportAccess.length > 0

  function pickPerson(p: ConfigPerson) {
    onChange(p.id)
    setShowAdd(false)
    setError(null)
  }

  async function handleImportClient(c: ClientContactRow) {
    setSaving(true)
    setError(null)
    const res = await upsertConfigPersonAction({
      configurationId,
      fullName:     c.full_name,
      email:        c.email,
      phone:        c.phone,
      contactRoles: [],
      accessScope:  null,
    })
    setSaving(false)
    if (!res.ok) { setError(res.error); return }
    const all = await getPersonsForConfigAction(configurationId)
    setPersons(all)
    onChange(res.person.id)
    setClientContacts(prev => prev.filter(x => x.id !== c.id))
    setShowAdd(false)
  }

  async function handleAddNew() {
    setSaving(true)
    setError(null)
    const res = await upsertConfigPersonAction({
      configurationId,
      fullName:     fName,
      email:        fEmail,
      phone:        fPhone || null,
      contactRoles: [],
      accessScope:  null,
    })
    setSaving(false)
    if (!res.ok) { setError(res.error); return }
    const all = await getPersonsForConfigAction(configurationId)
    setPersons(all)
    onChange(res.person.id)
    setFName('')
    setFEmail('')
    setFPhone('')
    setShowAdd(false)
  }

  if (loading) {
    return (
      <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Loading…</div>
    )
  }

  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '8px' }}>
        {label ?? 'Contact'}
      </p>
      {hint && (
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>{hint}</p>
      )}
      {!selected && placeholder && (
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{placeholder}</p>
      )}

      {staleId && (
        <div style={{
          marginBottom: '8px', padding: '10px 12px', borderRadius: '8px',
          border: '1px solid rgba(229,57,53,0.25)', background: 'rgba(229,57,53,0.06)', fontSize: '12px', color: '#B71C1C',
        }}>
          This person is no longer in the directory (they may have been removed). Choose someone else or add them again.
          <button type="button" onClick={() => onChange('')} style={{ marginLeft: '8px', fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#B71C1C' }}>
            Clear
          </button>
        </div>
      )}

      {/* Selected person — same card pattern as OrchestratorUserSelector */}
      {selected && !showAdd && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
          <div style={{
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
              {selected.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{selected.full_name}</span>
                {selected.access_scope && locationId && (
                  <ScopeBadge scope={selected.access_scope} subLocations={subLocations} ids={selected.sub_location_ids} />
                )}
                {selected.can_amend_schedules && (
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(27,138,90,0.10)', color: '#1B5E20', letterSpacing: '.04em' }}>CAN AMEND</span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {selected.email}{selected.phone ? ` · ${selected.phone}` : ''}
              </div>
            </div>
            <button type="button" onClick={() => onChange('')} title="Clear selection" style={{
              width: '24px', height: '24px', borderRadius: '6px', border: 'none',
              background: 'rgba(229,57,53,0.08)', color: '#C62828',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <X size={12} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setShowAdd(true); setAddMode(hasPickableContacts ? 'contacts' : 'form'); setError(null) }}
            style={{
              alignSelf: 'flex-start',
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              border: '1px solid rgba(146,140,227,0.25)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Change contact
          </button>
        </div>
      )}

      {!selected && !showAdd && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          No contact selected yet.
        </p>
      )}

      {!showAdd && (!selected || staleId) && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {hasPickableContacts && (
            <button type="button" onClick={() => { setShowAdd(true); setAddMode('contacts'); setError(null) }} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              border: '1px solid rgba(0,129,255,0.3)', color: '#0057B8',
              background: 'rgba(0,129,255,0.06)', cursor: 'pointer',
            }}>
              <Users size={12} /> Select from contacts
            </button>
          )}
          <button type="button" onClick={() => { setShowAdd(true); setAddMode('form'); setError(null) }} style={{
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

          {addMode === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {section4.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }}>
                    From section 4 — contacts by role
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {section4.map(p => (
                      <button key={p.id} type="button" onClick={() => pickPerson(p)} disabled={saving} style={{
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

              {withReportAccess.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }}>
                    Directory — reporting access (Section 5)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {withReportAccess.map(p => (
                      <button key={p.id} type="button" onClick={() => pickPerson(p)} disabled={saving} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                        padding: '8px 10px', borderRadius: '7px', cursor: saving ? 'wait' : 'pointer',
                        border: '1px solid rgba(146,140,227,0.15)', background: 'var(--bg-elevated)',
                      }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, rgba(165,42,225,0.2), rgba(57,153,254,0.2))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700, color: '#7B1FA2',
                        }}>
                          {p.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>{p.full_name}</span>
                            {locationId && p.access_scope && (
                              <ScopeBadge scope={p.access_scope} subLocations={subLocations} ids={p.sub_location_ids} />
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.email}</div>
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
                      <button key={c.id} type="button" onClick={() => handleImportClient(c)} disabled={saving} style={{
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
