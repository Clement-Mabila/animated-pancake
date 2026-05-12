'use client'

import { useState, useEffect, useRef } from 'react'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'
import PersonCard from './contacts/PersonCard'
import { User, Menu, Info, ArrowRight, Loader2, BookUser, Users } from 'lucide-react'
import PersonModal from './contacts/PersonModal'
import UnassignedRolesWarning from './contacts/UnassignedRolesWarning'
import {
  ALL_ROLES,
  CATEGORY_COLORS,
  getUnassignedRequiredRoles,
  getContactForRole,
  setContactForRole,
} from './contacts/data'
import type { Person, RoleDef } from './contacts/data'
import {
  getPersonsForConfigAction,
  upsertConfigPersonAction,
  deleteConfigPersonAction,
  getClientContactsForLocationAction,
} from '@/app/actions/configPersons'
import type { ClientContactRow } from '@/app/actions/configPersons'
import type { WorkflowQuestion, ContactPickerOption } from '@/types'

// ── Props ─────────────────────────────────────────────────────

interface ContactsSectionProps {
  configurationId: string
  locationId?:     string
  data?:           Record<string, unknown>
  onSave:          (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?:     (data: Record<string, unknown>) => void
  isSaving?:       boolean
  isComplete?:     boolean
  questions?:      WorkflowQuestion[]
}

// ── Checkpoints ───────────────────────────────────────────────

const CHECKPOINTS = [
  { id: 'contacts_collected',    label: 'All site contacts collected and verified' },
  { id: 'oncall_confirmed',      label: '24/7 on-call contact confirmed per site' },
  { id: 'escalation_documented', label: 'Escalation path documented (site → ops → exec)' },
  { id: 'billing_loaded',        label: 'Billing / AR contact confirmed and loaded into finance system' },
  { id: 'po_approver_confirmed', label: 'Client PO approver confirmed for Break/Fix work' },
  { id: 'list_uploaded',         label: 'Contact list uploaded to Orchestrator' },
  { id: 'gdpr_obtained',         label: 'GDPR / data sharing consent obtained' },
]

// ── Helpers ───────────────────────────────────────────────────

function dbToPerson(p: { id: string; full_name: string; email: string; phone: string | null; contact_roles: string[] }): Person {
  return { id: p.id, name: p.full_name, email: p.email, phone: p.phone ?? '', roles: p.contact_roles }
}

function roleLabel(row: ClientContactRow) {
  return (row.role_label_custom || row.role_label).replace(/_/g, ' ')
}

// ── Manual-view role card ─────────────────────────────────────

function ManualRoleCard({
  roleId, roleLabel: label, scope, value, onChange, onBlur,
}: {
  roleId:    string
  roleLabel: string
  scope:     string
  value:     { name: string; email: string; phone: string }
  onChange:  (field: 'name' | 'email' | 'phone', val: string) => void
  onBlur:    () => void
}) {
  const c = CATEGORY_COLORS[scope] ?? CATEGORY_COLORS['Fleet-wide']
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid rgba(146,140,227,0.15)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-family)',
    fontSize: '12px',
    padding: '7px 10px',
    outline: 'none',
  }
  return (
    <div style={{ border: 'var(--border-subtle)', borderRadius: '8px', padding: '12px 14px', background: 'var(--bg-elevated)' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '3px', color: c.color }}>{scope}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        <input type="text"  placeholder="Full name"     value={value.name}  onChange={e => onChange('name',  e.target.value)} onBlur={onBlur} style={inputStyle} />
        <input type="email" placeholder="Email address" value={value.email} onChange={e => onChange('email', e.target.value)} onBlur={onBlur} style={inputStyle} />
        <input type="tel"   placeholder="Phone number"  value={value.phone} onChange={e => onChange('phone', e.target.value)} onBlur={onBlur} style={inputStyle} />
      </div>
    </div>
  )
}

// ── Client contacts import picker ─────────────────────────────

