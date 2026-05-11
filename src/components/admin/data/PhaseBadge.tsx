import { PHASE_LABELS } from '@/lib/phases'
import type { ConfigPhase } from '@/types'

export default function PhaseBadge({ phase }: { phase: ConfigPhase }) {
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{
        background: 'rgba(0, 129, 255, 0.12)',
        color: 'var(--electric-blue)',
      }}
    >
      {PHASE_LABELS[phase] ?? phase}
    </span>
  )
}
