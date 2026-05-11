import type { ConfigPhase, SectionId, ContactRoleLabel } from '@/types'

export const PHASE_ORDER: ConfigPhase[] = ['early', 'pre_deploy', 'deploy', 'post']
// NOTE: 'deploy' is intentionally excluded from client-facing phase selectors.
// It is an internal MBody go-live checklist (5 staff tasks), not a section-based
// client onboarding phase. Clients always start at 'early', 'pre_deploy', or 'post'.

// ── Phase → section mapping ──────────────────────────────────
// Source of truth: John's Q1/Q2 column analysis (28 Apr 26 data map).
//
// early:      Minimal bootstrap — viable deployment confirmed, contact +
//             timezone registered, ROI baseline captured.
//
// pre_deploy: ALL sections that have Q1 questions (John: J=Y).
//             FSM is 100% Q1 — belongs here, NOT in post.
//             Insight is mostly Q1 with 2 Q2-only questions — appears in both.
//
// deploy:     Operational checklist only — no form sections.
//             5 MBody tasks must be checked off before handover.
//
// post:       Only sections with Q2 questions (John: K=Y).
//             ROI, contacts, timezone, FSM have zero Q2 questions → excluded.

export const PHASE_SECTIONS: Record<ConfigPhase, SectionId[]> = {
  early:      ['roi', 'contacts', 'timezone'],
  pre_deploy: ['roi', 'kpis', 'fleet', 'contacts', 'roles', 'alerts', 'integrations', 'fsm', 'insight', 'timezone', 'docs'],
  deploy:     [],
  post:       ['kpis', 'fleet', 'roles', 'alerts', 'integrations', 'insight'],
}

export const PHASE_LABELS: Record<ConfigPhase, string> = {
  early:      'Early Onboarding',
  pre_deploy: 'Pre-Deployment',
  deploy:     'Deployment',
  post:       'Post-Deployment',
}

export const PHASE_DESCRIPTIONS: Record<ConfigPhase, string> = {
  early:      'Gate checks and minimal bootstrap — register client contact, confirm timezone, capture ROI baseline. Robots not yet on-site.',
  pre_deploy: 'Primary data collection — KPIs, fleet, contacts, roles, alerts, integrations, FSM, insight reports, timezone, and document requests. Everything needed before go-live.',
  deploy:     'Go-live operational checklist — 5 MBody team tasks must be completed and signed off before handover. Robots are live.',
  post:       'Post go-live tuning at +2 weeks — refine KPI targets, confirm fleet mapping, configure SSO and integrations, finalise alert rules.',
}

// Number of actionable items per phase (sections or checklist tasks).
// Used by the PhaseSelector to show meaningful counts.
export const PHASE_ITEM_COUNTS: Record<ConfigPhase, { count: number; unit: string }> = {
  early:      { count: PHASE_SECTIONS.early.length,      unit: 'sections'        },
  pre_deploy: { count: PHASE_SECTIONS.pre_deploy.length,  unit: 'sections'        },
  deploy:     { count: 5,                                 unit: 'checklist tasks' },
  post:       { count: PHASE_SECTIONS.post.length,        unit: 'sections'        },
}

// ── Role definitions ─────────────────────────────────────────

export interface RoleDefinition {
  label:       string
  scope:       string
  description: string
}

