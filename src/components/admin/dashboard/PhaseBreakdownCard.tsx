import type { ComponentType } from 'react'
import { Clock, Truck, Bot, ClockArrowUp } from 'lucide-react'
import { PHASE_LABELS, PHASE_ORDER } from '@/lib/phases'
import type { ConfigPhase } from '@/types'

/* ── Per-phase color + icon ─────────────────────────────────── */
type PhaseIcon = ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>

const PHASE_CONFIG: Record<ConfigPhase, { color: string; bg: string; icon: PhaseIcon }> = {
  early:      { color: '#928CE3', bg: 'rgba(146,140,227,0.15)', icon: Clock        },
  pre_deploy: { color: '#0081FF', bg: 'rgba(0,129,255,0.15)',   icon: Truck        },
  deploy:     { color: '#8b5cf6', bg: 'rgba(165,42,225,0.15)',  icon: Bot          },
  post:       { color: '#22C55E', bg: 'rgba(34,197,94,0.15)',   icon: ClockArrowUp },
}

/* ── Props ──────────────────────────────────────────────────── */
interface PhaseBreakdownCardProps {
  phaseCounts: Record<string, number>
  totalConfigs: number
}

/* ── Component ──────────────────────────────────────────────── */
export default function PhaseBreakdownCard({ phaseCounts, totalConfigs }: PhaseBreakdownCardProps) {
  const phases = PHASE_ORDER.map(phase => ({
    phase,
    label: PHASE_LABELS[phase],
    count: phaseCounts[phase] ?? 0,
    pct:   totalConfigs ? Math.round(((phaseCounts[phase] ?? 0) / totalConfigs) * 100) : 0,
    ...PHASE_CONFIG[phase],
  }))

  return (
    <div className="rounded-2xl bg-surface border border-border p-6">

      {/* Header */}
      <h2 className="text-base font-semibold text-heading">Configurations by phase</h2>
      <p className="text-xs text-muted mt-0.5 mb-5">
        {totalConfigs} configuration{totalConfigs !== 1 ? 's' : ''} across all phases
      </p>

      {/* Distribution bar */}
      {totalConfigs > 0 ? (
        <div className="flex gap-1 mb-5">
          {phases.map(({ phase, color, pct }) =>
            pct > 0 ? (
              <div
                key={phase}
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            ) : null
          )}
        </div>
      ) : (
        <div className="h-2 rounded-full bg-soft-lavender/15 mb-5" />
      )}

      {/* Phase rows */}
      <div>
        {phases.map(({ phase, label, count, pct, color, bg, icon: Icon }, i) => (
          <div key={phase}>
            <div className="flex items-center gap-3 py-3">
              <span
                className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
                style={{ backgroundColor: bg }}
              >
                <Icon size={15} strokeWidth={1.5} style={{ color }} />
              </span>
              <span className="flex-1 text-sm text-body-text">{label}</span>
              <span className="text-sm font-semibold text-heading">{count}</span>
              <span className="text-xs text-muted w-8 text-right">{pct}%</span>
            </div>
            {i < phases.length - 1 && (
              <div className="h-px bg-border ml-11" />
            )}
          </div>
        ))}
        {totalConfigs === 0 && (
          <p className="text-sm text-muted py-3">No configurations yet.</p>
        )}
      </div>
    </div>
  )
}