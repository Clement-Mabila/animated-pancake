'use client'

import { useState, useEffect } from 'react'
import FormField from '@/components/form/shared/FormField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'
import { ArrowRight, Loader2 } from 'lucide-react'

interface FSMSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  industry?: string | null
}

const SLA_TIERS = [
  { value: 'p1', label: 'P1 — Critical: 2hr response / 8hr resolution' },
  { value: 'p2', label: 'P2 — High: 4hr response / 24hr resolution' },
  { value: 'p3', label: 'P3 — Medium: 8hr response / 48hr resolution' },
  { value: 'custom', label: 'Custom (specify below)' },
]

const CHECKPOINTS = [
  { id: 'sla_confirmed',         label: 'SLA tier confirmed and matches signed contract' },
  { id: 'credit_rate_confirmed', label: 'SLA service credit rate confirmed (£70/hr/robot or negotiated rate)' },
  { id: 'breakfix_documented',   label: 'Break/Fix approval method and contact documented' },
  { id: 'portal_provisioned',    label: 'Client portal access provisioned (if required)' },
  { id: 'wo_recipients_set',     label: 'WO service report recipients set per site in Orchestrator' },
  { id: 'pm_recipient_confirmed',label: 'PM completion report recipient confirmed' },
  { id: 'csat_enabled',          label: 'Client feedback / CSAT requests enabled and tested' },
  { id: 'damage_explained',      label: 'Damage classification process explained and client contact confirmed' },
  { id: 'pm_schedule_configured',label: 'PM 14-day recurrence schedule configured per robot' },
  { id: 'parts_contact_confirmed',label: 'Defective parts handover contact confirmed per site' },
  { id: 'commissioning_confirmed',label: 'New robot commissioning contact confirmed' },
]