function ClientContactPicker({
  contacts,
  existingEmails,
  onSelect,
  onClose,
}: {
  contacts:       ClientContactRow[]
  existingEmails: Set<string>
  onSelect:       (c: ClientContactRow) => void
  onClose:        () => void
}) {
  const available = contacts.filter(c => !existingEmails.has(c.email.toLowerCase()))
  return (
    <div style={{
      marginBottom: '12px', padding: '12px', borderRadius: '10px',
      border: '1px solid rgba(0,129,255,0.2)', background: 'var(--bg-surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Client contacts for this location
        </span>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, padding: '0 2px' }}>×</button>
      </div>
      {available.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>All client contacts are already in the list.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {available.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                padding: '8px 10px', borderRadius: '7px', cursor: 'pointer',
                border: '1px solid rgba(0,129,255,0.15)', background: 'rgba(0,129,255,0.03)',
              }}
            >
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
                  {c.email} · <span style={{ textTransform: 'capitalize' }}>{roleLabel(c)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function ContactsSection({
  configurationId,
  locationId,
  data = {},
  onSave,
  onAutoSave,
  isSaving,
  questions,
}: ContactsSectionProps) {
  const resolvedCheckpoints = questions && questions.some(q => q.field_type === 'checkpoint')
    ? questions.filter(q => q.field_type === 'checkpoint' && q.active).sort((a, b) => a.sort_order - b.sort_order).map(q => ({ id: q.field_key, label: q.label ?? q.field_key }))
    : CHECKPOINTS

  const cpQuestion = questions?.find(q => q.field_type === 'contact_picker' && q.active)
  const resolvedRoles: RoleDef[] = cpQuestion?.options
    ? (cpQuestion.options as unknown as ContactPickerOption[]).map(o => ({
        id:       o.id,
        label:    o.label,
        category: o.category,
        required: o.required,
      }))
    : ALL_ROLES
  const resolvedCategories = [...new Set(resolvedRoles.map(r => r.category))]

  const [persons,  setPersons]  = useState<Person[]>([])
  const [checked,  setChecked]  = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )
  const [viewMode, setViewMode] = useState<'person' | 'manual'>('person')
  const [loading,  setLoading]  = useState(true)

  // Client contacts import
  const [clientContacts,     setClientContacts]     = useState<ClientContactRow[]>([])
  const [showClientPicker,   setShowClientPicker]   = useState(false)
  const clientContactsLoaded = useRef(false)

  // Modal state
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [modalSaving,   setModalSaving]   = useState(false)

  // Track DB IDs and manual view dirty state
  const dbPersonIdsRef    = useRef(new Set<string>())
  const personsRef        = useRef<Person[]>([])
  const dirtyPersonIdsRef = useRef(new Set<string>())
  const manualTimerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { personsRef.current = persons }, [persons])

  // Load persons from DB on mount
  useEffect(() => {
    getPersonsForConfigAction(configurationId)
      .then(dbPersons => {
        const mapped = dbPersons.map(dbToPerson)
        dbPersonIdsRef.current = new Set(mapped.map(p => p.id))
        setPersons(mapped)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [configurationId])

  // Sync checkpoints if parent data changes
  useEffect(() => {
    if (data.checkpoints) setChecked(data.checkpoints as Record<string, boolean>)
  }, [data])

  // Load client contacts lazily when picker is opened
  async function openClientPicker() {
    if (!locationId) return
    if (!clientContactsLoaded.current) {
      const rows = await getClientContactsForLocationAction(locationId).catch(() => [])
      setClientContacts(rows)
      clientContactsLoaded.current = true
    }
    setShowClientPicker(true)
  }

  // ── Derived ────────────────────────────────────────────────
  const existingEmails     = new Set(persons.map(p => p.email.toLowerCase()))
  const unassignedRequired = getUnassignedRequiredRoles(persons, resolvedRoles)
  const canComplete        = unassignedRequired.length === 0

  // ── Person CRUD ────────────────────────────────────────────

  function openAddModal() {
    setEditingPerson(null)
    setModalOpen(true)
  }

  function openEditModal(person: Person) {
    setEditingPerson(person)
    setModalOpen(true)
  }

  function prefillFromClientContact(c: ClientContactRow) {
    setShowClientPicker(false)
    setEditingPerson({
      id:    crypto.randomUUID(),  // temp, replaced by DB id on save
      name:  c.full_name,
      email: c.email,
      phone: c.phone ?? '',
      roles: [],
    })
    setModalOpen(true)
  }

  async function handleModalSave(person: Person) {
    setModalSaving(true)
    const isEdit = !!editingPerson && dbPersonIdsRef.current.has(person.id)

    const result = await upsertConfigPersonAction({
      id:           isEdit ? person.id : undefined,
      configurationId,
      fullName:     person.name,
      email:        person.email,
      phone:        person.phone || null,
      contactRoles: person.roles,
    })
    setModalSaving(false)
    if (!result.ok) return

    const saved = dbToPerson(result.person)
    dbPersonIdsRef.current.add(saved.id)
    setPersons(prev =>
      isEdit
        ? prev.map(p => p.id === editingPerson!.id ? saved : p)
        : [...prev, saved]
    )
    setModalOpen(false)
    setEditingPerson(null)
  }

  async function handleRemovePerson(id: string) {
    if (dbPersonIdsRef.current.has(id)) {
      const res = await deleteConfigPersonAction(id)
      if (!res.ok) return
      dbPersonIdsRef.current.delete(id)
    }
    setPersons(prev => prev.filter(p => p.id !== id))
  }

  // ── Manual view ────────────────────────────────────────────

  function handleManualChange(roleId: string, field: 'name' | 'email' | 'phone', value: string) {
    const updated = setContactForRole(persons, roleId, field, value)
    setPersons(updated)
    const affected = updated.find(p => p.roles.includes(roleId))
    if (affected) dirtyPersonIdsRef.current.add(affected.id)
    clearTimeout(manualTimerRef.current)
    manualTimerRef.current = setTimeout(flushDirtyPersons, 800)
  }

  async function handleManualBlur(roleId: string) {
    clearTimeout(manualTimerRef.current)
    const person = personsRef.current.find(p => p.roles.includes(roleId))
    if (!person || (!person.name.trim() && !person.email.trim())) return
    dirtyPersonIdsRef.current.add(person.id)
    await flushDirtyPersons()
  }

  async function flushDirtyPersons() {
    const dirtyIds = new Set(dirtyPersonIdsRef.current)
    if (dirtyIds.size === 0) return
    dirtyPersonIdsRef.current.clear()

    const current = personsRef.current
    for (const person of current) {
      if (!dirtyIds.has(person.id)) continue
      if (!person.name.trim() && !person.email.trim()) continue

      if (dbPersonIdsRef.current.has(person.id)) {
        await upsertConfigPersonAction({
          id: person.id, configurationId,
          fullName: person.name, email: person.email,
          phone: person.phone || null, contactRoles: person.roles,
        })
      } else {
        const result = await upsertConfigPersonAction({
          configurationId,
          fullName: person.name, email: person.email,
          phone: person.phone || null, contactRoles: person.roles,
        })
        if (result.ok) {
          const dbId = result.person.id
          dbPersonIdsRef.current.add(dbId)
          setPersons(prev => prev.map(p => p.id === person.id ? { ...p, id: dbId } : p))
        }
      }
    }
  }

  // ── Checkpoints ────────────────────────────────────────────

  function handleCheckpoint(id: string, value: boolean) {
    const updated = { ...checked, [id]: value }
    setChecked(updated)
    onAutoSave?.({ checkpoints: updated })
  }

  async function handleSave(isComplete: boolean) {
    if (isComplete && !canComplete) return
    await flushDirtyPersons()
    onSave({ checkpoints: checked }, isComplete)
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Record who is responsible at each level so reports and alerts reach the right person every time.
      </p>

      {/* ── View toggle ── */}
      <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-full p-1 mb-5 w-fit">
        <button
          onClick={() => setViewMode('person')}
          className={`flex items-center gap-2 px-4 py-1 rounded-2xl transition ${
            viewMode === 'person' ? 'bg-white text-sm font-medium shadow-sm' : 'bg-transparent text-slate-400'
          }`}
        >
          <User className="w-3.5 h-3.5" /> People
        </button>
        <button
          onClick={() => setViewMode('manual')}
          className={`flex items-center text-sm font-medium gap-2 px-4 py-1 rounded-2xl transition ${
            viewMode === 'manual'
              ? 'bg-white text-sm font-medium text-slate-800 shadow-sm'
              : 'bg-transparent text-sm font-medium text-slate-400'
          }`}
        >
          <Menu className="w-3.5 h-3.5" /> Manual entry
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading contacts…
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════
              PERSON-FIRST VIEW
          ═══════════════════════════════════════════════════ */}
          {viewMode === 'person' && (
            <>
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <button
                  onClick={openAddModal}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '9px 16px', borderRadius: '30px', background: 'transparent',
                    border: '1.5px dashed rgba(146,140,227,0.35)', color: 'var(--electric-blue)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s', letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(146,140,227,0.65)'; e.currentTarget.style.background = 'rgba(0,129,255,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(146,140,227,0.35)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Add person
                </button>

                {locationId && (
                  <button
                    onClick={openClientPicker}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '9px 16px', borderRadius: '30px', background: 'transparent',
                      border: '1.5px dashed rgba(0,129,255,0.3)', color: '#0057B8',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s', letterSpacing: '0.02em',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,129,255,0.6)'; e.currentTarget.style.background = 'rgba(0,129,255,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,129,255,0.3)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    <BookUser size={13} /> Import from client contacts
                  </button>
                )}
              </div>

              {/* Client contacts picker */}
              {showClientPicker && (
                <ClientContactPicker
                  contacts={clientContacts}
                  existingEmails={existingEmails}
                  onSelect={prefillFromClientContact}
                  onClose={() => setShowClientPicker(false)}
                />
              )}

              {/* Person cards */}
              {persons.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {persons.map(person => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      onEdit={() => openEditModal(person)}
                      onRemove={() => handleRemovePerson(person.id)}
                    />
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '24px', borderRadius: '10px',
                  border: '1px dashed rgba(146,140,227,0.25)',
                  background: 'var(--bg-elevated)', textAlign: 'center', marginBottom: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--text-muted)' }}>
                    <Users size={28} strokeWidth={1.5} aria-hidden />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No people added yet</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click "Add person" above to get started</div>
                </div>
              )}

              <UnassignedRolesWarning persons={persons} roles={resolvedRoles} />
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              MANUAL ENTRY VIEW
          ═══════════════════════════════════════════════════ */}
          {viewMode === 'manual' && (
            <>
              <div style={{
                padding: '10px 13px', borderRadius: '7px',
                background: 'rgba(0,129,255,0.06)', border: '1px solid rgba(0,129,255,0.15)',
                fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px',
                display: 'flex', gap: '8px', alignItems: 'flex-start',
              }}>
                <span><Info className="w-3.5 h-3.5" /></span>
                <span>Changes here are reflected in the People view and vice versa. A person can cover multiple roles — use the People tab for that.</span>
              </div>

              {resolvedCategories.map(cat => (
                <div key={cat}>
                  <SectionDivider label={cat} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                    {resolvedRoles.filter(r => r.category === cat).map(r => (
                      <ManualRoleCard key={r.id} roleId={r.id} roleLabel={r.label} scope={r.category}
                        value={getContactForRole(persons, r.id)}
                        onChange={(field, val) => handleManualChange(r.id, field, val)}
                        onBlur={() => handleManualBlur(r.id)} />
                    ))}
                  </div>
                </div>
              ))}

              <UnassignedRolesWarning persons={persons} roles={resolvedRoles} />
            </>
          )}
        </>
      )}

      {/* ── Checkpoints ── */}
      <CheckpointList checkpoints={resolvedCheckpoints} checked={checked} onChange={handleCheckpoint} />

      {/* ── Save actions ── */}
      <div className="mt-4 flex flex-col">
        <button
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className={`w-full py-2.5 rounded-2xl text-sm font-semibold border border-slate-500 text-heading bg-transparent transition-all mb-2 flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'}`}
        >
          {isSaving ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>) : 'Save draft'}
        </button>

        <button
          onClick={() => handleSave(true)}
          disabled={isSaving || !canComplete}
          title={!canComplete ? `Assign ${unassignedRequired.map(r => r.label).join(', ')} before completing` : undefined}
          className={`w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all text-white shadow-md ${canComplete ? 'bg-violet-500 hover:bg-violet-700' : 'bg-violet-300 cursor-not-allowed'} ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : canComplete ? (
            <>Save & mark complete <ArrowRight className="h-4 w-4" /></>
          ) : (
            `${unassignedRequired.length} required ${unassignedRequired.length === 1 ? 'role' : 'roles'} unassigned`
          )}
        </button>
      </div>

      {/* ── Add / edit modal ── */}
      {modalOpen && (
        <PersonModal
          person={editingPerson}
          allPersons={persons}
          roles={resolvedRoles}
          onSave={handleModalSave}
          onClose={() => { setModalOpen(false); setEditingPerson(null) }}
        />
      )}
      {modalSaving && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 style={{ width: 32, height: 32, color: 'white', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
    </div>
  )
}
