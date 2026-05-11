'use client'

import { useState, useEffect } from 'react'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'
import PersonCard from './contacts/PersonCard'
import { User, Menu, Info } from "lucide-react";
import PersonModal from './contacts/PersonModal'
import UnassignedRolesWarning from './contacts/UnassignedRolesWarning'
import {
  ALL_ROLES,
  CATEGORY_COLORS,
  getUnassignedRequiredRoles,
  migrateContactsData,
  getContactForRole,
  setContactForRole,
} from './contacts/data'
import type { Person } from './contacts/data'

// ── Props ─────────────────────────────────────────────────────

interface ContactsSectionProps {
  data?:          Record<string, unknown>
  onSave:         (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?:    (data: Record<string, unknown>) => void
  isSaving?:      boolean
  isComplete?:    boolean
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

// ── Scoped styles for the view toggle ─────────────────────────

const tabBase: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.15s',
  letterSpacing: '0.03em',
}

// ── Manual-view role card (legacy style, kept in sync) ────────

function ManualRoleCard({
  roleId, roleLabel, scope, value, onChange,
}: {
  roleId:    string
  roleLabel: string
  scope:     string
  value:     { name: string; email: string; phone: string }
  onChange:  (field: 'name' | 'email' | 'phone', val: string) => void
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
    <div style={{
      border: 'var(--border-subtle)',
      borderRadius: '8px',
      padding: '12px 14px',
      background: 'var(--bg-elevated)',
    }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '3px', color: c.color }}>
        {scope}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
        {roleLabel}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        <input type="text"  placeholder="Full name"     value={value.name}  onChange={e => onChange('name',  e.target.value)} style={inputStyle} />
        <input type="email" placeholder="Email address" value={value.email} onChange={e => onChange('email', e.target.value)} style={inputStyle} />
        <input type="tel"   placeholder="Phone number"  value={value.phone} onChange={e => onChange('phone', e.target.value)} style={inputStyle} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function ContactsSection({
  data = {},
  onSave,
  onAutoSave,
  isSaving,
}: ContactsSectionProps) {

  // Migrate on first load; supports legacy { contacts: {} } and new { persons: [] }
  const migrated = migrateContactsData(data)

  const [persons,  setPersons]  = useState<Person[]>(migrated.persons)
  const [checked,  setChecked]  = useState<Record<string, boolean>>(migrated.checkpoints)
  const [viewMode, setViewMode] = useState<'person' | 'manual'>('person')

  // Modal state
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)

  // Sync if parent data changes (e.g. session switch)
  useEffect(() => {
    if (Object.keys(data).length === 0) return
    const m = migrateContactsData(data)
    setPersons(m.persons)
    setChecked(m.checkpoints)
  }, [data])

  // ── Derived ────────────────────────────────────────────────
  const unassignedRequired = getUnassignedRequiredRoles(persons)
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

  function handleModalSave(person: Person) {
    const updated = editingPerson
      ? persons.map(p => (p.id === person.id ? person : p))
      : [...persons, person]
    setModalOpen(false)
    setEditingPerson(null)
    pushPersons(updated)
  }

  function handleRemovePerson(id: string) {
    const updated = persons.filter(p => p.id !== id)
    pushPersons(updated)
  }

  function pushPersons(updated: Person[]) {
    setPersons(updated)
    onAutoSave?.({ persons: updated, checkpoints: checked })
  }

  // ── Manual view helpers ────────────────────────────────────

  function handleManualChange(
    roleId: string,
    field: 'name' | 'email' | 'phone',
    value: string,
  ) {
    const updated = setContactForRole(persons, roleId, field, value)
    setPersons(updated)
    onAutoSave?.({ persons: updated, checkpoints: checked })
  }

  // ── Checkpoints ────────────────────────────────────────────

  function handleCheckpoint(id: string, value: boolean) {
    const updated = { ...checked, [id]: value }
    setChecked(updated)
    onAutoSave?.({ persons, checkpoints: updated })
  }

  // ── Save ───────────────────────────────────────────────────

  function handleSave(isComplete: boolean) {
    if (isComplete && !canComplete) return
    onSave({ persons, checkpoints: checked }, isComplete)
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
        className={`
          flex items-center gap-2 px-4 py-1 rounded-2xl transition
          ${viewMode === 'person'
            ? 'bg-white text-sm font-medium shadow-sm'
            : 'bg-transparent text-slate-400'
          }
        `}
      >
        <User className="w-3.5 h-3.5" />
        People
      </button>
      <button
        onClick={() => setViewMode('manual')}
        className={`
          flex items-center text-sm font-medium gap-2 px-4 py-1 rounded-2xl transition
          ${viewMode === 'manual'
            ? 'bg-white text-sm font-medium text-slate-800 shadow-sm'
            : 'bg-transparent text-sm font-medium text-slate-400'
          }
        `}
      >
        <Menu className="w-3.5 h-3.5" />
        Manual entry
      </button>
      </div>

      {/* ════════════════════════════════════════════════════════
          PERSON-FIRST VIEW (default)
      ════════════════════════════════════════════════════════ */}
      {viewMode === 'person' && (
        <>
          {/* Add person button */}
          <button
            onClick={openAddModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 16px',
              borderRadius: '30px',
              background: 'transparent',
              border: '1.5px dashed rgba(146,140,227,0.35)',
              color: 'var(--electric-blue)',
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '14px',
              transition: 'border-color 0.15s, background 0.15s',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(146,140,227,0.65)'
              e.currentTarget.style.background  = 'rgba(0,129,255,0.04)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(146,140,227,0.35)'
              e.currentTarget.style.background  = 'transparent'
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            Add person
          </button>

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
              padding: '24px',
              borderRadius: '10px',
              border: '1px dashed rgba(146,140,227,0.25)',
              background: 'var(--bg-elevated)',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                No people added yet
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Click "Add person" above to get started
              </div>
            </div>
          )}

          {/* Required roles warning */}
          <UnassignedRolesWarning persons={persons} />
        </>
      )}

      {/* ════════════════════════════════════════════════════════
          MANUAL ENTRY VIEW (legacy role-first, kept in sync)
      ════════════════════════════════════════════════════════ */}
      {viewMode === 'manual' && (
        <>
          {/* Info banner */}
          <div style={{
            padding: '10px 13px',
            borderRadius: '7px',
            background: 'rgba(0,129,255,0.06)',
            border: '1px solid rgba(0,129,255,0.15)',
            fontSize: '12px', color: 'var(--text-muted)',
            marginBottom: '16px',
            display: 'flex', gap: '8px', alignItems: 'flex-start',
          }}>
            <span><Info className='w-3.5 h-3.5'/></span>
            <span>
              Changes here are reflected in the People view and vice versa. 
              A person can cover multiple roles — use the People tab for that.
            </span>
          </div>

          {/* Fleet-wide */}
          <SectionDivider label="Fleet-wide contacts" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
            {ALL_ROLES.filter(r => r.category === 'Fleet-wide').map(r => (
              <ManualRoleCard
                key={r.id}
                roleId={r.id}
                roleLabel={r.label}
                scope={r.category}
                value={getContactForRole(persons, r.id)}
                onChange={(field, val) => handleManualChange(r.id, field, val)}
              />
            ))}
          </div>

          {/* Site-specific */}
          <SectionDivider label="Site-specific contacts" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
            {ALL_ROLES.filter(r => r.category === 'Site-specific').map(r => (
              <ManualRoleCard
                key={r.id}
                roleId={r.id}
                roleLabel={r.label}
                scope={r.category}
                value={getContactForRole(persons, r.id)}
                onChange={(field, val) => handleManualChange(r.id, field, val)}
              />
            ))}
          </div>

          {/* MBody AI */}
          <SectionDivider label="MBody AI" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
            {ALL_ROLES.filter(r => r.category === 'MBody AI').map(r => (
              <ManualRoleCard
                key={r.id}
                roleId={r.id}
                roleLabel={r.label}
                scope={r.category}
                value={getContactForRole(persons, r.id)}
                onChange={(field, val) => handleManualChange(r.id, field, val)}
              />
            ))}
          </div>

          {/* Still show warning in manual view */}
          <UnassignedRolesWarning persons={persons} />
        </>
      )}

      {/* ── Checkpoints ── */}
      <CheckpointList
        checkpoints={CHECKPOINTS}
        checked={checked}
        onChange={handleCheckpoint}
      />

      {/* ── Save draft ── */}
      <button
        onClick={() => handleSave(false)}
        disabled={isSaving}
        style={{
          width: '100%', padding: '10px', borderRadius: '8px',
          fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em',
          textTransform: 'uppercase', background: 'transparent',
          border: 'var(--border-subtle)', color: 'var(--text-muted)',
          cursor: isSaving ? 'not-allowed' : 'pointer', marginBottom: '8px',
        }}
      >
        {isSaving ? 'Saving...' : 'Save draft'}
      </button>

      {/* ── Save & complete ── */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => handleSave(true)}
          disabled={isSaving || !canComplete}
          title={
            !canComplete
              ? `Assign ${unassignedRequired.map(r => r.label).join(', ')} before completing`
              : undefined
          }
          style={{
            width: '100%', padding: '12px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600, color: 'white',
            background: canComplete
              ? 'linear-gradient(135deg, #A52AE1, #3999FE)'
              : 'rgba(146,140,227,0.25)',
            border: 'none',
            cursor: (isSaving || !canComplete) ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            boxShadow: canComplete ? '0 2px 12px rgba(0,129,255,0.25)' : 'none',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
        >
          {isSaving
            ? 'Saving...'
            : canComplete
            ? 'Save & mark complete →'
            : `${unassignedRequired.length} required ${unassignedRequired.length === 1 ? 'role' : 'roles'} unassigned`}
        </button>
      </div>

      {/* ── Person add/edit modal ── */}
      {modalOpen && (
        <PersonModal
          person={editingPerson}
          allPersons={persons}
          onSave={handleModalSave}
          onClose={() => { setModalOpen(false); setEditingPerson(null) }}
        />
      )}
    </div>
  )
}