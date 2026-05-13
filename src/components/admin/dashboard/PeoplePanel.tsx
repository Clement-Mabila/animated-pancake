'use client'

import Avatar from '@/components/admin/common/Avatar'
import type { ContactRoleLabel, MBodyRole } from '@/types'

/* ── Types ──────────────────────────────────────────────────── */
interface ClientContactRow {
  id: string
  full_name: string
  email: string
  role_label: ContactRoleLabel
  role_label_custom: string | null
  created_at: string
  location: { name: string } | null
}

interface StaffUserRow {
  id: string
  full_name: string
  email: string
  role: MBodyRole
  created_at: string
  config_status: string | null
}

interface PeoplePanelProps {
  recentContacts: ClientContactRow[]
  staffUsers: StaffUserRow[]
}

/* ── Label maps ─────────────────────────────────────────────── */
const ROLE_LABEL_MAP: Record<ContactRoleLabel, string> = {
  exec:                'Executive',
  ops_director:        'Ops Director',
  site_manager:        'Site Manager',
  it_manager:          'IT Manager',
  owner:               'Owner',
  supervisor:          'Supervisor',
  facilities_manager:  'Facilities Manager',
  operations_director: 'Operations Director',
  fleet_wide_manager:  'Fleet Wide Manager',
  other:               'Other',
}

const STAFF_ROLE_MAP: Record<MBodyRole, string> = {
  sales:            'Sales',
  account_manager:  'Account Manager',
  operations:       'Operations', 
  engineering:      'Engineering',
  finance:          'Finance',
  customer_success: 'Customer Success',
}

/* ── Type badge ─────────────────────────────────────────────── */
function TypeBadge({ type }: { type: 'client' | 'staff' }) {
  return type === 'client' ? (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 whitespace-nowrap">
      Client
    </span>
  ) : (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-500 whitespace-nowrap">
      Staff
    </span>
  )
}

/* ── Status pill ────────────────────────────────────────────── */
function StatusPill({ status }: { status: string | null }) {
  if (!status) return null
  const map: Record<string, { label: string; cls: string }> = {
    draft:           { label: 'Draft',      cls: 'bg-amber-50 text-amber-500'     },
    client_complete: { label: 'In Review',  cls: 'bg-blue-50 text-blue-500'       },
    mbody_complete:  { label: 'Completing', cls: 'bg-violet-50 text-violet-500'   },
    live:            { label: 'Live',       cls: 'bg-emerald-50 text-emerald-600' },
  }
  const cfg = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

/* ── Person card ────────────────────────────────────────────── */
function PersonCard({
  name,
  email,
  sublabel,
  meta,
  type,
  status,
}: {
  name: string
  email: string
  sublabel: string
  meta?: string | null
  type: 'client' | 'staff'
  status?: string | null
}) {
  return (
    <div className="flex items-center gap-3 bg-elevated rounded-2xl px-3 py-2.5 border border-border hover:border-slate-200 hover:shadow-sm transition-all duration-150">
      <Avatar name={name} email={email} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-heading truncate leading-tight">{name}</p>
        <p className="text-[11px] text-muted truncate mt-0.5">
          {sublabel}{meta ? ` · ${meta}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <TypeBadge type={type} />
        {status && <StatusPill status={status} />}
      </div>
    </div>
  )
}

/* ── Component ──────────────────────────────────────────────── */
export default function PeoplePanel({ recentContacts, staffUsers }: PeoplePanelProps) {
  const total = recentContacts.length + staffUsers.length

  return (
    // pb-5 on outer wrapper gives bottom spacing without clipping the scroll area
    <div className="rounded-2xl bg-surface border border-border px-6 pt-6 pb-5 flex flex-col h-full">

      {/* Header */}
      <h2 className="text-base font-semibold text-heading">Onboarding Members</h2>
      <p className="text-xs text-muted mt-0.5 mb-4">
        {total} member{total !== 1 ? 's' : ''} across clients &amp; staff
      </p>

      {/*
        Combined list:
        - maxHeight = 4 cards × 60px + 3 gaps × 8px = 264px (generous for any avatar size)
        - No pb inside scroll — padding lives on the outer wrapper instead
        - Scrollbar hidden cross-browser
      */}
      <div
        className="flex flex-col gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ maxHeight: '264px' }}
      >
        {total === 0 && (
          <p className="text-sm text-muted py-3">No people yet.</p>
        )}

        {recentContacts.map(c => (
          <PersonCard
            key={`contact-${c.id}`}
            name={c.full_name}
            email={c.email}
            sublabel={c.role_label_custom ?? ROLE_LABEL_MAP[c.role_label] ?? c.role_label}
            meta={c.location?.name ?? null}
            type="client"
          />
        ))}

        {staffUsers.map(s => (
          <PersonCard
            key={`staff-${s.id}`}
            name={s.full_name}
            email={s.email}
            sublabel={STAFF_ROLE_MAP[s.role] ?? s.role}
            type="staff"
            status={s.config_status}
          />
        ))}
      </div>
    </div>
  )
}