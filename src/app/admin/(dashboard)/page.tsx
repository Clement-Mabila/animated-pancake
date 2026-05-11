import Link from 'next/link'
import {
  Plus,
  UserPlus,
  Download,
  AlignHorizontalJustifyCenter,
  BrainCog,
  Bolt,
  CheckCircle,
} from 'lucide-react'
import { fetchAdminDashboardStats } from '@/lib/admin/fetchAdminData'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import PhaseBreakdownCard from '@/components/admin/dashboard/PhaseBreakdownCard'
import ActivityFeedCard   from '@/components/admin/dashboard/ActivityFeedCard'
import PeoplePanel        from '@/components/admin/dashboard/PeoplePanel'
import type { ConfigPhase } from '@/types'

/* ── Helpers ────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDateLabel() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase()
}

/* ── Badge pill ─────────────────────────────────────────────── */
const BADGE_VARIANTS = {
  blue:    'bg-electric-blue/15 text-electric-blue',
  violet:  'bg-bright-violet/15 text-bright-violet',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  muted:   'bg-soft-lavender/15 text-soft-lavender',
} as const

function Badge({ label, variant }: { label: string; variant: keyof typeof BADGE_VARIANTS }) {
  return (
    <span className={`text-xs font-normal px-2 py-1.5 rounded-2xl whitespace-nowrap ${BADGE_VARIANTS[variant]}`}>
      {label}
    </span>
  )
}

/* ── Inline stat ────────────────────────────────────────────── */
function StatInline({
  label, value, badge, badgeVariant,
}: {
  label: string
  value: number
  badge: string
  badgeVariant: keyof typeof BADGE_VARIANTS
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-elevated rounded-3xl px-5 py-4 min-w-[130px]">
      <span className="text-xs text-slate-600 dark:text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-heading">{value}</span>
        <Badge label={badge} variant={badgeVariant} />
      </div>
    </div>
  )
}

