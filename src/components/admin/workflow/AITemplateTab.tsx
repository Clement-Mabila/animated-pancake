'use client'

import { useState, useEffect } from 'react'
import {
  BrainCog, ChevronRight, ChevronLeft, Check, CheckCircle2,
  Atom, SquircleDashed, Squircle, RotateCcw, Truck, Globe, Rocket,
} from 'lucide-react'
import LocationPicker from './LocationPicker'
import { TEMPLATE_COLORS, DEPARTMENTS } from './TemplateMetadataModal'
import {
  PRIMARY_ROLES, ROLE_DEFINITIONS, ROLE_SUB_LOCATION_TIER,
  PHASE_ORDER, PHASE_LABELS, PHASE_DESCRIPTIONS, PHASE_ITEM_COUNTS, PHASE_SECTIONS,
} from '@/lib/phases'
import { getSubLocations, getClientContactsForLocation } from '@/lib/supabase/queries'
import { bulkCreateTemplateFromPreset, startOnboardingForTemplateAction } from '@/app/admin/actions/workflow'
import type { ConfigPhase, ContactRoleLabel, ClientContact } from '@/types'

// ── Types ──────────────────────────────────────────────────────

interface PresetSection {
  slug:            string
  title:           string
  subtitle:        string
  description:     string | null
  checkpointCount: number
  visibleInPhases: ConfigPhase[]
}

interface PresetColors {
  name:           string
  iconBg:         string
  iconText:       string
  badgeBg:        string
  badgeText:      string
  outline:        string
  outlineHover:   string
  outlineActive:  string
  dotActive:      string
  dotInactive:    string
  labelActive:    string
  divider:        string
  panelBorder:    string
  panelBg:        string
  stepNumActive:  string
  stepLineActive: string
  stepLineDone:   string
  phaseActive:    string
  phaseBg:        string
  chevronText:    string
  chevronBg:      string
  sectionNum:     string
  successRing:    string
  createBtn:      string
  skipBtn:        string
  reviewBorder:   string
  tag:            string
}

interface TemplatePreset {
  key:         string
  name:        string
  tagline:     string
  description: string
  icon:        React.ReactNode
  colors:      PresetColors
  sections:    PresetSection[]
  deployTasks: { taskKey: string; title: string; description: string }[]
}

// ── Section definitions ────────────────────────────────────────
// visibleInPhases is derived from PHASE_SECTIONS (single source of truth in lib/phases.ts)
// so it can never drift out of sync with what the onboarding page expects.

function sectionPhases(slug: string): ConfigPhase[] {
  return (['early', 'pre_deploy', 'post'] as ConfigPhase[]).filter(p =>
    (PHASE_SECTIONS[p] as string[]).includes(slug)
  )
}

const S: Record<string, PresetSection> = {
  roi:          { slug: 'roi',          title: 'ROI targets',                      subtitle: 'Baseline costs & outcome goals',          description: null, checkpointCount: 4,  visibleInPhases: sectionPhases('roi') },
  kpis:         { slug: 'kpis',         title: 'KPIs & performance metrics',        subtitle: 'Dashboard metric configuration',          description: null, checkpointCount: 5,  visibleInPhases: sectionPhases('kpis') },
  fleet:        { slug: 'fleet',        title: 'Validate robot fleet & locations',  subtitle: 'Confirm ingested data is accurate',       description: null, checkpointCount: 9,  visibleInPhases: sectionPhases('fleet') },
  contacts:     { slug: 'contacts',     title: 'Contacts by location & role',       subtitle: 'Site and fleet-level contacts',           description: null, checkpointCount: 7,  visibleInPhases: sectionPhases('contacts') },
  roles:        { slug: 'roles',        title: 'Reporting roles & access',          subtitle: 'Access tiers and permissions',            description: null, checkpointCount: 6,  visibleInPhases: sectionPhases('roles') },
  alerts:       { slug: 'alerts',       title: 'Alert configuration & routing',     subtitle: 'Priority levels and recipients',          description: null, checkpointCount: 7,  visibleInPhases: sectionPhases('alerts') },
  integrations: { slug: 'integrations', title: 'Client systems integrations',       subtitle: 'SSO, task management, facilities & more', description: null, checkpointCount: 6,  visibleInPhases: sectionPhases('integrations') },
  fsm:          { slug: 'fsm',          title: 'Field Service Management',          subtitle: 'Service, SLA, approval & warranty setup', description: null, checkpointCount: 11, visibleInPhases: sectionPhases('fsm') },
  insight:      { slug: 'insight',      title: 'Location insight reports',          subtitle: 'Per-site report configuration',           description: null, checkpointCount: 6,  visibleInPhases: sectionPhases('insight') },
  timezone:     { slug: 'timezone',     title: 'Time zone & reporting schedule',    subtitle: 'Delivery cadence & report scheduling',    description: null, checkpointCount: 5,  visibleInPhases: sectionPhases('timezone') },
  docs:         { slug: 'docs',         title: 'Documentation & handover',          subtitle: 'Client documentation and sign-off',       description: null, checkpointCount: 4,  visibleInPhases: sectionPhases('docs') },
}

