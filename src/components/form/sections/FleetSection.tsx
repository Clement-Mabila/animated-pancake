'use client'

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { CirclePlus, X, Upload, Pencil, Trash2, Bot, Check, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import FormField from '@/components/form/shared/FormField'
import MultiEntryField from '@/components/form/shared/MultiEntryField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SaveButtons from '@/components/form/shared/SaveButtons'
import SuggestionDropdown from '@/components/form/shared/SuggestionDropdown'
import { useSuggestions } from '@/hooks/useSuggestions'
import { saveSuggestionAction } from '@/app/actions/session'
import { addRobotAction, updateRobotAction, deleteRobotAction, importRobotsAction } from '@/app/actions/robots'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Robot {
  id:               string
  serial_id:        string | null
  alias:            string | null
  map_name:         string | null
  map_verified:     boolean
  sub_location_id:  string
  model:            string | null
  firmware_version: string | null
  floor_level:      number | null
  commissioned_at:  string | null
}

interface SubLocation { id: string; name: string }

import type { WorkflowQuestion } from '@/types'

interface FleetSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  locationId?: string
  industry?: string | null
  questions?: WorkflowQuestion[]
}

interface ParsedRobotRow {
  sub_location_name_raw: string
  sub_location_id:       string | null
  serial_id:             string
  alias:                 string
  map_name:              string
  map_verified:          boolean
  model:                 string
  firmware_version:      string
  floor_level:           string
}

interface RobotFormValues {
  sub_location_id:  string
  serial_id:        string
  alias:            string
  map_name:         string
  map_verified:     boolean
  model:            string
  firmware_version: string
  floor_level:      string
  commissioned_at:  string
}

type PanelTab = 'manual' | 'import'

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKPOINTS = [
  { id: 'robot_records_reviewed',   label: 'All robot records reviewed — IDs, models, serials correct', hint: 'Cross-reference against physical asset list' },
  { id: 'site_names_confirmed',     label: 'All site and location names confirmed accurate' },
  { id: 'floor_mapping_verified',   label: 'Floor / zone mapping verified against site floor plans' },
  { id: 'robot_location_confirmed', label: 'Robot-to-location assignments confirmed correct' },
  { id: 'geofences_verified',       label: 'Geofences and no-go zones verified per site' },
  { id: 'groupings_confirmed',      label: 'Location / sub-location groupings confirmed for reporting purposes' },
  { id: 'connectivity_confirmed',   label: 'Network connectivity confirmed live at each site' },
  { id: 'firmware_verified',        label: 'Firmware versions verified and up to date' },
  { id: 'amendments_corrected',     label: 'All amendments corrected in Orchestrator before go-live' },
]

const EMPTY_ROBOT_FORM: RobotFormValues = {
  sub_location_id:  '',
  serial_id:        '',
  alias:            '',
  map_name:         '',
  map_verified:     false,
  model:            '',
  firmware_version: '',
  floor_level:      '',
  commissioned_at:  '',
}

// Shared input / label class strings — no inline styles, no arbitrary values
const INPUT_CLS = [
  'w-full px-3 py-2.5 rounded-2xl text-sm border border-soft-lavender/20',
  'bg-elevated text-heading outline-none transition-colors',
  'focus:border-soft-lavender focus:ring-2 focus:ring-soft-lavender/15 focus:bg-surface',
].join(' ')

