'use client'

import { useState, useEffect } from 'react'
import FormField from '@/components/form/shared/FormField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'

import type { ConfigPhase } from '@/types'
import { ArrowRight, Loader2 } from 'lucide-react'

interface InsightSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  industry?: string | null
  phase?: ConfigPhase
}

const COMPONENTS = [
  { id: 'smart-text',    icon: 'ST', name: 'Smart Text',         desc: 'AI-generated narrative summary' },
  { id: 'kpi-grid',      icon: 'KG', name: 'KPI Grid',           desc: 'Key metrics with trend indicators' },
  { id: 'area-day',      icon: 'AD', name: 'Area by Day',        desc: 'Daily area cleaned over time' },
  { id: 'breakeven',     icon: 'BT', name: 'Breakeven Trend',    desc: 'ROI trend over time' },
  { id: 'area-location', icon: 'AL', name: 'Area by Location',   desc: 'Compare performance across locations' },
  { id: 'problem-areas', icon: 'PA', name: 'Problem Areas',      desc: 'AI-identified issues and anomalies' },
  { id: 'forecast',      icon: 'FC', name: 'Forecast',           desc: 'Predictive outlook for robot performance' },
  { id: 'consumables',   icon: 'CO', name: 'Consumables',        desc: 'Consumables status and usage' },
  { id: 'key-takeaways', icon: 'KT', name: 'Key Takeaways',      desc: 'AI synthesis of top insights' },
  { id: 'time-area',     icon: 'TR', name: 'Time & Area by Robot', desc: 'Compare robot efficiency across fleet' },
]

const KPIS = [
  { id: 'total-jobs',       name: 'Total Jobs',          meta: 'Direct'  },
  { id: 'jobs-completed',   name: 'Jobs Completed',      meta: 'Direct'  },
  { id: 'success-rate',     name: 'Success Rate',        meta: 'Derived' },
  { id: 'total-area',       name: 'Total Area Cleaned',  meta: 'Direct'  },
  { id: 'total-time',       name: 'Total Time',          meta: 'Direct'  },
  { id: 'productivity',     name: 'Productivity',        meta: 'Derived' },
  { id: 'avg-coverage',     name: 'Avg Coverage',        meta: 'Direct'  },
  { id: 'avg-job-duration', name: 'Avg Job Duration',    meta: 'Direct'  },
  { id: 'availability',     name: 'Availability %',      meta: 'Derived' },
  { id: 'utilization',      name: 'Utilization %',       meta: 'Derived' },
]

const CHECKPOINTS = [
  { id: 'components_confirmed',  label: 'Report components selected and confirmed with client' },
  { id: 'kpi_targets_set',       label: 'KPI targets and thresholds set per site' },
  { id: 'template_confirmed',    label: 'Per-site insight report template confirmed' },
  { id: 'recipients_set',        label: 'Report recipients set at site level in Orchestrator' },
  { id: 'bi_tested',             label: 'BI / data integration tested (if applicable)' },
  { id: 'first_report_sent',     label: 'First automated report sent and signed off by client' },
]

