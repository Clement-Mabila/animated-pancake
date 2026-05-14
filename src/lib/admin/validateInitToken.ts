import { createAdminClient } from '@/lib/supabase/admin'
import type { MBodyRole } from '@/types'

const MBODY_ROLE_VALUES: readonly MBodyRole[] = [
  'sales',
  'account_manager',
  'operations',
  'engineering',
  'finance',
  'customer_success',
  'admin',
]

function coerceMBodyRole(value: unknown): MBodyRole | null {
  if (typeof value !== 'string') return null
  return (MBODY_ROLE_VALUES as readonly string[]).includes(value)
    ? (value as MBodyRole)
    : null
}

export interface PrefillIdentity {
  email: string
  name:  string | null
  role:  MBodyRole | null  // null when no role could be resolved from staff/admin/config
  /** True when this identity came from a redeemed admin `init_token` (Contacts / admin “New Onboarding”). */
  fromAdminInitToken?: boolean
}

/**
 * Validates an onboarding init token and immediately redeems it (single-use).
 * Resolves MBody role in order:
 *   1. `staff_users` row matching admin email (case-insensitive)
 *   2. `admin_users` row for `admin_user_id` on the token — `mbody_role` or legacy `role` if present in DB
 *   3. Most recently edited `configurations` row where `last_edited_by` matches admin email and `mbody_role` is set
 *
 * Returns null when the token is invalid, expired, or already redeemed.
 * Callers should treat null as "no bypass — show normal identity step".
 * On success, `fromAdminInitToken` is set so the client can default/hide staff role UI when DB role is unknown.
 */
export async function validateAndRedeemInitToken(
  token: string
): Promise<PrefillIdentity | null> {
  if (!token) return null

  const db = createAdminClient()

  const { data, error } = await db
    .from('onboarding_init_tokens')
    .select('id, admin_user_id, admin_email, admin_name, expires_at, redeemed_at')
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

  // 1) staff_users by email (case-insensitive; limit(1) avoids PGRST116 if multiple match)
  const { data: staffRows } = await db
    .from('staff_users')
    .select('role')
    .ilike('email', data.admin_email)
    .limit(1)

  let role = coerceMBodyRole(staffRows?.[0]?.role)

  // 2) admin_users — optional mbody_role / role columns (not in base admin_migration.sql;
  //    some deployments add them; service-role select ignores unknown columns safely via *)
  if (!role && data.admin_user_id) {
    const { data: adminRow } = await db
      .from('admin_users')
      .select('*')
      .eq('user_id', data.admin_user_id)
      .maybeSingle()

    if (adminRow) {
      const raw = adminRow as Record<string, unknown>
      role =
        coerceMBodyRole(raw.mbody_role) ??
        coerceMBodyRole(raw.role)
    }
  }

  // 3) Last configuration touch — reuse mbody_role they last edited under
  if (!role) {
    const { data: cfgRow } = await db
      .from('configurations')
      .select('mbody_role')
      .eq('last_edited_by', data.admin_email)
      .not('mbody_role', 'is', null)
      .order('last_edited_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    role = coerceMBodyRole(cfgRow?.mbody_role)
  }

  return {
    email: data.admin_email,
    name:  data.admin_name ?? null,
    role,
    fromAdminInitToken: true,
  }
}
