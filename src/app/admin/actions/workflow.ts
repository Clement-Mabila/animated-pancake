'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { z } from 'zod'
import type {
  WorkflowTemplate,
  WorkflowSection,
  WorkflowQuestion,
  WorkflowDeployTask,
  ConfigPhase,
} from '@/types'

const REVALIDATE = () => revalidatePath('/admin/workflow')

const DEFAULT_TEMPLATE_ID = '11111111-1111-1111-1111-111111111111'

// ── Template metadata ─────────────────────────────────────────

const templateMetaSchema = z.object({
  name:               z.string().min(1, 'Name is required').max(128),
  department:         z.string().max(64).optional().nullable(),
  description:        z.string().max(512).optional().nullable(),
  version:            z.string().max(32).optional().nullable(),
  color:              z.string().max(16).optional().nullable(),
  location_id:        z.string().uuid().optional().nullable(),
  contact_role:       z.string().optional().nullable(),
  sub_location_group: z.array(z.string().uuid()).optional().nullable(),
  starting_phase:     z.enum(['early', 'pre_deploy', 'deploy', 'post']).optional().nullable(),
})

type TemplateMeta = z.infer<typeof templateMetaSchema>

async function cloneTemplateContent(db: ReturnType<typeof createAdminClient>, sourceId: string, destId: string) {
  const [sectionsRes, questionsRes, tasksRes] = await Promise.all([
    db.from('workflow_sections').select('*').eq('template_id', sourceId).eq('is_deleted', false),
    db.from('workflow_questions').select('*').eq('template_id', sourceId).eq('is_deleted', false),
    db.from('workflow_deploy_tasks').select('*').eq('template_id', sourceId),
  ])

  if (sectionsRes.data?.length) {
    await db.from('workflow_sections').insert(
      sectionsRes.data.map(({ id: _id, template_id: _t, ...rest }) => ({ ...rest, template_id: destId }))
    )
  }
  if (questionsRes.data?.length) {
    await db.from('workflow_questions').insert(
      questionsRes.data.map(({ id: _id, template_id: _t, ...rest }) => ({ ...rest, template_id: destId }))
    )
  }
  if (tasksRes.data?.length) {
    await db.from('workflow_deploy_tasks').insert(
      tasksRes.data.map(({ id: _id, template_id: _t, ...rest }) => ({ ...rest, template_id: destId }))
    )
  }
}

// ── Templates ────────────────────────────────────────────────

export async function createDraftTemplateAction(raw: unknown): Promise<
  { ok: true; draft: WorkflowTemplate } | { ok: false; error: string }
> {
  await requireAdminSession()
  const parsed = templateMetaSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' }
  const { name, department, description, version, color, location_id, contact_role, sub_location_group, starting_phase } = parsed.data

  const db = createAdminClient()

  const { data: draft, error: tErr } = await db
    .from('workflow_templates')
    .insert({ name, description: description ?? null, department: department ?? null, version: version ?? null, color: color ?? null, is_active: false, is_draft: true, location_id: location_id ?? null, contact_role: contact_role ?? null, sub_location_group: sub_location_group ?? null, starting_phase: starting_phase ?? null })
    .select()
    .single()
  if (tErr || !draft) return { ok: false, error: tErr?.message ?? 'Failed to create template' }

  // Seed from the fixed default template; fallback to any active template
  const { data: source } = await db
    .from('workflow_templates')
    .select('id')
    .eq('id', DEFAULT_TEMPLATE_ID)
    .maybeSingle()

  const sourceId = source?.id ?? (
    await db.from('workflow_templates').select('id').eq('is_active', true).maybeSingle()
  ).data?.id

  if (sourceId && sourceId !== draft.id) {
    await cloneTemplateContent(db, sourceId, draft.id)
  }

  REVALIDATE()
  return { ok: true, draft: draft as WorkflowTemplate }
}