/* ── Quick actions ──────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { icon: Plus,                         label: 'New Configuration', href: '/admin/configurations/new' },
  { icon: UserPlus,                     label: 'Add Contact',       href: '/admin/contacts/new'       },
  { icon: Download,                     label: 'Exports',           href: '/admin/exports'            },
  { icon: AlignHorizontalJustifyCenter, label: 'Audit Log',         href: '/admin/audit'              },
  { icon: Bolt,                         label: 'Configurations',    href: '/admin/configurations'     },
  { icon: BrainCog,                     label: 'Mbody Orion',       href: '/admin/settings'           },
]

/* ── Page ───────────────────────────────────────────────────── */
export default async function AdminDashboardPage() {
  const [{ adminUser }, stats] = await Promise.all([
    requireAdminSession(),
    fetchAdminDashboardStats(),
  ])

  const firstName = (adminUser.full_name ?? adminUser.email).split(' ')[0]

  const activityEntries = stats.recentConfigs.map(row => {
    const r = row as any
    const cc = Array.isArray(r.client_contact) ? r.client_contact[0] : r.client_contact
    return {
      id:         r.id,
      phase:      r.phase,
      status:     r.status,
      clientName: cc?.full_name ?? r.id.slice(0, 8),
      updatedAt:  r.updated_at,
    }
  })

  return (
    <div className="space-y-6">

      {/* ── Hero band ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-none border border-none p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">

          <div className="lg:min-w-[240px]">
            <p className="text-xs font-light text-muted uppercase tracking-widest mb-1">
              {getDateLabel()}
            </p>
            <h1 className="text-3xl font-bold text-heading mb-2.5 mt-2">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-sm text-muted">
              Here's what's happening across your onboarding pipeline today.
            </p>
          </div>

          <div className="flex flex-1 items-center gap-4">
            <div className="flex flex-wrap gap-4">
              <StatInline
                label="Client contacts"
                value={stats.totalContacts}
                badge={stats.newContactsThisMonth > 0 ? `+${stats.newContactsThisMonth} this month` : 'No new'}
                badgeVariant="blue"
              />
              <StatInline
                label="Configurations"
                value={stats.totalConfigs}
                badge={stats.newConfigsThisMonth > 0 ? `+${stats.newConfigsThisMonth} this month` : 'No new'}
                badgeVariant="violet"
              />
              <StatInline
                label="Draft"
                value={stats.draftConfigs}
                badge="Pending setup"
                badgeVariant="warning"
              />
              <StatInline
                label="Pipeline complete"
                value={stats.completeConfigs}
                badge={stats.newLiveThisMonth > 0 ? `+${stats.newLiveThisMonth} live` : 'None live'}
                badgeVariant="success"
              />
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-normal shrink-0">
              <CheckCircle size={13} strokeWidth={2} />
              {stats.completeConfigs} of {stats.totalConfigs} configs complete
            </span>
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_ACTIONS.map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 rounded-2xl bg-surface border border-border px-4 py-2 text-center hover:bg-elevated hover:border-soft-lavender/30 transition-all duration-200 group"
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-elevated group-hover:bg-soft-lavender/15 transition-colors">
              <Icon size={18} strokeWidth={1.5} className="text-body-text" />
            </span>
            <span className="text-xs font-medium text-body-text group-hover:text-heading transition-colors leading-tight">
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Phase progress ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* Left: PhaseBreakdown + PeoplePanel as independent cards */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          <PhaseBreakdownCard
            phaseCounts={stats.phaseCounts}
            totalConfigs={stats.totalConfigs}
          />
          <PeoplePanel
            recentContacts={stats.recentContacts as any}
            staffUsers={stats.staffUsers as any}
          />
        </div>

        {/* Right: Activity feed */}
        <div className="lg:col-span-2 h-full">
          <ActivityFeedCard entries={activityEntries} />
        </div>
      </div>

      {/* ── Recent panels ─────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        <div className="rounded-2xl bg-surface border border-border p-6">
          <h2 className="text-base font-semibold text-heading mb-4">Recent activity</h2>
          <ul className="space-y-2 text-sm">
            {stats.recentAudit.length === 0 && (
              <li className="text-muted">No audit entries yet.</li>
            )}
            {stats.recentAudit.map((row: {
              id: string
              action: string
              entity_type: string
              occurred_at: string
            }) => (
              <li key={row.id} className="flex justify-between gap-2 text-body-text">
                <span>
                  <span className="font-semibold">{row.action}</span>{' · '}{row.entity_type}
                </span>
                <span className="text-xs text-muted shrink-0">
                  {new Date(row.occurred_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/admin/audit"
            className="inline-block mt-4 text-xs font-semibold text-electric-blue no-underline hover:opacity-80 transition-opacity"
          >
            View all →
          </Link>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-6">
          <h2 className="text-base font-semibold text-heading mb-4">Recently updated</h2>
          <ul className="space-y-2 text-sm">
            {stats.recentConfigs.length === 0 && (
              <li className="text-muted">No configurations yet.</li>
            )}
            {stats.recentConfigs.map(row => {
              const r = row as {
                id: string
                updated_at: string
                status: string
                phase: string
                client_contact: { full_name: string } | { full_name: string }[] | null
              }
              const cc = Array.isArray(r.client_contact) ? r.client_contact[0] : r.client_contact
              return (
                <li key={r.id} className="flex justify-between gap-2">
                  <Link
                    href={`/admin/configurations/${r.id}`}
                    className="font-medium text-heading truncate no-underline hover:underline"
                  >
                    {cc?.full_name ?? r.id.slice(0, 8)}
                  </Link>
                  <span className="text-xs text-muted shrink-0">
                    {r.status} · {r.phase}
                  </span>
                </li>
              )
            })}
          </ul>
          <Link
            href="/admin/configurations"
            className="inline-block mt-4 text-xs font-semibold text-electric-blue no-underline hover:opacity-80 transition-opacity"
          >
            All configurations →
          </Link>
        </div>
      </div>
    </div>
  )
}