const DEPLOY_TASKS = [
  { taskKey: 'ingest_robots',             title: 'Ingest robots',             description: 'Define robot alias, location and sub-location maps in Orchestrator' },
  { taskKey: 'report_cadence',            title: 'Set report cadence',        description: 'Configure daily / weekly / monthly delivery times per customer spec' },
  { taskKey: 'robot_register_validation', title: 'Robot register validation', description: 'Verify robot register matches agreed fleet count and models' },
  { taskKey: 'validate_access_controls',  title: 'Validate access controls',  description: 'Each user role logs in and confirms they can see correct data scope' },
  { taskKey: 'orchestrator_training',     title: 'Orchestrator training',     description: 'Conduct training sessions for all customer user roles before handover' },
]

// ── Per-preset color palettes ──────────────────────────────────
// All classes spelled out in full so Tailwind JIT keeps them.

const COLORS: Record<string, PresetColors> = {
  quick_start: {
    name: 'emerald',
    iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-500',
    outline: 'outline-emerald-500/20', outlineHover: 'hover:outline-emerald-500/40', outlineActive: 'outline-emerald-500/50',
    dotActive: 'bg-emerald-500', dotInactive: 'bg-emerald-500/30', labelActive: 'text-emerald-500',
    divider: 'border-emerald-500/10', panelBorder: 'border-emerald-500/15', panelBg: 'bg-emerald-500/5',
    stepNumActive: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500',
    stepLineActive: 'bg-emerald-500/50', stepLineDone: 'bg-emerald-500/20',
    phaseActive: 'bg-emerald-500/10 outline-emerald-500/50 text-emerald-500',
    phaseBg: 'bg-elevated outline-emerald-500/15 text-muted hover:outline-emerald-500/30',
    chevronText: 'text-emerald-500', chevronBg: 'bg-emerald-500/10',
    sectionNum: 'bg-emerald-500/10 text-emerald-500', successRing: 'bg-emerald-500',
    createBtn: 'bg-emerald-500 hover:bg-emerald-500/90',
    skipBtn: 'border-emerald-500/20 text-muted hover:bg-emerald-500/5',
    reviewBorder: 'border-emerald-500/15', tag: 'bg-emerald-500/10 text-emerald-500',
  },
  standard: {
    name: 'sky',
    iconBg: 'bg-sky-500/10', iconText: 'text-sky-500',
    badgeBg: 'bg-sky-500/10', badgeText: 'text-sky-500',
    outline: 'outline-sky-500/20', outlineHover: 'hover:outline-sky-500/40', outlineActive: 'outline-sky-500/50',
    dotActive: 'bg-sky-500', dotInactive: 'bg-sky-500/30', labelActive: 'text-sky-500',
    divider: 'border-sky-500/10', panelBorder: 'border-sky-500/15', panelBg: 'bg-sky-500/5',
    stepNumActive: 'bg-sky-500/10 border-sky-500/40 text-sky-500',
    stepLineActive: 'bg-sky-500/50', stepLineDone: 'bg-sky-500/20',
    phaseActive: 'bg-sky-500/10 outline-sky-500/50 text-sky-500',
    phaseBg: 'bg-elevated outline-sky-500/15 text-muted hover:outline-sky-500/30',
    chevronText: 'text-sky-500', chevronBg: 'bg-sky-500/10',
    sectionNum: 'bg-sky-500/10 text-sky-500', successRing: 'bg-sky-500',
    createBtn: 'bg-sky-500 hover:bg-sky-500/90',
    skipBtn: 'border-sky-500/20 text-muted hover:bg-sky-500/5',
    reviewBorder: 'border-sky-500/15', tag: 'bg-sky-500/10 text-sky-500',
  },
  enterprise: {
    name: 'violet',
    iconBg: 'bg-violet-500/10', iconText: 'text-violet-500',
    badgeBg: 'bg-violet-500/10', badgeText: 'text-violet-500',
    outline: 'outline-violet-500/20', outlineHover: 'hover:outline-violet-500/40', outlineActive: 'outline-violet-500/50',
    dotActive: 'bg-violet-500', dotInactive: 'bg-violet-500/30', labelActive: 'text-violet-500',
    divider: 'border-violet-500/10', panelBorder: 'border-violet-500/15', panelBg: 'bg-violet-500/5',
    stepNumActive: 'bg-violet-500/10 border-violet-500/40 text-violet-500',
    stepLineActive: 'bg-violet-500/50', stepLineDone: 'bg-violet-500/20',
    phaseActive: 'bg-violet-500/10 outline-violet-500/50 text-violet-500',
    phaseBg: 'bg-elevated outline-violet-500/15 text-muted hover:outline-violet-500/30',
    chevronText: 'text-violet-500', chevronBg: 'bg-violet-500/10',
    sectionNum: 'bg-violet-500/10 text-violet-500', successRing: 'bg-violet-500',
    createBtn: 'bg-violet-500 hover:bg-violet-500/90',
    skipBtn: 'border-violet-500/20 text-muted hover:bg-violet-500/5',
    reviewBorder: 'border-violet-500/15', tag: 'bg-violet-500/10 text-violet-500',
  },
  logistics: {
    name: 'amber',
    iconBg: 'bg-amber-500/10', iconText: 'text-amber-500',
    badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-500',
    outline: 'outline-amber-500/20', outlineHover: 'hover:outline-amber-500/40', outlineActive: 'outline-amber-500/50',
    dotActive: 'bg-amber-500', dotInactive: 'bg-amber-500/30', labelActive: 'text-amber-500',
    divider: 'border-amber-500/10', panelBorder: 'border-amber-500/15', panelBg: 'bg-amber-500/5',
    stepNumActive: 'bg-amber-500/10 border-amber-500/40 text-amber-500',
    stepLineActive: 'bg-amber-500/50', stepLineDone: 'bg-amber-500/20',
    phaseActive: 'bg-amber-500/10 outline-amber-500/50 text-amber-500',
    phaseBg: 'bg-elevated outline-amber-500/15 text-muted hover:outline-amber-500/30',
    chevronText: 'text-amber-500', chevronBg: 'bg-amber-500/10',
    sectionNum: 'bg-amber-500/10 text-amber-500', successRing: 'bg-amber-500',
    createBtn: 'bg-amber-500 hover:bg-amber-500/90',
    skipBtn: 'border-amber-500/20 text-muted hover:bg-amber-500/5',
    reviewBorder: 'border-amber-500/15', tag: 'bg-amber-500/10 text-amber-500',
  },
  multi_site: {
    name: 'teal',
    iconBg: 'bg-teal-500/10', iconText: 'text-teal-500',
    badgeBg: 'bg-teal-500/10', badgeText: 'text-teal-500',
    outline: 'outline-teal-500/20', outlineHover: 'hover:outline-teal-500/40', outlineActive: 'outline-teal-500/50',
    dotActive: 'bg-teal-500', dotInactive: 'bg-teal-500/30', labelActive: 'text-teal-500',
    divider: 'border-teal-500/10', panelBorder: 'border-teal-500/15', panelBg: 'bg-teal-500/5',
    stepNumActive: 'bg-teal-500/10 border-teal-500/40 text-teal-500',
    stepLineActive: 'bg-teal-500/50', stepLineDone: 'bg-teal-500/20',
    phaseActive: 'bg-teal-500/10 outline-teal-500/50 text-teal-500',
    phaseBg: 'bg-elevated outline-teal-500/15 text-muted hover:outline-teal-500/30',
    chevronText: 'text-teal-500', chevronBg: 'bg-teal-500/10',
    sectionNum: 'bg-teal-500/10 text-teal-500', successRing: 'bg-teal-500',
    createBtn: 'bg-teal-500 hover:bg-teal-500/90',
    skipBtn: 'border-teal-500/20 text-muted hover:bg-teal-500/5',
    reviewBorder: 'border-teal-500/15', tag: 'bg-teal-500/10 text-teal-500',
  },
  rapid_pilot: {
    name: 'rose',
    iconBg: 'bg-rose-500/10', iconText: 'text-rose-500',
    badgeBg: 'bg-rose-500/10', badgeText: 'text-rose-500',
    outline: 'outline-rose-500/20', outlineHover: 'hover:outline-rose-500/40', outlineActive: 'outline-rose-500/50',
    dotActive: 'bg-rose-500', dotInactive: 'bg-rose-500/30', labelActive: 'text-rose-500',
    divider: 'border-rose-500/10', panelBorder: 'border-rose-500/15', panelBg: 'bg-rose-500/5',
    stepNumActive: 'bg-rose-500/10 border-rose-500/40 text-rose-500',
    stepLineActive: 'bg-rose-500/50', stepLineDone: 'bg-rose-500/20',
    phaseActive: 'bg-rose-500/10 outline-rose-500/50 text-rose-500',
    phaseBg: 'bg-elevated outline-rose-500/15 text-muted hover:outline-rose-500/30',
    chevronText: 'text-rose-500', chevronBg: 'bg-rose-500/10',
    sectionNum: 'bg-rose-500/10 text-rose-500', successRing: 'bg-rose-500',
    createBtn: 'bg-rose-500 hover:bg-rose-500/90',
    skipBtn: 'border-rose-500/20 text-muted hover:bg-rose-500/5',
    reviewBorder: 'border-rose-500/15', tag: 'bg-rose-500/10 text-rose-500',
  },
}

