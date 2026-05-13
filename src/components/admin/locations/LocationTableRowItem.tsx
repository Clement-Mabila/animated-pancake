'use client'
// src/components/admin/locations/LocationTableRowItem.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableRow, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical, Edit, Trash2, ChevronDown, ChevronRight,
  MapPin, Factory, Plus, Loader2,
} from 'lucide-react'
import { safeFormat } from '@/components/admin/contacts/Contactsconstants'
import type { SubLocation } from '@/types'
import type { LocationRow } from './Locationsconstants'

interface Props {
  location: LocationRow
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit: (location: LocationRow) => void
  onDeleteLocation: (location: LocationRow) => void
  onDeleteSub: (sub: SubLocation, locationName: string) => void
  onAddSubLocation: (locationId: string, name: string) => Promise<void>
  addingSubForId: string | null
}

export default function LocationTableRowItem({
  location,
  isSelected,
  onSelect,
  onEdit,
  onDeleteLocation,
  onDeleteSub,
  onAddSubLocation,
  addingSubForId,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [newSubName, setNewSubName] = useState('')
  const subCount = location.sub_locations.length

  const placeLine = [location.city, location.country].filter(Boolean).join(', ') || '—'
  const industry = location.industry?.trim() || '—'

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = newSubName.trim()
    if (!n) return
    await onAddSubLocation(location.id, n)
    setNewSubName('')
  }

  return (
    <>
      <TableRow
        className={`hover:bg-elevated/80 transition-colors border-b border-border ${isSelected ? 'bg-bright-violet/5' : ''}`}
      >
        <TableCell className="py-4 px-4">
          <div className="flex items-center justify-center">
            <Checkbox checked={isSelected} onCheckedChange={() => onSelect(location.id)} />
          </div>
        </TableCell>

        <TableCell className="py-4 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:bg-elevated hover:text-heading transition-colors"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse sub-locations' : 'Expand sub-locations'}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-muted shrink-0" />
              <span className="text-sm font-medium text-heading truncate">{location.name}</span>
            </div>
          </div>
        </TableCell>

        <TableCell className="py-4 px-4 text-sm text-body-text hidden md:table-cell">
          <span className="line-clamp-2">{placeLine}</span>
        </TableCell>

        <TableCell className="py-4 px-4 text-sm text-body-text hidden lg:table-cell">
          <div className="flex items-center gap-1.5 min-w-0">
            <Factory className="h-3.5 w-3.5 text-muted shrink-0" />
            <span className="truncate">{industry}</span>
          </div>
        </TableCell>

        <TableCell className="py-4 px-4 text-sm text-muted whitespace-nowrap">
          {subCount} sub{subCount !== 1 ? 's' : ''}
        </TableCell>

        <TableCell className="py-4 px-4 text-sm text-muted hidden lg:table-cell whitespace-nowrap">
          {safeFormat(location.created_at, 'MMM d, yyyy')}
        </TableCell>

        <TableCell className="py-4 px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-elevated">
                <MoreVertical className="h-4 w-4 text-body-text" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-popover border border-border rounded-lg shadow-sm p-1">
              <DropdownMenuItem
                onClick={() => onEdit(location)}
                className="px-2 py-2 rounded-md text-xs text-heading hover:bg-elevated cursor-pointer"
              >
                <div className="flex items-center gap-2"><Edit className="h-3 w-3" /><span>Edit location</span></div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-border" />
              <DropdownMenuItem
                onClick={() => onDeleteLocation(location)}
                className="px-2 py-2 rounded-md text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <div className="flex items-center gap-2"><Trash2 className="h-3 w-3" /><span>Delete location</span></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="border-b border-border bg-elevated/50 hover:bg-elevated/50">
          <TableCell colSpan={7} className="p-0">
            <div className="px-4 py-4 pl-14 space-y-3">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">Sub-locations</p>
              {location.sub_locations.length === 0 ? (
                <p className="text-sm text-muted">No sub-locations yet. Add one below.</p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden max-w-xl">
                  {location.sub_locations.map(sub => (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-heading"
                    >
                      <span className="truncate">{sub.name}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteSub(sub, location.name)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddSub} className="flex flex-wrap items-end gap-2 max-w-xl">
                <div className="flex-1 min-w-[160px]">
                  <label htmlFor={`sub-${location.id}`} className="sr-only">New sub-location name</label>
                  <Input
                    id={`sub-${location.id}`}
                    value={newSubName}
                    onChange={e => setNewSubName(e.target.value)}
                    placeholder="New sub-location name"
                    className="h-9 rounded-xl border-border bg-surface text-sm"
                    disabled={addingSubForId === location.id}
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 rounded-xl gap-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                  disabled={!newSubName.trim() || addingSubForId === location.id}
                >
                  {addingSubForId === location.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add
                </Button>
              </form>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
