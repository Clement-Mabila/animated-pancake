'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  loginEmailSchema,
  loginPasswordSchema,
  otpVerifySchema,
  registerAdminSchema,
} from '@/lib/admin/schemas'
import { normalizeApprovalStatus } from '@/lib/admin/approvalStatus'

async function getRequestMeta() {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  const userAgent = h.get('user-agent') ?? null
  return { ip, userAgent }
}

type LoginGate = 'ok' | 'none' | 'pending_verify' | 'awaiting_approval'

async function checkAdminLoginGate(userId: string): Promise<LoginGate> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('admin_users').select('approval_status').eq('user_id', userId).maybeSingle()
  if (error || !data) return 'none'
  const st = normalizeApprovalStatus(data)
  if (st === 'active') return 'ok'
  if (st === 'pending_email_verify') return 'pending_verify'
  return 'awaiting_approval'
}

async function assertActiveAdmin(userId: string): Promise<boolean> {
  return (await checkAdminLoginGate(userId)) === 'ok'
}

/** Record that email OTP step-up was satisfied (new row for audit trail). */
async function record2faPassed(userId: string) {
  const admin = createAdminClient()
  const { ip, userAgent } = await getRequestMeta()
  const now = new Date().toISOString()
  await admin.from('admin_2fa_sessions').insert({
    user_id: userId,
    challenge_sent_at: now,
    passed_at: now,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    ip,
    user_agent: userAgent,
  })
}

/** Start OTP challenge after password (does not mark 2FA passed yet). */
async function record2faChallenge(userId: string) {
  const admin = createAdminClient()
  const { ip, userAgent } = await getRequestMeta()
  const now = new Date().toISOString()
  await admin.from('admin_2fa_sessions').insert({
    user_id: userId,
    challenge_sent_at: now,
    passed_at: null,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    ip,
    user_agent: userAgent,
  })
}

export type AuthActionResult =
  | { ok: true; step?: 'awaiting_otp' | 'skip_otp' }
  | { ok: false; error: string }

export async function registerAdminAction(
  _prev: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = registerAdminSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
  })
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.email?.[0] ??
      parsed.error.flatten().fieldErrors.password?.[0] ??
      parsed.error.flatten().fieldErrors.full_name?.[0] ??
      'Invalid input'
    return { ok: false, error: msg }
  }

  const { email, password, full_name } = parsed.data
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: existingEmail } = await admin
    .from('admin_users')
    .select('user_id,approval_status')
    .ilike('email', email)
    .maybeSingle()
  if (existingEmail) {
    const st = normalizeApprovalStatus(existingEmail)
    if (st === 'active') {
      return { ok: false, error: 'An admin account already exists for this email. Sign in instead.' }
    }
    if (st === 'awaiting_approval') {
      return {
        ok: false,
        error: 'This email is already registered and awaiting superuser activation.',
      }
    }
    return {
      ok: false,
      error:
        'Registration was already started for this email. Check your inbox for a code or use the registration verification page.',
    }
  }

  const hdrs = await headers()
  const origin = hdrs.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Create Auth user with service role so `auth.users` row exists before FK insert into `admin_users`.
  // Client `signUp` can race or behave oddly with confirmations; Admin API is synchronous on the server.
  const { data: createdAuth, error: createAuthErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name },
  })

  if (createAuthErr || !createdAuth.user?.id) {
    const raw = createAuthErr?.message ?? 'Registration failed.'
    if (/already\s+been\s+registered|already\s+exists|duplicate/i.test(raw)) {
      return {
        ok: false,
        error: 'An account with this email already exists in Auth. Sign in, or ask a superuser to link you in admin_users.',
      }
    }
    return { ok: false, error: raw }
  }

  const userId = createdAuth.user.id
  const userEmail = createdAuth.user.email ?? email

  const { error: insertErr } = await admin.from('admin_users').upsert(
    {
      user_id: userId,
      email: userEmail.toLowerCase(),
      full_name,
      approval_status: 'pending_email_verify',
    },
    { onConflict: 'user_id' }
  )

  if (insertErr) {
    return { ok: false, error: insertErr.message }
  }

  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email: userEmail,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/admin/auth/callback`,
    },
  })

  if (otpErr) {
    return { ok: false, error: otpErr.message }
  }

  revalidatePath('/admin/register')
  return { ok: true, step: 'awaiting_otp' }
}

export async function verifyRegistrationOtpAction(
  _prev: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = otpVerifySchema.safeParse({
    email: formData.get('email'),
    token: formData.get('token'),
  })
  if (!parsed.success) {
    return { ok: false, error: 'Enter the 6-digit code and email.' }
  }

  const { email, token } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    type: 'email',
    email,
    token,
  })

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'Invalid or expired code.' }
  }

  const admin = createAdminClient()
  const { data: row } = await admin.from('admin_users').select('approval_status').eq('user_id', data.user.id).maybeSingle()

  if (!row || normalizeApprovalStatus(row) !== 'pending_email_verify') {
    await supabase.auth.signOut()
    return { ok: false, error: 'No pending registration found for this account.' }
  }

  const { error: updErr } = await admin
    .from('admin_users')
    .update({ approval_status: 'awaiting_approval' })
    .eq('user_id', data.user.id)

  if (updErr) {
    return { ok: false, error: updErr.message }
  }

  await supabase.auth.signOut()
  revalidatePath('/admin/register')
  redirect('/admin/register/pending')
}

export async function signInWithPasswordAction(
  _prev: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = loginPasswordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors.email?.[0] ?? 'Invalid input' }
  }

  const { email, password } = parsed.data
  const supabase = await createClient()

  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !authData.user) {
    return { ok: false, error: error?.message ?? 'Sign-in failed' }
  }

  const gate = await checkAdminLoginGate(authData.user.id)
  if (gate === 'none') {
    await supabase.auth.signOut()
    return { ok: false, error: 'This account is not authorized for admin access.' }
  }
  if (gate === 'pending_verify') {
    await supabase.auth.signOut()
    return {
      ok: false,
      error: 'Finish verifying your email — open the link below or complete registration.',
    }
  }
  if (gate === 'awaiting_approval') {
    await supabase.auth.signOut()
    return {
      ok: false,
      error:
        'Your admin account is awaiting activation by a superuser. You will be notified when access is enabled.',
    }
  }

  const ok = await assertActiveAdmin(authData.user.id)
  if (!ok) {
    await supabase.auth.signOut()
    return { ok: false, error: 'This account is not authorized for admin access.' }
  }

  const adminClient = createAdminClient()
  const { data: skipRow } = await adminClient
    .from('admin_users')
    .select('skip_otp')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (skipRow?.skip_otp) {
    return { ok: true, step: 'skip_otp' }
  }

  await record2faChallenge(authData.user.id)

  const hdrs = await headers()
  const origin = hdrs.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/admin/auth/callback`,
    },
  })
  if (otpErr) {
    return { ok: false, error: otpErr.message }
  }

  revalidatePath('/admin')
  return { ok: true, step: 'awaiting_otp' }
}

