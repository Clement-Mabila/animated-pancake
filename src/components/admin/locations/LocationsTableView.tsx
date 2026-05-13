'use client'
// src/components/admin/locations/LocationsTableView.tsx
import React, { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import LocationTableRowItem from './LocationTableRowItem'
import { placeSortKey, type LocationRow, type LocationSortField, type SortDirection } from './Locationsconstants'
import type { SubLocation } from '@/types'

function sortLocations(rows: LocationRow[], field: LocationSortField, direction: SortDirection): LocationRow[] {
  if (!field) return rows
  return [...rows].sort((a, b) => {
    let aVal: string | number
    let bVal: string | number
    switch (field) {
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case 'place':
        aVal = placeSortKey(a)
        bVal = placeSortKey(b)
        break
      case 'industry':
        aVal = (a.industry ?? '').toLowerCase()
        bVal = (b.industry ?? '').toLowerCase()
        break
      case 'subs':
        aVal = a.sub_locations.length
        bVal = b.sub_locations.length
        break
      case 'created':
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0
        break
      default:
        return 0
    }
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

interface SortableHeadProps {
  label: string
  field: LocationSortField
  sortField: LocationSortField
  sortDirection: SortDirection
  onSort: (field: LocationSortField, direction: SortDirection) => void
  className?: string
}

function SortableHead({ label, field, sortField, sortDirection, onSort, className = '' }: SortableHeadProps) {
  const isActive = sortField === field
  return (
    <TableHead
      className={`py-4 text-sm font-medium text-heading cursor-pointer select-none px-4 ${className}`}
      onClick={() => {
        if (!isActive) onSort(field, 'asc')
        else onSort(field, sortDirection === 'asc' ? 'desc' : 'asc')
      }}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isActive
          ? sortDirection === 'asc'
            ? <ChevronUp className="h-3.5 w-3.5 text-heading" />
            : <ChevronDown className="h-3.5 w-3.5 text-heading" />
          : <ChevronsUpDown className="h-3.5 w-3.5 text-muted" />
        }
      </div>
    </TableHead>
  )
}

interface Props {
  locations: LocationRow[]
  searchTerm: string
  selectedIds: string[]
  onSelect: (id: string) => void
  onSelectAll: () => void
  sortField: LocationSortField
  sortDirection: SortDirection
  onSort: (field: LocationSortField, direction: SortDirection) => void
  onEdit: (location: LocationRow) => void
  onDeleteLocation: (location: LocationRow) => void
  onDeleteSub: (sub: SubLocation, locationName: string) => void
  onAddSubLocation: (locationId: string, name: string) => Promise<void>
  addingSubForId: string | null
}

export default function LocationsTableView({
  locations, searchTerm, selectedIds, onSelect, onSelectAll,
  sortField, sortDirection, onSort,
  onEdit, onDeleteLocation, onDeleteSub, onAddSubLocation, addingSubForId,
}: Props) {
  const sorted = useMemo(
    () => sortLocations(locations, sortField, sortDirection),
    [locations, sortField, sortDirection],
  )

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-table-header hover:bg-table-header border-b border-border">
              <TableHead className="w-10 py-4 px-4">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={selectedIds.length === locations.length && locations.length > 0}
                    onCheckedChange={onSelectAll}
                    disabled={locations.length === 0}
                  />
                </div>
              </TableHead>
              <SortableHead label="Location" field="name" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
              <SortableHead label="City / country" field="place" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="hidden md:table-cell" />
              <SortableHead label="Industry" field="industry" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="hidden lg:table-cell" />
              <SortableHead label="Subs" field="subs" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
              <SortableHead label="Created" field="created" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="hidden lg:table-cell" />
              <TableHead className="w-10 py-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow className="border-b-0">
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted">
                  {searchTerm ? 'No locations match your search' : 'No locations found.'}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map(loc => (
                <LocationTableRowItem
                  key={loc.id}
                  location={loc}
                  isSelected={selectedIds.includes(loc.id)}
                  onSelect={onSelect}
                  onEdit={onEdit}
                  onDeleteLocation={onDeleteLocation}
                  onDeleteSub={onDeleteSub}
                  onAddSubLocation={onAddSubLocation}
                  addingSubForId={addingSubForId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {sorted.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted">
            {sorted.length} location{sorted.length !== 1 ? 's' : ''}
            {selectedIds.length > 0 && (
              <span className="ml-2 text-bright-violet font-medium">
                · {selectedIds.length} selected
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
