'use client'

import { useState, useEffect } from 'react'
import FormField from '@/components/form/shared/FormField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'

import type { ConfigPhase } from '@/types'

interface AlertsSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  industry?: string | null
  phase?: ConfigPhase
}

const PRIORITIES = [
  {
    id: 'critical',
    label: 'Critical',
    color: '#C62828',
    bg: 'rgba(229,57,53,0.10)',
    dot: '#E53935',
    examples: 'Robot collision / safety stop, e-stop, fire alarm trigger, full connectivity loss, defect confirmed',
  },
  {
    id: 'high',
    label: 'High',
    color: '#E65100',
    bg: 'rgba(245,124,0,0.10)',
    dot: '#F57C00',
    examples: 'Robot stuck > 10 min, battery failure mid-task, no-go zone breach, coverage < 70%, OEM approval overdue > 4 hrs',
  },
  {
    id: 'medium',
    label: 'Medium',
    color: '#0057B8',
    bg: 'rgba(0,129,255,0.10)',
    dot: '#0081FF',
    examples: 'Low battery not docking, consumable % below threshold, customer approval pending > 24 hrs',
  },
  {
    id: 'low',
    label: 'Low',
    color: '#1B5E20',
    bg: 'rgba(27,138,90,0.10)',
    dot: '#1B8A5A',
    examples: 'PM due (14-day cycle), firmware update available, daily coverage below target',
  },
]

const CHECKPOINTS = [
  { id: 'priorities_mapped',    label: 'All priority levels mapped to named recipients per site' },
  { id: 'critical_set',         label: 'Critical alert escalation contacts set (24/7)' },
  { id: 'channels_configured',  label: 'Delivery channels configured and tested in Orchestrator' },
  { id: 'test_sent',            label: 'Test alert sent and acknowledged at each priority level' },
  { id: 'quiet_hours_confirmed',label: 'Quiet hours / suppression rules confirmed' },
  { id: 'overrides_applied',    label: 'Site-specific overrides documented and applied' },
  { id: 'breakfix_recipient',   label: 'Break/Fix approval alert recipient confirmed and tested' },
]

