'use client'
// src/components/admin/contacts/ContactTableRowItem.tsx
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableRow, TableCell } from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical, Eye, Edit, Settings,
  ChevronDown, Check, CheckCheck,
  Calendar, Loader, UserCheck, Podcast,
  UserRoundCheck, Monitor, Shield, Layers,
  Cog, User, UserRoundCog} from 'lucide-react'
import Avatar from '@/components/admin/common/Avatar'
import { ROLE_DEFINITIONS } from '@/lib/phases'
import type { ContactRoleLabel } from '@/types'
import {
  safeFormat, getRoleBadge,
  type ContactRow, type ContactPendingChange,
} from './Contactsconstants'

// ── Role icon map ─────────────────────────────────────────────────────────────
const ROLE_ICONS: Record<string, React.ElementType> = {
  exec:                UserRoundCog,
  ops_director:        Podcast,
  site_manager:        UserRoundCog,
  it_manager:          Monitor,
  owner:               Shield,
  operations_director: Layers,
  supervisor:          UserRoundCheck,
  facilities_manager:  Cog,
  fleet_wide_manager:  UserRoundCheck,
  other:               User,
}

// ── Inline Role Dropdown ──────────────────────────────────────────────────────
interface RoleDropdownProps {
  currentRole: ContactRoleLabel
  currentCustom?: string | null
  contactId: string
  onSelect: (id: string, field: 'role_label', value: ContactRoleLabel) => void
  isPending: boolean
}

function RoleDropdown({ currentRole, currentCustom, contactId, onSelect, isPending }: RoleDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const badge = getRoleBadge(currentRole)
  const displayLabel = ROLE_DEFINITIONS[currentRole]?.label ?? currentRole
  const Icon = ROLE_ICONS[currentRole] ?? User

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-normal transition-all
          ${badge.bg} ${badge.text}
          ${isPending ? 'ring-2 ring-amber-400' : ''}
          hover:opacity-80`}
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="max-w-[120px] truncate">
          {displayLabel}
          {currentCustom ? ` · ${currentCustom}` : ''}
        </span>
        <ChevronDown className={`h-3 w-3 opacity-60 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 min-w-[220px]">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-1.5">
            Change role
          </p>
          {Object.entries(ROLE_DEFINITIONS).map(([key, def]) => {
            const b = getRoleBadge(key)
            const BIcon = ROLE_ICONS[key] ?? User
            return (
              <button
                key={key}
                onClick={() => { onSelect(contactId, 'role_label', key as ContactRoleLabel); setOpen(false) }}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${b.bg} ${b.text}`}>
                  <BIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  {def.label ?? key}
                </span>
                {currentRole === key && <Check className="h-3 w-3 text-slate-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Email cell — hover to reveal, click to copy ───────────────────────────────
function EmailCell({ email }: { email: string }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => { setCopied(false); setVisible(false) }, 1500)
    })
  }

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => { if (!copied) setVisible(false) }}
    >
      {/* Floating card */}
      <div className={`absolute bottom-full left-0 mb-2.5 z-50 transition-all duration-150 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
      }`}>
        <div
          onClick={handleCopy}
          className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors select-none whitespace-nowrap"
        >
          {copied ? (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCheck className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-sm font-medium">Copied!</span>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-slate-400 mb-0.5">Click to copy</p>
              <p className="text-sm font-medium text-black">{email}</p>
            </>
          )}
        </div>
        {/* Down arrow */}
        <div className="absolute -bottom-1.5 left-5 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45" />
      </div>

      {/* Trigger — truncated email */}
      <span className="truncate max-w-[160px] cursor-default">{email}</span>
    </div>
  )
}

// ── Row props ─────────────────────────────────────────────────────────────────
interface Props {
  contact: ContactRow
  isSelected: boolean
  onSelect: (id: string) => void
  onViewDetails: (contact: ContactRow) => void
  onEditRole: (contact: ContactRow) => void
  pendingChange: ContactPendingChange | null
  onInlineEdit: (id: string, field: 'role_label', value: ContactRoleLabel) => void
}

// ── Row ───────────────────────────────────────────────────────────────────────
export default function ContactTableRowItem({
  contact, isSelected, onSelect, onViewDetails, onEditRole, pendingChange, onInlineEdit,
}: Props) {
  const effectiveRole = pendingChange?.role_label ?? contact.role_label

  return (
    <TableRow className={`hover:bg-slate-50 transition-colors border-b border-slate-100 ${isSelected ? 'bg-violet-50' : ''}`}>

      {/* Checkbox */}
      <TableCell className="py-4 px-4">
        <div className="flex items-center justify-center">
          <Checkbox checked={isSelected} onCheckedChange={() => onSelect(contact.id)} />
        </div>
      </TableCell>

      {/* Name + Avatar */}
      <TableCell className="py-4 px-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={contact.full_name} email={contact.email} size="xs" />
          <div className="min-w-0">
            <Link
              href={`/admin/contacts/${contact.id}`}
              className="text-sm font-medium text-black hover:text-violet-600 transition-colors truncate block max-w-[140px]"
            >
              {contact.full_name}
            </Link>
          </div>
        </div>
      </TableCell>

      {/* Role — inline dropdown */}
      <TableCell className="py-4 px-4">
        <RoleDropdown
          currentRole={effectiveRole}
          currentCustom={contact.role_label_custom}
          contactId={contact.id}
          onSelect={onInlineEdit}
          isPending={pendingChange?.role_label !== undefined}
        />
      </TableCell>

      {/* Email — hover to reveal + copy */}
      <TableCell className="text-sm text-black font-normal py-4 px-4 min-w-[180px]">
        {contact.email && <EmailCell email={contact.email} />}
      </TableCell>

      {/* Location */}
      <TableCell className="text-sm text-black font-normal py-4 px-4 hidden md:table-cell">
        {contact.location?.name ? (
          <div className="flex items-center gap-1.5">
            <Loader className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span>
              {contact.location.name}
              {contact.sub_location?.name && (
                <span className="text-slate-400"> · {contact.sub_location.name}</span>
              )}
            </span>
          </div>
        ) : '—'}
      </TableCell>

      {/* Created */}
      <TableCell className="py-4 px-4 hidden lg:table-cell whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {safeFormat(contact.created_at, 'MMM d, yyyy')}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-4 px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 text-white">
              <MoreVertical className="h-4 w-4 text-slate-700" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 rounded-lg shadow-sm p-1">
            <DropdownMenuItem
              onClick={() => onViewDetails(contact)}
              className="px-2 py-2 rounded-md text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-2"><Eye className="h-3 w-3" /><span>View Details</span></div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEditRole(contact)}
              className="px-2 py-2 rounded-md text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-2"><Edit className="h-3 w-3" /><span>Change Role</span></div>
            </DropdownMenuItem>
            {contact.linked_configuration && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem asChild>
                  <Link
                    href={`/admin/configurations/${contact.linked_configuration.id}`}
                    className="px-2 py-2 rounded-md text-xs text-blue-600 hover:bg-blue-50 cursor-pointer flex"
                  >
                    <div className="flex items-center gap-2"><Settings className="h-3 w-3" /><span>View Config</span></div>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
