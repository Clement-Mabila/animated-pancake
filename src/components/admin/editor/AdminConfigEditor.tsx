'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import SectionCard from '@/components/form/shared/SectionCard'
import DynamicSection from '@/components/form/DynamicSection'
import ROISection from '@/components/form/sections/ROISection'
import KPIsSection from '@/components/form/sections/KPIsSection'
import FleetSection from '@/components/form/sections/FleetSection'
import ContactsSection from '@/components/form/sections/ContactsSection'
import RolesSection from '@/components/form/sections/RolesSection'
import IntegrationsSection from '@/components/form/sections/IntegrationsSection'
import FSMSection from '@/components/form/sections/FSMSection'
import InsightSection from '@/components/form/sections/InsightSection'
import TimezoneSection from '@/components/form/sections/TimezoneSection'
import DocumentsSection from '@/components/form/sections/DocumentsSection'
import { adminSaveSectionAction } from '@/app/admin/actions/configurationAdmin'
import { useToast } from '@/context/ToastContext'
import type { ConfigurationWithStaff, ConfigSection, SectionId, WorkflowQuestion, ConfigPhase } from '@/types'

const SECTIONS: { id: SectionId; number: number; title: string; subtitle: string; checkpoints: number }[] = [
  { id: 'roi', number: 1, title: 'ROI targets', subtitle: 'Baseline costs & outcome goals', checkpoints: 4 },
  { id: 'kpis', number: 2, title: 'KPIs & performance metrics', subtitle: 'Dashboard metric configuration', checkpoints: 5 },
  { id: 'fleet', number: 3, title: 'Validate robot fleet & locations', subtitle: 'Confirm ingested data is accurate', checkpoints: 9 },
  { id: 'contacts', number: 4, title: 'Contacts by location & role', subtitle: 'Site and fleet-level contacts', checkpoints: 7 },
  { id: 'roles', number: 5, title: 'Reporting roles & access', subtitle: 'Access tiers and permissions', checkpoints: 6 },
  { id: 'alerts', number: 6, title: 'Alert configuration & routing', subtitle: 'Priority levels and recipients', checkpoints: 7 },
  { id: 'integrations', number: 7, title: 'Client systems integrations', subtitle: 'SSO, task management, facilities & more', checkpoints: 6 },
  { id: 'fsm', number: 8, title: 'Field Service Management & Work Orders', subtitle: 'Service, SLA, approval & warranty setup', checkpoints: 11 },
  { id: 'insight', number: 9, title: 'Location insight reports', subtitle: 'Per-site report configuration', checkpoints: 6 },
  { id: 'timezone', number: 10, title: 'Time zone & reporting schedule', subtitle: 'Delivery cadence & report scheduling', checkpoints: 5 },
  { id: 'docs', number: 11, title: 'Required documents', subtitle: 'Facility map, org chart & vendor details', checkpoints: 3 },
]

export default function AdminConfigEditor({
  initialConfiguration,
  initialSections,
  questions = [],
}: {
  initialConfiguration: ConfigurationWithStaff & {
    location?: { industry: string | null } | null
    client_contact?: unknown
  }
  initialSections: Record<string, ConfigSection>
  questions?: WorkflowQuestion[]
}) {
  const { showToast } = useToast()
  const [configuration] = useState(initialConfiguration)
  const [sections, setSections] = useState<Record<string, ConfigSection>>(initialSections)
  const [saving, setSaving] = useState(false)
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const initializedRef = useRef(false)

  const industry = configuration.location?.industry ?? null
  const locationId = configuration.location_id ?? undefined

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const first = SECTIONS.find(s => !sections[s.id]?.is_complete)
    setOpenSectionId(first?.id ?? SECTIONS[0]?.id ?? null)
  }, [sections])

  const persist = useCallback(
    async (sectionId: SectionId, data: Record<string, unknown>, isComplete: boolean) => {
      setSaving(true)
      try {
        const res = await adminSaveSectionAction({
          configurationId: configuration.id,
          sectionId,
          data,
          isComplete,
        })
        if (!res.ok) {
          showToast('error', res.error)
          return
        }
        setSections(prev => ({
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            configuration_id: configuration.id,
            section_id: sectionId,
            data,
            is_complete: isComplete,
            saved_at: new Date().toISOString(),
          } as ConfigSection,
        }))
        showToast(isComplete ? 'complete' : 'draft', isComplete ? 'Section saved' : 'Draft saved')
      } finally {
        setSaving(false)
      }
    },
    [configuration.id, showToast]
  )

  function toggleSection(id: string) {
    setOpenSectionId(prev => (prev === id ? null : id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-xl px-4 py-3 mb-2 text-sm font-semibold"
        style={{
          background: 'linear-gradient(135deg, rgba(165,42,225,0.12), rgba(57,153,254,0.08))',
          border: '1px solid rgba(146,140,227,0.25)',
          color: 'var(--text-primary)',
        }}
      >
        Admin editor — all sections are available regardless of phase. Changes are audit-logged.
      </div>

      {SECTIONS.map((s, idx) => {
        const sectionId = s.id
        const sectionData = sections[sectionId]
        const child = (() => {
          switch (sectionId) {
            case 'roi':
              return (
                <ROISection
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  industry={industry}
                />
              )
            case 'kpis':
              return (
                <KPIsSection
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  industry={industry}
                />
              )
            case 'fleet':
              return (
                <FleetSection
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  locationId={locationId}
                  industry={industry}
                  questions={questions.filter(q => q.section_slug === sectionId)}
                />
              )
            case 'contacts':
              return (
                <ContactsSection
                  configurationId={configuration.id}
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  questions={questions.filter(q => q.section_slug === sectionId)}
                />
              )
            case 'roles':
              return (
                <RolesSection
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  industry={industry}
                />
              )
            case 'alerts': {
              const alertQs = questions.filter(q => q.section_slug === 'alerts' && q.field_key !== '__all__')
              return (
                <DynamicSection
                  sectionSlug="alerts"
                  questions={alertQs}
                  phase={(configuration.phase as ConfigPhase) ?? 'post'}
                  description={null}
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  industry={industry}
                  configurationId={configuration.id}
                  locationId={locationId}
                />
              )
            }
            case 'integrations':
              return (
                <IntegrationsSection
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  industry={industry}
                  questions={questions.filter(q => q.section_slug === sectionId)}
                />
              )
            case 'fsm':
              return (
                <FSMSection
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  industry={industry}
                />
              )
            case 'insight':
              return (
                <InsightSection
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  industry={industry}
                />
              )
            case 'timezone':
              return (
                <TimezoneSection
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  industry={industry}
                />
              )
            case 'docs':
              return (
                <DocumentsSection
                  data={sectionData?.data ?? {}}
                  onSave={(d, c) => persist(sectionId, d, c)}
                  onAutoSave={() => {}}
                  isSaving={saving}
                  isComplete={sectionData?.is_complete ?? false}
                  questions={questions.filter(q => q.section_slug === sectionId)}
                />
              )
          }
        })()

        return (
          <SectionCard
            key={sectionId}
            id={sectionId}
            number={idx + 1}
            title={s.title}
            subtitle={s.subtitle}
            checkpointCount={questions.filter(q => q.section_slug === sectionId && q.field_type === 'checkpoint').length || s.checkpoints}
            isComplete={sectionData?.is_complete ?? false}
            open={openSectionId === sectionId}
            onToggle={() => toggleSection(sectionId)}
          >
            {child}
          </SectionCard>
        )
      })}
    </div>
  )
}
