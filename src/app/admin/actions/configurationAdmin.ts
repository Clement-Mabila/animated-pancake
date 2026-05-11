'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import {
  upsertConfigSectionAction,
  updateConfigurationLastEditedAction,
} from '@/app/actions/session'
import { recordAuditAction } from '@/app/admin/actions/audit'
import type { SectionId } from '@/types'
import { z } from 'zod'

const saveSchema = z.object({
  configurationId: z.string().uuid(),
  sectionId: z.enum([
    'roi',
    'kpis',
    'fleet',
    'contacts',
    'roles',
    'alerts',
    'integrations',
    'fsm',
    'insight',
    'timezone',
    'docs',
  ]),
  data: z.record(z.string(), z.any()),
  isComplete: z.boolean(),
})

export async function adminSaveSectionAction(raw: unknown) {
  const parsed = saveSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid payload' }
  }
  const { adminUser } = await requireAdminSession()
  const { configurationId, sectionId, data, isComplete } = parsed.data

  const admin = createAdminClient()
  const { data: prev } = await admin
    .from('config_sections')
    .select('*')
    .eq('configuration_id', configurationId)
    .eq('section_id', sectionId)
    .maybeSingle()

  const editorLabel = `admin:${adminUser.email}`

  await upsertConfigSectionAction(configurationId, sectionId as SectionId, data, isComplete, editorLabel)
  await updateConfigurationLastEditedAction(configurationId, editorLabel)

  const { data: next } = await admin
    .from('config_sections')
    .select('*')
    .eq('configuration_id', configurationId)
    .eq('section_id', sectionId)
    .maybeSingle()

  await recordAuditAction({
    adminUserId: adminUser.user_id,
    action: 'config_section_save',
    entityType: 'config_section',
    entityId: next?.id ?? configurationId,
    before: (prev ?? null) as unknown as Record<string, unknown> | null,
    after: (next ?? null) as unknown as Record<string, unknown> | null,
  })

  revalidatePath('/admin/configurations')
  revalidatePath(`/admin/configurations/${configurationId}`)
  revalidatePath(`/admin/configurations/${configurationId}/edit`)

  return { ok: true as const }
}