export default function InsightSection({ data = {}, onSave, onAutoSave, isSaving, phase }: InsightSectionProps) {
  const isPost = phase === 'post'
  const [selectedComponents, setSelectedComponents] = useState<Record<string, boolean>>(
    (data.selected_components as Record<string, boolean>) ?? {}
  )
  const [selectedKpis, setSelectedKpis] = useState<Record<string, boolean>>(
    (data.selected_kpis as Record<string, boolean>) ?? {}
  )
  const [fields, setFields] = useState({
    kpi_targets:        (data.kpi_targets        as string) ?? '',
    report_frequency:   (data.report_frequency   as string) ?? '',
    report_recipients:  (data.report_recipients  as string) ?? '',
    report_format:      (data.report_format      as string) ?? '',
    bi_integration:     (data.bi_integration     as string) ?? '',
    benchmarking:       (data.benchmarking       as string) ?? '',
  })
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setSelectedComponents((data.selected_components as Record<string, boolean>) ?? {})
    setSelectedKpis((data.selected_kpis as Record<string, boolean>) ?? {})
    setFields({
      kpi_targets:       (data.kpi_targets       as string) ?? '',
      report_frequency:  (data.report_frequency  as string) ?? '',
      report_recipients: (data.report_recipients as string) ?? '',
      report_format:     (data.report_format     as string) ?? '',
      bi_integration:    (data.bi_integration    as string) ?? '',
      benchmarking:      (data.benchmarking      as string) ?? '',
    })
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  function setField(key: string, value: string) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.({ selected_components: selectedComponents, selected_kpis: selectedKpis, ...updated, checkpoints: checked })
  }

  function handleSave(isComplete: boolean) {
    onSave({
      selected_components: selectedComponents,
      selected_kpis: selectedKpis,
      ...fields,
      checkpoints: checked,
    }, isComplete)
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Select the report components and KPIs to include in each location insight report.
        Confirm targets, recipients, and cadence before go-live.
      </p>

      {/* Report components */}
      <SectionDivider label="Select report components" />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px', marginBottom: '20px',
      }}>
        {COMPONENTS.map(c => {
          const isOn = !!selectedComponents[c.id]
          return (
            <button
              key={c.id}
              onClick={() => {
              const updated = { ...selectedComponents, [c.id]: !selectedComponents[c.id] }
              setSelectedComponents(updated)
              onAutoSave?.({ selected_components: updated, selected_kpis: selectedKpis, ...fields, checkpoints: checked })
            }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
                background: isOn ? 'rgba(165,42,225,0.07)' : 'var(--bg-elevated)',
                border: isOn ? '1px solid rgba(165,42,225,0.35)' : 'var(--border-subtle)',
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.03em',
                transition: 'all 0.15s',
                background: isOn ? 'var(--bright-violet)' : 'rgba(165,42,225,0.10)',
                color: isOn ? 'white' : 'var(--bright-violet)',
                border: isOn ? 'none' : '1px solid rgba(165,42,225,0.2)',
              }}>
                {c.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', fontWeight: 600, lineHeight: 1.3,
                  color: isOn ? 'var(--bright-violet)' : 'var(--text-primary)',
                }}>
                  {c.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {c.desc}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* KPI selector */}
      <SectionDivider label="Select KPIs & set targets" />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '6px', marginBottom: '16px',
      }}>
        {KPIS.map(k => {
          const isOn = !!selectedKpis[k.id]
          return (
            <button
              key={k.id}
              onClick={() => {
              const updated = { ...selectedKpis, [k.id]: !selectedKpis[k.id] }
              setSelectedKpis(updated)
              onAutoSave?.({ selected_components: selectedComponents, selected_kpis: updated, ...fields, checkpoints: checked })
            }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '8px', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
                background: isOn ? 'rgba(0,129,255,0.06)' : 'var(--bg-elevated)',
                border: isOn ? '1px solid rgba(0,129,255,0.30)' : 'var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: isOn ? 'var(--electric-blue)' : 'var(--text-primary)' }}>
                  {k.name}
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 6px',
                  borderRadius: '10px', alignSelf: 'flex-start',
                  background: k.meta === 'Derived' ? 'rgba(165,42,225,0.10)' : 'rgba(0,129,255,0.10)',
                  color: k.meta === 'Derived' ? '#7B1FA2' : '#0057B8',
                }}>
                  {k.meta}
                </span>
              </div>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isOn ? 'var(--electric-blue)' : 'var(--bg-surface)',
                border: isOn ? 'none' : '1.5px solid rgba(146,140,227,0.3)',
              }}>
                {isOn && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <FormField
        label={isPost ? 'Refine KPI targets & thresholds (post go-live)' : 'KPI targets & thresholds'}
        type="textarea"
        rows={3}
        placeholder={isPost
          ? 'Adjust targets based on 2-week live data — e.g. raise ROI threshold or lower coverage target per site...'
          : 'e.g. ROI < $20/hr, Avg Area Cleaned > 16,000 sq ft/robot/day, Utilization > 4 hrs/day/robot...'}
        value={fields.kpi_targets}
        onChange={v => setField('kpi_targets', v)}
      />

      <SectionDivider label="Report delivery" />

      <FormField
        label="Insight report frequency per site"
        placeholder="e.g. Daily email + weekly PDF + monthly deep-dive"
        value={fields.report_frequency}
        onChange={v => setField('report_frequency', v)}
      />

      <FormField
        label="Report recipients at site level"
        placeholder="e.g. Site Manager, Cleaning Supervisor, Area Director"
        value={fields.report_recipients}
        onChange={v => setField('report_recipients', v)}
      />

      <FormField
        label="Preferred report format"
        placeholder="e.g. Email digest, in-app dashboard, exported PDF, BI data feed"
        value={fields.report_format}
        onChange={v => setField('report_format', v)}
      />

      {/* BI integration + benchmarking — Q2 only; not needed until live data exists */}
      {isPost ? (
        <>
          <FormField
            label="Client BI / reporting tool integration"
            placeholder="e.g. Power BI, Tableau — API endpoint or CSV feed? Confirm connection tested."
            value={fields.bi_integration}
            onChange={v => setField('bi_integration', v)}
          />

          <FormField
            label="Benchmarking preference"
            type="textarea"
            rows={2}
            placeholder="vs other sites? vs industry benchmark? vs previous period?"
            value={fields.benchmarking}
            onChange={v => setField('benchmarking', v)}
          />
        </>
      ) : (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          background: 'rgba(57,153,254,0.05)', border: '1px solid rgba(57,153,254,0.18)',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--electric-blue)' }}>Post-Deploy only: </span>
            BI / data integration and benchmarking preferences are configured after go-live,
            once live data is available to validate the connection and set meaningful baselines.
          </p>
        </div>
      )}

      <CheckpointList
        checkpoints={CHECKPOINTS}
        checked={checked}
        onChange={(id, value) => {
          const updated = { ...checked, [id]: value }
          setChecked(updated)
          onAutoSave?.({ selected_components: selectedComponents, selected_kpis: selectedKpis, ...fields, checkpoints: updated })
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