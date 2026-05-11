'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerAdminAction, type AuthActionResult } from '@/app/admin/actions/auth'

export default function RegisterForm() {
  const router = useRouter()
  const emailRef = useRef('')
  const [state, action, pending] = useActionState(
    registerAdminAction,
    undefined as AuthActionResult | undefined
  )

  useEffect(() => {
    const e = emailRef.current
    if (state?.ok && state.step === 'awaiting_otp' && e) {
      router.push(`/admin/register/verify?email=${encodeURIComponent(e)}`)
    }
  }, [state, router])

  return (
    <div
      className="w-full max-w-md mx-auto rounded-xl p-8"
      style={{
        background: 'var(--bg-surface)',
        border: 'var(--border-subtle)',
        boxShadow: '0 16px 48px rgba(165,42,225,0.08)',
      }}
    >
      <h1 className="text-2xl font-normal mb-1" style={{ color: 'var(--text-primary)' }}>
        Register admin account
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Create your credentials. We will email a one-time code to verify your address before your account is reviewed.
      </p>

      <form
        action={fd => {
          emailRef.current = String(fd.get('email') ?? '')
          return action(fd)
        }}
        className="space-y-4"
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Full name
          </label>
          <input
            name="full_name"
            type="text"
            required
            autoComplete="name"
            className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--bg-elevated)',
              border: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--bg-elevated)',
              border: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--bg-elevated)',
              border: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            At least 8 characters.
          </p>
        </div>
        {state?.ok === false && (
          <p className="text-sm" style={{ color: 'var(--error)' }}>
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-lg text-sm font-semibold border-none cursor-pointer text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #A52AE1, #3999FE)' }}
        >
          {pending ? 'Creating account…' : 'Continue'}
        </button>
      </form>

      <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
        Already have access?{' '}
        <Link href="/admin/login" className="font-semibold no-underline" style={{ color: 'var(--electric-blue)' }}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
