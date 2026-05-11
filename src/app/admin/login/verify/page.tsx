import OtpForm from '@/components/admin/auth/OtpForm'

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email: raw } = await searchParams
  const email = raw ? decodeURIComponent(raw) : ''

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 gap-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      {!email ? (
        <p className="text-center text-sm max-w-md" style={{ color: 'var(--error)' }}>
          Missing email. Go back to{' '}
          <a href="/admin/login" className="underline" style={{ color: 'var(--electric-blue)' }}>
            login
          </a>
          .
        </p>
      ) : (
        <OtpForm email={email} />
      )}
      <a href="/admin/login" className="text-xs font-semibold no-underline" style={{ color: 'var(--text-muted)' }}>
        ← Back to login
      </a>
    </div>
  )
}
