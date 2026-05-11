'use client'

import { useState, useEffect } from 'react'
import FormField from '@/components/form/shared/FormField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'
import SaveButtons from '@/components/form/shared/SaveButtons'

interface ROISectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  industry?: string | null
}

const CHECKPOINTS = [
  { id: 'baseline_provided',      label: 'Baseline labour / operational cost data provided' },
  { id: 'roi_agreed',             label: 'ROI targets agreed with client stakeholders' },
  { id: 'measurement_documented', label: 'Measurement methodology documented' },
  {
    id: 'review_cadence',
    label: 'Review cadence agreed (monthly / quarterly)',
    hint: 'Confirm who owns ROI review meetings',
  },
]

export default function ROISection({
  data = {},
  onSave,
  onAutoSave,
  isSaving,
  isComplete = false,
  industry,
}: ROISectionProps) {
  const [fields, setFields] = useState({
    primary_roi_objective:     (data.primary_roi_objective     as string) ?? '',
    baseline_annual_cost:      (data.baseline_annual_cost      as string) ?? '',
    target_cost_reduction:     (data.target_cost_reduction     as string) ?? '',
    target_payback_period:     (data.target_payback_period     as string) ?? '',
    non_financial_roi_goals:   (data.non_financial_roi_goals   as string) ?? '',
    roi_measurement_method:    (data.roi_measurement_method    as string) ?? '',
    target_sqft_per_robot_day: (data.target_sqft_per_robot_day as string) ?? '',
    target_util_hours_per_day: (data.target_util_hours_per_day as string) ?? '',
  })
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setFields({
      primary_roi_objective:     (data.primary_roi_objective     as string) ?? '',
      baseline_annual_cost:      (data.baseline_annual_cost      as string) ?? '',
      target_cost_reduction:     (data.target_cost_reduction     as string) ?? '',
      target_payback_period:     (data.target_payback_period     as string) ?? '',
      non_financial_roi_goals:   (data.non_financial_roi_goals   as string) ?? '',
      roi_measurement_method:    (data.roi_measurement_method    as string) ?? '',
      target_sqft_per_robot_day: (data.target_sqft_per_robot_day as string) ?? '',
      target_util_hours_per_day: (data.target_util_hours_per_day as string) ?? '',
    })
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  function setField(key: string, value: string) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.({ ...updated, checkpoints: checked })
  }

  function toggleCheckpoint(id: string, value: boolean) {
    const updated = { ...checked, [id]: value }
    setChecked(updated)
    onAutoSave?.({ ...fields, checkpoints: updated })
  }

  function getCurrentData() {
    return { ...fields, checkpoints: checked }
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Establish the client's baseline costs and target outcomes to calibrate Orchestrator
        reporting benchmarks across the robot deployment.
      </p>

      <FormField
        label="Primary ROI objective"
        type="textarea"
        rows={2}
        placeholder="e.g. Reduce manual cleaning labour cost by 30%, increase hygiene consistency across all floors"
        value={fields.primary_roi_objective}
        onChange={v => setField('primary_roi_objective', v)}
        sectionId="roi"
        fieldKey="primary_roi_objective"
        industry={industry}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <FormField
          label="Baseline annual cost (£)"
          placeholder="e.g. 480,000"
          value={fields.baseline_annual_cost}
          onChange={v => setField('baseline_annual_cost', v)}
          sectionId="roi"
          fieldKey="baseline_annual_cost"
          industry={industry}
        />
        <FormField
          label="Target cost reduction"
          placeholder="e.g. 28%"
          value={fields.target_cost_reduction}
          onChange={v => setField('target_cost_reduction', v)}
          sectionId="roi"
          fieldKey="target_cost_reduction"
          industry={industry}
        />
        <FormField
          label="Target payback period"
          placeholder="e.g. 18 months"
          value={fields.target_payback_period}
          onChange={v => setField('target_payback_period', v)}
          sectionId="roi"
          fieldKey="target_payback_period"
          industry={industry}
        />
      </div>

      <FormField
        label="Non-financial ROI goals"
        type="textarea"
        rows={2}
        placeholder="e.g. Improved audit scores, reduced staff injury, 24/7 coverage without shift premium"
        value={fields.non_financial_roi_goals}
        onChange={v => setField('non_financial_roi_goals', v)}
        sectionId="roi"
        fieldKey="non_financial_roi_goals"
        industry={industry}
      />

      <FormField
        label="How ROI will be measured & reported"
        type="textarea"
        rows={2}
        placeholder="e.g. Monthly labour hour comparison, hygiene audit pass rate, downtime hours avoided"
        value={fields.roi_measurement_method}
        onChange={v => setField('roi_measurement_method', v)}
        sectionId="roi"
        fieldKey="roi_measurement_method"
        industry={industry}
      />

      <SectionDivider label="Performance targets" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField
          label="Target sq ft cleaned per robot per day"
          placeholder="e.g. 18,000 ft² / robot / day"
          value={fields.target_sqft_per_robot_day}
          onChange={v => setField('target_sqft_per_robot_day', v)}
          sectionId="roi"
          fieldKey="target_sqft_per_robot_day"
          industry={industry}
        />
        <FormField
          label="Target utilization hours per robot per day"
          placeholder="e.g. 6.5 hrs / robot / day"
          value={fields.target_util_hours_per_day}
          onChange={v => setField('target_util_hours_per_day', v)}
          sectionId="roi"
          fieldKey="target_util_hours_per_day"
          industry={industry}
        />
      </div>

      <CheckpointList
        checkpoints={CHECKPOINTS}
        checked={checked}
        onChange={toggleCheckpoint}
      />

      <SaveButtons
        onSaveDraft={() => onSave(getCurrentData(), false)}
        onComplete={() => onSave(getCurrentData(), true)}
        isSaving={isSaving ?? false}
        isComplete={isComplete}
      />
    </div>
  )
}