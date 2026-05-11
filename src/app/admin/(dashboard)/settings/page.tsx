export default function AdminSettingsPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-3xl font-normal" style={{ color: 'var(--text-primary)' }}>
        Admin settings
      </h1>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
        Admin access is controlled by the <code className="text-xs">admin_users</code> table and{' '}
        <code className="text-xs">approval_status</code> (<code className="text-xs">admin_approval_status_migration.sql</code>
        ). Self-service sign-up lives at <code className="text-xs">/admin/register</code>; after email OTP the row is{' '}
        <code className="text-xs">awaiting_approval</code> until a superuser sets it to <code className="text-xs">active</code>.
      </p>
      <pre
        className="text-xs p-4 rounded-lg overflow-x-auto"
        style={{
          background: 'var(--bg-elevated)',
          border: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        {`-- Activate a registered admin (run in Supabase SQL editor)
UPDATE public.admin_users
SET approval_status = 'active'
WHERE email = 'you@company.com';

-- Manual bootstrap (FK-safe: user must exist in Authentication first)
INSERT INTO public.admin_users (user_id, email, full_name, approval_status)
SELECT u.id, lower(trim(u.email)), COALESCE(NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''), 'Admin'), 'active'
FROM auth.users AS u
WHERE lower(trim(u.email)) = lower(trim('you@company.com'))
ON CONFLICT (user_id) DO NOTHING;`}
      </pre>
    </div>
  )
}
