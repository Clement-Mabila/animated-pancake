'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, Lock,
  LayoutTemplate, AlignHorizontalJustifyStart, BadgeCheck, Columns, BrainCog, Workflow,
} from 'lucide-react'
import TemplateLibrary from './TemplateLibrary'
import SectionsTab    from './SectionsTab'
import PhaseMatrixTab from './PhaseMatrixTab'
import DeployTasksTab from './DeployTasksTab'
import AITemplateTab  from './AITemplateTab'
import EmbeddedOnboardingPanel from './EmbeddedOnboardingPanel'
import type { WorkflowTemplate, WorkflowSection, WorkflowQuestion, WorkflowDeployTask } from '@/types'

type Tab = 'sections' | 'matrix' | 'deploy' | 'ai'

type NavCard = {
  id:        Tab
  label:     string
  icon:      React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>
  getCount:  (s: WorkflowSection[], q: WorkflowQuestion[], d: WorkflowDeployTask[]) => number | null
  iconColor: string
  iconBg:    string
}

const NAV_CARDS: NavCard[] = [
  { id: 'sections', label: 'Sections',    icon: LayoutTemplate,              getCount: (s)        => s.length, iconColor: '#928CE3', iconBg: 'rgba(146,140,227,0.15)' },
  { id: 'matrix',   label: 'Phases',      icon: AlignHorizontalJustifyStart, getCount: (_, q)     => q.length, iconColor: '#0081FF', iconBg: 'rgba(0,129,255,0.15)'   },
  { id: 'deploy',   label: 'Deployment',  icon: BadgeCheck,                  getCount: (_, __, d) => d.length, iconColor: '#22C55E', iconBg: 'rgba(34,197,94,0.15)'   },
  { id: 'ai',       label: 'AI Builder',  icon: BrainCog,                    getCount: ()         => null,     iconColor: '#928CE3', iconBg: 'rgba(146,140,227,0.15)' },
]

interface Props {
  templates:           WorkflowTemplate[]
  allSections:         WorkflowSection[]
  allQuestions:        WorkflowQuestion[]
  allDeployTasks:      WorkflowDeployTask[]
  allDeletedSections:  WorkflowSection[]
  allDeletedQuestions: WorkflowQuestion[]
}

