'use client'
// src/components/admin/contacts/ContactsTab.tsx
import React, { useState } from 'react'
import { Users } from 'lucide-react'
import ContactsTableView from './Contactstableview'
import PaginationControls from './Paginationcontrols'
import type { ContactRow, PendingChangesMap, ContactSortField, SortDirection } from './Contactsconstants'

const PAGE_SIZE = 10

interface PaginationState {
  currentPage: number
  totalPages: number
  pageNumbers: (number | string)[]
  setCurrentPage: (page: number) => void
}

function useSimplePagination(items: ContactRow[], pageSize = PAGE_SIZE) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = items.slice((safePage - 1) * pageSize, safePage * pageSize)

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
  contacts: ContactRow[]
  searchTerm: string
  onViewDetails: (contact: ContactRow) => void
  onEditRole: (contact: ContactRow) => void
  sortField: ContactSortField
  sortDirection: SortDirection
  onSort: (field: ContactSortField, direction: SortDirection) => void
  onSaveInlineChanges?: (changes: PendingChangesMap) => Promise<void>
}

export default function ContactsTab({
  contacts, searchTerm, onViewDetails, onEditRole,
  sortField, sortDirection, onSort, onSaveInlineChanges,
}: Props) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const { paginated, pagination } = useSimplePagination(contacts)

  const handleSelectContact = (id: string) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedContacts(
      selectedContacts.length === contacts.length ? [] : contacts.map(c => c.id)
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (contacts.length === 0) {
    return (
      <div className="p-16 text-center rounded-lg bg-white border border-slate-200">
        <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6">
          <Users className="w-12 h-12 text-white -rotate-6" />
        </div>
        <h3 className="text-2xl font-medium text-slate-800 mb-2">No contacts found</h3>
        <p className="text-slate-500 mb-8 font-normal">
          {searchTerm ? 'Try adjusting your search' : 'No client contacts have been added yet'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ContactsTableView
        contacts={paginated}
        searchTerm={searchTerm}
        selectedContacts={selectedContacts}
        onSelectContact={handleSelectContact}
        onSelectAll={handleSelectAll}
        onViewDetails={onViewDetails}
        onEditRole={onEditRole}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        onSaveInlineChanges={onSaveInlineChanges}
      />
      {pagination.totalPages > 1 && <PaginationControls pagination={pagination} />}
    </div>
  )
}