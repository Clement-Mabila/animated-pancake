import Link from 'next/link'
import RegistrationOtpForm from '@/components/admin/auth/RegistrationOtpForm'

export default async function AdminRegisterVerifyPage({
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
          Missing email. Start from{' '}
          <Link href="/admin/register" className="underline" style={{ color: 'var(--electric-blue)' }}>
            registration
          </Link>{' '}
          or open the link from your confirmation email.
        </p>
      ) : (
        <RegistrationOtpForm email={email} />
      )}
      <Link href="/admin/register" className="text-xs font-semibold no-underline" style={{ color: 'var(--text-muted)' }}>
        ← Back to registration
      </Link>
    </div>
  )
}
