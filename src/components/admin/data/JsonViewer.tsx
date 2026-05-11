'use client'

import { useState } from 'react'

export default function JsonViewer({ title, data }: { title: string; data: unknown }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-lg overflow-hidden mb-2"
      style={{ border: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 text-xs font-semibold flex justify-between items-center border-none cursor-pointer"
        style={{ color: 'var(--text-primary)', background: 'transparent' }}
      >
        {title}
        <span style={{ color: 'var(--text-muted)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <pre
          className="text-[11px] p-3 overflow-auto max-h-80 font-mono m-0"
          style={{ color: 'var(--text-body)', borderTop: 'var(--border-subtle)' }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
