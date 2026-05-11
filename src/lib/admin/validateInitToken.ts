import { createAdminClient } from '@/lib/supabase/admin'
import type { MBodyRole } from '@/types'

export interface PrefillIdentity {
  email: string
  name:  string | null
  role:  MBodyRole | null  // null when admin has no existing staff_user record
}

/**
 * Validates an onboarding init token and immediately redeems it (single-use).
 * Also looks up any existing staff_user record so the role field can be
 * pre-populated when the admin has used the onboarding form before.
 *
 * Returns null when the token is invalid, expired, or already redeemed.
 * Callers should treat null as "no bypass — show normal identity step".
 */
export async function validateAndRedeemInitToken(
  token: string
): Promise<PrefillIdentity | null> {
  if (!token) return null

  const db = createAdminClient()

  const { data, error } = await db
    .from('onboarding_init_tokens')
    .select('id, admin_email, admin_name, expires_at, redeemed_at')
    .eq('id', token)
    .maybeSingle()

  if (error || !data)                             return null
  if (data.redeemed_at !== null)                  return null  // already used
  if (new Date(data.expires_at) < new Date())     return null  // expired

  // Redeem immediately — no second use, no replay
  const { error: redeemError } = await db
    .from('onboarding_init_tokens')
    .update({ redeemed_at: new Date().toISOString() })
    .eq('id', token)

  if (redeemError) return null

  // Look up existing staff_user to carry forward the admin's MBody role
  const { data: staffUser } = await db
    .from('staff_users')
    .select('role')
    .eq('email', data.admin_email)
    .maybeSingle()

  return {
    email: data.admin_email,
    name:  data.admin_name ?? null,
    role:  (staffUser?.role as MBodyRole) ?? null,
  }
}
