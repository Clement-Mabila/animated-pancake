import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminUser } from '@/types'
import { normalizeApprovalStatus } from '@/lib/admin/approvalStatus'

const TWO_FACTOR_MAX_AGE_MS = 12 * 60 * 60 * 1000

export async function requireAdminSession(): Promise<{
  user: { id: string; email?: string }
  adminUser: AdminUser
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    redirect('/admin/login')
  }

  const adminDb = createAdminClient()
  const { data: adminRow, error: adminErr } = await adminDb
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (adminErr || !adminRow) {
    await supabase.auth.signOut()
    redirect('/admin/login?error=not_admin')
  }

  const approval = normalizeApprovalStatus(adminRow)

  if (approval === 'pending_email_verify') {
    redirect(`/admin/register/verify?email=${encodeURIComponent(user.email ?? '')}`)
  }

  if (approval === 'awaiting_approval') {
    await supabase.auth.signOut()
    redirect('/admin/register/pending')
  }

  if (!adminRow.skip_otp) {
    const cutoff = new Date(Date.now() - TWO_FACTOR_MAX_AGE_MS).toISOString()
    const { data: recent2fa } = await adminDb
      .from('admin_2fa_sessions')
      .select('passed_at')
      .eq('user_id', user.id)
      .gte('passed_at', cutoff)
      .order('passed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!recent2fa?.passed_at) {
      redirect('/admin/login/verify')
    }
  }

  const adminUser: AdminUser = {
    ...(adminRow as AdminUser),
    approval_status: 'active',
  }

  return {
    user: { id: user.id, email: user.email ?? undefined },
    adminUser,
  }
}
