// src/components/admin/contacts/contactsConstants.ts
import { format, isValid } from 'date-fns'
import type { ContactRoleLabel, ConfigStatus } from '@/types'

// ── Date formatter ────────────────────────────────────────────────────────────
export function safeFormat(value: string | null | undefined, formatStr: string, fallback = '—'): string {
  if (!value) return fallback
  const date = new Date(value)
  return isValid(date) ? format(date, formatStr) : fallback
}

// ── Role → left-panel gradient (ContactCard) ──────────────────────────────────
const ROLE_GRADIENTS: Record<string, string> = {
  exec:                'from-violet-500 via-violet-600 to-violet-500',
  ops_director:        'from-blue-600 via-blue-500 to-blue-700',
  site_manager:        'from-emerald-500 via-emerald-600 to-emerald-500',
  it_manager:          'from-sky-500 via-sky-600 to-sky-500',
  owner:               'from-amber-500 via-amber-600 to-amber-500',
  operations_director: 'from-orange-500 via-orange-600 to-orange-500',
  supervisor:          'from-cyan-500 via-cyan-600 to-cyan-500',
  facilities_manager:  'from-lime-500 via-lime-600 to-lime-500',
  fleet_wide_manager:  'from-rose-500 via-rose-600 to-rose-500',
  other:               'from-slate-500 via-slate-600 to-slate-500',
}

export function getRoleGradient(role: string): string {
  return ROLE_GRADIENTS[role] ?? ROLE_GRADIENTS.other
}

// ── Role → inline badge (table row) ──────────────────────────────────────────
interface BadgeStyle { text: string; bg: string }

const ROLE_BADGE: Record<string, BadgeStyle> = {
  exec:                { text: 'text-violet-600',  bg: 'bg-violet-50'  },
  ops_director:        { text: 'text-blue-600',    bg: 'bg-blue-50'    },
  site_manager:        { text: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
  it_manager:          { text: 'text-sky-600',     bg: 'bg-sky-50'     },
  owner:               { text: 'text-amber-600',   bg: 'bg-amber-50'   },
  operations_director: { text: 'text-orange-600',  bg: 'bg-orange-50'  },
  supervisor:          { text: 'text-cyan-600',    bg: 'bg-cyan-50'    },
  facilities_manager:  { text: 'text-lime-600',    bg: 'bg-lime-50'    },
  fleet_wide_manager:  { text: 'text-rose-600',    bg: 'bg-rose-50'    },
  other:               { text: 'text-slate-500',   bg: 'bg-slate-100'  },
}

export function getRoleBadge(role: string): BadgeStyle {
  return ROLE_BADGE[role] ?? { text: 'text-slate-500', bg: 'bg-slate-100' }
}

// ── Config status → badge style ───────────────────────────────────────────────
interface ConfigStatusStyle { bg: string; text: string; dot: string }

const CONFIG_STATUS_STYLES: Record<string, ConfigStatusStyle> = {
  active:    { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-600',   dot: 'bg-amber-400'   },
  draft:     { bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-400'   },
  inactive:  { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400'     },
  archived:  { bg: 'bg-slate-100',  text: 'text-slate-400',   dot: 'bg-slate-300'   },
  in_review: { bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-400'    },
}

export function getConfigStatusStyle(status: ConfigStatus | string): ConfigStatusStyle {
  return CONFIG_STATUS_STYLES[status] ?? CONFIG_STATUS_STYLES.draft
}

// ── Shared types ──────────────────────────────────────────────────────────────
export interface LinkedConfiguration {
  id: string
  status: ConfigStatus
  phase: string
}

export interface ContactLocation {
  name: string
}

export interface ContactRow {
  id: string
  full_name: string
  role_label: ContactRoleLabel
  role_label_custom?: string | null
  email: string
  phone?: string | null
  location?: ContactLocation | null
  sub_location?: ContactLocation | null
  linked_configuration?: LinkedConfiguration | null
  created_at: string
}

export type ContactPendingChange = {
  role_label?: ContactRoleLabel
}

export type PendingChangesMap = Record<string, ContactPendingChange>

export type ContactSortField = 'name' | 'role' | 'location' | 'created' | null

export type SortDirection = 'asc' | 'desc'