const PRESETS: TemplatePreset[] = [
  {
    key: 'quick_start', name: 'Quick Start', tagline: 'Core setup, fast turnaround',
    description: 'Ideal for smaller deployments. Fleet validation, KPIs, alerts, roles, and timezone — everything needed to get to go-live quickly.',
    icon: <SquircleDashed size={19} />, colors: COLORS.quick_start,
    sections: ['fleet', 'kpis', 'alerts', 'roles', 'timezone'].map(k => S[k]),
    deployTasks: DEPLOY_TASKS,
  },
  {
    key: 'standard', name: 'Standard Operations', tagline: 'The right fit for most clients',
    description: 'Balanced coverage — fleet, contacts, KPIs, roles, alerts, integrations, insight, and timezone. Recommended for the majority of deployments.',
    icon: <SquircleDashed size={19} />, colors: COLORS.standard,
    sections: ['fleet', 'contacts', 'kpis', 'roles', 'alerts', 'integrations', 'timezone', 'insight'].map(k => S[k]),
    deployTasks: DEPLOY_TASKS,
  },
  {
    key: 'enterprise', name: 'Full Enterprise', tagline: 'Everything included',
    description: 'The complete suite — all sections including ROI tracking, FSM work orders, and documentation. For large or complex enterprise clients.',
    icon: <Squircle size={19} />, colors: COLORS.enterprise,
    sections: ['roi', 'kpis', 'fleet', 'contacts', 'roles', 'alerts', 'integrations', 'fsm', 'insight', 'timezone', 'docs'].map(k => S[k]),
    deployTasks: DEPLOY_TASKS,
  },
  {
    key: 'logistics', name: 'Logistics & Warehouse', tagline: 'Fleet ops and integration focused',
    description: 'Optimised for logistics and warehouse clients — fleet validation, alert routing, system integrations, contacts, and timezone.',
    icon: <Truck size={17} />, colors: COLORS.logistics,
    sections: ['fleet', 'contacts', 'alerts', 'roles', 'integrations', 'timezone'].map(k => S[k]),
    deployTasks: DEPLOY_TASKS,
  },
  {
    key: 'multi_site', name: 'Multi-Site Regional', tagline: 'Multi-location reporting heavy',
    description: 'Built for regional clients across multiple sites. Prioritises contacts, per-site insight reports, and KPI tracking by location.',
    icon: <Globe size={17} />, colors: COLORS.multi_site,
    sections: ['fleet', 'contacts', 'kpis', 'roles', 'alerts', 'insight', 'timezone'].map(k => S[k]),
    deployTasks: DEPLOY_TASKS,
  },
  {
    key: 'rapid_pilot', name: 'Rapid Pilot', tagline: 'POC or trial deployment',
    description: 'Minimum viable template for proof-of-concept or pilot engagements. Fleet, alerts, and timezone only — quick to complete.',
    icon: <Rocket size={17} />, colors: COLORS.rapid_pilot,
    sections: ['fleet', 'alerts', 'timezone'].map(k => S[k]),
    deployTasks: DEPLOY_TASKS.slice(0, 3),
  },
]

