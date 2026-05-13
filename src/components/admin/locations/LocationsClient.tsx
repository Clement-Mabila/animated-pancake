'use client'
// src/components/admin/locations/LocationsClient.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, CirclePlus, X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'
import LocationsTab from './LocationsTab'
import type { LocationRow, LocationSortField, SortDirection } from './Locationsconstants'
import type { SubLocation } from '@/types'
import {
  adminCreateLocationWithSubsAction,
  adminUpdateLocationAction,
  adminDeleteLocationAction,
  adminAddSubLocationAction,
  adminDeleteSubLocationAction,
} from '@/app/admin/actions/locations'

const BADGE_VARIANTS = {
  blue:    'bg-electric-blue/15 text-electric-blue',
  violet:  'bg-bright-violet/15 text-bright-violet',
  success: 'bg-success/15 text-success',
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
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-heading">{value}</span>
        <Badge label={badge} variant={badgeVariant} />
      </div>
    </div>
  )
}

interface CollapsibleSearchProps {
  value: string
  onChange: (v: string) => void
}

function CollapsibleSearch({ value, onChange }: CollapsibleSearchProps) {
  const [expanded, setExpanded] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
        type="button"
        onClick={expand}
        className="h-10 w-10 rounded-2xl bg-surface border border-border flex items-center justify-center hover:bg-elevated transition-colors"
        aria-label="Open search"
      >
        <Search className="h-4 w-4 text-body-text" />
      </button>
    )
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
      <Input
        ref={inputRef}
        placeholder="Search locations…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="w-64 pl-9 h-10 text-sm bg-surface border-border focus:border-border rounded-full placeholder:text-muted"
      />
    </div>
  )
}

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="presentation"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

interface Props {
  locations: LocationRow[]
}

