'use server'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Creates a single-use, 1-hour init token tied to the current admin session.
 * The token is passed to /onboarding?init_token=<id> to bypass the identity step.
 * Server validates and redeems the token — it cannot be replayed or forged.
 */
export async function initiateAdminOnboarding(): Promise<{ token: string }> {
  const { user, adminUser } = await requireAdminSession()

  const db = createAdminClient()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('onboarding_init_tokens')
    .insert({
      admin_user_id: user.id,
      admin_email:   adminUser.email,
      admin_name:    adminUser.full_name ?? null,
      expires_at:    expiresAt,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error('Failed to create onboarding session token')
  }

  return { token: data.id as string }
}