export async function signInWithMagicLinkAction(
  _prev: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = loginEmailSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { ok: false, error: 'Enter a valid email.' }
  }
  const { email } = parsed.data
  const supabase = await createClient()

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('admin_users')
    .select('user_id,approval_status')
    .ilike('email', email)
    .maybeSingle()

  if (!row) {
    return { ok: false, error: 'No admin account for this email.' }
  }

  const st = normalizeApprovalStatus(row)
  if (st === 'pending_email_verify') {
    return { ok: false, error: 'Complete email verification on the registration page first.' }
  }
  if (st === 'awaiting_approval') {
    return {
      ok: false,
      error: 'Your admin account is awaiting activation by a superuser.',
    }
  }

  const hdrs = await headers()
  const origin = hdrs.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/admin/auth/callback`,
    },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function requestEmailOtpAction(
  _prev: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = loginEmailSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { ok: false, error: 'Enter a valid email.' }
  }
  const { email } = parsed.data
  const supabase = await createClient()

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('admin_users')
    .select('user_id,approval_status')
    .ilike('email', email)
    .maybeSingle()

  if (!row) {
    return { ok: false, error: 'No admin account for this email.' }
  }

  const st = normalizeApprovalStatus(row)
  if (st === 'pending_email_verify') {
    return { ok: false, error: 'Complete registration verification first.' }
  }
  if (st === 'awaiting_approval') {
    return {
      ok: false,
      error: 'Your admin account is awaiting activation by a superuser.',
    }
  }

  const hdrs = await headers()
  const origin = hdrs.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/admin/auth/callback`,
    },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function verifyOtpAction(
  _prev: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = otpVerifySchema.safeParse({
    email: formData.get('email'),
    token: formData.get('token'),
  })
  if (!parsed.success) {
    return { ok: false, error: 'Enter the 6-digit code and email.' }
  }

  const { email, token } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    type: 'email',
    email,
    token,
  })
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'Invalid or expired code.' }
  }

  const gate = await checkAdminLoginGate(data.user.id)
  if (gate !== 'ok') {
    await supabase.auth.signOut()
    if (gate === 'pending_verify') {
      return { ok: false, error: 'Use the registration verification page for this account.' }
    }
    if (gate === 'awaiting_approval') {
      return {
        ok: false,
        error: 'Your admin account is awaiting activation by a superuser.',
      }
    }
    return { ok: false, error: 'This account is not authorized for admin access.' }
  }

  await record2faPassed(data.user.id)
  revalidatePath('/admin')
  redirect('/admin')
}

export async function toggleSkipOtpAction(
  skipOtp: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return { ok: false, error: 'Not authenticated.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('admin_users')
    .update({ skip_otp: skipOtp })
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

export async function signOutAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const admin = createAdminClient()
    await admin.from('admin_2fa_sessions').delete().eq('user_id', user.id)
  }
  await supabase.auth.signOut()
  redirect('/admin/login')
}