const LABEL_CLS = 'block text-xs font-medium text-soft-lavender mb-1.5'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseModels(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'string' && raw.startsWith('[')) {
    try { return JSON.parse(raw) } catch { /* fall through */ }
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

function generateAlias(): string {
  return `MBR-${Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0').toUpperCase()}`
}

function normKey(h: string): string {
  return h.toLowerCase().replace(/[\s_-]+/g, '')
}

function parseFileRows(headers: string[], dataRows: unknown[][], subLocations: SubLocation[]): ParsedRobotRow[] {
  const idx: Record<string, number> = {}
  headers.forEach((h, i) => {
    const n = normKey(String(h ?? ''))
    if (['sublocation','sublocationname','location','site'].includes(n))     idx.sub      = i
    if (['serialid','serial','robotid','sn','serialnumber'].includes(n))     idx.serial   = i
    if (['alias','name','robotname','robotalias'].includes(n))               idx.alias    = i
    if (['mapname','map','mapfile'].includes(n))                             idx.map      = i
    if (['mapverified','verified','mapok'].includes(n))                      idx.verified = i
    if (['model','robotmodel','type','robottype'].includes(n))               idx.model    = i
    if (['firmware','firmwareversion','fw','fwversion'].includes(n))         idx.firmware = i
    if (['floorlevel','floor','level','floorno'].includes(n))                idx.floor    = i
  })
  const get = (row: unknown[], key: string) => {
    const i = idx[key]; return i !== undefined ? String(row[i] ?? '').trim() : ''
  }
  return dataRows
    .filter(row => row.some(c => c !== null && c !== undefined && String(c).trim() !== ''))
    .map(row => {
      const subLocRaw = get(row, 'sub')
      const matched   = subLocations.find(sl => sl.name.toLowerCase() === subLocRaw.toLowerCase())
      const verRaw    = get(row, 'verified').toLowerCase()
      return {
        sub_location_name_raw: subLocRaw,
        sub_location_id:       matched?.id ?? null,
        serial_id:             get(row, 'serial'),
        alias:                 get(row, 'alias'),
        map_name:              get(row, 'map'),
        map_verified:          ['yes','true','1','x'].includes(verRaw),
        model:                 get(row, 'model'),
        firmware_version:      get(row, 'firmware'),
        floor_level:           get(row, 'floor'),
      }
    })
}

// ── RobotSuggestionInput ──────────────────────────────────────────────────────

interface RobotSuggestionInputProps {
  sectionId:    string
  fieldKey:     string
  industry?:    string | null
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
}

function RobotSuggestionInput({
  sectionId, fieldKey, industry, value, onChange, placeholder,
}: RobotSuggestionInputProps) {
  const containerRef                  = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<React.CSSProperties>({})
  const [mounted, setMounted]         = useState(false)
  const listboxId                     = useId()
  const sugg                          = useSuggestions(sectionId, fieldKey, industry)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!sugg.open) return
    function updatePos() {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setDropdownPos({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [sugg.open])

  const filtered     = sugg.filter(value)
  const pageSuggs    = sugg.getPage(filtered)
  const showDropdown = sugg.open && (pageSuggs.length > 0 || sugg.loading)

  function handleSelect(v: string) {
    onChange(v)
    sugg.onClose()
    sugg.addOptimistic(v, industry)
    saveSuggestionAction(sectionId, fieldKey, v, industry ?? null).catch(() => {})
  }

  return (
    <div ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={e => { sugg.resetPage(); onChange(e.target.value) }}
        onFocus={() => sugg.onFocus()}
        onBlur={e => {
          sugg.onClose()
          const v = e.target.value.trim()
          if (v.length >= 2) {
            sugg.addOptimistic(v, industry)
            saveSuggestionAction(sectionId, fieldKey, v, industry ?? null).catch(() => {})
          }
        }}
        onKeyDown={e => sugg.handleKey(e, pageSuggs, handleSelect)}
        placeholder={placeholder}
        className={INPUT_CLS}
        autoComplete="off"
        role={sugg.enabled ? 'combobox' : undefined}
        aria-expanded={sugg.enabled ? showDropdown : undefined}
        aria-autocomplete={sugg.enabled ? 'list' : undefined}
        aria-controls={sugg.enabled && showDropdown ? listboxId : undefined}
        aria-activedescendant={sugg.enabled && sugg.activeIndex >= 0 ? `suggestion-${sugg.activeIndex}` : undefined}
      />
      {mounted && showDropdown && createPortal(
        <SuggestionDropdown
          id={listboxId}
          suggestions={pageSuggs}
          hasMore={sugg.hasMore(filtered)}
          loading={sugg.loading}
          style={dropdownPos}
          activeIndex={sugg.activeIndex}
          onSelect={handleSelect}
          onShowMore={sugg.showMore}
        />,
        document.body,
      )}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full border-0 cursor-pointer relative shrink-0 transition-colors ${value ? 'bg-green-500/60' : 'bg-soft-lavender/15'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all block ${value ? 'left-auto right-0.5' : 'left-0.5 right-auto'}`} />
      </button>
      <span className="text-xs text-body-text">{label}</span>
    </div>
  )
}

// ── RobotFormFields ───────────────────────────────────────────────────────────
// MODULE LEVEL — never defined inside another component (prevents remount on re-render)

interface RobotFormFieldsProps {
  values:       RobotFormValues
  set:          (patch: Partial<RobotFormValues>) => void
  subLocations: SubLocation[]
  industry?:    string | null
}

function RobotFormFields({ values, set, subLocations, industry }: RobotFormFieldsProps) {
  function field(label: React.ReactNode, children: React.ReactNode) {
    return (
      <div>
        <label className={LABEL_CLS}>{label}</label>
        {children}
      </div>
    )
  }

  const plainInput = (
    key: keyof RobotFormValues,
    placeholder?: string,
    type: React.HTMLInputTypeAttribute = 'text',
  ) => (
    <input
      type={type}
      value={values[key] as string}
      onChange={e => set({ [key]: e.target.value })}
      placeholder={placeholder}
      className={INPUT_CLS}
      autoComplete="off"
    />
  )

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        {field('Sub-location *',
          <select
            value={values.sub_location_id}
            onChange={e => set({ sub_location_id: e.target.value })}
            className={`${INPUT_CLS} cursor-pointer`}
          >
            {subLocations.map(sl => <option key={sl.id} value={sl.id}>{sl.name}</option>)}
          </select>
        )}

        {field('Model',
          <RobotSuggestionInput
            sectionId="fleet" fieldKey="robot_model" industry={industry}
            value={values.model}
            onChange={v => set({ model: v })}
            placeholder="e.g. L50"
          />
        )}

        {field('Firmware version',
          <RobotSuggestionInput
            sectionId="fleet" fieldKey="robot_firmware" industry={industry}
            value={values.firmware_version}
            onChange={v => set({ firmware_version: v })}
            placeholder="e.g. 4.2.1"
          />
        )}

        {field('Serial ID', plainInput('serial_id', 'e.g. SN-0012'))}

        {field(
          <>
            <span>Alias</span>
            <span className="font-normal normal-case tracking-normal text-xs ml-1 opacity-50">(auto-generated if blank)</span>
          </>,
          plainInput('alias', 'e.g. MBR-A2F1'),
        )}

        {field('Map name',          plainInput('map_name', 'e.g. floor-2-west'))}
        {field('Floor level',       plainInput('floor_level', 'e.g. 2', 'number'))}
        {field('Commissioned date', plainInput('commissioned_at', '', 'date'))}
      </div>

      <div className="mb-3.5">
        <Toggle value={values.map_verified} onChange={v => set({ map_verified: v })} label="Map verified" />
      </div>
    </>
  )
}

// ── FleetSection ──────────────────────────────────────────────────────────────

export default function FleetSection({
  data = {},
  onSave,
  onAutoSave,
  isSaving,
  isComplete,
  locationId,
  industry,
  questions,
}: FleetSectionProps) {
  const resolvedCheckpoints = questions && questions.some(q => q.field_type === 'checkpoint')
    ? questions.filter(q => q.field_type === 'checkpoint' && q.active).sort((a, b) => a.sort_order - b.sort_order).map(q => ({ id: q.field_key, label: q.label ?? q.field_key }))
    : CHECKPOINTS

  // ── Section-level form state ──────────────────────────────
  const [robots,       setRobots]       = useState<Robot[]>([])
  const [subLocations, setSubLocations] = useState<SubLocation[]>([])
  const [robotNotes,   setRobotNotes]   = useState<Record<string, string>>((data.robot_notes   as Record<string, string>)  ?? {})
  const [robotCorrect, setRobotCorrect] = useState<Record<string, boolean>>((data.robot_correct as Record<string, boolean>) ?? {})
  const [fields, setFields] = useState({
    total_robots_confirmed:  (data.total_robots_confirmed  as string) ?? '',
    sites_count_confirmed:   (data.sites_count_confirmed   as string) ?? '',
    floor_zone_notes:        (data.floor_zone_notes        as string) ?? '',
    location_grouping_notes: (data.location_grouping_notes as string) ?? '',
    amendments_required:     (data.amendments_required     as string) ?? '',
  })
  const [robotModels, setRobotModels] = useState<string[]>(parseModels(data.robot_models_confirmed))
  const [checked,     setChecked]     = useState<Record<string, boolean>>((data.checkpoints as Record<string, boolean>) ?? {})
  const [loading,     setLoading]     = useState(false)

  // ── Add panel ─────────────────────────────────────────────
  const [showPanel,    setShowPanel]    = useState(false)
  const [panelTab,     setPanelTab]     = useState<PanelTab>('manual')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [manual,       setManual]       = useState<RobotFormValues>(EMPTY_ROBOT_FORM)

  // ── Import ────────────────────────────────────────────────
  const [importRows,     setImportRows]     = useState<ParsedRobotRow[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [isDragging,     setIsDragging]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Edit / delete ─────────────────────────────────────────
  const [editingRobotId,  setEditingRobotId]  = useState<string | null>(null)
  const [deletingRobotId, setDeletingRobotId] = useState<string | null>(null)
  const [editForm,        setEditForm]        = useState<RobotFormValues>(EMPTY_ROBOT_FORM)
  const [menuRobotId,     setMenuRobotId]     = useState<string | null>(null)

  // ── Data fetching ─────────────────────────────────────────
  const fetchData = useCallback(async (autoOpen = false) => {
    if (!locationId) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const [{ data: subLocs }, { data: robotData }] = await Promise.all([
        supabase.from('sub_locations').select('*').eq('location_id', locationId).order('name'),
        supabase.from('robots').select('*, sub_locations!inner(location_id)').eq('sub_locations.location_id', locationId),
      ])
      const sls = subLocs ?? []
      const rbs = robotData ?? []
      setSubLocations(sls)
      setRobots(rbs)
      setManual(prev => prev.sub_location_id ? prev : { ...prev, sub_location_id: sls[0]?.id ?? '' })
      if (autoOpen && rbs.length === 0 && sls.length > 0) setShowPanel(true)
    } catch { /* silently fail */ }
  }, [locationId])

  useEffect(() => {
    if (!locationId) return
    setLoading(true)
    fetchData(true).finally(() => setLoading(false))
  }, [locationId, fetchData])

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setRobotNotes((data.robot_notes    as Record<string, string>)  ?? {})
    setRobotCorrect((data.robot_correct as Record<string, boolean>) ?? {})
    setRobotModels(parseModels(data.robot_models_confirmed))
    setFields({
      total_robots_confirmed:  (data.total_robots_confirmed  as string) ?? '',
      sites_count_confirmed:   (data.sites_count_confirmed   as string) ?? '',
      floor_zone_notes:        (data.floor_zone_notes        as string) ?? '',
      location_grouping_notes: (data.location_grouping_notes as string) ?? '',
      amendments_required:     (data.amendments_required     as string) ?? '',
    })
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  // ── Section form helpers ──────────────────────────────────
  function setField(key: string, value: string) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.(buildPayload(updated, robotModels, robotNotes, robotCorrect, checked))
  }
  function handleModelsChange(entries: string[]) {
    setRobotModels(entries)
    onAutoSave?.(buildPayload(fields, entries, robotNotes, robotCorrect, checked))
  }
  function buildPayload(
    f: typeof fields,
    models: string[],
    notes: Record<string, string>,
    correct: Record<string, boolean>,
    chk: Record<string, boolean>,
  ): Record<string, unknown> {
    return { ...f, robot_models_confirmed: JSON.stringify(models), robot_notes: notes, robot_correct: correct, checkpoints: chk }
  }
  function getCurrentData() {
    return buildPayload(fields, robotModels, robotNotes, robotCorrect, checked)
  }

  // ── Add manually ──────────────────────────────────────────
  async function handleAddManual() {
    if (!manual.sub_location_id) { toast.error('Select a sub-location'); return }
    setIsSubmitting(true)
    try {
      await addRobotAction({
        sub_location_id:  manual.sub_location_id,
        serial_id:        manual.serial_id        || null,
        alias:            manual.alias            || generateAlias(),
        map_name:         manual.map_name         || null,
        map_verified:     manual.map_verified,
        model:            manual.model            || null,
        firmware_version: manual.firmware_version || null,
        floor_level:      manual.floor_level ? parseInt(manual.floor_level) : null,
        commissioned_at:  manual.commissioned_at  || null,
      })
      toast.success('Robot added')
      setManual(prev => ({ ...EMPTY_ROBOT_FORM, sub_location_id: prev.sub_location_id }))
      await fetchData(false)
    } catch {
      toast.error('Failed to add robot')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Edit / delete ─────────────────────────────────────────
  function startEdit(robot: Robot) {
    setEditingRobotId(robot.id)
    setDeletingRobotId(null)
    setEditForm({
      sub_location_id:  robot.sub_location_id,
      serial_id:        robot.serial_id        ?? '',
      alias:            robot.alias            ?? '',
      map_name:         robot.map_name         ?? '',
      map_verified:     robot.map_verified,
      model:            robot.model            ?? '',
      firmware_version: robot.firmware_version ?? '',
      floor_level:      robot.floor_level != null ? String(robot.floor_level) : '',
      commissioned_at:  robot.commissioned_at ? robot.commissioned_at.slice(0, 10) : '',
    })
  }

  async function handleSaveEdit(robotId: string) {
    setIsSubmitting(true)
    try {
      await updateRobotAction(robotId, {
        sub_location_id:  editForm.sub_location_id,
        serial_id:        editForm.serial_id        || null,
        alias:            editForm.alias            || null,
        map_name:         editForm.map_name         || null,
        map_verified:     editForm.map_verified,
        model:            editForm.model            || null,
        firmware_version: editForm.firmware_version || null,
        floor_level:      editForm.floor_level ? parseInt(editForm.floor_level) : null,
        commissioned_at:  editForm.commissioned_at  || null,
      })
      toast.success('Robot updated')
      setEditingRobotId(null)
      await fetchData(false)
    } catch {
      toast.error('Failed to update robot')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(robotId: string) {
    setIsSubmitting(true)
    try {
      await deleteRobotAction(robotId)
      toast.success('Robot removed')
      setDeletingRobotId(null)
      await fetchData(false)
    } catch {
      toast.error('Failed to remove robot')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── File import ───────────────────────────────────────────
  async function processFile(file: File) {
    setImportFileName(file.name)
    try {
      const { read, utils } = await import('xlsx')
      const workbook = file.name.toLowerCase().endsWith('.csv')
        ? read(await file.text(), { type: 'string' })
        : read(await file.arrayBuffer())
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw   = utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
      if (raw.length < 2) { toast.error('File has no data rows'); return }
      setImportRows(parseFileRows(raw[0] as string[], raw.slice(1) as unknown[][], subLocations))
    } catch {
      toast.error('Failed to parse file — check format and try again')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) processFile(file); e.target.value = ''
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]; if (file) processFile(file)
  }

  async function handleImport() {
    const valid = importRows.filter(r => r.sub_location_id !== null)
    if (valid.length === 0) { toast.error('No rows with a matched sub-location'); return }
    setIsSubmitting(true)
    try {
      const result = await importRobotsAction(valid.map(r => ({
        sub_location_id:  r.sub_location_id!,
        serial_id:        r.serial_id        || null,
        alias:            r.alias            || generateAlias(),
        map_name:         r.map_name         || null,
        map_verified:     r.map_verified,
        model:            r.model            || null,
        firmware_version: r.firmware_version || null,
        floor_level:      r.floor_level ? parseInt(r.floor_level) : null,
      })))
      toast.success(`${result.count} robot${result.count !== 1 ? 's' : ''} imported`)
      setImportRows([]); setImportFileName(''); setShowPanel(false)
      await fetchData(false)
    } catch {
      toast.error('Import failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────
  const robotsBySubLoc   = subLocations.map(sl => ({ subLocation: sl, robots: robots.filter(r => r.sub_location_id === sl.id) })).filter(g => g.robots.length > 0)
  const canAddRobots     = !loading && subLocations.length > 0
  const validImportCount = importRows.filter(r => r.sub_location_id !== null).length

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <p className="text-sm text-body-text leading-relaxed mb-5">
        Robot and location data has already been ingested into Orchestrator. Validate that all
        records are correct, complete, and ready for reporting before go-live.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Total robots in Orchestrator" placeholder={`Expected: ${robots.length}`} value={fields.total_robots_confirmed} onChange={v => setField('total_robots_confirmed', v)} sectionId="fleet" fieldKey="total_robots_confirmed" industry={industry} />
        <FormField label="Number of sub-locations"      placeholder={`Expected: ${subLocations.length}`} value={fields.sites_count_confirmed} onChange={v => setField('sites_count_confirmed', v)} sectionId="fleet" fieldKey="sites_count_confirmed" industry={industry} />
      </div>

      <MultiEntryField label="Robot models / types confirmed" placeholder="e.g. SP50 scrubber ×20 — press Enter to add" entries={robotModels} onChange={handleModelsChange} sectionId="fleet" fieldKey="robot_models_confirmed" industry={industry} />

      <FormField label="Floor / zone mapping notes" type="textarea" rows={2} placeholder="Walk through each sub-location — note any zones missing, mislabelled, or incorrectly assigned" value={fields.floor_zone_notes} onChange={v => setField('floor_zone_notes', v)} sectionId="fleet" fieldKey="floor_zone_notes" industry={industry} />

      <FormField label="Location / Sub-Location grouping notes" type="textarea" rows={2} placeholder="e.g. Casino + Convention grouped as 'Ground Floor'; flag any groupings that need to change before go-live" value={fields.location_grouping_notes} onChange={v => setField('location_grouping_notes', v)} sectionId="fleet" fieldKey="location_grouping_notes" industry={industry} />

      {/* ── Robot register header ─────────────────────────── */}
      <div className="flex items-center gap-3 mt-6 mb-3">
        <div className="h-px flex-1 bg-soft-lavender/10" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted shrink-0">Robot register</span>
        <div className="h-px flex-1 bg-soft-lavender/10" />
        {canAddRobots && (
          <button
            onClick={() => setShowPanel(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-semibold cursor-pointer border border-violet-600/30 text-violet-600 shrink-0 transition-all ${showPanel ? 'bg-violet-600/10' : 'bg-transparent'}`}
          >
            <CirclePlus size={14} /> Add robot
          </button>
        )}
      </div>

      {/* ── Add panel ─────────────────────────────────────── */}
      {showPanel && canAddRobots && (
        <div className="border border-soft-lavender/20 rounded-2xl bg-soft-lavender/5 mb-4 overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center border-b border-soft-lavender/10 px-4">
            {(['manual', 'import'] as PanelTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setPanelTab(tab)}
                className={`px-3.5 py-2.5 text-xs  font-medium cursor-pointer border-0 bg-transparent transition-all -mb-px border-b-2 ${panelTab === tab ? 'border-violet-500 text-violet-500' : 'border-transparent text-violet-600/70 hover:text-violet-600'}`}
              >
                {tab === 'manual' ? 'Add manually' : 'Import from file'}
              </button>
            ))}
            <button
              onClick={() => { setShowPanel(false); setImportRows([]); setImportFileName('') }}
              className="ml-auto p-1.5 border-0 bg-transparent cursor-pointer text-muted rounded-md"
              aria-label="Close panel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Manual tab */}
          {panelTab === 'manual' && (
            <div className="p-4">
              <RobotFormFields values={manual} set={p => setManual(prev => ({ ...prev, ...p }))} subLocations={subLocations} industry={industry} />
              <button
                onClick={handleAddManual}
                disabled={isSubmitting || !manual.sub_location_id}
                className="px-5 py-2 flex items-center gap-2 rounded-2xl text-sm font-semibold border-0 bg-violet-600 text-white cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CirclePlus size={14} /> {isSubmitting ? 'Adding…' : 'Add robot'}
              </button>
            </div>
          )}

          {/* Import tab */}
          {panelTab === 'import' && (
            <div className="p-4">
              {importRows.length === 0 ? (
                <>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragging ? 'border-soft-lavender/60 bg-soft-lavender/5' : 'border-soft-lavender/25 bg-transparent'}`}
                  >
                    <Upload size={24} className="mx-auto mb-2 text-soft-lavender opacity-70" />
                    <p className="text-sm font-semibold text-body-text mb-1">Drop a CSV or XLSX file here, or click to browse</p>
                    <p className="text-xs text-muted">Columns: sub_location, model, firmware, serial_id, alias, map_name, map_verified, floor_level</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs text-muted">{importFileName} — {importRows.length} row{importRows.length !== 1 ? 's' : ''} parsed</span>
                    <button onClick={() => { setImportRows([]); setImportFileName('') }} className="text-xs text-muted bg-transparent border-0 cursor-pointer">Clear</button>
                  </div>
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-soft-lavender/15">
                          {['Sub-location','Model','Firmware','Serial ID','Alias','Map','Floor','Verified'].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left font-bold text-xs uppercase tracking-wide text-muted">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((row, i) => (
                          <tr key={i} className="border-b border-soft-lavender/5">
                            <td className="px-2 py-1.5">
                              {row.sub_location_id ? (
                                <span className="text-body-text">{subLocations.find(sl => sl.id === row.sub_location_id)?.name ?? row.sub_location_name_raw}</span>
                              ) : (
                                <select
                                  value=""
                                  onChange={e => { const id = e.target.value; setImportRows(prev => prev.map((r, j) => j === i ? { ...r, sub_location_id: id } : r)) }}
                                  className="text-xs px-1.5 py-0.5 rounded-md border border-red-500/40 bg-red-500/5 text-heading cursor-pointer"
                                >
                                  <option value="" disabled>Match &ldquo;{row.sub_location_name_raw}&rdquo;</option>
                                  {subLocations.map(sl => <option key={sl.id} value={sl.id}>{sl.name}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-body-text">{row.model || '—'}</td>
                            <td className="px-2 py-1.5 text-body-text font-mono">{row.firmware_version || '—'}</td>
                            <td className="px-2 py-1.5 text-body-text font-mono">{row.serial_id || '—'}</td>
                            <td className="px-2 py-1.5 text-body-text">{row.alias || <span className="text-muted italic">auto</span>}</td>
                            <td className="px-2 py-1.5 text-body-text">{row.map_name || '—'}</td>
                            <td className="px-2 py-1.5 text-body-text">{row.floor_level || '—'}</td>
                            <td className="px-2 py-1.5">
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${row.map_verified ? 'bg-green-500/10 text-green-600' : 'bg-red-500/5 text-red-600'}`}>
                                {row.map_verified ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importRows.some(r => !r.sub_location_id) && (
                    <p className="text-xs text-warning mb-2.5">
                      {importRows.filter(r => !r.sub_location_id).length} row{importRows.filter(r => !r.sub_location_id).length !== 1 ? 's' : ''} without a matched sub-location will be skipped.
                    </p>
                  )}
                  <button
                    onClick={handleImport}
                    disabled={isSubmitting || validImportCount === 0}
                    className="px-5 py-2 rounded-2xl text-xs font-bold border-0 bg-soft-lavender/80 text-white cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Importing…' : `Import ${validImportCount} robot${validImportCount !== 1 ? 's' : ''}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Robot list ────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-muted py-4">Loading robot fleet data…</p>
      ) : !locationId ? null
        : subLocations.length === 0 ? (
          <p className="text-sm text-muted py-4">No sub-locations found for this location. Add sub-locations before registering robots.</p>
        ) : robots.length === 0 ? (
          <p className="text-sm text-muted py-2">No robots added yet — use the form above to register your first robot.</p>
        ) : (
          <div className="flex flex-col gap-4 mb-4">
            {robotsBySubLoc.map(({ subLocation, robots: subRobots }) => (
              <div key={subLocation.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-soft-lavender">{subLocation.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-soft-lavender/10 text-soft-lavender font-semibold">
                    {subRobots.length} robot{subRobots.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {subRobots.map(robot => {
                    const isCorrect  = robotCorrect[robot.id] !== false
                    const isEditing  = editingRobotId  === robot.id
                    const isDeleting = deletingRobotId === robot.id

                    if (isEditing) return (
                      <div key={robot.id} className="p-3 rounded-2xl border border-soft-lavender/30 bg-soft-lavender/5">
                        <RobotFormFields values={editForm} set={p => setEditForm(prev => ({ ...prev, ...p }))} subLocations={subLocations} industry={industry} />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(robot.id)}
                            disabled={isSubmitting}
                            className="px-4 py-1.5 rounded-2xl text-xs font-bold border-0 bg-soft-lavender/80 text-white cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingRobotId(null)}
                            className="px-3.5 py-1.5 rounded-2xl text-xs font-semibold cursor-pointer border border-soft-lavender/20 bg-transparent text-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )

                    if (isDeleting) return (
                      <div key={robot.id} className="flex items-center justify-between px-3 py-2.5 rounded-2xl border border-red-500/30 bg-red-500/5">
                        <span className="text-sm text-body-text">Remove <strong>{robot.alias || robot.serial_id || 'this robot'}</strong>?</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleDelete(robot.id)}
                            disabled={isSubmitting}
                            className="px-3 py-1 rounded-2xl text-xs font-bold border-0 bg-red-500/80 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? 'Removing…' : 'Remove'}
                          </button>
                          <button
                            onClick={() => setDeletingRobotId(null)}
                            className="px-3.5 py-1.5 rounded-2xl text-xs font-semibold cursor-pointer border border-soft-lavender/20 bg-transparent text-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )

                    return (
                      <div
                        key={robot.id}
                        className="group relative rounded-2xl border border-soft-lavender/15 bg-elevated"
                      >
                        {/* invisible overlay to close menu on outside click */}
                        {menuRobotId === robot.id && (
                          <div className="fixed inset-0 z-10" onClick={() => setMenuRobotId(null)} />
                        )}

                        <div className="p-4">
                          {/* ── Header ─────────────────────────────── */}
                          <div className="flex items-center gap-2 mb-1">
                            <Bot size={14} className="shrink-0 text-muted" />
                            <span className="text-sm font-bold text-heading truncate flex-1">{robot.model || 'Unknown Model'}</span>
                            {/* 3-dot menu — visible on hover */}
                            <div className="relative z-20">
                              <button
                                onClick={() => setMenuRobotId(menuRobotId === robot.id ? null : robot.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg border-0 bg-transparent cursor-pointer text-muted hover:text-heading hover:bg-soft-lavender/10 transition-all"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                              {menuRobotId === robot.id && (
                                <div className="absolute right-0 top-full mt-1 bg-elevated border border-soft-lavender/20 rounded-xl shadow-lg py-1 min-w-[110px]">
                                  <button
                                    onClick={() => { startEdit(robot); setMenuRobotId(null) }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-body-text hover:bg-soft-lavender/10 cursor-pointer border-0 bg-transparent text-left transition-colors"
                                  >
                                    <Pencil size={12} /> Edit
                                  </button>
                                  <button
                                    onClick={() => { setDeletingRobotId(robot.id); setEditingRobotId(null); setMenuRobotId(null) }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-error hover:bg-red-500/10 cursor-pointer border-0 bg-transparent text-left transition-colors"
                                  >
                                    <Trash2 size={12} /> Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* subtitle: alias · location */}
                          <p className="text-xs text-muted mb-3 pl-[22px]">
                            {[robot.alias, subLocation.name].filter(Boolean).join(' · ')}
                          </p>

                          {/* ── Body: check list + right visual ──── */}
                          <div className="flex items-center gap-3">
                            <ul className="flex-1 min-w-0 flex flex-col gap-1.5">
                              {[
                                robot.serial_id       && `Serial: ${robot.serial_id}`,
                                robot.firmware_version && `Firmware: ${robot.firmware_version}`,
                                robot.map_name         && `Map: ${robot.map_name}`,
                              ].filter(Boolean).map(text => (
                                <li key={text as string} className="flex items-center gap-2 text-xs text-body-text">
                                  {isCorrect
                                    ? <Check size={12} className="shrink-0 text-green-500" />
                                    : <X     size={12} className="shrink-0 text-red-400" />
                                  }
                                  <span className="truncate">{text}</span>
                                </li>
                              ))}
                            </ul>

                          </div>

                          {/* ── Footer ─────────────────────────────── */}
                          <div className="mt-3 pt-3 border-t border-soft-lavender/10 flex items-center justify-between gap-2">
                            <span className="text-xs text-muted">
                              {robot.commissioned_at
                                ? `Commissioned ${new Date(robot.commissioned_at).toLocaleDateString()}`
                                : robot.floor_level != null ? `Floor ${robot.floor_level}` : 'Not commissioned'}
                            </span>
                            <button
                              onClick={() => { const u = { ...robotCorrect, [robot.id]: !isCorrect }; setRobotCorrect(u); onAutoSave?.({ ...getCurrentData(), robot_correct: u }) }}
                              className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer transition-all ${isCorrect ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                            >
                              {isCorrect ? 'Correct' : 'Flag'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      <FormField label="Amendments or corrections required" type="textarea" rows={3} placeholder="List any records that need updating before go-live" value={fields.amendments_required} onChange={v => setField('amendments_required', v)} sectionId="fleet" fieldKey="amendments_required" industry={industry} />

      <CheckpointList checkpoints={resolvedCheckpoints} checked={checked} onChange={(id, value) => { const u = { ...checked, [id]: value }; setChecked(u); onAutoSave?.({ ...getCurrentData(), checkpoints: u }) }} />

      <SaveButtons onSaveDraft={() => onSave(getCurrentData(), false)} onComplete={() => onSave(getCurrentData(), true)} isSaving={isSaving ?? false} isComplete={isComplete ?? false} />
    </div>
  )
}
