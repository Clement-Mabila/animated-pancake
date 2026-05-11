import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAndRedeemInitToken, type PrefillIdentity } from '@/lib/admin/validateInitToken'
import OnboardingClient from './OnboardingClient'
import { PHASE_ORDER, PHASE_SECTIONS } from '@/lib/phases'
import type { ConfigPhase, SectionId } from '@/types'

export const dynamic = 'force-dynamic'

const DEFAULT_TEMPLATE_ID = '11111111-1111-1111-1111-111111111111'

async function OnboardingPageContent({
  searchParams,
}: {
  searchParams: Promise<{ init_token?: string; template_id?: string }>
}) {
  const { init_token, template_id } = await searchParams

  // ── Token validation (admin-initiated onboarding bypass) ──────────────────
  // validateAndRedeemInitToken returns null for any invalid/expired/replayed
  // token — callers must treat null as no-bypass (show normal identity step).
  let prefillIdentity: PrefillIdentity | null = null
  if (init_token) {
    prefillIdentity = await validateAndRedeemInitToken(init_token)
  }

  const db = createAdminClient()

  // Resolve template: explicit param → active template → fallback default
  let templateId = DEFAULT_TEMPLATE_ID
  if (template_id) {
    // Validate the passed template_id exists
    const { data: explicitTmpl } = await db
      .from('workflow_templates')
      .select('id')
      .eq('id', template_id)
      .maybeSingle()
    if (explicitTmpl) templateId = explicitTmpl.id
  } else {
    // Active (non-draft) template
    const { data: template } = await db
      .from('workflow_templates')
      .select('id')
      .eq('is_active', true)
      .eq('is_draft', false)
      .maybeSingle()
    if (template) templateId = template.id
  }

  const [sectionsResult, gateQuestionsResult, allQuestionsResult] = await Promise.all([
    db
      .from('workflow_sections')
      .select('slug, title, subtitle, description, sort_order, checkpoint_count')
      .eq('template_id', templateId)
      .eq('active', true)
      .order('sort_order'),
    db
      .from('workflow_questions')
      .select('section_slug, visible_in_phases')
      .eq('template_id', templateId)
      .eq('field_key', '__all__')
      .eq('active', true),
    db
      .from('workflow_questions')
      .select('*')
      .eq('template_id', templateId)
      .neq('field_key', '__all__')
      .eq('active', true)
      .order('sort_order'),
  ])

  const rawSections   = sectionsResult.data      ?? []
  const gateQuestions = gateQuestionsResult.data ?? []
  const allQuestions  = allQuestionsResult.data  ?? []

  // Build phaseSections from DB gate questions
  const phaseSections: Record<ConfigPhase, SectionId[]> = {
    early: [], pre_deploy: [], deploy: [], post: [],
  }
  gateQuestions.forEach(q => {
    ;(q.visible_in_phases as ConfigPhase[]).forEach(phase => {
      if (phase !== 'deploy') {
        phaseSections[phase].push(q.section_slug as SectionId)
      }
    })
  })

  // Sort each phase's list by the section's sort_order
  const slugOrder = rawSections.map(s => s.slug)
  const sortByOrder = (ids: SectionId[]) =>
    [...ids].sort((a, b) => slugOrder.indexOf(a) - slugOrder.indexOf(b))

  PHASE_ORDER.forEach(phase => {
    if (phase !== 'deploy') phaseSections[phase] = sortByOrder(phaseSections[phase])
  })

  // Fall back to hardcoded PHASE_SECTIONS if DB returned nothing (template not yet seeded)
  const activePhaseSections: Record<ConfigPhase, SectionId[]> =
    rawSections.length > 0 ? phaseSections : PHASE_SECTIONS

  // Map DB rows → section definition objects
  const dbSections = rawSections.map((s, i) => ({
    id:          s.slug as SectionId,
    number:      i + 1,
    title:       s.title,
    subtitle:    s.subtitle ?? '',
    description: s.description ?? null,
    checkpoints: s.checkpoint_count,
  }))

  return (
    <OnboardingClient
      dbSections={dbSections}
      phaseSections={activePhaseSections}
      questions={allQuestions}
      prefillIdentity={prefillIdentity}
      templateId={templateId}
    />
  )
}

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ init_token?: string; template_id?: string }>
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ color: 'var(--text-muted)' }}>
        Loading…
      </div>
    }>
      <OnboardingPageContent searchParams={searchParams} />
    </Suspense>
  )
}