export default function WorkflowBuilder({ templates, allSections, allQuestions, allDeployTasks, allDeletedSections, allDeletedQuestions }: Props) {
  const defaultId = templates.find(t => t.is_active)?.id ?? templates[0]?.id ?? null

  const router = useRouter()

  const [tab,             setTab]             = useState<Tab>('sections')
  const [selectedId,      setSelectedId]      = useState<string | null>(defaultId)
  const [sectionsVersion, setSectionsVersion] = useState(0)
  const [splitScreen,     setSplitScreen]     = useState(false)

  function handleTemplateCreated(id: string) {
    setSelectedId(id)
    setTab('sections')
    router.refresh()
  }

  function handleTemplateCreatedWithPreview(id: string) {
    setSelectedId(id)
    setTab('sections')
    setSplitScreen(true)
    router.refresh()
  }

  const selected = templates.find(t => t.id === selectedId)
    ?? templates.find(t => t.is_active)
    ?? templates[0]
    ?? null

  const sections        = allSections.filter(s => s.template_id === selected?.id)
  const questions       = allQuestions.filter(q => q.template_id === selected?.id)
  const deployTasks     = allDeployTasks.filter(d => d.template_id === selected?.id)
  const deletedSections = allDeletedSections.filter(s => s.template_id === selected?.id)
  const deletedQuestions = allDeletedQuestions.filter(q => q.template_id === selected?.id)
  const readOnly        = !selected?.is_draft

  const primaryTemplate  = templates.find(t => t.is_active) ?? null
  const primarySections  = allSections.filter(s => s.template_id === primaryTemplate?.id && s.template_id !== selected?.id)
  const primaryQuestions = allQuestions.filter(q => q.template_id === primaryTemplate?.id && q.template_id !== selected?.id)

  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        No workflow templates found. Run workflow_migration.sql to seed the default template.
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">

          <div className="lg:min-w-[240px]">
            <p className="text-xs font-light text-muted uppercase tracking-widest mb-1">
              WORKFLOW BUILDER
            </p>
            <h1 className="text-3xl font-bold text-heading mb-2.5 mt-2">
              Onboarding Templates
            </h1>
            <p className="text-sm text-muted">
              Manage multiple templates and choose which one is live.
            </p>
          </div>

          {selected && (
            <div className="flex flex-1 items-center gap-4 flex-wrap">
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5 bg-elevated rounded-3xl px-5 py-4 min-w-[120px]">
                  <span className="text-xs text-muted">Sections</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-heading">{sections.length}</span>
                    <span className="text-xs font-normal px-2 py-1.5 rounded-2xl whitespace-nowrap bg-electric-blue/15 text-electric-blue">
                      configured
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 bg-elevated rounded-3xl px-5 py-4 min-w-[120px]">
                  <span className="text-xs text-muted">Questions</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-heading">{questions.length}</span>
                    <span className="text-xs font-normal px-2 py-1.5 rounded-2xl whitespace-nowrap bg-bright-violet/15 text-bright-violet">
                      total fields
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 bg-elevated rounded-3xl px-5 py-4 min-w-[120px]">
                  <span className="text-xs text-muted">Deploy tasks</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-heading">{deployTasks.length}</span>
                    <span className={`text-xs font-normal px-2 py-1.5 rounded-2xl whitespace-nowrap ${
                      selected.is_draft ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
                    }`}>
                      {selected.is_active ? 'Live' : selected.is_draft ? 'Draft' : 'Archived'}
                    </span>
                  </div>
                </div>
              </div>

              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-normal shrink-0 ${
                selected.is_active ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}>
                <CheckCircle size={13} strokeWidth={2} />
                {selected.is_active ? 'Live template' : selected.is_draft ? 'Draft in progress' : 'Archived template'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Template library shelf ─────────────────────────────── */}
      <TemplateLibrary
        templates={templates}
        allSections={allSections}
        allQuestions={allQuestions}
        selectedId={selected?.id ?? null}
        onSelect={id => { setSelectedId(id); setTab('sections') }}
        onTemplateReset={() => setSectionsVersion(v => v + 1)}
      />

      {/* ── Nav cards + content ────────────────────────────────── */}
      {selected && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {NAV_CARDS.map(({ id, label, icon: Icon, getCount, iconColor, iconBg }) => {
              const isActive = tab === id
              const count    = getCount(sections, questions, deployTasks)
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-2xl border text-xs font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-elevated border-soft-lavender/30 text-heading'
                      : 'bg-surface border-border text-body-text hover:bg-elevated hover:border-soft-lavender/30 hover:text-heading'
                  }`}
                >
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-md transition-colors shrink-0"
                    style={isActive ? { backgroundColor: iconBg } : undefined}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.5}
                      className={isActive ? '' : 'text-muted'}
                      style={isActive ? { color: iconColor } : undefined}
                    />
                  </span>
                  {label}
                  {count !== null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-bright-violet/15 text-bright-violet' : 'bg-elevated text-muted'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Split-screen preview toggle — only on sections tab */}
            {tab === 'sections' && (
              <button
                onClick={() => setSplitScreen(v => !v)}
                className={`ml-auto flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-all duration-200
                  ${splitScreen
                    ? 'bg-violet-600 border-none text-white'
                    : 'bg-elevated border-purple-400/25 text-heading hover:bg-elevated hover:border-purple-400/50 hover:text-purple-600'
                  }`}
              >
                <Workflow size={16} strokeWidth={1.6} />
                {splitScreen ? 'Close preview' : 'Live Onboarding'}
              </button>
            )}

            {readOnly && tab !== 'ai' && (
              <span className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated border border-border text-xs text-muted shrink-0">
                <Lock size={11} strokeWidth={1.8} />
                {selected.is_active ? 'Live template — duplicate it to make changes' : 'Archived — read only'}
              </span>
            )}
          </div>

          {tab === 'sections' && (
            splitScreen ? (
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <SectionsTab
                    key={`${selected.id}-${sectionsVersion}`}
                    templateId={selected.id}
                    sections={sections}
                    questions={questions}
                    deletedSections={deletedSections}
                    deletedQuestions={deletedQuestions}
                    readOnly={readOnly}
                    primarySections={primarySections}
                    primaryQuestions={primaryQuestions}
                  />
                </div>
                <div className="w-[440px] shrink-0">
                  <Suspense fallback={
                    <div className="rounded-2xl border border-border bg-elevated flex items-center justify-center h-40">
                      <span className="text-xs text-muted">Loading preview…</span>
                    </div>
                  }>
                    <EmbeddedOnboardingPanel
                      templateId={selected.id}
                      questions={questions}
                      sections={sections}
                      locationId={selected.location_id ?? undefined}
                      contactRole={selected.contact_role ?? undefined}
                      startingPhase={selected.starting_phase ?? undefined}
                    />
                  </Suspense>
                </div>
              </div>
            ) : (
              <SectionsTab
                key={`${selected.id}-${sectionsVersion}`}
                templateId={selected.id}
                sections={sections}
                questions={questions}
                deletedSections={deletedSections}
                deletedQuestions={deletedQuestions}
                readOnly={readOnly}
                primarySections={primarySections}
                primaryQuestions={primaryQuestions}
              />
            )
          )}
          {tab === 'matrix' && (
            <PhaseMatrixTab
              key={`${selected.id}-${sectionsVersion}`}
              templateId={selected.id}
              sections={sections}
              questions={questions}
              readOnly={readOnly}
            />
          )}
          {tab === 'deploy' && (
            <DeployTasksTab
              key={selected.id}
              templateId={selected.id}
              deployTasks={deployTasks}
              readOnly={readOnly}
            />
          )}
          {tab === 'ai' && (
            <AITemplateTab
              onTemplateCreated={handleTemplateCreated}
              onOpenPreview={handleTemplateCreatedWithPreview}
            />
          )}
        </>
      )}
    </div>
  )
}
