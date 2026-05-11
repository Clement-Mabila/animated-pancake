import Link from 'next/link'

export default function AdminRegisterPendingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 gap-6" style={{ background: 'var(--bg-primary)' }}>
      <div
        className="w-full max-w-md rounded-xl p-8 text-center space-y-4"
        style={{
          background: 'var(--bg-surface)',
          border: 'var(--border-subtle)',
          boxShadow: '0 16px 48px rgba(165,42,225,0.08)',
        }}
      >
        <h1 className="text-2xl font-normal" style={{ color: 'var(--text-primary)' }}>
          Awaiting activation
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
          Your email is verified. A superuser must set your admin account to <strong>active</strong> in Supabase before you
          can sign in with password, magic link, or email code.
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          You will use the same email and password you registered with once access is enabled.
        </p>
        <Link
          href="/admin/login"
          className="inline-block mt-2 py-3 px-6 rounded-lg text-sm font-semibold no-underline text-white"
          style={{ background: 'linear-gradient(135deg, #A52AE1, #3999FE)' }}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
