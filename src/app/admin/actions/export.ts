'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import {
  evaluateExportCompleteness,
  fetchConfigurationsForExport,
  fetchSectionsForExport,
  fetchQuestionDefaultsForExport,
  applyQuestionDefaults,
  sha256Json,
} from '@/lib/admin/exportPayload'
import { recordAuditAction } from '@/app/admin/actions/audit'

const EXPORT_JSON_VERSION = 1

const idsListSchema = z.array(z.string().uuid()).min(1).max(500)
const idsListOptionalSchema = z.array(z.string().uuid()).max(500)

export async function evaluateExportCompletenessAction(configurationIds: string[]) {
  const parsed = idsListOptionalSchema.safeParse(configurationIds)
  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid configuration ids', allComplete: false, perConfig: [] }
  }
  await requireAdminSession()
  if (parsed.data.length === 0) {
    return { ok: true as const, allComplete: true, perConfig: [] }
  }
  const admin = createAdminClient()
  const { rows, allComplete } = await evaluateExportCompleteness(admin, parsed.data)
  return { ok: true as const, allComplete, perConfig: rows }
}

export async function exportConfigurationsAction(input: {
  scope: 'one' | 'many' | 'all'
  configurationIds: string[] | 'all'
  typedConfirm: string
  includedIncomplete: boolean
}): Promise<{ ok: true; filename: string; base64: string } | { ok: false; error: string }> {
  const { adminUser } = await requireAdminSession()
  const admin = createAdminClient()

  const configs =
    input.configurationIds === 'all'
      ? await fetchConfigurationsForExport(admin, 'all')
      : await fetchConfigurationsForExport(
          admin,
          idsListSchema.parse(input.configurationIds)
        )

  const allIds = configs.map(c => c.id as string)

  if (allIds.length === 0) {
    return { ok: false, error: 'Nothing to export.' }
  }

  const { allComplete, rows } = await evaluateExportCompleteness(admin, allIds)

  if (!allComplete) {
    if (input.typedConfirm !== 'EXPORT' || !input.includedIncomplete) {
      return { ok: false, error: 'Incomplete configurations require typing EXPORT and confirming.' }
    }
  }

  const sections = await fetchSectionsForExport(admin, allIds)
  const sectionsByConfig = new Map<string, typeof sections>()
  for (const s of sections) {
    const cid = s.configuration_id as string
    if (!sectionsByConfig.has(cid)) sectionsByConfig.set(cid, [])
    sectionsByConfig.get(cid)!.push(s)
  }

  // Fetch question defaults from the active template for export substitution
  const { data: activeTmpl } = await admin
    .from('workflow_templates')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()
  const questionDefaults = activeTmpl
    ? await fetchQuestionDefaultsForExport(admin, activeTmpl.id as string)
    : []

  const configurations = configs.map(row => {
    const { staff_user, client_contact, location, sub_location, ...rest } = row as Record<
      string,
      unknown
    >
    return {
      ...rest,
      location: location ?? null,
      sub_location: sub_location ?? null,
      client_contact: client_contact ?? null,
      staff_user: staff_user ?? null,
      sections: (sectionsByConfig.get(row.id as string) ?? []).map(sec => ({
        id: sec.id,
        configuration_id: sec.configuration_id,
        section_id: sec.section_id,
        data: applyQuestionDefaults(
          (sec.data as Record<string, unknown>) ?? {},
          sec.section_id as string,
          questionDefaults,
        ),
        is_complete: sec.is_complete,
        completed_by: sec.completed_by,
        saved_at: sec.saved_at,
      })),
    }
  })

  const now = new Date().toISOString()
  const payload = {
    export_metadata: {
      version: EXPORT_JSON_VERSION,
      exported_at: now,
      exported_by: { admin_user_id: adminUser.user_id, email: adminUser.email },
      scope: input.scope,
      included_incomplete: !allComplete,
    },
    configurations,
  }

  const { hash, bytes } = sha256Json(payload)

  const { data: lastVer } = await admin
    .from('export_versions')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (lastVer?.version ?? 0) + 1

  await admin.from('export_versions').insert({
    admin_user_id: adminUser.user_id,
    scope: input.scope,
    configuration_ids: allIds,
    version: nextVersion,
    payload_sha256: hash,
    payload_size_bytes: bytes,
    included_incomplete: !allComplete,
  })

  await recordAuditAction({
    adminUserId: adminUser.user_id,
    action: 'export_json',
    entityType: 'export',
    entityId: null,
    before: null,
    after: {
      scope: input.scope,
      count: allIds.length,
      version: nextVersion,
      sha256: hash,
      included_incomplete: !allComplete,
    },
  })

  const json = JSON.stringify(payload, null, 2)
  const filename = `mbody-export-${input.scope}-v${nextVersion}-${now.slice(0, 10)}.json`

  return {
    ok: true,
    filename,
    base64: Buffer.from(json, 'utf8').toString('base64'),
  }
}
