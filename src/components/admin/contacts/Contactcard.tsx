'use client'
// src/components/admin/contacts/ContactCard.tsx
import React from 'react'
import Link from 'next/link'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreVertical, Eye, Edit, Phone, MapPin, Settings, ExternalLink } from 'lucide-react'
import Avatar from '@/components/admin/common/Avatar'
import { ROLE_DEFINITIONS } from '@/lib/phases'
import {
  safeFormat, getRoleGradient, getConfigStatusStyle,
  type ContactRow,
} from './Contactsconstants'

interface Props {
  contact: ContactRow
  onViewDetails: (contact: ContactRow) => void
  onEditRole: (contact: ContactRow) => void
}

export default function ContactCard({ contact, onViewDetails, onEditRole }: Props) {
  const gradient   = getRoleGradient(contact.role_label)
  const roleLabel  = ROLE_DEFINITIONS[contact.role_label]?.label ?? contact.role_label
  const linked     = contact.linked_configuration

  return (
    <div className="flex rounded-lg h-[180px] border border-slate-200 overflow-hidden">

      {/* ── Left gradient panel ── */}
      <div className={`bg-gradient-to-br ${gradient} p-5 flex flex-col justify-between w-[52%] flex-shrink-0 overflow-hidden`}>
        <Avatar
          name={contact.full_name}
          email={contact.email}
          size="sm"
          className="ring-2 ring-white/30"
        />
        <div>
          <Link
            href={`/admin/contacts/${contact.id}`}
            className="text-white text-base font-semibold leading-tight mb-1 truncate block hover:underline underline-offset-2"
          >
            {contact.full_name}
          </Link>
          <p className="text-white/90 text-xs font-light truncate mb-0.5">
            {roleLabel}
            {contact.role_label_custom ? ` · ${contact.role_label_custom}` : ''}
          </p>
          {contact.location?.name && (
            <p className="text-white/70 text-[10px] font-light truncate">
              {contact.location.name}
              {contact.sub_location?.name ? ` · ${contact.sub_location.name}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="bg-white flex flex-col justify-between p-4 flex-1 min-w-0">
        <div className="space-y-2">

          {/* Phone */}
          {contact.phone && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0">
                <Phone className="w-3 h-3 text-slate-500" />
              </div>
              <p className="text-slate-700 text-xs truncate">{contact.phone}</p>
            </div>
          )}

          {/* Location */}
          {contact.location?.name && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3 h-3 text-slate-500" />
              </div>
              <p className="text-slate-700 text-xs truncate">
                {contact.location.name}
                {contact.sub_location?.name ? ` · ${contact.sub_location.name}` : ''}
              </p>
            </div>
          )}

          {/* Configuration */}
          {linked ? (
            <div className="flex flex-col gap-0.5">
              <Link
                href={`/admin/configurations/${linked.id}`}
                className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 hover:opacity-75 transition-opacity"
              >
                {linked.id.slice(0, 8)}…
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
              {(() => {
                const s = getConfigStatusStyle(linked.status)
                return (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className="capitalize">{linked.status}</span>
                  </span>
                )
              })()}
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0">
                <Settings className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-slate-400 text-xs">No configuration</p>
            </div>
          )}

          <p className="text-slate-400 text-[10px]">
            Added {safeFormat(contact.created_at, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
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
              {linked && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/admin/configurations/${linked.id}`}
                      className="px-2 py-2 rounded-md text-xs text-blue-600 hover:bg-blue-50 cursor-pointer flex"
                    >
                      <div className="flex items-center gap-2"><Settings className="h-3 w-3" /><span>View Config</span></div>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
