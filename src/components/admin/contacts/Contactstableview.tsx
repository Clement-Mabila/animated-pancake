'use client'
// src/components/admin/contacts/ContactsTableView.tsx
import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { ChevronUp, ChevronDown, ChevronsUpDown, Save, X, AlertCircle, Info } from 'lucide-react'
import ContactTableRowItem from './Contactablerowitem'
import type { ContactRow, ContactPendingChange, PendingChangesMap, ContactSortField, SortDirection } from './Contactsconstants'
import type { ContactRoleLabel } from '@/types'

// ── Sort helper ───────────────────────────────────────────────────────────────
function sortContacts(contacts: ContactRow[], field: ContactSortField, direction: SortDirection): ContactRow[] {
  if (!field) return contacts
  return [...contacts].sort((a, b) => {
    let aVal: string | number
    let bVal: string | number
    switch (field) {
      case 'name':
        aVal = (a.full_name ?? '').toLowerCase()
        bVal = (b.full_name ?? '').toLowerCase()
        break
      case 'role':
        aVal = (a.role_label ?? '').toLowerCase()
        bVal = (b.role_label ?? '').toLowerCase()
        break
      case 'location':
        aVal = (a.location?.name ?? '').toLowerCase()
        bVal = (b.location?.name ?? '').toLowerCase()
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

// ── Sortable header cell ──────────────────────────────────────────────────────
interface SortableHeadProps {
  label: string
  field: ContactSortField
  sortField: ContactSortField
  sortDirection: SortDirection
  onSort: (field: ContactSortField, direction: SortDirection) => void
  className?: string
  showInfo?: boolean
}

function SortableHead({ label, field, sortField, sortDirection, onSort, className = '', showInfo = false }: SortableHeadProps) {
  const isActive = sortField === field
  return (
    <TableHead
      className={`py-4 text-sm font-medium text-black cursor-pointer select-none px-4 ${className}`}
      onClick={() => {
        if (!isActive) onSort(field, 'asc')
        else onSort(field, sortDirection === 'asc' ? 'desc' : 'asc')
      }}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isActive
          ? sortDirection === 'asc'
            ? <ChevronUp className="h-3.5 w-3.5 text-black" />
            : <ChevronDown className="h-3.5 w-3.5 text-black" />
          : <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
        }
        {showInfo && <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />}
      </div>
    </TableHead>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  contacts: ContactRow[]
  searchTerm: string
  selectedContacts: string[]
  onSelectContact: (id: string) => void
  onSelectAll: () => void
  onViewDetails: (contact: ContactRow) => void
  onEditRole: (contact: ContactRow) => void
  sortField: ContactSortField
  sortDirection: SortDirection
  onSort: (field: ContactSortField, direction: SortDirection) => void
  onSaveInlineChanges?: (changes: PendingChangesMap) => Promise<void>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ContactsTableView({
  contacts, searchTerm, selectedContacts, onSelectContact, onSelectAll,
  onViewDetails, onEditRole, sortField, sortDirection, onSort, onSaveInlineChanges,
}: Props) {
  const [pendingChanges, setPendingChanges] = useState<PendingChangesMap>({})
  const [saving, setSaving] = useState(false)
  const pendingCount = Object.keys(pendingChanges).length

  const handleInlineEdit = (contactId: string, field: 'role_label', value: ContactRoleLabel) => {
    setPendingChanges(prev => {
      const existing = prev[contactId] ?? {}
      const original = contacts.find(c => c.id === contactId)
      const updated: ContactPendingChange = { ...existing, [field]: value }

      if (field === 'role_label' && value === original?.role_label) {
        delete updated.role_label
      }

      if (Object.keys(updated).length === 0) {
        const { [contactId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [contactId]: updated }
    })
  }

  const handleCancelChanges = () => setPendingChanges({})

  const handleSaveChanges = async () => {
    if (!onSaveInlineChanges) return
    setSaving(true)
    try {
      await onSaveInlineChanges(pendingChanges)
      setPendingChanges({})
    } catch {
      // parent handles toast; keep pending so user can retry
    } finally {
      setSaving(false)
    }
  }

  const sortedContacts = useMemo(
    () => sortContacts(contacts, sortField, sortDirection),
    [contacts, sortField, sortDirection],
  )

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">

      {/* ── Pending changes save bar ── */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">
              {pendingCount} unsaved change{pendingCount > 1 ? 's' : ''}
            </span>
            <span className="text-amber-500 hidden sm:inline">— review before saving</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              className="h-7 px-2.5 text-xs text-amber-700 hover:bg-amber-100"
              onClick={handleCancelChanges}
              disabled={saving}
            >
              <X className="h-3 w-3 mr-1" /> Discard
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-white gap-1"
              onClick={handleSaveChanges}
              disabled={saving}
            >
              <Save className="h-3 w-3" />
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100 hover:bg-gray-100 border-b border-slate-200">

              <TableHead className="py-4w-10 px-4">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={selectedContacts.length === contacts.length && contacts.length > 0}
                    onCheckedChange={onSelectAll}
                    disabled={contacts.length === 0}
                  />
                </div>
              </TableHead>

              <SortableHead label="Name"     field="name"     sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
              <SortableHead label="Role"     field="role"     sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
              <TableHead className="py-4text-sm font-medium text-black px-4 min-w-[180px]">Email</TableHead>
              <SortableHead label="Location" field="location" sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="hidden md:table-cell" />
              <SortableHead label="Created"  field="created"  sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="hidden lg:table-cell" showInfo />
              <TableHead className="py-4w-10" />

            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedContacts.length === 0 ? (
              <TableRow className="border-b-0">
                <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-400">
                  {searchTerm ? 'No contacts match your search' : 'No contacts found.'}
                </TableCell>
              </TableRow>
            ) : (
              sortedContacts.map(contact => (
                <ContactTableRowItem
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedContacts.includes(contact.id)}
                  onSelect={onSelectContact}
                  onViewDetails={onViewDetails}
                  onEditRole={onEditRole}
                  pendingChange={pendingChanges[contact.id] ?? null}
                  onInlineEdit={handleInlineEdit}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Footer count ── */}
      {sortedContacts.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {sortedContacts.length} contact{sortedContacts.length !== 1 ? 's' : ''}
            {selectedContacts.length > 0 && (
              <span className="ml-2 text-violet-600 font-medium">
                · {selectedContacts.length} selected
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