// ── Shared styles ──────────────────────────────────────────────

const inputCls = 'w-full bg-surface border border-border rounded-lg text-heading text-sm px-3 py-2 outline-none focus:border-violet-500/50 transition-colors duration-150'
const labelCls = 'block text-xs font-medium text-muted mb-1'

// ── Step indicator ─────────────────────────────────────────────

const STEP_LABELS = ['Sections', 'Details', 'Binding', 'Review']

function StepBar({ current, colors: c }: { current: number; colors: PresetColors }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {STEP_LABELS.map((label, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={i} className={`flex items-center gap-1.5 ${i < STEP_LABELS.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex items-center gap-1 shrink-0">
              <div className={[
                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                done  ? `${c.successRing} text-white` :
                active ? `${c.stepNumActive} border` :
                         'bg-elevated border border-border text-muted',
              ].join(' ')}>
                {done ? <Check size={10} strokeWidth={3} /> : i + 1}
              </div>
              <span className={`text-xs ${active ? `font-semibold ${c.labelActive}` : 'font-normal text-muted'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-px ${done ? c.stepLineActive : c.stepLineDone}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Nav buttons ────────────────────────────────────────────────

function NavRow({
  onBack, onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  creating = false,
  colors: c,
}: {
  onBack:        () => void
  onNext:        () => void
  nextLabel?:    string
  nextDisabled?: boolean
  creating?:     boolean
  colors:        PresetColors
}) {
  return (
    <div className="flex gap-2 mt-5">
      <button
        type="button"
        onClick={onBack}
        className="px-4 py-2 rounded-lg bg-elevated border border-border text-muted text-xs font-semibold cursor-pointer flex items-center gap-1 hover:bg-surface transition-colors duration-150"
      >
        <ChevronLeft size={13} /> Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || creating}
        className={[
          'flex-1 py-2 rounded-lg border-none text-xs font-semibold flex items-center justify-center gap-1 transition-colors duration-150',
          nextDisabled || creating
            ? 'bg-surface text-muted cursor-not-allowed opacity-50'
            : `${c.createBtn} text-white cursor-pointer`,
        ].join(' ')}
      >
        {creating ? 'Creating…' : nextLabel}
        {!creating && <ChevronRight size={13} />}
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

interface Props {
  onTemplateCreated: (templateId: string) => void
}

type Step = 0 | 1 | 2 | 3 | 4 | 5

export default function AITemplateTab({ onTemplateCreated }: Props) {
  // Wizard
  const [step,             setStep]             = useState<Step>(0)
  const [preset,           setPreset]           = useState<TemplatePreset | null>(null)
  const [selectedSections, setSelectedSections] = useState<PresetSection[]>([])

  // Template metadata
  const [name,        setName]        = useState('')
  const [department,  setDepartment]  = useState('')
  const [description, setDescription] = useState('')
  const [color,       setColor]       = useState('#928CE3')

  // Location binding
  const [locationId,            setLocationId]            = useState('')
  const [contactRole,           setContactRole]           = useState<ContactRoleLabel | ''>('')
  const [subLocationGroup,      setSubLocationGroup]      = useState<string[]>([])
  const [startPhase,            setStartPhase]            = useState<ConfigPhase>('early')
  const [availableSubLocations, setAvailableSubLocations] = useState<{ id: string; name: string }[]>([])

  // Contact selection
  const [existingContacts,   setExistingContacts]   = useState<ClientContact[]>([])
  const [contactFetchDone,   setContactFetchDone]   = useState(false)
  const [selectedContactId,  setSelectedContactId]  = useState<string | null>(null)
  const [showNewContact,     setShowNewContact]     = useState(false)
  const [newContactName,     setNewContactName]     = useState('')
  const [newContactEmail,    setNewContactEmail]    = useState('')
  const [newContactSubLocId, setNewContactSubLocId] = useState('')

  // Result
  const [creating,    setCreating]    = useState(false)
  const [starting,    setStarting]    = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [createdId,   setCreatedId]   = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')

  // Fallback to violet before a preset is selected
  const c: PresetColors = preset?.colors ?? COLORS.enterprise

  useEffect(() => {
    if (!locationId || !contactRole) {
      setExistingContacts([])
      setContactFetchDone(false)
      return
    }
    setContactFetchDone(false)
    getClientContactsForLocation(locationId).then(all => {
      setExistingContacts(all.filter(ct => ct.role_label === contactRole))
      setContactFetchDone(true)
    })
  }, [locationId, contactRole])

  function reset() {
    setStep(0); setPreset(null); setSelectedSections([])
    setName(''); setDepartment(''); setDescription(''); setColor('#928CE3')
    setLocationId(''); setContactRole(''); setSubLocationGroup([])
    setStartPhase('early'); setAvailableSubLocations([])
    setExistingContacts([]); setContactFetchDone(false)
    setSelectedContactId(null); setShowNewContact(false)
    setNewContactName(''); setNewContactEmail(''); setNewContactSubLocId('')
    setError(null); setCreatedId(null); setCreatedName('')
  }

  async function handleCreate() {
    if (!preset || !name.trim() || selectedSections.length === 0) return
    setCreating(true); setError(null)
    try {
      const result = await bulkCreateTemplateFromPreset(
        {
          name:               name.trim(),
          department:         department  || null,
          description:        description || null,
          color:              color       || null,
          location_id:        locationId  || null,
          contact_role:       contactRole || null,
          sub_location_group: subLocationGroup.length > 0 ? subLocationGroup : null,
          starting_phase:     locationId && contactRole ? startPhase : null,
        },
        selectedSections,
        preset.deployTasks,
      )
      if (!result.ok) { setError(result.error); return }
      setCreatedId(result.templateId)
      setCreatedName(name.trim())
      setStep(5)
    } finally {
      setCreating(false)
    }
  }

  async function handleStartOnboarding() {
    if (!createdId || !locationId || !contactRole) return
    const useExisting = !!selectedContactId
    const useNew      = showNewContact && !!newContactName.trim() && !!newContactEmail.trim()
    if (!useExisting && !useNew) return
    setStarting(true); setError(null)
    try {
      let contactData: { fullName: string; email: string; subLocationId?: string }
      if (useExisting) {
        const ct = existingContacts.find(x => x.id === selectedContactId)
        if (!ct) { setError('Selected contact not found'); return }
        contactData = { fullName: ct.full_name, email: ct.email, subLocationId: ct.sub_location_id ?? undefined }
      } else {
        const tier = ROLE_SUB_LOCATION_TIER[contactRole as ContactRoleLabel]
        contactData = {
          fullName:      newContactName.trim(),
          email:         newContactEmail.trim(),
          subLocationId: tier === 'single_sub' ? newContactSubLocId || undefined : undefined,
        }
      }
      const r = await startOnboardingForTemplateAction(createdId, contactData, startPhase)
      if (!r.ok) { setError(r.error); return }
      window.open(`/onboarding?config=${r.configId}&template_id=${createdId}`, '_blank')
    } finally {
      setStarting(false)
    }
  }

  const contactDisplayName = selectedContactId
    ? (existingContacts.find(ct => ct.id === selectedContactId)?.full_name ?? '')
    : (showNewContact && newContactName.trim()) ? newContactName.trim() : ''

  const hasContact = !!(locationId && contactRole &&
    (selectedContactId || (showNewContact && newContactName.trim() && newContactEmail.trim())))

  // ── Right panel ─────────────────────────────────────────────

  const rightPanel = preset ? (
    <div className="p-4 rounded-2xl bg-surface border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-md ${c.iconBg} flex items-center justify-center ${c.iconText} shrink-0`}>
          {preset.icon}
        </div>
        <div>
          <p className="text-xs font-bold text-heading m-0">{preset.name}</p>
          <p className={`text-xs ${c.labelActive} font-medium m-0`}>{selectedSections.length} / {preset.sections.length} sections</p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {preset.sections.map((s, i) => {
          const active = selectedSections.some(sel => sel.slug === s.slug)
          return (
            <div key={s.slug} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-opacity duration-150 ${active ? 'bg-elevated opacity-100' : 'opacity-35'}`}>
              <div className={`w-4 h-4 rounded-full ${active ? c.sectionNum : 'bg-elevated text-muted'} flex items-center justify-center text-xs font-bold shrink-0`}>
                {active ? i + 1 : '—'}
              </div>
              <div>
                <p className="text-xs font-semibold text-heading m-0">{s.title}</p>
                <p className="text-xs text-muted m-0">{s.subtitle}</p>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted mt-2.5 pt-2.5 border-t border-border mb-0">
        + {preset.deployTasks.length} deployment checklist tasks
      </p>
    </div>
  ) : (
    <div className="p-4 rounded-2xl bg-surface border border-border">
      <p className="text-sm font-semibold text-muted mb-3.5">How it works</p>
      {[
        ['Pick a preset',      "Choose a template type that matches your client's complexity."],
        ['Customise sections', 'Toggle individual sections on or off from the preset.'],
        ['Name & describe',    'Give the template a name, color, and optional description.'],
        ['Bind to location',   'Link to a client location, contact role, and starting phase.'],
        ['Review & create',    'Saved as a draft — customise questions in the Sections tab.'],
      ].map(([title, desc], i) => (
        <div key={i} className="flex gap-2.5 mb-3.5">
          <div className="w-4 h-4 rounded-full bg-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-500 shrink-0 mt-px">
            {i + 1}
          </div>
          <div>
            <p className="text-xs font-semibold text-heading m-0 mb-0.5">{title}</p>
            <p className="text-xs text-muted leading-normal m-0">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )

  // ── Step 0: Welcome + preset cards ──────────────────────────

  const step0 = (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
            <Atom size={18} />
          </div>
          <h2 className="text-base font-bold text-heading m-0">Build a template</h2>
        </div>
        <p className="text-sm text-muted leading-relaxed m-0">
          Pick a starting point below. You can toggle sections on or off, then customise questions in the Sections tab.
        </p>
      </div>

      <p className="text-sm font-semibold text-body-text mb-3">Choose a starting point</p>

      <div className="flex flex-col gap-1.5">
        {PRESETS.map(p => {
          const pc = p.colors
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => { setPreset(p); setSelectedSections([...p.sections]); setStep(1) }}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-elevated cursor-pointer text-left transition-all duration-200 w-full hover:border-soft-lavender/40 group"
            >
              <div className={`w-8 h-8 rounded-lg ${pc.iconBg} flex items-center justify-center ${pc.iconText} shrink-0`}>
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm font-semibold text-heading">{p.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${pc.tag} font-semibold shrink-0`}>
                    {p.sections.length} sections
                  </span>
                </div>
                <p className="text-xs text-muted leading-normal m-0">{p.description}</p>
              </div>
              <div className={`${pc.chevronBg} rounded-full p-1 flex items-center justify-center shrink-0`}>
                <ChevronRight size={16} className={pc.chevronText} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── Step 1: Section toggle ───────────────────────────────────

  const step1 = preset ? (
    <div>
      <StepBar current={0} colors={c} />
      <h3 className="text-sm font-bold text-heading m-0 mb-1">Customise sections</h3>
      <p className="text-xs text-muted m-0 mb-4">
        All <strong className="text-heading">{preset.name}</strong> sections are included. Toggle any off that don't apply to this client.
      </p>

      <div className="flex flex-col gap-1.5">
        {preset.sections.map(s => {
          const active = selectedSections.some(sel => sel.slug === s.slug)
          const toggle = () => setSelectedSections(prev =>
            active
              ? prev.length > 1 ? prev.filter(x => x.slug !== s.slug) : prev
              : [...prev, s]
          )
          return (
            <button
              key={s.slug}
              type="button"
              onClick={toggle}
              className={[
                'flex items-center gap-2.5 py-2.5 px-3 rounded-xl border cursor-pointer text-left transition-all duration-150',
                active
                  ? `${c.panelBg} border-transparent outline outline-2 ${c.outlineActive}`
                  : 'bg-elevated border-border hover:border-soft-lavender/40',
              ].join(' ')}
            >
              <div className={[
                'shrink-0 flex items-center justify-center transition-all duration-150',
                active ? `${c.successRing}` : 'bg-surface border border-border',
              ].join(' ')} style={{ width: '18px', height: '18px', borderRadius: '5px' }}>
                {active && <Check size={11} color="white" strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold m-0 ${active ? 'text-heading' : 'text-muted'}`}>{s.title}</p>
                <p className="text-xs text-muted m-0 mt-0.5">{s.subtitle}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.badgeBg} text-muted font-medium shrink-0`}>
                {s.checkpointCount} checkpoints
              </span>
            </button>
          )
        })}
      </div>

      {selectedSections.length < preset.sections.length && (
        <p className={`text-xs ${c.labelActive} mt-2.5`}>
          {preset.sections.length - selectedSections.length} section{preset.sections.length - selectedSections.length !== 1 ? 's' : ''} excluded
        </p>
      )}

      <NavRow
        onBack={() => { setPreset(null); setSelectedSections([]); setStep(0) }}
        onNext={() => setStep(2)}
        nextDisabled={selectedSections.length === 0}
        colors={c}
      />
    </div>
  ) : null

  // ── Step 2: Template metadata + color ────────────────────────

  const step2 = (
    <div>
      <StepBar current={1} colors={c} />
      <h3 className="text-sm font-bold text-heading m-0 mb-1">Template details</h3>
      <p className="text-xs text-muted m-0 mb-4">Give this template a name. Department and description are optional.</p>

      <div className="flex flex-col gap-3">
        <div>
          <label className={labelCls}>Template name <span className="text-red-500/70">*</span></label>
          <input
            type="text"
            placeholder="e.g. Enterprise Fleet Onboarding"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputCls}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelCls}>Department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)} className={inputCls}>
              <option value="">No department</option>
              {DEPARTMENTS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Card color</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TEMPLATE_COLORS.map(tc => (
                <button
                  key={tc}
                  type="button"
                  onClick={() => setColor(tc)}
                  className="w-5 h-5 rounded-full border-none cursor-pointer transition-all duration-150"
                  style={{
                    background: tc,
                    transform: color === tc ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: color === tc ? `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${tc}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            placeholder="Briefly describe when to use this template…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className={`${inputCls} resize-y min-h-16`}
          />
        </div>
      </div>

      <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!name.trim()} colors={c} />
    </div>
  )

  // ── Step 3: Location & contact binding ───────────────────────

  const step3 = (
    <div>
      <StepBar current={2} colors={c} />
      <h3 className="text-sm font-bold text-heading m-0 mb-1">Location & contact binding</h3>
      <p className="text-xs text-muted m-0 mb-4">
        Optionally bind this template to a client location and contact role. Skip to leave it unbound.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Client location</label>
          <LocationPicker
            onLocationSet={async (locId) => {
              setLocationId(locId)
              setContactRole(''); setSubLocationGroup([])
              setSelectedContactId(null); setShowNewContact(false)
              setExistingContacts([]); setContactFetchDone(false)
              if (locId) {
                const subs = await getSubLocations(locId)
                setAvailableSubLocations(subs.map(s => ({ id: s.id, name: s.name })))
              } else {
                setAvailableSubLocations([])
              }
            }}
          />
        </div>

        {locationId && (
          <>
            {/* Contact role */}
            <div>
              <label className={labelCls}>Contact role <span className="font-normal">(optional)</span></label>
              <div className="flex flex-col gap-1">
                {PRIMARY_ROLES.map(r => {
                  const def = ROLE_DEFINITIONS[r]
                  const sel = contactRole === r
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setContactRole(sel ? '' : r); setSubLocationGroup([]); setSelectedContactId(null); setShowNewContact(false) }}
                      className={[
                        'flex items-center gap-2 py-2 px-2.5 rounded-lg border cursor-pointer text-left transition-all duration-150',
                        sel
                          ? `${c.iconBg} border-transparent outline outline-2 ${c.outlineActive}`
                          : 'bg-elevated border-border hover:border-soft-lavender/40',
                      ].join(' ')}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sel ? c.dotActive : c.dotInactive}`} />
                      <span className={`text-xs font-semibold flex-1 ${sel ? c.labelActive : 'text-heading'}`}>{def.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.badgeBg} text-muted font-medium`}>{def.scope}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sub-location group */}
            {contactRole && availableSubLocations.length > 0 && (
              <div>
                <label className={labelCls}>Sub-locations this role covers <span className="font-normal">(all = leave unchecked)</span></label>
                <div className="flex flex-col gap-1">
                  {availableSubLocations.map(sl => (
                    <label key={sl.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={subLocationGroup.includes(sl.id)}
                        onChange={e => setSubLocationGroup(prev =>
                          e.target.checked ? [...prev, sl.id] : prev.filter(id => id !== sl.id)
                        )}
                        className="w-3.5 h-3.5"
                        style={{ accentColor: '#928CE3' }}
                      />
                      <span className="text-xs text-body-text">{sl.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Starting phase */}
            {contactRole && (
              <div>
                <label className={labelCls}>Starting phase <span className="font-normal">— default phase when onboarding this contact</span></label>
                <div className="flex flex-col gap-1.5">
                  {(PHASE_ORDER.filter(p => p !== 'deploy') as ConfigPhase[]).map((p, idx) => {
                    const { count, unit } = PHASE_ITEM_COUNTS[p]
                    const isSel = startPhase === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setStartPhase(p)}
                        className={[
                          'flex items-center gap-2.5 py-2.5 px-3 rounded-xl border cursor-pointer text-left transition-all duration-150',
                          isSel
                            ? `${c.panelBg} border-transparent outline outline-2 ${c.outlineActive}`
                            : 'bg-elevated border-border text-muted hover:border-soft-lavender/40',
                        ].join(' ')}
                      >
                        <div className={[
                          'w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-150',
                          isSel ? `${c.successRing} text-white` : 'bg-elevated border border-border text-muted',
                        ].join(' ')}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className={`text-xs font-semibold mb-0.5 ${isSel ? c.labelActive : 'text-heading'}`}>
                            {PHASE_LABELS[p]}
                            <span className="ml-1.5 text-xs font-normal text-muted">{count} {unit}</span>
                          </div>
                          <div className="text-xs text-muted leading-snug">{PHASE_DESCRIPTIONS[p]}</div>
                        </div>
                        {isSel && <CheckCircle2 size={13} className={c.labelActive} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Client contacts */}
            {contactRole && (
              <div>
                <label className={labelCls}>
                  Client contact
                  {contactFetchDone && existingContacts.length > 0 && (
                    <span className="font-normal ml-1">· {existingContacts.length} at this location</span>
                  )}
                </label>

                {!contactFetchDone && <p className="text-xs text-muted">Loading contacts…</p>}

                {contactFetchDone && existingContacts.length > 0 && (
                  <div className="flex flex-col gap-1 mb-2">
                    {existingContacts.map(ct => {
                      const isSel      = selectedContactId === ct.id
                      const tier       = ROLE_SUB_LOCATION_TIER[contactRole as ContactRoleLabel]
                      const subLocName = ct.sub_location_id
                        ? availableSubLocations.find(s => s.id === ct.sub_location_id)?.name
                        : null
                      const scopeLabel = subLocName
                        ?? (tier === 'fleet_wide' ? 'Fleet-wide' : tier === 'single_sub' ? 'Sub-location' : 'Location')
                      return (
                        <button
                          key={ct.id}
                          type="button"
                          onClick={() => {
                            setSelectedContactId(isSel ? null : ct.id)
                            if (!isSel) { setShowNewContact(false); setNewContactName(''); setNewContactEmail('') }
                          }}
                          className={[
                            'flex items-center gap-2.5 py-2 px-2.5 rounded-lg border cursor-pointer text-left transition-all duration-150',
                            isSel
                              ? `${c.panelBg} border-transparent outline outline-2 ${c.outlineActive}`
                              : 'bg-elevated border-border hover:border-soft-lavender/40',
                          ].join(' ')}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center ${isSel ? c.successRing : 'bg-elevated border border-border'}`}>
                            {isSel && <Check size={9} color="white" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-semibold flex items-center gap-1.5 ${isSel ? c.labelActive : 'text-heading'}`}>
                              {ct.full_name}
                              <span className={`text-xs px-1 py-0.5 rounded-full ${c.badgeBg} text-muted font-normal`}>{scopeLabel}</span>
                            </div>
                            <div className="text-xs text-muted">{ct.email}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {!showNewContact ? (
                  <button
                    type="button"
                    onClick={() => { setShowNewContact(true); setSelectedContactId(null) }}
                    className="w-full py-1.5 rounded-lg bg-transparent border border-dashed border-border text-muted text-xs font-semibold cursor-pointer transition-colors duration-150 hover:border-soft-lavender/40"
                  >
                    + New contact
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-border bg-elevated">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${c.labelActive}`}>New contact</span>
                      <button
                        type="button"
                        onClick={() => { setShowNewContact(false); setNewContactName(''); setNewContactEmail(''); setNewContactSubLocId('') }}
                        className="bg-transparent border-none cursor-pointer text-muted text-xs leading-none"
                      >✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={labelCls}>Full name *</label>
                        <input type="text" value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="Contact name" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Email *</label>
                        <input type="email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="contact@client.com" className={inputCls} />
                      </div>
                    </div>
                    {ROLE_SUB_LOCATION_TIER[contactRole as ContactRoleLabel] === 'single_sub' && availableSubLocations.length > 0 && (
                      <div>
                        <label className={labelCls}>Sub-location</label>
                        <select value={newContactSubLocId} onChange={e => setNewContactSubLocId(e.target.value)} className={inputCls}>
                          <option value="">Select sub-location…</option>
                          {availableSubLocations.map(sl => (
                            <option key={sl.id} value={sl.id}>{sl.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <NavRow onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel={locationId ? 'Next' : 'Skip'} colors={c} />
    </div>
  )

  // ── Step 4: Review ───────────────────────────────────────────

  const step4 = (
    <div>
      <StepBar current={3} colors={c} />
      <h3 className="text-sm font-bold text-heading m-0 mb-1">Review & create</h3>
      <p className="text-xs text-muted m-0 mb-4">Check everything looks right, then create your template draft.</p>

      <div className="flex flex-col gap-1.5 mb-4">
        {([
          { label: 'Preset',  value: `${preset?.name} · ${selectedSections.length} sections` },
          { label: 'Name',    value: name, sub: description || undefined, extra: department || undefined },
          { label: 'Binding',
            value: locationId && contactRole
              ? `${ROLE_DEFINITIONS[contactRole as ContactRoleLabel]?.label} · ${PHASE_LABELS[startPhase]}`
              : 'Unbound — general template',
            sub: contactDisplayName ? `Contact: ${contactDisplayName}` : undefined,
          },
        ] as { label: string; value: string; sub?: string; extra?: string }[]).map(row => (
          <div key={row.label} className="py-2.5 px-3 rounded-xl bg-elevated border border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted m-0 mb-1">{row.label}</p>
            <p className="text-sm font-semibold text-heading m-0">{row.value}</p>
            {row.extra && <p className="text-xs text-muted m-0 mt-0.5">{row.extra}</p>}
            {row.sub   && <p className="text-xs text-muted m-0 mt-0.5">{row.sub}</p>}
          </div>
        ))}
      </div>

      {error && (
        <div className="py-2.5 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500/90 text-xs mb-3">
          {error}
        </div>
      )}

      <NavRow onBack={() => setStep(3)} onNext={handleCreate} nextLabel="Create template" creating={creating} colors={c} />
    </div>
  )

  // ── Step 5: Success ──────────────────────────────────────────

  const step5 = (
    <div>
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className={`w-9 h-9 rounded-full ${c.successRing} flex items-center justify-center shrink-0`}>
          <Check size={17} color="white" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-heading m-0">Template ready</h3>
          <p className="text-xs text-muted m-0">{selectedSections.length} sections · {preset?.deployTasks.length} deploy tasks</p>
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed mb-4">
        <strong className="text-heading">{createdName}</strong> has been saved as a draft.
        Open the Sections tab to add questions, configure phase visibility, and publish when ready.
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => createdId && onTemplateCreated(createdId)}
          className={`w-full py-2.5 rounded-lg border-none ${c.createBtn} text-white text-xs font-semibold cursor-pointer transition-colors duration-150`}
        >
          Open in Sections tab →
        </button>
        {hasContact && (
          <button
            onClick={handleStartOnboarding}
            disabled={starting}
            className={`w-full py-2.5 rounded-lg bg-transparent border ${c.skipBtn} text-xs font-semibold cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {starting ? 'Opening…' : `Start Onboarding for ${contactDisplayName} →`}
          </button>
        )}
        <button
          onClick={reset}
          className="w-full py-2 rounded-lg bg-transparent border border-border text-muted text-xs font-semibold cursor-pointer flex items-center justify-center gap-1 transition-colors duration-150 hover:bg-elevated"
        >
          <RotateCcw size={11} /> Create another
        </button>
      </div>

      {error && (
        <div className="py-2.5 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500/90 text-xs mt-3">
          {error}
        </div>
      )}
    </div>
  )

  // ── Layout ───────────────────────────────────────────────────

  const leftContent =
    step === 0 ? step0 :
    step === 1 ? step1 :
    step === 2 ? step2 :
    step === 3 ? step3 :
    step === 4 ? step4 :
    step5

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">{leftContent}</div>
      <div className="w-2/5 shrink-0 min-w-0">{rightPanel}</div>
    </div>
  )
}