export default function FSMSection({ data = {}, onSave, onAutoSave, isSaving, industry }: FSMSectionProps) {
  const [fields, setFields] = useState({
    sla_tier:                   (data.sla_tier                   as string) ?? '',
    sla_credit_rate:            (data.sla_credit_rate            as string) ?? '',
    breakfix_approval_method:   (data.breakfix_approval_method   as string) ?? '',
    breakfix_approval_contact:  (data.breakfix_approval_contact  as string) ?? '',
    client_portal_access:       (data.client_portal_access       as string) ?? '',
    wo_report_delivery:         (data.wo_report_delivery         as string) ?? '',
    csat_optin:                 (data.csat_optin                 as string) ?? '',
    damage_classification:      (data.damage_classification      as string) ?? '',
    pm_schedule_recurrence:     (data.pm_schedule_recurrence     as string) ?? '',
    pm_completion_recipient:    (data.pm_completion_recipient    as string) ?? '',
    defective_parts_handover:   (data.defective_parts_handover   as string) ?? '',
    commissioning_contact:      (data.commissioning_contact      as string) ?? '',
  })
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setFields({
      sla_tier:                  (data.sla_tier                  as string) ?? '',
      sla_credit_rate:           (data.sla_credit_rate           as string) ?? '',
      breakfix_approval_method:  (data.breakfix_approval_method  as string) ?? '',
      breakfix_approval_contact: (data.breakfix_approval_contact as string) ?? '',
      client_portal_access:      (data.client_portal_access      as string) ?? '',
      wo_report_delivery:        (data.wo_report_delivery        as string) ?? '',
      csat_optin:                (data.csat_optin                as string) ?? '',
      damage_classification:     (data.damage_classification     as string) ?? '',
      pm_schedule_recurrence:    (data.pm_schedule_recurrence    as string) ?? '',
      pm_completion_recipient:   (data.pm_completion_recipient   as string) ?? '',
      defective_parts_handover:  (data.defective_parts_handover  as string) ?? '',
      commissioning_contact:     (data.commissioning_contact     as string) ?? '',
    })
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  function setField(key: string, value: string) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.({ ...updated, checkpoints: checked })
  }

  function handleSave(isComplete: boolean) {
    onSave({ ...fields, checkpoints: checked }, isComplete)
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Configure how work orders are created, assessed, approved, and closed for robots at
        this client's sites. These settings govern SLA behaviour, billing classification,
        approval workflows, and warranty alerting.
      </p>

      <SectionDivider label="SLA configuration" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField
          label="Client SLA tier"
          type="select"
          options={SLA_TIERS}
          value={fields.sla_tier}
          onChange={v => setField('sla_tier', v)}
        />
        <FormField
          label="SLA service credit rate"
          placeholder="e.g. Standard £70/hr/robot or negotiated rate"
          value={fields.sla_credit_rate}
          onChange={v => setField('sla_credit_rate', v)}
        />
      </div>

      <SectionDivider label="Break/Fix approval" />

      <FormField
        label="Break/Fix approval method"
        placeholder="e.g. Email sign-off, client portal, digital signature, verbal + email follow-up"
        value={fields.breakfix_approval_method}
        onChange={v => setField('breakfix_approval_method', v)}
      />

      <FormField
        label="Break/Fix approval contact & turnaround"
        placeholder="Name / role who approves and target response time"
        value={fields.breakfix_approval_contact}
        onChange={v => setField('breakfix_approval_contact', v)}
      />

      <FormField
        label="Client portal access for WO visibility?"
        placeholder="Does the client want access to view live WO status and service history?"
        value={fields.client_portal_access}
        onChange={v => setField('client_portal_access', v)}
      />

      <SectionDivider label="Reporting & feedback" />

      <FormField
        label="WO service report delivery"
        type="textarea"
        rows={2}
        placeholder="Who receives the automated service report on WO close? e.g. Site Manager + Ops Director"
        value={fields.wo_report_delivery}
        onChange={v => setField('wo_report_delivery', v)}
      />

      <FormField
        label="Client feedback / CSAT opt-in"
        placeholder="Confirm client opts in to post-WO service rating requests"
        value={fields.csat_optin}
        onChange={v => setField('csat_optin', v)}
      />

      <FormField
        label="Damage classification awareness"
        type="textarea"
        rows={2}
        placeholder="Confirm client understands Employee / Guest / Third-Party damage billing. Who verifies damage type?"
        value={fields.damage_classification}
        onChange={v => setField('damage_classification', v)}
      />

      <SectionDivider label="Preventive maintenance" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FormField
          label="PM schedule recurrence"
          placeholder="Standard: every 14 days per robot"
          value={fields.pm_schedule_recurrence}
          onChange={v => setField('pm_schedule_recurrence', v)}
        />
        <FormField
          label="PM completion report recipient"
          placeholder="e.g. Property Operator, Facilities Manager, H&S Officer"
          value={fields.pm_completion_recipient}
          onChange={v => setField('pm_completion_recipient', v)}
        />
      </div>

      <SectionDivider label="Parts & commissioning" />

      <FormField
        label="Defective parts handover process"
        type="textarea"
        rows={2}
        placeholder="Who coordinates OEM defective part handover? Parts not collected within 30 days flagged to hub manager."
        value={fields.defective_parts_handover}
        onChange={v => setField('defective_parts_handover', v)}
      />

      <FormField
        label="New robot commissioning contact"
        placeholder="Who on the client side is present for new robot commissioning WOs? Name, role, site"
        value={fields.commissioning_contact}
        onChange={v => setField('commissioning_contact', v)}
      />

      <CheckpointList
        checkpoints={CHECKPOINTS}
        checked={checked}
        onChange={(id, value) => {
          const updated = { ...checked, [id]: value }
          setChecked(updated)
          onAutoSave?.({ ...fields, checkpoints: updated })
        }}
      />

{/* Save actions */}
<div className="flex flex-col">

  {/* Save draft */}
  <button
    onClick={() => handleSave(false)}
    disabled={isSaving}
    className={`
      w-full
      py-2.5
      rounded-2xl
      text-sm
      font-semibold
      tracking-wide
      uppercase
      border
      border-slate-500
      text-slate-300
      bg-transparent
      transition-all
      mb-2
      flex
      items-center
      justify-center
      gap-2
      ${isSaving ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:border-slate-400"}
    `}
  >
    {isSaving ? (
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving...
      </>
    ) : (
      "Save draft"
    )}
  </button>

  {/* Save & mark complete */}
  <button
    onClick={() => handleSave(true)}
    disabled={isSaving}
    className={`
      w-full
      py-3
      rounded-2xl
      text-sm
      font-semibold
      flex
      items-center
      justify-center
      gap-2
      transition-all
      text-white
      shadow-md
      bg-violet-500
      hover:bg-violet-700
      ${isSaving ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
    `}
  >
    {isSaving ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Saving...
      </>
    ) : (
      <>
        Save & mark complete
        <ArrowRight className="h-4 w-4" />
      </>
    )}
  </button>

</div>
    </div>
  )
}