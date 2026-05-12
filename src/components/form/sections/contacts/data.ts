// ── Types ────────────────────────────────────────────────────

export interface Person {
  id: string
  name: string
  email: string
  phone: string
  roles: string[]
}

export interface RoleDef {
  id: string
  label: string
  category: string
  required: boolean
}

// ── Role definitions ─────────────────────────────────────────

export const ALL_ROLES: RoleDef[] = [
  { id: 'exec_sponsor',    label: 'Executive Sponsor',         category: 'Fleet-wide',    required: true  },
  { id: 'ops_director',    label: 'Operations Director',       category: 'Fleet-wide',    required: false },
  { id: 'robot_programme', label: 'Robot Programme Manager',   category: 'Fleet-wide',    required: true  },
  { id: 'finance_contact', label: 'Finance & Reporting',       category: 'Fleet-wide',    required: false },
  { id: 'it_network',      label: 'IT / Network Contact',      category: 'Fleet-wide',    required: true  },
  { id: 'billing_ar',      label: 'Billing / AR Contact',      category: 'Fleet-wide',    required: false },
  { id: 'po_approver',     label: 'PO Approver',               category: 'Fleet-wide',    required: false },
  { id: 'site_manager',    label: 'Site Manager',              category: 'Site-specific', required: false },
  { id: 'cleaning_super',  label: 'Cleaning Supervisor',       category: 'Site-specific', required: false },
  { id: 'hs_officer',      label: 'Health & Safety Officer',   category: 'Site-specific', required: false },
  { id: 'first_responder', label: 'First Responder',           category: 'Site-specific', required: true  },
  { id: 'csat_contact',    label: 'CSAT Contact',              category: 'Site-specific', required: false },
  { id: 'parts_contact',   label: 'Parts Collection Contact',  category: 'Site-specific', required: false },
  { id: 'mbody_tam',       label: 'MBody AI TAM',              category: 'MBody AI',      required: false },
]

export const REQUIRED_ROLE_IDS = ALL_ROLES.filter(r => r.required).map(r => r.id)

export const CATEGORIES = ['Fleet-wide', 'Site-specific', 'MBody AI'] as const

export const CATEGORY_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  'Fleet-wide':    { color: '#0057B8', bg: 'rgba(0,129,255,0.10)',  border: 'rgba(0,87,184,0.22)'   },
  'Site-specific': { color: '#7B1FA2', bg: 'rgba(165,42,225,0.08)', border: 'rgba(123,31,162,0.22)' },
  'MBody AI':      { color: '#1565C0', bg: 'rgba(57,153,254,0.10)', border: 'rgba(57,153,254,0.22)' },
}

// ── Derived helpers ───────────────────────────────────────────

export function getUnassignedRequiredRoles(persons: Person[], roles: RoleDef[] = ALL_ROLES): RoleDef[] {
  const assigned = new Set(persons.flatMap(p => p.roles))
  return roles.filter(r => r.required && !assigned.has(r.id))
}

// ── Data migration ────────────────────────────────────────────
// Handles both the new { persons } shape and the legacy { contacts } shape.

export function migrateContactsData(data: Record<string, unknown>): {
  persons: Person[]
  checkpoints: Record<string, boolean>
} {
  const checkpoints = (data.checkpoints as Record<string, boolean>) ?? {}

  // Already new format
  if (Array.isArray(data.persons)) {
    return { persons: data.persons as Person[], checkpoints }
  }

  // Legacy format: { contacts: { exec_sponsor: { name, email, phone }, ... } }
  if (data.contacts && typeof data.contacts === 'object') {
    const old = data.contacts as Record<string, { name?: string; email?: string; phone?: string }>
    const persons: Person[] = []

    Object.entries(old).forEach(([roleId, contact]) => {
      if (!contact?.name?.trim() && !contact?.email?.trim()) return
      // Merge into existing person if same email
      const existing = contact.email
        ? persons.find(p => p.email === contact.email)
        : undefined
      if (existing) {
        existing.roles.push(roleId)
      } else {
        persons.push({
          id: crypto.randomUUID(),
          name:  contact.name  ?? '',
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          roles: [roleId],
        })
      }
    })

    return { persons, checkpoints }
  }

  return { persons: [], checkpoints }
}

// ── Manual view helpers ───────────────────────────────────────
// These let the legacy role-first view read/write from the same persons array.

export function getContactForRole(persons: Person[], roleId: string) {
  const person = persons.find(p => p.roles.includes(roleId))
  return {
    name:  person?.name  ?? '',
    email: person?.email ?? '',
    phone: person?.phone ?? '',
  }
}

export function setContactForRole(
  persons: Person[],
  roleId: string,
  field: 'name' | 'email' | 'phone',
  value: string,
): Person[] {
  const idx = persons.findIndex(p => p.roles.includes(roleId))

  if (idx >= 0) {
    const updated = persons.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    // Clean up ghost person: all fields empty and only this one role
    const p = updated[idx]
    if (!p.name.trim() && !p.email.trim() && !p.phone.trim() && p.roles.length === 1) {
      return updated.filter((_, i) => i !== idx)
    }
    return updated
  }

  // Don't create a person for an empty value
  if (!value.trim()) return persons

  return [
    ...persons,
    {
      id:    crypto.randomUUID(),
      name:  field === 'name'  ? value : '',
      email: field === 'email' ? value : '',
      phone: field === 'phone' ? value : '',
      roles: [roleId],
    },
  ]
}