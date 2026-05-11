'use client'

import { AlertTriangle } from 'lucide-react'
import { getUnassignedRequiredRoles } from './data'
import type { Person } from './data'

interface UnassignedRolesWarningProps {
  persons: Person[]
}

export default function UnassignedRolesWarning({ persons }: UnassignedRolesWarningProps) {
  const unassigned = getUnassignedRequiredRoles(persons)
  if (unassigned.length === 0) return null

  return (
    <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex gap-2.5 items-start mb-3">
      
      <AlertTriangle className="w-4.5 h-4.5 text-amber-700 mt-0.5 flex-shrink-0" />

      <div className="flex-1">
        <div className="text-xs font-bold text-amber-800 mb-1.5">
          {unassigned.length} required {unassigned.length === 1 ? 'role' : 'roles'} not yet assigned
        </div>

        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {unassigned.map(role => (
            <span
              key={role.id}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold
                         bg-amber-100 text-amber-800 border border-amber-200"
            >
              {role.label}
            </span>
          ))}
        </div>

        <div className="text-[11px] text-amber-800">
          Add a person and assign these roles before marking this section complete.
        </div>
      </div>
    </div>
  )
}