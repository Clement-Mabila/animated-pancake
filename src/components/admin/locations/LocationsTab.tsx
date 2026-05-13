'use client'
// src/components/admin/locations/LocationsTab.tsx
import React, { useState } from 'react'
import { MapPin } from 'lucide-react'
import LocationsTableView from './LocationsTableView'
import PaginationControls from '@/components/admin/contacts/Paginationcontrols'
import type { LocationRow, LocationSortField, SortDirection } from './Locationsconstants'
import type { SubLocation } from '@/types'

const PAGE_SIZE = 10

interface PaginationState {
  currentPage: number
  totalPages: number
  pageNumbers: (number | string)[]
  setCurrentPage: (page: number) => void
}

function useSimplePagination(items: LocationRow[], pageSize = PAGE_SIZE) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = items.slice((safePage - 1) * pageSize, safePage * pageSize)

  const pageNumbers: (number | string)[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= safePage - 1 && i <= safePage + 1)) {
      pageNumbers.push(i)
    } else if (
      (i === 2 && safePage > 3) ||
      (i === totalPages - 1 && safePage < totalPages - 2)
    ) {
      pageNumbers.push(i === 2 ? 'ellipsis-start' : 'ellipsis-end')
    }
  }

  return {
    paginated,
    pagination: { currentPage: safePage, totalPages, pageNumbers, setCurrentPage } satisfies PaginationState,
  }
}

interface Props {
  locations: LocationRow[]
  searchTerm: string
  sortField: LocationSortField
  sortDirection: SortDirection
  onSort: (field: LocationSortField, direction: SortDirection) => void
  onEdit: (location: LocationRow) => void
  onDeleteLocation: (location: LocationRow) => void
  onDeleteSub: (sub: SubLocation, locationName: string) => void
  onAddSubLocation: (locationId: string, name: string) => Promise<void>
  addingSubForId: string | null
}

export default function LocationsTab({
  locations, searchTerm, sortField, sortDirection, onSort,
  onEdit, onDeleteLocation, onDeleteSub, onAddSubLocation, addingSubForId,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { paginated, pagination } = useSimplePagination(locations)

  const handleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.length === locations.length ? [] : locations.map(l => l.id))
  }

  if (locations.length === 0) {
    return (
      <div className="p-16 text-center rounded-lg bg-surface border border-border">
        <div className="w-24 h-24 bg-cyan-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6">
          <MapPin className="w-12 h-12 text-white -rotate-6" />
        </div>
        <h3 className="text-2xl font-medium text-heading mb-2">No locations found</h3>
        <p className="text-muted mb-8 font-normal">
          {searchTerm ? 'Try adjusting your search' : 'Add a location to get started'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <LocationsTableView
        locations={paginated}
        searchTerm={searchTerm}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        onEdit={onEdit}
        onDeleteLocation={onDeleteLocation}
        onDeleteSub={onDeleteSub}
        onAddSubLocation={onAddSubLocation}
        addingSubForId={addingSubForId}
      />
      {pagination.totalPages > 1 && <PaginationControls pagination={pagination} />}
    </div>
  )
}
