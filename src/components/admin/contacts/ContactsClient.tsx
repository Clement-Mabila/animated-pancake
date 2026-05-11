'use client'
// src/components/admin/contacts/ContactsClient.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, CirclePlus, ListFilter, Check, X } from 'lucide-react'
import { initiateAdminOnboarding } from '@/app/admin/actions/initiateAdminOnboarding'
import { ROLE_DEFINITIONS } from '@/lib/phases'
import { getRoleBadge } from './Contactsconstants'
import ContactsTab from './ContactsTab'
import type { ContactRow, PendingChangesMap, ContactSortField, SortDirection } from './Contactsconstants'
import type { ContactRoleLabel } from '@/types'

// ── Badge pill (mirrors dashboard) ───────────────────────────────────────────
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

function getDateLabel() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase()
}

// ── Collapsible search ────────────────────────────────────────────────────────
interface CollapsibleSearchProps {
  value: string
  onChange: (v: string) => void
}

function CollapsibleSearch({ value, onChange }: CollapsibleSearchProps) {
  const [expanded, setExpanded] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  const expand = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    setExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleBlur = () => {
    closeTimer.current = setTimeout(() => {
      setExpanded(false)
      onChange('')
      closeTimer.current = null
    }, 5000)
  }

  const handleFocus = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }

  if (!expanded) {
    return (
      <button
        onClick={expand}
        className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        aria-label="Open search"
      >
        <Search className="h-4 w-4 text-slate-600" />
      </button>
    )
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <Input
        ref={inputRef}
        placeholder="Search contacts…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="w-64 pl-9 h-10 text-sm bg-white border-slate-200 focus:border-slate-300 rounded-full placeholder:text-slate-400"
      />
    </div>
  )
}

// ── Filters dropdown ──────────────────────────────────────────────────────────
interface FiltersButtonProps {
  availableRoles:  ContactRoleLabel[]
  roleCount:       Record<string, number>
  filterRoles:     Set<ContactRoleLabel>
  filterConfig:    'with' | 'without' | null
  onToggleRole:    (role: ContactRoleLabel) => void
  onToggleConfig:  (v: 'with' | 'without') => void
  onClear:         () => void
  activeCount:     number
}

