'use client'

import Header from '@/components/layout/Header'
import SessionSelector from '@/components/form/SessionSelector'
import SectionCard from '@/components/form/shared/SectionCard'
import ToastContainer from '@/components/ui/ToastContainer'
import DynamicSection from '@/components/form/DynamicSection'
import FleetSection from '@/components/form/sections/FleetSection'
import ContactsSection from '@/components/form/sections/ContactsSection'
import AlertsSection from '@/components/form/sections/AlertsSection'
import IntegrationsSection from '@/components/form/sections/IntegrationsSection'
import DocumentsSection from '@/components/form/sections/DocumentsSection'
import DeployChecklist from '@/components/form/DeployChecklist'
import { useState, useEffect, useRef } from 'react'
import { useSession } from '@/hooks/useSession'
import { useToast } from '@/context/ToastContext'
import { PHASE_LABELS, PHASE_ORDER, getNextPhase, getPreviousPhase } from '@/lib/phases'
import type { ContactPanelResult } from '@/components/form/ClientContactPanel'
import type { StaffIdentity, ConfigTarget, ConfigPhase, SectionId, WorkflowQuestion } from '@/types'
import type { PrefillIdentity } from '@/lib/admin/validateInitToken'

interface SectionDef {
  id:          SectionId
  number:      number
  title:       string
  subtitle:    string
  description: string | null
  checkpoints: number
}

interface Props {
  dbSections:       SectionDef[]
  phaseSections:    Record<ConfigPhase, SectionId[]>
  questions:        WorkflowQuestion[]
  prefillIdentity?: PrefillIdentity | null
  templateId?:      string | null
}