export default function AlertsSection({ data = {}, onSave, onAutoSave, isSaving, industry, phase }: AlertsSectionProps) {
  const isPost = phase === 'post'
  const [alertRecipients, setAlertRecipients] = useState<Record<string, string>>(
    (data.alert_recipients as Record<string, string>) ?? {}
  )
  const [fields, setFields] = useState({
    delivery_method:         (data.delivery_method         as string) ?? '',
    out_of_hours_contacts:   (data.out_of_hours_contacts   as string) ?? '',
    quiet_hours:             (data.quiet_hours             as string) ?? '',
    site_overrides:          (data.site_overrides          as string) ?? '',
    breakfix_alert_recipient:(data.breakfix_alert_recipient as string) ?? '',
  })
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setAlertRecipients((data.alert_recipients as Record<string, string>) ?? {})
    setFields({
      delivery_method:          (data.delivery_method          as string) ?? '',
      out_of_hours_contacts:    (data.out_of_hours_contacts    as string) ?? '',
      quiet_hours:              (data.quiet_hours              as string) ?? '',
      site_overrides:           (data.site_overrides           as string) ?? '',
      breakfix_alert_recipient: (data.breakfix_alert_recipient as string) ?? '',
    })
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  function setField(key: string, value: string) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.({ alert_recipients: alertRecipients, ...updated, checkpoints: checked })
  }

  function handleSave(isComplete: boolean) {
    onSave({ alert_recipients: alertRecipients, ...fields, checkpoints: checked }, isComplete)
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Configure which robot events trigger alerts, at what priority, and who gets notified
        by site, role, and channel.
      </p>

      {/* Alert matrix */}
      <SectionDivider label="Alert routing matrix" />
      <div style={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: 'var(--border-subtle)',
        marginBottom: '20px',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '110px 1fr 220px',
          background: 'var(--bg-elevated)',
          borderBottom: 'var(--border-subtle)',
          padding: '8px 12px',
          gap: '12px',
        }}>
          {['Priority', 'Example triggers', 'Notify — names / roles'].map(h => (
            <span key={h} style={{
              fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Table rows */}
        {PRIORITIES.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 220px',
              gap: '12px',
              padding: '12px',
              alignItems: 'center',
              background: 'var(--bg-surface)',
              borderBottom: i < PRIORITIES.length - 1 ? 'var(--border-subtle)' : 'none',
            }}
          >
            {/* Priority pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 8px', borderRadius: '20px',
              background: p.bg,
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', color: p.color }}>
                {p.label}
              </span>
            </div>

            {/* Examples */}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {p.examples}
            </span>

            {/* Recipient input */}
            <input
              type="text"
              placeholder="Names / roles..."
              value={alertRecipients[p.id] ?? ''}
              onChange={e => {
                const updated = { ...alertRecipients, [p.id]: e.target.value }
                setAlertRecipients(updated)
                onAutoSave?.({ alert_recipients: updated, ...fields, checkpoints: checked })
              }}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(146,140,227,0.2)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '12px',
                padding: '7px 10px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        ))}
      </div>

      <SectionDivider label="Delivery settings" />

      <FormField
        label="Alert delivery method"
        placeholder="e.g. Push notification (app), email, SMS for critical only"
        value={fields.delivery_method}
        onChange={v => setField('delivery_method', v)}
        sectionId="alerts"
        fieldKey="delivery_method"
        industry={industry}
      />

      <FormField
        label="Out-of-hours critical alert contacts"
        type="textarea"
        rows={2}
        placeholder="Who receives critical alerts when site is unstaffed? Include mobile numbers."
        value={fields.out_of_hours_contacts}
        onChange={v => setField('out_of_hours_contacts', v)}
      />

      {/* Quiet hours + site overrides — Q2 only, refined after 2-week live data */}
      {isPost ? (
        <>
          <FormField
            label="Alert suppression / quiet hours"
            placeholder="e.g. Suppress Low / Medium 22:00–06:00; Critical always on"
            value={fields.quiet_hours}
            onChange={v => setField('quiet_hours', v)}
            sectionId="alerts"
            fieldKey="quiet_hours"
            industry={industry}
          />

          <FormField
            label="Site-specific alert overrides"
            type="textarea"
            rows={2}
            placeholder="e.g. Hospital site — all alerts silent mode with app-only push"
            value={fields.site_overrides}
            onChange={v => setField('site_overrides', v)}
            sectionId="alerts"
            fieldKey="site_overrides"
            industry={industry}
          />
        </>
      ) : (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          background: 'rgba(57,153,254,0.05)', border: '1px solid rgba(57,153,254,0.18)',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--electric-blue)' }}>Post-Deploy only: </span>
            Quiet hours and site-specific overrides are configured in the Post-Deployment phase
            after reviewing 2 weeks of live alert patterns.
          </p>
        </div>
      )}

      <FormField
        label="Break/Fix customer approval alert recipient"
        placeholder="Who receives the cost estimate notification requiring approval before chargeable work starts?"
        value={fields.breakfix_alert_recipient}
        onChange={v => setField('breakfix_alert_recipient', v)}
      />

      <CheckpointList
        checkpoints={CHECKPOINTS}
        checked={checked}
        onChange={(id, value) => {
          const updated = { ...checked, [id]: value }
          setChecked(updated)
          onAutoSave?.({ alert_recipients: alertRecipients, ...fields, checkpoints: updated })
        }}
      />

      <button
        onClick={() => handleSave(false)}
        disabled={isSaving}
        style={{
          width: '100%', padding: '10px', borderRadius: '8px',
          fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em',
          textTransform: 'uppercase', background: 'transparent',
          border: 'var(--border-subtle)', color: 'var(--text-muted)',
          cursor: isSaving ? 'not-allowed' : 'pointer', marginBottom: '8px',
        }}
      >
        {isSaving ? 'Saving...' : 'Save draft'}
      </button>

      <button
        onClick={() => handleSave(true)}
        disabled={isSaving}
        style={{
          width: '100%', padding: '12px', borderRadius: '8px',
          fontSize: '13px', fontWeight: 600, color: 'white',
          background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
          border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
          opacity: isSaving ? 0.7 : 1,
          boxShadow: '0 2px 12px rgba(0,129,255,0.25)',
        }}
      >
        {isSaving ? 'Saving...' : 'Save & mark complete →'}
      </button>
    </div>
  )
}