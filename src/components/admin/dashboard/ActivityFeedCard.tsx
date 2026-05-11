'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { PHASE_ORDER, PHASE_LABELS } from '@/lib/phases'
import type { ConfigPhase } from '@/types'

/* ── Types ──────────────────────────────────────────────────── */
export interface ActivityEntry {
  id:         string
  phase:      ConfigPhase
  status:     string
  clientName: string
  updatedAt:  string
}

interface ActivityFeedCardProps {
  entries: ActivityEntry[]
}

/* ── Phase colors ───────────────────────────────────────────── */
const PHASE_COLORS: Record<ConfigPhase, string> = {
  early:      '#928CE3',
  pre_deploy: '#0081FF',
  deploy:     '#A52AE1',
  post:       '#22C55E',
}

/* ── Status pill ────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft:           { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B', label: 'Draft'    },
  client_complete: { bg: 'rgba(0,129,255,0.15)',   color: '#0081FF', label: 'Client ✓' },
  mbody_complete:  { bg: 'rgba(146,140,227,0.15)', color: '#928CE3', label: 'MBody ✓'  },
  live:            { bg: 'rgba(34,197,94,0.15)',   color: '#22C55E', label: 'Live'      },
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'rgba(146,140,227,0.1)', color: '#928CE3', label: status }
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

/* ── Relative time ──────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/* ── Component ──────────────────────────────────────────────── */
export default function ActivityFeedCard({ entries }: ActivityFeedCardProps) {
  const [activePhase, setActivePhase] = useState<ConfigPhase>('early')

  const countByPhase = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of entries) counts[e.phase] = (counts[e.phase] ?? 0) + 1
    return counts
  }, [entries])

  const filtered = useMemo(
    () => entries.filter(e => e.phase === activePhase),
    [entries, activePhase]
  )

  return (
    <div className="rounded-2xl bg-surface border border-border px-6 pt-6 pb-5 flex flex-col max-h-92">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-heading">Site Activity</h2>
          <p className="text-xs text-muted mt-0.5">{entries.length} total across all phases</p>
        </div>
        <Link
          href="/admin/configurations"
          className="text-xs font-medium text-electric-blue hover:opacity-75 transition-opacity shrink-0 mt-0.5 no-underline"
        >
          View all →
        </Link>
      </div>

      {/* Phase tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {PHASE_ORDER.map(phase => {
          const active = phase === activePhase
          const count  = countByPhase[phase] ?? 0
          return (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                active
                  ? 'bg-heading text-canvas'
                  : 'text-muted hover:text-body-text hover:bg-elevated'
              }`}
            >
              {!active && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: PHASE_COLORS[phase] }}
                />
              )}
              {PHASE_LABELS[phase]}
              {count > 0 && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-white/20 text-white' : 'bg-elevated text-muted'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/*
        maxHeight mirrors PeoplePanel's scroll area (264px) exactly,
        so both cards are always the same total height regardless of content.
        Scrollbar hidden cross-browser.
      */}
      <div
        className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ maxHeight: '264px' }}
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-muted py-3">No configurations in this phase.</p>
        ) : (
          <ul className="space-y-0">
            {filtered.map((entry, i) => (
              <li key={entry.id}>
                <Link
                  href={`/admin/configurations/${entry.id}`}
                  className="flex items-center gap-3 py-3 no-underline group"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: PHASE_COLORS[entry.phase] }}
                  />
                  <span className="flex-1 text-sm font-medium text-heading truncate group-hover:text-bright-violet transition-colors">
                    {entry.clientName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={entry.status} />
                    <span className="text-xs text-muted">{timeAgo(entry.updatedAt)}</span>
                  </div>
                </Link>
                {i < filtered.length - 1 && (
                  <div className="h-px bg-border ml-5" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}