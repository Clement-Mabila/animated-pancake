'use client'

import { useState, useEffect } from 'react'
import FormField from '@/components/form/shared/FormField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'

import type { ConfigPhase } from '@/types'

interface KPIsSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  industry?: string | null
  phase?: ConfigPhase
}

const KPIS = [
  { id: 'fleet-subloc-roi',          name: 'Fleet and Sub-Location ROI',              meta: 'Derived' },
  { id: 'total-area',                name: 'Total Area Cleaned',                       meta: 'Direct'  },
  { id: 'avg-area-per-robot-day',    name: 'Avg Area Cleaned by Robot per Day',        meta: 'Derived' },
  { id: 'avg-cleaning-time-per-day', name: 'Avg Cleaning Time by Robot per Day',       meta: 'Derived' },
  { id: 'robot-cost-per-hour',       name: 'Robot Cost per Hour',                      meta: 'Derived' },
]

const CHECKPOINTS = [
  { id: 'kpi_confirmed',    label: 'KPI selection confirmed with client stakeholders' },
  { id: 'targets_set',      label: 'Targets and thresholds set per KPI' },
  { id: 'headline_agreed',  label: 'Top headline KPI agreed and configured in Orchestrator' },
  { id: 'baseline_loaded',  label: 'Benchmark baseline data loaded for trend comparison' },
  { id: 'custom_tested',    label: 'Custom formula documented and tested (if applicable)' },
]

export default function KPIsSection({ data = {}, onSave, onAutoSave, isSaving, industry, phase }: KPIsSectionProps) {
  const isPost = phase === 'post'
  const [selectedKpis, setSelectedKpis] = useState<Record<string, boolean>>(
    (data.selected_kpis as Record<string, boolean>) ?? {}
  )
  const [fields, setFields] = useState({
    headline_kpi:       (data.headline_kpi       as string) ?? '',
    reporting_frequency:(data.reporting_frequency as string) ?? '',
    custom_kpi_formula: (data.custom_kpi_formula  as string) ?? '',
    kpi_targets:        (data.kpi_targets         as string) ?? '',
  })
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setSelectedKpis((data.selected_kpis as Record<string, boolean>) ?? {})
    setFields({
      headline_kpi:        (data.headline_kpi        as string) ?? '',
      reporting_frequency: (data.reporting_frequency  as string) ?? '',
      custom_kpi_formula:  (data.custom_kpi_formula   as string) ?? '',
      kpi_targets:         (data.kpi_targets          as string) ?? '',
    })
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  function toggleKpi(id: string) {
    const updated = { ...selectedKpis, [id]: !selectedKpis[id] }
    setSelectedKpis(updated)
    onAutoSave?.({ selected_kpis: updated, ...fields, checkpoints: checked })
  }

  function setField(key: string, value: string) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.({ selected_kpis: selectedKpis, ...updated, checkpoints: checked })
  }

  function handleSave(isComplete: boolean) {
    onSave({ selected_kpis: selectedKpis, ...fields, checkpoints: checked }, isComplete)
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Select the KPIs to display on fleet-wide and per-location dashboards, and set target
        thresholds for each. These will drive Orchestrator alerts and reporting benchmarks.
      </p>

      {/* KPI selector */}
      <span style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: '10px',
      }}>
        Select KPIs
      </span>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '6px',
        marginBottom: '20px',
      }}>
        {KPIS.map(kpi => {
          const isOn = !!selectedKpis[kpi.id]
          return (
            <button
              key={kpi.id}
              onClick={() => toggleKpi(kpi.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '10px 13px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: isOn ? 'rgba(0,129,255,0.06)' : 'var(--bg-elevated)',
                border: isOn
                  ? '1px solid rgba(0,129,255,0.30)'
                  : 'var(--border-subtle)',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isOn ? 'var(--electric-blue)' : 'var(--text-primary)',
                }}>
                  {kpi.name}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  alignSelf: 'flex-start',
                  background: kpi.meta === 'Derived'
                    ? 'rgba(165,42,225,0.10)'
                    : 'rgba(0,129,255,0.10)',
                  color: kpi.meta === 'Derived' ? '#7B1FA2' : '#0057B8',
                }}>
                  {kpi.meta}
                </span>
              </div>

              {/* Toggle circle */}
              <div style={{
                width: '16px', height: '16px',
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
                background: isOn ? 'var(--electric-blue)' : 'var(--bg-surface)',
                border: isOn ? 'none' : '1.5px solid rgba(146,140,227,0.3)',
              }}>
                {isOn && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* KPI targets textarea — label shifts in post phase */}
      <FormField
        label={isPost ? 'Refine KPI targets & thresholds (post go-live)' : 'KPI targets & thresholds'}
        type="textarea"
        rows={3}
        placeholder={isPost
          ? 'Adjust targets based on 2-week live data — e.g. raise ROI threshold, lower coverage target...'
          : 'e.g. ROI < $20/hr, Avg Area Cleaned > 16,000 sq ft/robot/day, Utilization > 4 hrs/day/robot...'}
        value={fields.kpi_targets}
        onChange={v => setField('kpi_targets', v)}
        sectionId="kpis"
        fieldKey="kpi_targets"
        industry={industry}
      />

      <SectionDivider label="Dashboard configuration" />

      <FormField
        label="Top headline KPI (shown prominently on dashboard)"
        placeholder="e.g. Avg Coverage — the single most important metric for this client"
        value={fields.headline_kpi}
        onChange={v => setField('headline_kpi', v)}
        sectionId="kpis"
        fieldKey="headline_kpi"
        industry={industry}
      />

      <FormField
        label="KPI reporting frequency"
        placeholder="e.g. Real-time dashboard + daily digest + weekly summary"
        value={fields.reporting_frequency}
        onChange={v => setField('reporting_frequency', v)}
        sectionId="kpis"
        fieldKey="reporting_frequency"
        industry={industry}
      />

      {/* Custom formula — Q2 only, not needed during initial pre-deploy setup */}
      {isPost && (
        <FormField
          label="Custom KPI or formula required?"
          type="textarea"
          rows={2}
          placeholder="e.g. Hygiene score = (coverage % × task completion %) weighted by floor priority"
          value={fields.custom_kpi_formula}
          onChange={v => setField('custom_kpi_formula', v)}
          sectionId="kpis"
          fieldKey="custom_kpi_formula"
          industry={industry}
        />
      )}

      {/* Checkpoints */}
      <CheckpointList
        checkpoints={CHECKPOINTS}
        checked={checked}
        onChange={(id, value) => {
          const updated = { ...checked, [id]: value }
          setChecked(updated)
          onAutoSave?.({ selected_kpis: selectedKpis, ...fields, checkpoints: updated })
        }}
      />

      {/* Save draft */}
      <button
        onClick={() => handleSave(false)}
        disabled={isSaving}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          background: 'transparent',
          border: 'var(--border-subtle)',
          color: 'var(--text-muted)',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          marginBottom: '8px',
          transition: 'all 0.2s',
        }}
      >
        {isSaving ? 'Saving...' : 'Save draft'}
      </button>

      {/* Mark complete */}
      <button
        onClick={() => handleSave(true)}
        disabled={isSaving}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'white',
          background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
          border: 'none',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          opacity: isSaving ? 0.7 : 1,
          boxShadow: '0 2px 12px rgba(0,129,255,0.25)',
          transition: 'all 0.2s',
        }}
      >
        {isSaving ? 'Saving...' : 'Save & mark complete →'}
      </button>
    </div>
  )
}