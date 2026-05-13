'use client'

import DynamicSection from '@/components/form/DynamicSection'
import type { WorkflowQuestion, ConfigPhase } from '@/types'

interface FleetSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  locationId?: string
  industry?: string | null
  questions?: WorkflowQuestion[]
  configurationId?: string
  phase?: ConfigPhase
  description?: string | null
}

export default function FleetSection({
  questions = [],
  phase = 'pre_deploy',
  description = null,
  configurationId,
  data = {},
  ...rest
}: FleetSectionProps) {
  const qs = questions.filter(q => q.field_key !== '__all__')
  return (
    <DynamicSection
      sectionSlug="fleet"
      questions={qs}
      phase={phase}
      description={description}
      configurationId={configurationId}
      data={data}
      {...rest}
    />
  )
}
