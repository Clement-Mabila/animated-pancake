'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
import { upsertWorkflowQuestionAction } from '@/app/admin/actions/workflow'
import type { WorkflowSection, WorkflowQuestion, ConfigPhase } from '@/types'

// Deploy phase has no form sections — excluded from the matrix
const MATRIX_PHASES: { value: ConfigPhase; label: string; shortLabel: string; ring: string }[] = [
  { value: 'early',      label: 'Early Onboarding', shortLabel: 'Early',      ring: 'ring-amber-300'  },
  { value: 'pre_deploy', label: 'Pre-Deployment',   shortLabel: 'Pre-Deploy', ring: 'ring-blue-300'   },
  { value: 'post',       label: 'Post-Deployment',  shortLabel: 'Post',       ring: 'ring-violet-300' },
]

const GRID = '2fr 1fr 120px 120px 120px'

interface Props {
  templateId: string
  sections:   WorkflowSection[]
  questions:  WorkflowQuestion[]
  readOnly:   boolean
}

export default function PhaseMatrixTab({ templateId, sections, questions, readOnly }: Props) {
  const router = useRouter()

  // Map: sectionSlug → __all__ question (phase gate)
  const allQuestionMap = questions.reduce<Record<string, WorkflowQuestion>>((acc, q) => {
    if (q.field_key === '__all__') acc[q.section_slug] = q
    return acc
  }, {})

  // Count real questions per section (exclude __all__ gate)
  const questionCountMap = questions.reduce<Record<string, number>>((acc, q) => {
    if (q.field_key !== '__all__') acc[q.section_slug] = (acc[q.section_slug] ?? 0) + 1
    return acc
  }, {})

  // Local optimistic state: sectionSlug → phases set
  const [phaseMap, setPhaseMap] = useState<Record<string, Set<ConfigPhase>>>(() => {
    const init: Record<string, Set<ConfigPhase>> = {}
    sections.forEach(s => {
      init[s.slug] = new Set((allQuestionMap[s.slug]?.visible_in_phases ?? []) as ConfigPhase[])
    })
    return init
  })

  const [saving, setSaving] = useState<string | null>(null)

  async function handleToggle(sectionSlug: string, phase: ConfigPhase) {
    if (readOnly) return
    const question = allQuestionMap[sectionSlug]
    if (!question) return

    const current = phaseMap[sectionSlug] ?? new Set<ConfigPhase>()
    const next    = new Set(current)
    if (next.has(phase)) {
      if (next.size <= 1) return
      next.delete(phase)
    } else {
      next.add(phase)
    }

    setPhaseMap(prev => ({ ...prev, [sectionSlug]: next }))
    setSaving(sectionSlug)

    await upsertWorkflowQuestionAction({
      id:              question.id,
      templateId,
      sectionSlug,
      fieldKey:        '__all__',
      label:           question.label,
      fieldType:       question.field_type,
      visibleInPhases: Array.from(next),
      isPartial:       question.is_partial,
      instructionPreDeploy:  question.instruction_pre_deploy,
      instructionPostDeploy: question.instruction_post_deploy,
      dummyValue:      question.dummy_value,
      dummyTooltip:    question.dummy_tooltip,
      active:          question.active,
    })

    setSaving(null)
    router.refresh()
  }

  const phaseCounts = MATRIX_PHASES.reduce<Record<ConfigPhase, number>>((acc, { value }) => {
    acc[value] = sections.filter(s => phaseMap[s.slug]?.has(value)).length
    return acc
  }, {} as Record<ConfigPhase, number>)

  const activeSections   = sections.filter(s => s.active)
  const inactiveSections = sections.filter(s => !s.active)

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-heading">Phase visibility matrix</h3>
        <p className="text-xs text-muted mt-0.5">
          Toggle which sections appear in each onboarding phase. Each change saves immediately.
          {readOnly && <span className="ml-1 text-amber-600 font-medium">Read-only — create a draft to edit.</span>}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">

        {/* Header row */}
        <div className="grid bg-gray-100 border-b border-slate-200" style={{ gridTemplateColumns: GRID }}>
          <div className="px-4 py-4 flex items-center gap-1.5">
            <span className="text-sm font-medium text-black">Section</span>
            <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          </div>
          <div className="px-4 py-4">
            <span className="text-sm font-medium text-black">Description</span>
          </div>
          {MATRIX_PHASES.map(({ value, shortLabel }) => (
            <div key={value} className="px-4 py-4 text-center">
              <span className="text-sm font-medium text-black">{shortLabel}</span>
            </div>
          ))}
        </div>

        {/* Section rows */}
        {activeSections.map((section) => {
          const isSaving   = saving === section.slug
          const qCount     = questionCountMap[section.slug] ?? 0
          const descriptor = section.subtitle ?? section.description ?? '—'

          return (
            <div
              key={section.id}
              className="grid items-center transition-colors hover:bg-slate-50 border-b border-slate-100"
              style={{ gridTemplateColumns: GRID }}
            >
              {/* Section name */}
              <div className="px-4 py-4 min-w-0">
                <p className="text-sm font-medium text-black leading-tight truncate">{section.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {qCount} {qCount === 1 ? 'question' : 'questions'}
                </p>
              </div>

              {/* Description */}
              <div className="px-4 py-4">
                <p className="text-sm text-slate-500 truncate">{descriptor}</p>
              </div>

              {/* Phase toggles */}
              {MATRIX_PHASES.map(({ value, ring }) => {
                const checked = phaseMap[section.slug]?.has(value) ?? false
                const isOnly  = checked && (phaseMap[section.slug]?.size ?? 0) <= 1
                return (
                  <div key={value} className="flex items-center justify-center px-4 py-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(section.slug, value)}
                      disabled={readOnly || isSaving || (checked && isOnly)}
                      title={
                        readOnly        ? 'Create a draft to edit'
                        : checked && isOnly ? 'Section must remain in at least one phase'
                        : checked       ? `Remove from ${value}` : `Add to ${value}`
                      }
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                        checked
                          ? `bg-primary border-primary ${isSaving ? 'opacity-60' : ''}`
                          : 'border-input bg-white hover:border-ring'
                      } ${readOnly || (checked && isOnly) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} focus:outline-none focus:ring-2 ${ring}`}
                    >
                      {checked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Totals row */}
        <div className="grid bg-gray-100 border-t border-slate-200" style={{ gridTemplateColumns: GRID }}>
          <div className="px-4 py-2.5 col-span-2">
            <p className="text-xs text-slate-400">Active sections per phase</p>
          </div>
          {MATRIX_PHASES.map(({ value }) => (
            <div key={value} className="flex items-center justify-center px-4 py-2.5">
              <span className="text-sm font-medium text-black">{phaseCounts[value]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inactive sections notice */}
      {inactiveSections.length > 0 && (
        <div className="mt-4 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50/50">
          <p className="text-xs text-amber-700 font-medium">
            {inactiveSections.length} inactive section{inactiveSections.length > 1 ? 's' : ''} hidden from matrix:{' '}
            {inactiveSections.map(s => s.slug).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
