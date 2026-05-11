import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeApprovalStatus } from '@/lib/admin/approvalStatus'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/admin'

  if (!code) {
    return NextResponse.redirect(new URL('/admin/login?error=callback', url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/admin/login?error=callback', url.origin))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return NextResponse.redirect(new URL('/admin/login?error=callback', url.origin))
  }

  const admin = createAdminClient()
  const { data: adminRow } = await admin
    .from('admin_users')
    .select('user_id,approval_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminRow) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/admin/login?error=not_admin', url.origin))
  }

  const approval = normalizeApprovalStatus(adminRow)

  if (approval === 'pending_email_verify') {
    await supabase.auth.signOut()
    const verifyUrl = new URL('/admin/register/verify', url.origin)
    if (user.email) verifyUrl.searchParams.set('email', user.email)
    return NextResponse.redirect(verifyUrl)
  }

  if (approval === 'awaiting_approval') {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/admin/register/pending', url.origin))
  }

  const hdrs = new Headers(request.headers)
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? hdrs.get('x-real-ip') ?? null
  const userAgent = hdrs.get('user-agent') ?? null
  const now = new Date().toISOString()
  await admin.from('admin_2fa_sessions').insert({
    user_id: user.id,
    challenge_sent_at: now,
    passed_at: now,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    ip,
    user_agent: userAgent,
  })

  return NextResponse.redirect(new URL(next, url.origin))
}