function FiltersButton({
  availableRoles, roleCount, filterRoles, filterConfig,
  onToggleRole, onToggleConfig, onClear, activeCount,
}: FiltersButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(p => !p)}
        className={`relative h-10 w-10 rounded-2xl border flex items-center justify-center transition-colors ${
          open
            ? 'bg-slate-900 border-slate-900 text-white'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
        aria-label="Filters"
      >
        <ListFilter className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Filters</p>
            {activeCount > 0 && (
              <button
                onClick={onClear}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>

          {/* By Role */}
          <div className=' border-b'></div>
          {availableRoles.length > 0 && (
            <div>
              <p className="text-sm font-normal text-slate-700 mb-2">
                Role Level filter
              </p>
              <div className="flex flex-wrap gap-2.5">
                {availableRoles.map(role => {
                  const selected = filterRoles.has(role)
                  const badge    = getRoleBadge(role)
                  const label    = ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS]?.label ?? role
                  const count    = roleCount[role] ?? 0
                  return (
                    <button
                      key={role}
                      onClick={() => onToggleRole(role)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : `${badge.bg} ${badge.text} border-transparent hover:border-current/20`
                      }`}
                    >
                      {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                      {label}
                      <span className={`text-xs ${selected ? 'opacity-60' : 'opacity-50'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* By Configuration */}
          <div className=' border-b'></div>
          <div>
            <p className="text-sm font-normal text-slate-700 mb-2">
              Conditional Filters
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['with', 'without'] as const).map(v => {
                const selected = filterConfig === v
                const label    = v === 'with' ? 'Has config' : 'No config'
                return (
                  <button
                    key={v}
                    onClick={() => onToggleConfig(v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 flex-shrink-0" />}
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  contacts: ContactRow[]
}

export default function ContactsClient({ contacts }: Props) {
  const router = useRouter()

  const [searchTerm,    setSearchTerm] = useState('')
  const [sortField,     setSortField]  = useState<ContactSortField>(null)
  const [sortDirection, setSortDir]    = useState<SortDirection>('asc')
  const [initiating,    setInitiating] = useState(false)
  const [filterRoles,   setFilterRoles]  = useState<Set<ContactRoleLabel>>(new Set())
  const [filterConfig,  setFilterConfig] = useState<'with' | 'without' | null>(null)

  const handleAddUser = async () => {
    setInitiating(true)
    try {
      const { token } = await initiateAdminOnboarding()
      router.push(`/onboarding?init_token=${token}`)
    } finally {
      setInitiating(false)
    }
  }

  const handleSort = (field: ContactSortField, direction: SortDirection) => {
    setSortField(field)
    setSortDir(direction)
  }

  const toggleRole = (role: ContactRoleLabel) => {
    setFilterRoles(prev => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  const toggleConfig = (v: 'with' | 'without') => {
    setFilterConfig(prev => prev === v ? null : v)
  }

  const clearFilters = () => {
    setFilterRoles(new Set())
    setFilterConfig(null)
  }

  const activeFilterCount = filterRoles.size + (filterConfig !== null ? 1 : 0)

  // ── Stats derived from props ───────────────────────────────────────────────
  const now           = new Date()
  const totalContacts = contacts.length
  const withConfig    = contacts.filter(c => c.linked_configuration).length
  const newThisMonth  = contacts.filter(c => {
    const d = new Date(c.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const locationCount = new Set(
    contacts.filter(c => c.location).map(c => c.location!.name)
  ).size

  // Roles that actually appear in the data + per-role counts
  const { availableRoles, roleCount } = useMemo(() => {
    const count: Record<string, number> = {}
    contacts.forEach(c => { count[c.role_label] = (count[c.role_label] ?? 0) + 1 })
    const roles = Object.keys(count) as ContactRoleLabel[]
    return { availableRoles: roles, roleCount: count }
  }, [contacts])

  // ── Filter (search + role + config) ───────────────────────────────────────
  const filtered = useMemo(() => {
    let result = contacts

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(c =>
        (c.full_name      ?? '').toLowerCase().includes(q) ||
        (c.email          ?? '').toLowerCase().includes(q) ||
        (c.phone          ?? '').toLowerCase().includes(q) ||
        (c.location?.name ?? '').toLowerCase().includes(q) ||
        (c.role_label     ?? '').toLowerCase().includes(q)
      )
    }

    if (filterRoles.size > 0) {
      result = result.filter(c => filterRoles.has(c.role_label))
    }

    if (filterConfig === 'with') {
      result = result.filter(c => !!c.linked_configuration)
    } else if (filterConfig === 'without') {
      result = result.filter(c => !c.linked_configuration)
    }

    return result
  }, [contacts, searchTerm, filterRoles, filterConfig])

  const handleViewDetails       = (_contact: ContactRow) => {}
  const handleEditRole          = (_contact: ContactRow) => {}
  const handleSaveInlineChanges = async (_changes: PendingChangesMap): Promise<void> => {}

  return (
    <div className="contacts-client space-y-6">

      {/* ── Hero band ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">

        <div className="lg:min-w-[240px]">
          <h1 className="text-3xl font-bold text-heading mb-2.5 mt-2">
            Onboarded Users
          </h1>
          <p className="text-sm text-muted">
            All client contacts across locations with linked configuration status.
          </p>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-4">
          <StatInline
            label="Total contacts"
            value={totalContacts}
            badge={newThisMonth > 0 ? `+${newThisMonth} this month` : 'No new'}
            badgeVariant="blue"
          />
          <StatInline
            label="With config"
            value={withConfig}
            badge={totalContacts > 0 ? `${Math.round(withConfig / totalContacts * 100)}% linked` : 'None'}
            badgeVariant="violet"
          />
          <StatInline
            label="Locations"
            value={locationCount}
            badge="Active"
            badgeVariant="muted"
          />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2">

        {/* Left — search */}
        <CollapsibleSearch value={searchTerm} onChange={setSearchTerm} />

        {/* Right — filters + new onboarding */}
        <div className="flex items-center gap-2">
          <FiltersButton
            availableRoles={availableRoles}
            roleCount={roleCount}
            filterRoles={filterRoles}
            filterConfig={filterConfig}
            onToggleRole={toggleRole}
            onToggleConfig={toggleConfig}
            onClear={clearFilters}
            activeCount={activeFilterCount}
          />
          <button
            onClick={handleAddUser}
            disabled={initiating}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CirclePlus className="h-4 w-4" />
            {initiating ? 'Starting…' : 'New Onboarding'}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <ContactsTab
        contacts={filtered}
        searchTerm={searchTerm}
        onViewDetails={handleViewDetails}
        onEditRole={handleEditRole}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onSaveInlineChanges={handleSaveInlineChanges}
      />
    </div>
  )
}
