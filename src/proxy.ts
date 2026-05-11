import { NextResponse, type NextRequest } from 'next/server'
import { createProxySupabase, redirectWithSupabaseCookies } from '@/lib/supabase/proxy'
import { normalizeApprovalStatus } from '@/lib/admin/approvalStatus'

const TWO_FACTOR_MAX_AGE_MS = 12 * 60 * 60 * 1000

function isPublicAdminPath(pathname: string) {
  return (
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/login/') ||
    pathname.startsWith('/admin/auth/callback') ||
    pathname === '/admin/register' ||
    pathname.startsWith('/admin/register/')
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const { supabase, getResponse } = createProxySupabase(request)

  if (isPublicAdminPath(pathname)) {
    return getResponse()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id,approval_status,skip_otp')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminRow) {
    await supabase.auth.signOut()
    return redirectWithSupabaseCookies(new URL('/admin/login?error=not_admin', request.url), getResponse())
  }

  const approval = normalizeApprovalStatus(adminRow)

  if (approval === 'pending_email_verify') {
    const verifyUrl = new URL('/admin/register/verify', request.url)
    if (user.email) verifyUrl.searchParams.set('email', user.email)
    return redirectWithSupabaseCookies(verifyUrl, getResponse())
  }

  if (approval === 'awaiting_approval') {
    await supabase.auth.signOut()
    return redirectWithSupabaseCookies(new URL('/admin/register/pending', request.url), getResponse())
  }

  if (!adminRow.skip_otp) {
    const cutoff = new Date(Date.now() - TWO_FACTOR_MAX_AGE_MS).toISOString()
    const { data: twoFa } = await supabase
      .from('admin_2fa_sessions')
      .select('passed_at')
      .eq('user_id', user.id)
      .gte('passed_at', cutoff)
      .order('passed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!twoFa?.passed_at) {
      const verifyUrl = new URL('/admin/login/verify', request.url)
      if (user.email) verifyUrl.searchParams.set('email', user.email)
      return redirectWithSupabaseCookies(verifyUrl, getResponse())
    }
  }

  return getResponse()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
