'use client'

import { useState } from 'react'
import type { ExportCompletenessRow } from '@/lib/admin/exportPayload'

export default function IncompleteExportConfirm({
  open,
  title,
  rows,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  rows: ExportCompletenessRow[]
  onCancel: () => void
  onConfirm: (typed: string, includedIncomplete: boolean) => void
}) {
  const [typed, setTyped] = useState('')
  const [ack, setAck] = useState(false)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,10,14,0.75)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-confirm-title"
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--bg-surface)',
          border: 'var(--border-active)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
        }}
      >
        <h2 id="export-confirm-title" className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-body)' }}>
          Some configurations are incomplete for their current phase. Exporting may include partial data.
        </p>
        <ul className="text-xs space-y-2 mb-4 max-h-48 overflow-y-auto" style={{ color: 'var(--text-muted)' }}>
          {rows.map(r => (
            <li key={r.id}>
              <span className="font-mono">{r.id.slice(0, 8)}…</span> — missing:{' '}
              {r.missingSections.length ? r.missingSections.join(', ') : '—'}
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer" style={{ color: 'var(--text-body)' }}>
          <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
          I understand this export includes incomplete configurations.
        </label>
        <p className="text-xs mb-2" style={{ color: 'var(--warning)' }}>
          Type <strong>EXPORT</strong> to enable the export button.
        </p>
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm mb-4 font-mono"
          style={{
            background: 'var(--bg-elevated)',
            border: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          placeholder="EXPORT"
          autoComplete="off"
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              setTyped('')
              setAck(false)
              onCancel()
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-body)',
              border: 'var(--border-subtle)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={typed !== 'EXPORT' || !ack}
            onClick={() => onConfirm(typed, true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-white"
            style={{
              background: typed === 'EXPORT' && ack ? 'linear-gradient(135deg, #A52AE1, #3999FE)' : 'rgba(146,140,227,0.3)',
            }}
          >
            Export anyway
          </button>
        </div>
      </div>
    </div>
  )
}
