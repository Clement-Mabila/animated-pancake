'use client'

import { useState, useEffect } from 'react'
import FormField from '@/components/form/shared/FormField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'
import SaveButtons from '@/components/form/shared/SaveButtons'

interface TimezoneSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  industry?: string | null
}

const TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern Time (ET) — UTC-5/4' },
  { value: 'America/Chicago',     label: 'Central Time (CT) — UTC-6/5' },
  { value: 'America/Denver',      label: 'Mountain Time (MT) — UTC-7/6' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) — UTC-8/7' },
  { value: 'America/Phoenix',     label: 'Arizona (no DST) — UTC-7' },
  { value: 'America/Anchorage',   label: 'Alaska Time (AKT) — UTC-9/8' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii Time (HST) — UTC-10' },
  { value: 'Europe/London',       label: 'London (GMT/BST) — UTC+0/1' },
  { value: 'Europe/Paris',        label: 'Central European Time (CET) — UTC+1/2' },
  { value: 'Asia/Dubai',          label: 'Gulf Standard Time (GST) — UTC+4' },
  { value: 'Asia/Singapore',      label: 'Singapore Time (SGT) — UTC+8' },
  { value: 'Australia/Sydney',    label: 'Australian Eastern Time (AET) — UTC+10/11' },
]

const CHECKPOINTS = [
  { id: 'primary_tz_set',     label: 'Primary time zone set in Orchestrator' },
  { id: 'dst_confirmed',      label: 'Daylight saving transitions confirmed' },
  { id: 'multiregion_tested', label: 'Multi-region time offsets tested (if applicable)' },
  { id: 'schedule_activated', label: 'Report schedule activated and delivery confirmed' },
  { id: 'first_report',       label: 'Client confirmed receipt of first scheduled report' },
]

export default function TimezoneSection({
  data = {},
  onSave,
  onAutoSave,
  isSaving,
  isComplete,
  industry,
}: TimezoneSectionProps) {
  const [fields, setFields] = useState({
    primary_timezone:        (data.primary_timezone        as string) ?? '',
    additional_timezones:    (data.additional_timezones    as string) ?? '',
    business_hours:          (data.business_hours          as string) ?? '',
    daily_report_time:       (data.daily_report_time       as string) ?? '',
    weekly_report_schedule:  (data.weekly_report_schedule  as string) ?? '',
    monthly_report_schedule: (data.monthly_report_schedule as string) ?? '',
  })
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setFields({
      primary_timezone:        (data.primary_timezone        as string) ?? '',
      additional_timezones:    (data.additional_timezones    as string) ?? '',
      business_hours:          (data.business_hours          as string) ?? '',
      daily_report_time:       (data.daily_report_time       as string) ?? '',
      weekly_report_schedule:  (data.weekly_report_schedule  as string) ?? '',
      monthly_report_schedule: (data.monthly_report_schedule as string) ?? '',
    })
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  function setField(key: string, value: string) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.({ ...updated, checkpoints: checked })
  }

  function getCurrentData() {
    return { ...fields, checkpoints: checked }
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Set regional time zones, business hours, and the automated report delivery schedule
        for every site.
      </p>

      <SectionDivider label="Time zones" />

      <FormField
        label="Primary operating time zone"
        type="select"
        options={TIMEZONES}
        value={fields.primary_timezone}
        onChange={v => setField('primary_timezone', v)}
      />

      <FormField
        label="Additional time zones (multi-region)"
        placeholder="e.g. US/Eastern, Europe/London — list all additional zones"
        value={fields.additional_timezones}
        onChange={v => setField('additional_timezones', v)}
        sectionId="timezone"
        fieldKey="additional_timezones"
        industry={industry}
      />

      <FormField
        label="Business hours definition"
        placeholder="e.g. Mon–Fri 06:00–22:00, Sat 07:00–18:00"
        value={fields.business_hours}
        onChange={v => setField('business_hours', v)}
        sectionId="timezone"
        fieldKey="business_hours"
        industry={industry}
      />

      <SectionDivider label="Report schedule" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <FormField
          label="Daily report delivery time"
          placeholder="e.g. 07:00 local"
          value={fields.daily_report_time}
          onChange={v => setField('daily_report_time', v)}
          sectionId="timezone"
          fieldKey="daily_report_time"
          industry={industry}
        />
        <FormField
          label="Weekly report day & time"
          placeholder="e.g. Monday 07:30"
          value={fields.weekly_report_schedule}
          onChange={v => setField('weekly_report_schedule', v)}
          sectionId="timezone"
          fieldKey="weekly_report_schedule"
          industry={industry}
        />
        <FormField
          label="Monthly report date & time"
          placeholder="e.g. 1st of month, 08:00"
          value={fields.monthly_report_schedule}
          onChange={v => setField('monthly_report_schedule', v)}
          sectionId="timezone"
          fieldKey="monthly_report_schedule"
          industry={industry}
        />
      </div>

      <CheckpointList
        checkpoints={CHECKPOINTS}
        checked={checked}
        onChange={(id, value) => {
          const updated = { ...checked, [id]: value }
          setChecked(updated)
          onAutoSave?.({ ...fields, checkpoints: updated })
        }}
      />

      <SaveButtons
        onSaveDraft={() => onSave(getCurrentData(), false)}
        onComplete={() => onSave(getCurrentData(), true)}
        isSaving={isSaving ?? false}
        isComplete={isComplete ?? false}
      />
    </div>
  )
}