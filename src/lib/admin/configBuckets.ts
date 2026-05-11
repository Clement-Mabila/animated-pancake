import type { ConfigBucketTab, ConfigStatus, ConfigPhase } from '@/types'
import { PHASE_SECTIONS } from '@/lib/phases'
import type { SectionId } from '@/types'

export function phaseSectionCount(phase: ConfigPhase): number {
  return PHASE_SECTIONS[phase].length
}

export function countCompletedInPhase(
  phase: ConfigPhase,
  sections: Record<string, { is_complete?: boolean } | undefined>
): number {
  const ids = PHASE_SECTIONS[phase] as SectionId[]
  return ids.filter(id => sections[id]?.is_complete === true).length
}

export function getConfigBucket(input: {
  status: ConfigStatus
  phase: ConfigPhase
  completedInPhase: number
}): Exclude<ConfigBucketTab, 'all'> {
  if (input.status !== 'draft') return 'complete'
  if (input.completedInPhase === 0) return 'draft'
  return 'in_progress'
}

export function matchesBucket(
  tab: ConfigBucketTab,
  input: { status: ConfigStatus; phase: ConfigPhase; completedInPhase: number }
): boolean {
  if (tab === 'all') return true
  const b = getConfigBucket(input)
  if (tab === 'complete') return b === 'complete'
  return b === tab
}
