'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Building2, MapPin } from 'lucide-react'
import { getLocations, getSubLocations } from '@/lib/supabase/queries'
import { createLocationAction, createSubLocationAction } from '@/app/actions/session'
import type { Location, SubLocation } from '@/types'

// ── Shared styles ────────────────────────────────────────────

const inputClass =
  'w-full bg-elevated border border-soft-lavender/20 rounded-md text-heading text-sm px-3.5 py-2.5 outline-none focus:border-soft-lavender transition-colors duration-150'

const labelClass =
  'block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5'

// ── Sub-components ───────────────────────────────────────────

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
          type="button"
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
                type="button"
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
          type="button"
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

// ── Main component ───────────────────────────────────────────

export interface LocationPickerProps {
  /** Called when a location (and its sub-location IDs) are resolved. */
  onLocationSet: (locationId: string, subLocationIds: string[]) => void | Promise<void>
}

export default function LocationPicker({ onLocationSet }: LocationPickerProps) {
  const [locationMode, setLocationMode] = useState<'existing' | 'new'>('existing')

  // Existing location state
  const [locations,           setLocations]           = useState<Location[]>([])
  const [selectedLocation,    setSelectedLocation]    = useState('')
  const [subLocations,        setSubLocations]        = useState<SubLocation[]>([])
  const [selectedSubLocation, setSelectedSubLocation] = useState('')
  const [addingSubToExisting, setAddingSubToExisting] = useState(false)
  const [newSubToExistingName,setNewSubToExistingName]= useState('')

  // New location state
  const [newLocName,     setNewLocName]     = useState('')
  const [newLocIndustry, setNewLocIndustry] = useState('')
  const [newLocCountry,  setNewLocCountry]  = useState('')
  const [newLocCity,     setNewLocCity]     = useState('')
  const [newLocSubNames, setNewLocSubNames] = useState<string[]>([])

  // Saved new location
  const [savedNewLocationId, setSavedNewLocationId] = useState('')
  const [savedSubLocNames,   setSavedSubLocNames]   = useState<string[]>([])
  const [savingNewLocation,  setSavingNewLocation]  = useState(false)
  const [editingNewLocation, setEditingNewLocation] = useState(false)

  // Load locations on mount
  useEffect(() => {
    getLocations().then(setLocations)
  }, [])

  // Load sub-locations when existing location selected, then call onLocationSet
  useEffect(() => {
    if (!selectedLocation) { setSubLocations([]); return }
    getSubLocations(selectedLocation).then(subs => {
      setSubLocations(subs)
      setSelectedSubLocation('')
      setAddingSubToExisting(false)
      setNewSubToExistingName('')
      // When a location is selected (existing mode), immediately notify parent
      onLocationSet(selectedLocation, subs.map(s => s.id))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation])

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
      let subIds: string[] = []
      if (newLocSubNames.length > 0) {
        const subs = await Promise.all(
          newLocSubNames.map(name => createSubLocationAction({ locationId: loc.id, name }))
        )
        subIds = subs.map(s => s.id)
      }
      setSavedNewLocationId(loc.id)
      setSavedSubLocNames([...newLocSubNames])
      setEditingNewLocation(false)
      // Refresh locations list
      getLocations().then(setLocations)
      // Notify parent
      onLocationSet(loc.id, subIds)
    } finally {
      setSavingNewLocation(false)
    }
  }

  async function handleUpdateNewLocation() {
    if (!savedNewLocationId || !newLocName.trim()) return
    setSavingNewLocation(true)
    try {
      const alreadySaved = new Set(savedSubLocNames)
      const toCreate = newLocSubNames.filter(n => !alreadySaved.has(n))
      let newSubIds: string[] = []
      if (toCreate.length > 0) {
        const subs = await Promise.all(
          toCreate.map(name => createSubLocationAction({ locationId: savedNewLocationId, name }))
        )
        newSubIds = subs.map(s => s.id)
        setSavedSubLocNames(prev => [...prev, ...toCreate])
      }
      setEditingNewLocation(false)
      getLocations().then(setLocations)
      // Re-fetch all sub-locations for this location and notify parent
      const allSubs = await getSubLocations(savedNewLocationId)
      onLocationSet(savedNewLocationId, allSubs.map(s => s.id))
    } finally {
      setSavingNewLocation(false)
    }
  }

  function handleModeChange(v: string) {
    setLocationMode(v as 'existing' | 'new')
    setSelectedLocation('')
    setSelectedSubLocation('')
    setSubLocations([])
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
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Existing / New toggle — hidden once a new location is saved */}
      {!savedNewLocationId && (
        <ModeToggle
          value={locationMode}
          onChange={handleModeChange}
          options={[
            { value: 'existing', label: 'Existing client',  icon: <Building2 size={11} /> },
            { value: 'new',      label: 'New client',       icon: <Plus size={11} strokeWidth={2.5} /> },
          ]}
        />
      )}

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
              <option value="">Select a client…</option>
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
                    <option value="">All sub-locations (location-wide)</option>
                    {subLocations.map(sl => (
                      <option key={sl.id} value={sl.id}>{sl.name}</option>
                    ))}
                    <option value="__new__">+ Add new sub-location…</option>
                  </select>
                  {!selectedSubLocation && (
                    <p className="text-xs text-muted mt-1.5">
                      Leave blank to apply to all sub-locations.
                    </p>
                  )}
                </>
              ) : (
                <div
                  style={{
                    padding: '12px 14px', borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid rgba(146,140,227,0.2)',
                  }}
                >
                  <div style={{
                    fontSize: '11px', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    color: 'var(--text-muted)', marginBottom: '8px',
                  }}>
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
                      type="button"
                      onClick={() => { setAddingSubToExisting(false); setNewSubToExistingName('') }}
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
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── New client ── */}
      {locationMode === 'new' && (
        savedNewLocationId && !editingNewLocation ? (
          /* Collapsed summary after save */
          <div
            style={{
              padding: '12px 14px', borderRadius: '8px',
              background: 'var(--bg-elevated)',
              border: '1px solid rgba(146,140,227,0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={13} style={{ color: 'var(--electric-blue)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>
                  {newLocName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingNewLocation(true)}
                className="text-xs text-electric-blue bg-transparent border-0 cursor-pointer"
              >
                Edit
              </button>
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
          /* Create / edit form */
          <div className="flex flex-col gap-3">
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

            <div>
              <label className={labelClass}>Sub-locations</label>

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

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {editingNewLocation && (
                <button
                  type="button"
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
                type="button"
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
  )
}