export default function OnboardingClient({ dbSections, phaseSections, questions, prefillIdentity, templateId }: Props) {
  const { showToast } = useToast()

  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const initializedRef = useRef(false)

  const {
    configuration,
    sections,
    loading,
    saving,
    identity,
    inheritableConfig,
    activeSectionIds,
    industry,
    startConfiguration,
    resumeConfiguration,
    applyInheritedConfig,
    saveSection,
    queueAutoSave,
    advancePhase,
    completedSections,
    progress,
  } = useSession({
    onAutoSave: () => showToast('autosave'),
    phaseSections,
    templateId: templateId ?? undefined,
  })

  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false)
  const [deployAllComplete, setDeployAllComplete] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // Derive section → phases map from the DB-driven phaseSections prop
  const sectionPhases: Partial<Record<SectionId, ConfigPhase[]>> = {}
  PHASE_ORDER.forEach(phase => {
    phaseSections[phase].forEach(sId => {
      if (!sectionPhases[sId]) sectionPhases[sId] = []
      sectionPhases[sId]!.push(phase)
    })
  })

  // Sections visible for the current phase
  const activeSections = dbSections.filter(s => activeSectionIds.includes(s.id))
  // In "show all" mode every section is rendered; otherwise only the active phase sections
  const displaySections = showAll ? dbSections : activeSections

  // Open the first incomplete active section once the session loads
  useEffect(() => {
    if (!configuration || initializedRef.current) return
    initializedRef.current = true
    const first = activeSections.find(s => !sections[s.id]?.is_complete)
    setOpenSectionId(first?.id ?? activeSections[0]?.id ?? null)
  }, [configuration, sections, activeSections])

  function toggleSection(id: string) {
    setOpenSectionId(prev => (prev === id ? null : id))
  }

  // Called by SessionSelector when staff hits "Start configuration"
  async function handleStart(
    id:             StaffIdentity,
    target:         ConfigTarget,
    locationId?:    string,
    subLocationId?: string,
    contact?:       ContactPanelResult['contact'],
    phase?:         ConfigPhase,
  ) {
    await startConfiguration(id, target, locationId, subLocationId, contact, phase)
  }

  // Called by each section's Save Draft / Mark Complete buttons
  async function handleSave(
    sectionId: SectionId,
    data: Record<string, unknown>,
    isComplete: boolean
  ) {
    await saveSection(sectionId, data, isComplete, identity?.email ?? 'unknown')
    showToast(isComplete ? 'complete' : 'draft', isComplete ? 'Section complete ✓' : 'Draft saved')

    if (isComplete) {
      const idx  = activeSections.findIndex(s => s.id === sectionId)
      const next = activeSections[idx + 1]
      setOpenSectionId(next?.id ?? null)
      if (next) {
        setTimeout(() => {
          document.getElementById(`sec-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)
      }
    }
  }

  // Called on field change for auto-save
  function handleAutoSave(sectionId: SectionId, data: Record<string, unknown>) {
    queueAutoSave(sectionId, data, identity?.email ?? 'unknown')
  }

  // Scope + phase label shown in hero
  function getScopeLabel() {
    if (!configuration) return ''
    const phase = PHASE_LABELS[configuration.phase]
    switch (configuration.scope) {
      case 'location':     return `Client configuration · ${phase}`
      case 'sub_location': return `Sub-location configuration · ${phase}`
      case 'mbody_role':   return `${identity?.role?.replace('_', ' ')} role configuration`
      case 'user':         return 'Personal configuration'
    }
  }

  return (
    <>
      <Header
        progress={progress}
        sectionsComplete={completedSections}
        totalSections={activeSectionIds.length || 10}
      />

      <ToastContainer />

      <main className="max-w-4xl mx-auto pt-14 px-10 pb-20">
        {!configuration ? (
          <SessionSelector
            onStart={handleStart}
            onResume={resumeConfiguration}
            loading={loading}
            prefillIdentity={prefillIdentity}
          />
        ) : (
          <div>

            {/* ── Inherited config banner ── */}
            {inheritableConfig && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-6 border border-electric-blue/25 bg-electric-blue/5">
                <div>
                  <p className="text-sm font-semibold text-electric-blue mb-0.5">
                    A parent configuration exists
                  </p>
                  <p className="text-xs text-muted">
                    Would you like to start from the existing configuration and adjust from there?
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={applyInheritedConfig}
                    className="py-1.5 px-3.5 rounded-md text-xs font-semibold text-white border-0 bg-electric-blue cursor-pointer"
                  >
                    Yes, inherit
                  </button>
                  <button
                    onClick={() => {}}
                    className="py-1.5 px-3.5 rounded-md text-xs font-semibold border border-soft-lavender/20 text-muted bg-transparent cursor-pointer"
                  >
                    Start fresh
                  </button>
                </div>
              </div>
            )}

            {/* ── Hero ── */}
            <div className="relative mb-11">
              <div className="absolute w-72 h-72 rounded-full bg-bright-violet -top-20 -right-16 blur-3xl opacity-10 pointer-events-none" />
              <div className="absolute w-52 h-52 rounded-full bg-electric-blue top-5 right-28 blur-3xl opacity-10 pointer-events-none" />

              <div className="flex items-center gap-2 mb-3.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #A52AE1, #3999FE)' }}
                />
                <span className="text-xs font-semibold tracking-widest uppercase text-electric-blue">
                  Orchestrator · {getScopeLabel()}
                </span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight leading-tight text-heading mb-3.5">
                System onboarding<br />
                <span className="bg-gradient-to-r from-[#0081FF] to-[#A52AE1] bg-clip-text text-transparent">
                  configuration
                </span>
              </h1>

              <p className="text-base text-body-text max-w-xl leading-relaxed mb-4">
                Configure what this user or location sees in Orchestrator — KPIs, reports,
                alerts, fleet data, integrations, and reporting preferences.
              </p>

              {/* Identity + status pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {identity && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-soft-lavender/10 text-soft-lavender">
                    {identity.fullName} · {identity.role.replace('_', ' ')}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  configuration.status === 'live'
                    ? 'bg-success/10 text-success'
                    : 'bg-soft-lavender/10 text-soft-lavender'
                }`}>
                  {configuration.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* ── Progress dots — hidden for deploy phase (checklist, not sections) ── */}
            {configuration.phase !== 'deploy' && (
              <div
                className="mb-10 bg-surface rounded-lg py-4 px-5"
                style={{
                  border: 'var(--border-subtle)',
                  boxShadow: '0 2px 16px rgba(165,42,225,0.05)',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${activeSections.length}, 1fr)`,
                  gap: '8px',
                }}
              >
                {activeSections.map((s, i) => {
                  const isDone = sections[s.id]?.is_complete ?? false
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        const el = document.getElementById(`sec-${s.id}`)
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 hover:opacity-70 transition-opacity duration-300"
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all duration-300 ${
                          isDone ? 'text-white' : 'bg-elevated text-muted'
                        }`}
                        style={isDone
                          ? { background: 'linear-gradient(135deg, #A52AE1, #3999FE)' }
                          : { border: '1.5px solid rgba(146,140,227,0.2)' }
                        }
                      >
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs font-medium text-center tracking-wide leading-snug ${
                        isDone ? 'text-soft-lavender' : 'text-muted'
                      }`}>
                        {s.title.split(' ')[0]}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Active sections for current phase ── */}
            <div className="flex flex-col gap-2.5">

              {configuration.phase === 'deploy' && (
                <DeployChecklist
                  configId={configuration.id}
                  initialChecklist={(configuration.deploy_checklist as Record<string, boolean>) ?? {}}
                  onProgressChange={(allComplete) => setDeployAllComplete(allComplete)}
                />
              )}

              {(configuration.phase !== 'deploy' || showAll) && displaySections.map((s, idx) => {
                const sectionId = s.id as SectionId
                const sectionData = sections[sectionId]
                const phase = configuration.phase

                const sectionQs = questions.filter(q => q.section_slug === sectionId)
                const dynProps  = {
                  data:        sectionData?.data ?? {},
                  onSave:      (d: Record<string, unknown>, c: boolean) => handleSave(sectionId, d, c),
                  onAutoSave:  (d: Record<string, unknown>) => handleAutoSave(sectionId, d),
                  isSaving:    saving,
                  isComplete:  sectionData?.is_complete ?? false,
                  industry,
                }

                const child = (() => {
                  switch (sectionId) {
                    // ── Dynamic sections ──────────────────────────────
                    case 'roi':
                    case 'kpis':
                    case 'roles':
                    case 'fsm':
                    case 'insight':
                    case 'timezone':
                      return <DynamicSection sectionSlug={sectionId} questions={sectionQs} phase={phase} description={s.description} {...dynProps} />

                    // ── Custom sections ───────────────────────────────
                    case 'fleet':        return <FleetSection        {...dynProps} locationId={configuration.location_id ?? undefined} />
                    case 'contacts':     return <ContactsSection     {...dynProps} />
                    case 'alerts':       return <AlertsSection       {...dynProps} phase={phase} />
                    case 'integrations': return <IntegrationsSection {...dynProps} phase={phase} />
                    case 'docs':         return <DocumentsSection    {...dynProps} />
                  }
                })()

                return (
                  <SectionCard
                    key={sectionId}
                    id={sectionId}
                    number={showAll ? s.number : idx + 1}
                    title={s.title}
                    subtitle={s.subtitle}
                    checkpointCount={s.checkpoints}
                    isComplete={sectionData?.is_complete ?? false}
                    open={openSectionId === sectionId}
                    onToggle={() => toggleSection(sectionId)}
                    phasePills={showAll ? sectionPhases[sectionId] : undefined}
                  >
                    {child}
                  </SectionCard>
                )
              })}

              {/* ── Phase advancement bar ── */}
              {configuration.scope === 'location' || configuration.scope === 'sub_location' ? (() => {
                const isDeployPhase = configuration.phase === 'deploy'
                const allComplete   = isDeployPhase
                  ? deployAllComplete
                  : completedSections === activeSections.length && activeSections.length > 0
                const nextPhase    = getNextPhase(configuration.phase)
                const prevPhase    = getPreviousPhase(configuration.phase)
                const isLastPhase  = nextPhase === null
                const nextSections = nextPhase ? phaseSections[nextPhase].length : 0

                return (
                  <div style={{
                    marginTop: '24px', padding: '20px 24px', borderRadius: '12px',
                    background: allComplete
                      ? 'linear-gradient(135deg, rgba(57,153,254,0.06), rgba(165,42,225,0.06))'
                      : 'var(--bg-surface)',
                    border: allComplete
                      ? '1px solid rgba(57,153,254,0.25)'
                      : '1px solid rgba(146,140,227,0.15)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '3px' }}>
                          {isDeployPhase
                            ? allComplete
                              ? 'All 5 deploy tasks complete ✓'
                              : '5 checklist tasks must be completed before handover'
                            : allComplete
                              ? isLastPhase
                                ? 'Configuration complete ✓'
                                : `All ${activeSections.length} sections complete ✓`
                              : `${completedSections} of ${activeSections.length} sections complete`}
                        </div>
                        {!isLastPhase && nextPhase && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Next: {PHASE_LABELS[nextPhase]} · {isDeployPhase ? nextSections : nextSections} section{nextSections !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {/* Show all sections toggle */}
                        <button
                          onClick={() => setShowAll(v => !v)}
                          style={{
                            padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                            border: showAll ? '1px solid rgba(165,42,225,0.4)' : '1px solid rgba(146,140,227,0.2)',
                            background: showAll ? 'rgba(165,42,225,0.08)' : 'transparent',
                            color: showAll ? '#A52AE1' : 'var(--text-muted)',
                            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                          }}
                        >
                          {showAll ? 'Phase view' : 'All sections'}
                        </button>

                        {!isLastPhase && nextPhase && (
                          <button
                            onClick={() => advancePhase(nextPhase)}
                            disabled={!allComplete || loading}
                            style={{
                              padding: '9px 20px', borderRadius: '8px', border: 'none',
                              background: allComplete
                                ? 'linear-gradient(135deg, #A52AE1, #3999FE)'
                                : 'rgba(146,140,227,0.15)',
                              color: allComplete ? 'white' : 'var(--text-muted)',
                              fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
                              cursor: allComplete ? 'pointer' : 'not-allowed',
                              transition: 'all 0.15s',
                            }}
                            title={!allComplete
                              ? isDeployPhase ? 'Complete all 5 deploy tasks to advance' : 'Complete all sections to advance'
                              : undefined}
                          >
                            {isDeployPhase ? 'Advance to Post-Deployment' : `Advance to ${PHASE_LABELS[nextPhase]}`} →
                          </button>
                        )}
                      </div>
                    </div>

                    {prevPhase && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(146,140,227,0.1)' }}>
                        {showRollbackConfirm ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Roll back to {PHASE_LABELS[prevPhase]}? Sections added in this phase will be marked incomplete. Data is preserved.
                            </span>
                            <button
                              onClick={async () => { setShowRollbackConfirm(false); await advancePhase(prevPhase) }}
                              style={{
                                padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.4)',
                                background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.85)',
                                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              Confirm rollback
                            </button>
                            <button
                              onClick={() => setShowRollbackConfirm(false)}
                              style={{
                                padding: '4px 12px', borderRadius: '6px', border: 'none',
                                background: 'none', color: 'var(--text-muted)',
                                fontSize: '11px', cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowRollbackConfirm(true)}
                            style={{
                              background: 'none', border: 'none', padding: 0,
                              fontSize: '11px', color: 'var(--text-muted)',
                              cursor: 'pointer', textDecoration: 'underline',
                              textDecorationStyle: 'dotted',
                            }}
                          >
                            Roll back to {PHASE_LABELS[prevPhase]}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })() : null}

            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="text-center pt-7 px-10 pb-11 text-xs text-muted tracking-wide"
        style={{ borderTop: 'var(--border-subtle)' }}
      >
        <span className="font-bold bg-gradient-to-br from-[#A52AE1] to-[#3999FE] bg-clip-text text-transparent">
          MBody AI
        </span>
        {' '}·{' '}Orchestrator system configuration{' '}·{' '}Confidential
      </footer>
    </>
  )
}