export async function setActiveTemplateAction(templateId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await requireAdminSession()
  const db = createAdminClient()

  // Default template keeps its Primary status; all others return to Draft
  const { data: currentActive } = await db
    .from('workflow_templates')
    .select('id, is_default')
    .eq('is_active', true)
    .maybeSingle()

  if (currentActive) {
    const prevState = currentActive.is_default
      ? { is_active: false, is_draft: false, is_archived: false, updated_at: new Date().toISOString() }
      : { is_active: false, is_draft: true,  is_archived: false, updated_at: new Date().toISOString() }
    await db.from('workflow_templates').update(prevState).eq('id', currentActive.id)
  }

  const { error } = await db
    .from('workflow_templates')
    .update({ is_active: true, is_draft: false, is_archived: false, last_published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', templateId)

  if (error) return { ok: false, error: error.message }
  REVALIDATE()
  return { ok: true }
}

export async function archiveTemplateAction(templateId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await requireAdminSession()
  const db = createAdminClient()

  const { data: tmpl } = await db
    .from('workflow_templates')
    .select('is_active')
    .eq('id', templateId)
    .maybeSingle()

  if (tmpl?.is_active) return { ok: false, error: 'Cannot archive the active template' }

  const { error } = await db
    .from('workflow_templates')
    .update({ is_archived: true, is_draft: false, updated_at: new Date().toISOString() })
    .eq('id', templateId)

  if (error) return { ok: false, error: error.message }
  REVALIDATE()
  return { ok: true }
}

export async function unarchiveTemplateAction(templateId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await requireAdminSession()
  const db = createAdminClient()

  const { error } = await db
    .from('workflow_templates')
    .update({ is_archived: false, is_draft: true, updated_at: new Date().toISOString() })
    .eq('id', templateId)

  if (error) return { ok: false, error: error.message }
  REVALIDATE()
  return { ok: true }
}

export async function deleteTemplateAction(templateId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await requireAdminSession()
  const db = createAdminClient()

  const { data: tmpl } = await db
    .from('workflow_templates')
    .select('is_active')
    .eq('id', templateId)
    .maybeSingle()

  if (tmpl?.is_active) return { ok: false, error: 'Cannot delete the active template' }

  const { error } = await db.from('workflow_templates').delete().eq('id', templateId)
  if (error) return { ok: false, error: error.message }
  REVALIDATE()
  return { ok: true }
}

export async function duplicateTemplateAction(sourceId: string, raw: unknown): Promise<
  { ok: true; draft: WorkflowTemplate } | { ok: false; error: string }
> {
  await requireAdminSession()
  const parsed = templateMetaSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' }
  const { name, department, description, version, color, location_id, contact_role, sub_location_group, starting_phase } = parsed.data

  const db = createAdminClient()

  const { data: draft, error: tErr } = await db
    .from('workflow_templates')
    .insert({ name, description: description ?? null, department: department ?? null, version: version ?? null, color: color ?? null, is_active: false, is_draft: true, location_id: location_id ?? null, contact_role: contact_role ?? null, sub_location_group: sub_location_group ?? null, starting_phase: starting_phase ?? null })
    .select()
    .single()
  if (tErr || !draft) return { ok: false, error: tErr?.message ?? 'Failed to duplicate template' }

  await cloneTemplateContent(db, sourceId, draft.id)

  REVALIDATE()
  return { ok: true, draft: draft as WorkflowTemplate }
}

export async function updateTemplateMetadataAction(templateId: string, raw: unknown): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await requireAdminSession()
  const parsed = templateMetaSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' }
  const { name, department, description, version, color, location_id, contact_role, sub_location_group, starting_phase } = parsed.data

  const db = createAdminClient()
  const { error } = await db
    .from('workflow_templates')
    .update({ name, description: description ?? null, department: department ?? null, version: version ?? null, color: color ?? null, location_id: location_id ?? null, contact_role: contact_role ?? null, sub_location_group: sub_location_group ?? null, starting_phase: starting_phase ?? null, updated_at: new Date().toISOString() })
    .eq('id', templateId)

  if (error) return { ok: false, error: error.message }
  REVALIDATE()
  return { ok: true }
}

// ── Sections ─────────────────────────────────────────────────

const sectionSchema = z.object({
  id:               z.string().uuid().optional(),
  templateId:       z.string().uuid(),
  slug:             z.string().min(1).max(64).regex(/^[a-z0-9_]+$/),
  title:            z.string().min(1).max(128),
  subtitle:         z.string().max(256).optional().nullable(),
  description:      z.string().max(1000).optional().nullable(),
  checkpointCount:  z.number().int().min(0).max(99),
  active:           z.boolean(),
})

export async function upsertWorkflowSectionAction(raw: unknown): Promise<
  { ok: true; section: WorkflowSection } | { ok: false; error: string }
> {
  await requireAdminSession()
  const parsed = sectionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' }
  const { id, templateId, slug, title, subtitle, description, checkpointCount, active } = parsed.data

  const db = createAdminClient()

  if (id) {
    const { data, error } = await db
      .from('workflow_sections')
      .update({ title, subtitle: subtitle ?? null, description: description ?? null, checkpoint_count: checkpointCount, active })
      .eq('id', id)
      .select()
      .single()
    if (error) return { ok: false, error: error.message }
    REVALIDATE()
    return { ok: true, section: data as WorkflowSection }
  }

  const { data: last } = await db
    .from('workflow_sections')
    .select('sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = (last?.sort_order ?? 0) + 1

  const { data, error } = await db
    .from('workflow_sections')
    .insert({ template_id: templateId, slug, title, subtitle: subtitle ?? null, description: description ?? null, checkpoint_count: checkpointCount, active, sort_order: sortOrder })
    .select()
    .single()
  if (error) return { ok: false, error: error.message }

  await db.from('workflow_questions').insert({
    template_id: templateId,
    section_slug: slug,
    field_key: '__all__',
    label: null,
    field_type: 'text',
    visible_in_phases: ['pre_deploy', 'post'],
    is_partial: false,
    sort_order: 0,
    active: true,
  })

  REVALIDATE()
  return { ok: true, section: data as WorkflowSection }
}

export async function deleteWorkflowSectionAction(id: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await requireAdminSession()
  const db = createAdminClient()

  const { data: section } = await db
    .from('workflow_sections')
    .select('template_id, slug')
    .eq('id', id)
    .maybeSingle()
  if (!section) return { ok: false, error: 'Section not found' }

  const now = new Date().toISOString()
  const { error } = await db
    .from('workflow_sections')
    .update({ is_deleted: true, deleted_at: now })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  await db
    .from('workflow_questions')
    .update({ is_deleted: true, deleted_at: now })
    .eq('template_id', section.template_id)
    .eq('section_slug', section.slug)
    .eq('is_deleted', false)

  REVALIDATE()
  return { ok: true }
}

export async function reorderWorkflowSectionsAction(
  updates: { id: string; sortOrder: number }[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()
  for (const { id, sortOrder } of updates) {
    const { error } = await db
      .from('workflow_sections')
      .update({ sort_order: sortOrder })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  }
  REVALIDATE()
  return { ok: true }
}

// ── Questions ────────────────────────────────────────────────

const questionOptionSchema = z.object({
  value: z.string().min(1).max(128),
  label: z.string().min(1).max(256),
  hint:  z.string().max(128).optional().nullable(),
})

const questionSchema = z.object({
  id:                    z.string().uuid().optional(),
  templateId:            z.string().uuid(),
  sectionSlug:           z.string().min(1),
  fieldKey:              z.string().min(1).max(64).regex(/^[a-z0-9_]+$/),
  label:                 z.string().max(256).optional().nullable(),
  placeholder:           z.string().max(512).optional().nullable(),
  fieldType:             z.enum(['text', 'textarea', 'select', 'multiselect', 'boolean', 'number', 'checkpoint']),
  visibleInPhases:       z.array(z.enum(['early', 'pre_deploy', 'deploy', 'post'])).min(1),
  options:               z.array(questionOptionSchema).optional().nullable(),
  isPartial:             z.boolean(),
  instructionPreDeploy:  z.string().max(512).optional().nullable(),
  instructionPostDeploy: z.string().max(512).optional().nullable(),
  dummyValue:            z.string().max(256).optional().nullable(),
  dummyTooltip:          z.string().max(256).optional().nullable(),
  active:                z.boolean(),
})

export async function upsertWorkflowQuestionAction(raw: unknown): Promise<
  { ok: true; question: WorkflowQuestion } | { ok: false; error: string }
> {
  await requireAdminSession()
  const parsed = questionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' }
  const {
    id, templateId, sectionSlug, fieldKey, label, placeholder, fieldType,
    visibleInPhases, options, isPartial, instructionPreDeploy, instructionPostDeploy,
    dummyValue, dummyTooltip, active,
  } = parsed.data

  const db = createAdminClient()

  const payload = {
    section_slug:             sectionSlug,
    label:                    label ?? null,
    placeholder:              placeholder ?? null,
    field_type:               fieldType,
    visible_in_phases:        visibleInPhases as ConfigPhase[],
    options:                  options ?? null,
    is_partial:               isPartial,
    instruction_pre_deploy:   instructionPreDeploy ?? null,
    instruction_post_deploy:  instructionPostDeploy ?? null,
    dummy_value:              dummyValue ?? null,
    dummy_tooltip:            dummyTooltip ?? null,
    active,
  }

  if (id) {
    const { data, error } = await db
      .from('workflow_questions')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) return { ok: false, error: error.message }
    REVALIDATE()
    return { ok: true, question: data as WorkflowQuestion }
  }

  const { data: last } = await db
    .from('workflow_questions')
    .select('sort_order')
    .eq('template_id', templateId)
    .eq('section_slug', sectionSlug)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await db
    .from('workflow_questions')
    .insert({ template_id: templateId, field_key: fieldKey, sort_order: (last?.sort_order ?? 0) + 1, ...payload })
    .select()
    .single()
  if (error) return { ok: false, error: error.message }
  REVALIDATE()
  return { ok: true, question: data as WorkflowQuestion }
}

export async function deleteWorkflowQuestionAction(id: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await requireAdminSession()
  const db = createAdminClient()
  const { error } = await db
    .from('workflow_questions')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  REVALIDATE()
  return { ok: true }
}

export async function reorderWorkflowQuestionsAction(
  updates: { id: string; sortOrder: number }[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()
  for (const { id, sortOrder } of updates) {
    const { error } = await db
      .from('workflow_questions')
      .update({ sort_order: sortOrder })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  }
  REVALIDATE()
  return { ok: true }
}

// ── Deploy tasks ─────────────────────────────────────────────

const deployTaskSchema = z.object({
  id:          z.string().uuid().optional(),
  templateId:  z.string().uuid(),
  taskKey:     z.string().min(1).max(64).regex(/^[a-z0-9_]+$/),
  title:       z.string().min(1).max(128),
  description: z.string().max(512).optional().nullable(),
})

export async function upsertDeployTaskAction(raw: unknown): Promise<
  { ok: true; task: WorkflowDeployTask } | { ok: false; error: string }
> {
  await requireAdminSession()
  const parsed = deployTaskSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' }
  const { id, templateId, taskKey, title, description } = parsed.data
  const db = createAdminClient()

  if (id) {
    const { data, error } = await db
      .from('workflow_deploy_tasks')
      .update({ title, description: description ?? null })
      .eq('id', id)
      .select()
      .single()
    if (error) return { ok: false, error: error.message }
    REVALIDATE()
    return { ok: true, task: data as WorkflowDeployTask }
  }

  const { data: last } = await db
    .from('workflow_deploy_tasks')
    .select('sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await db
    .from('workflow_deploy_tasks')
    .insert({ template_id: templateId, task_key: taskKey, title, description: description ?? null, sort_order: (last?.sort_order ?? 0) + 1 })
    .select()
    .single()
  if (error) return { ok: false, error: error.message }
  REVALIDATE()
  return { ok: true, task: data as WorkflowDeployTask }
}

export async function deleteDeployTaskAction(id: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await requireAdminSession()
  const db = createAdminClient()
  const { error } = await db.from('workflow_deploy_tasks').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  REVALIDATE()
  return { ok: true }
}

export async function reorderDeployTasksAction(
  updates: { id: string; sortOrder: number }[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()
  for (const { id, sortOrder } of updates) {
    const { error } = await db
      .from('workflow_deploy_tasks')
      .update({ sort_order: sortOrder })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  }
  REVALIDATE()
  return { ok: true }
}

// ── Restore / undo helpers ────────────────────────────────────

export async function restoreWorkflowSectionAction(
  section: WorkflowSection,
  _questions: WorkflowQuestion[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()

  const { error: sErr } = await db
    .from('workflow_sections')
    .update({ is_deleted: false, deleted_at: null })
    .eq('id', section.id)
  if (sErr) return { ok: false, error: sErr.message }

  const { error: qErr } = await db
    .from('workflow_questions')
    .update({ is_deleted: false, deleted_at: null })
    .eq('template_id', section.template_id)
    .eq('section_slug', section.slug)
    .eq('is_deleted', true)
  if (qErr) return { ok: false, error: qErr.message }

  REVALIDATE()
  return { ok: true }
}

export async function restoreWorkflowQuestionAction(
  question: WorkflowQuestion,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()

  const { error } = await db
    .from('workflow_questions')
    .update({ is_deleted: false, deleted_at: null })
    .eq('id', question.id)
  if (error) return { ok: false, error: error.message }

  REVALIDATE()
  return { ok: true }
}

export async function restoreDeployTaskAction(
  task: WorkflowDeployTask,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()

  const { error } = await db.from('workflow_deploy_tasks').insert({
    id: task.id, template_id: task.template_id, task_key: task.task_key,
    title: task.title, description: task.description, sort_order: task.sort_order,
  })
  if (error) return { ok: false, error: error.message }

  REVALIDATE()
  return { ok: true }
}

export async function restoreTemplateToDefaultAction(templateId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  await requireAdminSession()
  const db = createAdminClient()

  const { data: tmpl } = await db
    .from('workflow_templates')
    .select('is_active')
    .eq('id', templateId)
    .maybeSingle()
  if (tmpl?.is_active) return { ok: false, error: 'Cannot restore the active template — duplicate it first' }

  const { data: defaultTmpl } = await db
    .from('workflow_templates')
    .select('id')
    .eq('is_default', true)
    .maybeSingle()
  if (!defaultTmpl) return { ok: false, error: 'No default template found in the database.' }
  if (defaultTmpl.id === templateId) return { ok: false, error: 'This template is already the default.' }

  await Promise.all([
    db.from('workflow_sections').delete().eq('template_id', templateId),
    db.from('workflow_questions').delete().eq('template_id', templateId),
    db.from('workflow_deploy_tasks').delete().eq('template_id', templateId),
  ])

  await cloneTemplateContent(db, defaultTmpl.id, templateId)

  REVALIDATE()
  return { ok: true }
}

// ── Import from primary template ─────────────────────────────────

export async function importSectionFromPrimaryAction(
  primarySectionId: string,
  targetTemplateId: string,
): Promise<{ ok: true; section: WorkflowSection; questions: WorkflowQuestion[] } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()

  const { data: src, error: sErr } = await db
    .from('workflow_sections')
    .select('*')
    .eq('id', primarySectionId)
    .single()
  if (sErr || !src) return { ok: false, error: sErr?.message ?? 'Section not found' }

  const { data: existing } = await db
    .from('workflow_sections')
    .select('id')
    .eq('template_id', targetTemplateId)
    .eq('slug', src.slug)
    .eq('is_deleted', false)
    .maybeSingle()
  if (existing) return { ok: false, error: `Section "${src.slug}" already exists in this template` }

  const { data: last } = await db
    .from('workflow_sections')
    .select('sort_order')
    .eq('template_id', targetTemplateId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { id: _id, template_id: _t, ...sectionRest } = src
  const { data: newSection, error: insErr } = await db
    .from('workflow_sections')
    .insert({ ...sectionRest, template_id: targetTemplateId, sort_order: (last?.sort_order ?? 0) + 1, is_deleted: false, deleted_at: null })
    .select()
    .single()
  if (insErr || !newSection) return { ok: false, error: insErr?.message ?? 'Failed to insert section' }

  const { data: srcQs } = await db
    .from('workflow_questions')
    .select('*')
    .eq('template_id', src.template_id)
    .eq('section_slug', src.slug)
    .eq('is_deleted', false)

  let newQuestions: WorkflowQuestion[] = []
  if (srcQs?.length) {
    const { data: insertedQs, error: qErr } = await db
      .from('workflow_questions')
      .insert(srcQs.map(({ id: _qid, template_id: _qt, ...qrest }) => ({ ...qrest, template_id: targetTemplateId, is_deleted: false, deleted_at: null })))
      .select()
    if (qErr) return { ok: false, error: qErr.message }
    newQuestions = (insertedQs ?? []) as WorkflowQuestion[]
  }

  REVALIDATE()
  return { ok: true, section: newSection as WorkflowSection, questions: newQuestions }
}

export async function importQuestionFromPrimaryAction(
  primaryQuestionId: string,
  targetTemplateId: string,
): Promise<{ ok: true; question: WorkflowQuestion } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()

  const { data: src, error: sErr } = await db
    .from('workflow_questions')
    .select('*')
    .eq('id', primaryQuestionId)
    .single()
  if (sErr || !src) return { ok: false, error: sErr?.message ?? 'Question not found' }

  const { data: existing } = await db
    .from('workflow_questions')
    .select('id')
    .eq('template_id', targetTemplateId)
    .eq('section_slug', src.section_slug)
    .eq('field_key', src.field_key)
    .eq('is_deleted', false)
    .maybeSingle()
  if (existing) return { ok: false, error: `Field "${src.field_key}" already exists in this section` }

  const { data: last } = await db
    .from('workflow_questions')
    .select('sort_order')
    .eq('template_id', targetTemplateId)
    .eq('section_slug', src.section_slug)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { id: _id, template_id: _t, ...qRest } = src
  const { data: newQ, error: insErr } = await db
    .from('workflow_questions')
    .insert({ ...qRest, template_id: targetTemplateId, sort_order: (last?.sort_order ?? 0) + 1, is_deleted: false, deleted_at: null })
    .select()
    .single()
  if (insErr || !newQ) return { ok: false, error: insErr?.message ?? 'Failed to insert question' }

  REVALIDATE()
  return { ok: true, question: newQ as WorkflowQuestion }
}

// ── Bulk create from preset ──────────────────────────────────────

export async function bulkCreateTemplateFromPreset(
  meta: {
    name:               string
    department?:        string | null
    description?:       string | null
    color?:             string | null
    location_id?:       string | null
    contact_role?:      string | null
    sub_location_group?: string[] | null
    starting_phase?:    string | null
  },
  sections: Array<{
    slug:            string
    title:           string
    subtitle:        string | null
    description:     string | null
    checkpointCount: number
    visibleInPhases: ConfigPhase[]
  }>,
  deployTasks: Array<{ taskKey: string; title: string; description: string | null }>,
): Promise<{ ok: true; templateId: string } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()

  const { data: draft, error: tErr } = await db
    .from('workflow_templates')
    .insert({
      name:               meta.name.trim(),
      description:        meta.description        ?? null,
      department:         meta.department         ?? null,
      color:              meta.color              ?? null,
      is_active:          false,
      is_draft:           true,
      location_id:        meta.location_id        ?? null,
      contact_role:       meta.contact_role       ?? null,
      sub_location_group: meta.sub_location_group ?? null,
      starting_phase:     meta.starting_phase     ?? null,
    })
    .select('id')
    .single()

  if (tErr || !draft) return { ok: false, error: tErr?.message ?? 'Failed to create template' }

  const templateId = draft.id

  if (sections.length > 0) {
    const { error: sErr } = await db.from('workflow_sections').insert(
      sections.map((s, i) => ({
        template_id:      templateId,
        slug:             s.slug,
        title:            s.title,
        subtitle:         s.subtitle,
        description:      s.description,
        checkpoint_count: s.checkpointCount,
        active:           true,
        sort_order:       i + 1,
      }))
    )
    if (sErr) return { ok: false, error: sErr.message }

    const { error: qErr } = await db.from('workflow_questions').insert(
      sections.map(s => ({
        template_id:       templateId,
        section_slug:      s.slug,
        field_key:         '__all__',
        label:             null,
        field_type:        'text',
        visible_in_phases: s.visibleInPhases,
        is_partial:        false,
        sort_order:        0,
        active:            true,
      }))
    )
    if (qErr) return { ok: false, error: qErr.message }

    // Clone real questions from the canonical default template (is_default = true).
    // Fall back to the hardcoded seed UUID if no default is flagged.
    const { data: defaultTmpl } = await db
      .from('workflow_templates')
      .select('id')
      .eq('is_default', true)
      .maybeSingle()
    const sourceTemplateId = defaultTmpl?.id ?? DEFAULT_TEMPLATE_ID

    const { data: sourceQs, error: sqErr } = await db
      .from('workflow_questions')
      .select('*')
      .eq('template_id', sourceTemplateId)
      .in('section_slug', sections.map(s => s.slug))
      .neq('field_key', '__all__')
      .eq('is_deleted', false)

    if (sqErr) console.error('[bulkCreateTemplateFromPreset] question fetch error:', sqErr.message)

    if (sourceQs?.length) {
      const { error: iqErr } = await db.from('workflow_questions').insert(
        sourceQs.map(({ id: _id, template_id: _t, ...rest }) => ({ ...rest, template_id: templateId }))
      )
      if (iqErr) console.error('[bulkCreateTemplateFromPreset] question insert error:', iqErr.message)
    }
  }

  if (deployTasks.length > 0) {
    const { error: dErr } = await db.from('workflow_deploy_tasks').insert(
      deployTasks.map((t, i) => ({
        template_id: templateId,
        task_key:    t.taskKey,
        title:       t.title,
        description: t.description,
        sort_order:  i + 1,
      }))
    )
    if (dErr) return { ok: false, error: dErr.message }
  }

  REVALIDATE()
  return { ok: true, templateId }
}

// ── Onboarding quick-start ─────────────────────────────────────

export async function startOnboardingForTemplateAction(
  templateId: string,
  contact: { fullName: string; email: string; subLocationId?: string },
  phase: ConfigPhase,
): Promise<{ ok: true; configId: string; existed: boolean } | { ok: false; error: string }> {
  await requireAdminSession()
  const db = createAdminClient()

  const { data: tmpl } = await db
    .from('workflow_templates')
    .select('id, location_id, contact_role')
    .eq('id', templateId)
    .maybeSingle()

  if (!tmpl?.location_id) return { ok: false, error: 'Template has no location binding' }

  const magicToken = crypto.randomUUID()
  const expiresAt  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: cc, error: ccErr } = await db
    .from('client_contacts')
    .upsert(
      {
        location_id:      tmpl.location_id,
        sub_location_id:  contact.subLocationId ?? null,
        full_name:        contact.fullName.trim(),
        email:            contact.email.toLowerCase().trim(),
        role_label:       tmpl.contact_role ?? 'other',
        magic_token:      magicToken,
        token_expires_at: expiresAt,
      },
      { onConflict: 'email,location_id' }
    )
    .select('id')
    .single()

  if (ccErr || !cc) return { ok: false, error: ccErr?.message ?? 'Failed to create contact' }

  const { data: existing } = await db
    .from('configurations')
    .select('id')
    .eq('client_contact_id', cc.id)
    .maybeSingle()

  if (existing) return { ok: true, configId: existing.id, existed: true }

  const { data: cfg, error: cfgErr } = await db
    .from('configurations')
    .insert({
      scope:                'location',
      status:               'draft',
      phase,
      location_id:          tmpl.location_id,
      sub_location_id:      contact.subLocationId ?? null,
      client_contact_id:    cc.id,
      workflow_template_id: templateId,
      last_edited_by:       contact.email.toLowerCase().trim(),
      last_edited_at:       new Date().toISOString(),
    })
    .select('id')
    .single()

  if (cfgErr || !cfg) return { ok: false, error: cfgErr?.message ?? 'Failed to create configuration' }

  REVALIDATE()
  return { ok: true, configId: cfg.id, existed: false }
}

// ── Custom presets ────────────────────────────────────────────────

export interface CustomPresetRow {
  id:            string
  name:          string
  description:   string | null
  sectionSlugs:  string[]
  createdAt:     string
}

export async function getCustomPresetsAction(): Promise<
  { ok: true; presets: CustomPresetRow[] } | { ok: false; error: string }
> {
  const { user } = await requireAdminSession()
  const db = createAdminClient()

  const { data, error } = await db
    .from('workflow_custom_presets')
    .select('id, name, description, section_slugs, created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: true })

  if (error) return { ok: false, error: error.message }

  return {
    ok: true,
    presets: (data ?? []).map(r => ({
      id:           r.id,
      name:         r.name,
      description:  r.description,
      sectionSlugs: r.section_slugs,
      createdAt:    r.created_at,
    })),
  }
}

export async function saveCustomPresetAction(
  name: string,
  description: string | null,
  sectionSlugs: string[],
): Promise<{ ok: true; preset: CustomPresetRow } | { ok: false; error: string }> {
  const { user } = await requireAdminSession()
  if (!name.trim())              return { ok: false, error: 'Name is required' }
  if (sectionSlugs.length === 0) return { ok: false, error: 'Select at least one section' }

  const db = createAdminClient()
  const { data, error } = await db
    .from('workflow_custom_presets')
    .insert({ created_by: user.id, name: name.trim(), description, section_slugs: sectionSlugs })
    .select('id, name, description, section_slugs, created_at')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to save preset' }

  return {
    ok: true,
    preset: {
      id:           data.id,
      name:         data.name,
      description:  data.description,
      sectionSlugs: data.section_slugs,
      createdAt:    data.created_at,
    },
  }
}

export async function deleteCustomPresetAction(id: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const { user } = await requireAdminSession()
  const db = createAdminClient()

  const { error } = await db
    .from('workflow_custom_presets')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
