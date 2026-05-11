import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PHASE_SECTIONS } from '@/lib/phases'
import type { ConfigPhase, SectionId } from '@/types'

// Dynamic sections that use WorkflowQuestion-based rendering — the only ones
// where dummy_value substitution is applicable.
const DYNAMIC_SECTION_SLUGS = new Set(['roi', 'kpis', 'roles', 'fsm', 'insight', 'timezone'])

export interface QuestionDefault {
  section_slug: string
  field_key:    string
  field_type:   string
  dummy_value:  string
}

export async function fetchQuestionDefaultsForExport(
  admin: SupabaseClient,
  templateId: string,
): Promise<QuestionDefault[]> {
  const { data, error } = await admin
    .from('workflow_questions')
    .select('section_slug, field_key, field_type, dummy_value')
    .eq('template_id', templateId)
    .not('dummy_value', 'is', null)
    .eq('is_partial', false)
  if (error) throw error
  return (data ?? []) as QuestionDefault[]
}

export function applyQuestionDefaults(
  sectionData: Record<string, unknown>,
  sectionSlug:  string,
  defaults:     QuestionDefault[],
): Record<string, unknown> {
  if (!DYNAMIC_SECTION_SLUGS.has(sectionSlug)) return sectionData

  const applicable = defaults.filter(d => d.section_slug === sectionSlug)
  if (applicable.length === 0) return sectionData

  const result = { ...sectionData }
  for (const d of applicable) {
    // Only substitute plain text/textarea fields — select/multiselect/boolean
    // store structured values that don't map to a raw string default.
    if (d.field_type !== 'text' && d.field_type !== 'textarea') continue
    const existing = result[d.field_key]
    if (existing === null || existing === undefined || existing === '') {
      result[d.field_key] = d.dummy_value
    }
  }
  return result
}

export interface ExportCompletenessRow {
  id: string
  phase: ConfigPhase
  missingSections: SectionId[]
  allComplete: boolean
}

export async function evaluateExportCompleteness(
  admin: SupabaseClient,
  configurationIds: string[]
): Promise<{ rows: ExportCompletenessRow[]; allComplete: boolean }> {
  if (configurationIds.length === 0) {
    return { rows: [], allComplete: true }
  }

  const { data: configs, error: cErr } = await admin
    .from('configurations')
    .select('id, phase')
    .in('id', configurationIds)
  if (cErr || !configs) throw cErr ?? new Error('Failed to load configurations')

  const { data: sections, error: sErr } = await admin
    .from('config_sections')
    .select('configuration_id, section_id, is_complete')
    .in('configuration_id', configurationIds)
  if (sErr) throw sErr

  const byConfig: Record<string, Record<string, boolean>> = {}
  for (const sid of configurationIds) {
    byConfig[sid] = {}
  }
  for (const row of sections ?? []) {
    const cid = row.configuration_id as string
    const sec = row.section_id as string
    byConfig[cid] ??= {}
    byConfig[cid][sec] = row.is_complete === true
  }

  const rows: ExportCompletenessRow[] = configs.map(c => {
    const phase = c.phase as ConfigPhase
    const need = PHASE_SECTIONS[phase] as SectionId[]
    const done = byConfig[c.id] ?? {}
    const missing = need.filter(id => !done[id])
    return {
      id: c.id,
      phase,
      missingSections: missing,
      allComplete: missing.length === 0,
    }
  })

  return {
    rows,
    allComplete: rows.every(r => r.allComplete),
  }
}

export async function fetchConfigurationsForExport(admin: SupabaseClient, ids: string[] | 'all') {
  let q = admin.from('configurations').select(`
    *,
    staff_user:staff_users(*),
    client_contact:client_contacts(*),
    location:locations(*),
    sub_location:sub_locations(*)
  `)
  if (ids !== 'all') {
    q = q.in('id', ids)
  }
  const { data, error } = await q.order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchSectionsForExport(admin: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return []
  const { data, error } = await admin
    .from('config_sections')
    .select('*')
    .in('configuration_id', ids)
    .order('section_id')
  if (error) throw error
  return data ?? []
}

export function sha256Json(payload: unknown): { hash: string; bytes: number } {
  const json = JSON.stringify(payload)
  const buf = Buffer.from(json, 'utf8')
  return {
    hash: createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length,
  }
}
