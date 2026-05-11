'use client'
import { useState } from 'react'
import { Info } from 'lucide-react'

interface FieldDefaultBadgeProps {
  value:    string
  forArea?: boolean
}

export default function FieldDefaultBadge({ value, forArea = false }: FieldDefaultBadgeProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`absolute left-2 z-[3] leading-none ${forArea ? 'top-2.5' : 'top-1/2 -translate-y-1/2'}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Info
        size={14}
        className={`block cursor-default transition-colors duration-150 ${open ? 'text-soft-lavender' : 'text-soft-lavender/65'}`}
      />

      {open && (
        <div className="absolute bottom-full mb-2 -left-2 z-[9999] min-w-44 max-w-72 rounded-xl border border-soft-lavender/25 bg-[#1c1730] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(146,140,227,0.08)] pointer-events-none">
          {/* Arrow */}
          <div className="absolute -bottom-1 left-3 size-2 rotate-45 border-b border-r border-soft-lavender/25 bg-[#1c1730]" />

          <p className="mb-1 font-sans text-xs font-semibold tracking-widest text-soft-lavender/70">
            System default
          </p>
          <div className="my-1.5 h-px bg-soft-lavender/15" />
          <p className="m-0 font-sans text-xs leading-normal text-white/85">
            {value}
          </p>
        </div>
      )}
    </div>
  )
}