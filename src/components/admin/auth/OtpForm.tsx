'use client'

import { useActionState } from 'react'
import { verifyOtpAction, type AuthActionResult } from '@/app/admin/actions/auth'

export default function OtpForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyOtpAction, undefined as AuthActionResult | undefined)

  return (
    <form
      action={action}
      className="space-y-4 w-full max-w-md mx-auto rounded-xl p-8"
      style={{
        background: 'var(--bg-surface)',
        border: 'var(--border-subtle)',
        boxShadow: '0 16px 48px rgba(165,42,225,0.08)',
      }}
    >
      <input type="hidden" name="email" value={email} />
      <h1 className="text-xl font-normal mb-1" style={{ color: 'var(--text-primary)' }}>
        Enter verification code
      </h1>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        We sent a 6-digit code to <strong style={{ color: 'var(--text-body)' }}>{email}</strong>
      </p>
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
        Code
      </label>
      <input
        name="token"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        required
        autoComplete="one-time-code"
        placeholder="000000"
        className="mt-1 w-full rounded-lg px-3 py-3 text-lg tracking-[0.3em] text-center font-mono outline-none"
        style={{
          background: 'var(--bg-elevated)',
          border: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      />
      {state?.ok === false && (
        <p className="text-sm font-medium" style={{ color: 'var(--error)' }}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-lg text-sm font-semibold border-none cursor-pointer text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #A52AE1, #3999FE)' }}
      >
        {pending ? 'Verifying…' : 'Verify and continue'}
      </button>
    </form>
  )
}
