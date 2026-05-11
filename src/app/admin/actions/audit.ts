'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { shallowDiff } from '@/lib/admin/diff'

export async function recordAuditAction(params: {
  adminUserId: string
  action: string
  entityType: string
  entityId: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}): Promise<void> {
  const admin = createAdminClient()
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  const diffObj = shallowDiff(params.before ?? null, params.after ?? null)
  const { error } = await admin.from('admin_audit_log').insert({
    admin_user_id: params.adminUserId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
    diff: diffObj as unknown as Record<string, unknown>,
    ip,
  })
  if (error) console.error('recordAuditAction', error)
}