export const ROLE_DEFINITIONS: Record<ContactRoleLabel, RoleDefinition> = {
  exec: {
    label:       'Executive',
    scope:       'Fleet-Wide',
    description: 'Fleet-wide visibility across all locations. Sees aggregated KPIs, company-wide ROI, and high-level fleet health.',
  },
  ops_director: {
    label:       'Ops Director',
    scope:       'Location',
    description: 'Location-level visibility. Sees all sub-locations within their site — KPIs, fleet status, location alerts, and contacts.',
  },
  site_manager: {
    label:       'Site Manager',
    scope:       'Sub-Location',
    description: 'Sub-location visibility. Sees robots on their floor or zone, operational alerts, and FSM work orders for their area.',
  },
  it_manager: {
    label:       'IT Manager',
    scope:       'System',
    description: 'System-wide technical access. Manages integrations, SSO configuration, API access, and user permissions.',
  },
  owner: {
    label:       'Owner',
    scope:       'Fleet-Wide',
    description: 'Fleet-wide visibility. Full access across all locations.',
  },
  operations_director: {
    label:       'Operations Director',
    scope:       'Location',
    description: 'Location-level operations visibility.',
  },
  supervisor: {
    label:       'Supervisor',
    scope:       'Sub-Location',
    description: 'Sub-location supervisory access.',
  },
  facilities_manager: {
    label:       'Facilities Manager',
    scope:       'Location',
    description: 'Facilities and infrastructure visibility across their location.',
  },
  fleet_wide_manager: {
    label:       'Fleet Manager',
    scope:       'Fleet-Wide',
    description: 'Fleet-wide operational management across all locations and sub-locations.',
  },
  other: {
    label:       'Other',
    scope:       'Custom',
    description: 'Custom role — scope defined per client.',
  },
}

// Roles shown in the new contact form (primary hierarchy + other)
export const PRIMARY_ROLES: ContactRoleLabel[] = [
  'exec',
  'ops_director',
  'site_manager',
  'it_manager',
  'other',
]

// Sub-location picker tier for each role:
//   fleet_wide   — role covers all locations/sub-locations; no picker needed
//   single_sub   — role is scoped to one specific sub-location; show single-select
//   location_level — role covers a whole location but no sub-unit picker needed
export const ROLE_SUB_LOCATION_TIER: Record<ContactRoleLabel, 'fleet_wide' | 'single_sub' | 'location_level'> = {
  exec:                'fleet_wide',
  owner:               'fleet_wide',
  fleet_wide_manager:  'fleet_wide',
  ops_director:        'fleet_wide',
  operations_director: 'fleet_wide',
  supervisor:          'single_sub',
  facilities_manager:  'single_sub',
  site_manager:        'location_level',
  it_manager:          'location_level',
  other:               'location_level',
}

// Maps each section to all phases it appears in (ordered by PHASE_ORDER).
// Used to render phase pills when "show all sections" is active.
// Sections with questions in two phases (e.g. kpis: pre_deploy + post) get two pills.
export const SECTION_PHASES: Partial<Record<SectionId, ConfigPhase[]>> =
  PHASE_ORDER.reduce((acc, phase) => {
    PHASE_SECTIONS[phase].forEach(sId => {
      if (!acc[sId]) acc[sId] = []
      acc[sId]!.push(phase)
    })
    return acc
  }, {} as Partial<Record<SectionId, ConfigPhase[]>>)

// ── Phase helpers ────────────────────────────────────────────

export function getNextPhase(phase: ConfigPhase): ConfigPhase | null {
  const idx = PHASE_ORDER.indexOf(phase)
  return idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null
}

export function getPreviousPhase(phase: ConfigPhase): ConfigPhase | null {
  const idx = PHASE_ORDER.indexOf(phase)
  return idx > 0 ? PHASE_ORDER[idx - 1] : null
}

// Derives display status for a target phase from a config's CURRENT phase.
export function getPhaseDisplayStatus(
  config: { phase: ConfigPhase; status: string },
  targetPhase: ConfigPhase
): 'not_started' | 'active' | 'complete' {
  const currentIdx = PHASE_ORDER.indexOf(config.phase)
  const targetIdx  = PHASE_ORDER.indexOf(targetPhase)

  if (targetIdx < currentIdx) return 'complete'

  if (targetIdx === currentIdx) {
    const done = config.status === 'live'
      || config.status === 'client_complete'
      || config.status === 'mbody_complete'
    return done ? 'complete' : 'active'
  }

  return 'not_started'
}