export default function LocationsClient({ locations }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<LocationSortField>(null)
  const [sortDirection, setSortDir] = useState<SortDirection>('asc')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LocationRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LocationRow | null>(null)
  const [deleteSub, setDeleteSub] = useState<{ sub: SubLocation; locationName: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [addingSubForId, setAddingSubForId] = useState<string | null>(null)

  const [createName, setCreateName] = useState('')
  const [createCity, setCreateCity] = useState('')
  const [createCountry, setCreateCountry] = useState('')
  const [createIndustry, setCreateIndustry] = useState('')
  const [createSubs, setCreateSubs] = useState<string[]>([''])

  const resetCreateForm = () => {
    setCreateName('')
    setCreateCity('')
    setCreateCountry('')
    setCreateIndustry('')
    setCreateSubs([''])
  }

  const handleSort = (field: LocationSortField, direction: SortDirection) => {
    setSortField(field)
    setSortDir(direction)
  }

  const totalSubs = useMemo(
    () => locations.reduce((n, l) => n + l.sub_locations.length, 0),
    [locations],
  )

  const countryCount = useMemo(() => {
    const s = new Set(locations.map(l => l.country).filter(Boolean) as string[])
    return s.size
  }, [locations])

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return locations
    const q = searchTerm.toLowerCase()
    return locations.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.city ?? '').toLowerCase().includes(q) ||
      (l.country ?? '').toLowerCase().includes(q) ||
      (l.industry ?? '').toLowerCase().includes(q) ||
      l.sub_locations.some(s => s.name.toLowerCase().includes(q)),
    )
  }, [locations, searchTerm])

  const refresh = () => { router.refresh() }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = createName.trim()
    if (!name) { showToast('error', 'Location name is required'); return }
    setSaving(true)
    try {
      const subLocationNames = createSubs.map(s => s.trim()).filter(Boolean)
      const res = await adminCreateLocationWithSubsAction({
        name,
        city: createCity.trim() || null,
        country: createCountry.trim() || null,
        industry: createIndustry.trim() || null,
        subLocationNames,
      })
      if (!res.ok) {
        showToast('error', res.error)
        return
      }
      showToast('draft', 'Location created')
      setCreateOpen(false)
      resetCreateForm()
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const [editName, setEditName] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editCountry, setEditCountry] = useState('')
  const [editIndustry, setEditIndustry] = useState('')

  useEffect(() => {
    if (editTarget) {
      setEditName(editTarget.name)
      setEditCity(editTarget.city ?? '')
      setEditCountry(editTarget.country ?? '')
      setEditIndustry(editTarget.industry ?? '')
    }
  }, [editTarget])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    const name = editName.trim()
    if (!name) { showToast('error', 'Location name is required'); return }
    setSaving(true)
    try {
      const res = await adminUpdateLocationAction({
        id: editTarget.id,
        name,
        city: editCity.trim() || null,
        country: editCountry.trim() || null,
        industry: editIndustry.trim() || null,
      })
      if (!res.ok) {
        showToast('error', res.error)
        return
      }
      showToast('draft', 'Location updated')
      setEditTarget(null)
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLocation = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const res = await adminDeleteLocationAction(deleteTarget.id)
      if (!res.ok) {
        showToast('error', res.error)
        return
      }
      showToast('draft', 'Location deleted')
      setDeleteTarget(null)
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSub = async () => {
    if (!deleteSub) return
    setSaving(true)
    try {
      const res = await adminDeleteSubLocationAction(deleteSub.sub.id)
      if (!res.ok) {
        showToast('error', res.error)
        return
      }
      showToast('draft', 'Sub-location removed')
      setDeleteSub(null)
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleAddSubLocation = async (locationId: string, name: string) => {
    setAddingSubForId(locationId)
    try {
      const res = await adminAddSubLocationAction({ locationId, name })
      if (!res.ok) {
        showToast('error', res.error)
        return
      }
      showToast('draft', 'Sub-location added')
      refresh()
    } finally {
      setAddingSubForId(null)
    }
  }

  const addCreateSubRow = () => setCreateSubs(prev => [...prev, ''])
  const updateCreateSub = (i: number, v: string) => {
    setCreateSubs(prev => prev.map((s, j) => (j === i ? v : s)))
  }
  const removeCreateSub = (i: number) => {
    setCreateSubs(prev => (prev.length <= 1 ? [''] : prev.filter((_, j) => j !== i)))
  }

  return (
    <div className="locations-client space-y-6">

      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="lg:min-w-[240px]">
          <h1 className="text-3xl font-bold text-heading mb-2.5 mt-2">Locations</h1>
          <p className="text-sm text-muted">
            Physical sites, sub-locations, and industry metadata used across onboarding and contacts.
          </p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <StatInline
            label="Total locations"
            value={locations.length}
            badge={locations.length ? 'Directory' : 'Empty'}
            badgeVariant="blue"
          />
          <StatInline
            label="Sub-locations"
            value={totalSubs}
            badge={totalSubs ? 'Mapped' : 'None'}
            badgeVariant="violet"
          />
          <StatInline
            label="Countries"
            value={countryCount}
            badge="Regions"
            badgeVariant="muted"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <CollapsibleSearch value={searchTerm} onChange={setSearchTerm} />
        <button
          type="button"
          onClick={() => { resetCreateForm(); setCreateOpen(true) }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors"
        >
          <CirclePlus className="h-4 w-4" />
          Add location
        </button>
      </div>

      <LocationsTab
        locations={filtered}
        searchTerm={searchTerm}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onEdit={setEditTarget}
        onDeleteLocation={setDeleteTarget}
        onDeleteSub={(sub, locationName) => setDeleteSub({ sub, locationName })}
        onAddSubLocation={handleAddSubLocation}
        addingSubForId={addingSubForId}
      />

      {createOpen && (
        <ModalBackdrop onClose={() => { if (!saving) { setCreateOpen(false); resetCreateForm() } }}>
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-xl p-6 space-y-4"
            role="dialog"
            aria-labelledby="create-loc-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 id="create-loc-title" className="text-lg font-semibold text-heading">Add location</h2>
              <button type="button" onClick={() => !saving && setCreateOpen(false)} className="p-1 rounded-lg hover:bg-elevated text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted">Name *</label>
                <Input value={createName} onChange={e => setCreateName(e.target.value)} className="mt-1 rounded-xl border-border bg-elevated" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted">City</label>
                  <Input value={createCity} onChange={e => setCreateCity(e.target.value)} className="mt-1 rounded-xl border-border bg-elevated" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Country</label>
                  <Input value={createCountry} onChange={e => setCreateCountry(e.target.value)} className="mt-1 rounded-xl border-border bg-elevated" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Industry</label>
                <Input value={createIndustry} onChange={e => setCreateIndustry(e.target.value)} className="mt-1 rounded-xl border-border bg-elevated" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted">Sub-locations (optional)</label>
                  <button type="button" onClick={addCreateSubRow} className="text-xs text-bright-violet hover:underline inline-flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add row
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {createSubs.map((row, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={row}
                        onChange={e => updateCreateSub(i, e.target.value)}
                        placeholder={`Sub-location ${i + 1}`}
                        className="rounded-xl border-border bg-elevated flex-1"
                      />
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeCreateSub(i)} aria-label="Remove row">
                        <Trash2 className="h-4 w-4 text-muted" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => !saving && setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
                  {saving ? 'Saving…' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}

      {editTarget && (
        <ModalBackdrop onClose={() => !saving && setEditTarget(null)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-xl p-6 space-y-4"
            role="dialog"
            aria-labelledby="edit-loc-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 id="edit-loc-title" className="text-lg font-semibold text-heading">Edit location</h2>
              <button type="button" onClick={() => !saving && setEditTarget(null)} className="p-1 rounded-lg hover:bg-elevated text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted">Name *</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1 rounded-xl border-border bg-elevated" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted">City</label>
                  <Input value={editCity} onChange={e => setEditCity(e.target.value)} className="mt-1 rounded-xl border-border bg-elevated" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Country</label>
                  <Input value={editCountry} onChange={e => setEditCountry(e.target.value)} className="mt-1 rounded-xl border-border bg-elevated" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Industry</label>
                <Input value={editIndustry} onChange={e => setEditIndustry(e.target.value)} className="mt-1 rounded-xl border-border bg-elevated" />
              </div>
              <p className="text-xs text-muted">Manage sub-locations from the table row.</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => !saving && setEditTarget(null)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      )}

      {deleteTarget && (
        <ModalBackdrop onClose={() => !saving && setDeleteTarget(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl p-6 space-y-4"
            role="alertdialog"
            aria-labelledby="del-loc-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="del-loc-title" className="text-lg font-semibold text-heading">Delete location?</h2>
            <p className="text-sm text-muted">
              <span className="font-medium text-heading">{deleteTarget.name}</span>
              {' '}and all {deleteTarget.sub_locations.length} sub-location{deleteTarget.sub_locations.length !== 1 ? 's' : ''} will be permanently removed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => !saving && setDeleteTarget(null)}>Cancel</Button>
              <Button type="button" variant="destructive" disabled={saving} onClick={handleDeleteLocation}>
                {saving ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {deleteSub && (
        <ModalBackdrop onClose={() => !saving && setDeleteSub(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl p-6 space-y-4"
            role="alertdialog"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-heading">Remove sub-location?</h2>
            <p className="text-sm text-muted">
              <span className="font-medium text-heading">{deleteSub.sub.name}</span>
              {' '}under {deleteSub.locationName} will be removed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => !saving && setDeleteSub(null)}>Cancel</Button>
              <Button type="button" variant="destructive" disabled={saving} onClick={handleDeleteSub}>
                {saving ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  )
}
