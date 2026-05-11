import { fetchAuditPage } from '@/lib/admin/fetchAdminData'

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string }>
}) {
  const { entityType } = await searchParams
  const { rows } = await fetchAuditPage({ entityType, limit: 50, offset: 0 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-normal mb-2" style={{ color: 'var(--text-primary)' }}>
          Audit log
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Admin actions with before / after snapshots. Filter:{' '}
          <code className="text-xs">{entityType ?? 'all'}</code>
        </p>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No entries.</p>}
        {rows.map(row => (
          <details
            key={row.id as string}
            className="rounded-lg overflow-hidden group"
            style={{ border: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
          >
            <summary
              className="px-4 py-3 cursor-pointer text-sm font-semibold list-none flex justify-between gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <span>
                {String(row.action)} · {String(row.entity_type)}
              </span>
              <span className="text-xs font-normal shrink-0" style={{ color: 'var(--text-muted)' }}>
                {new Date(row.occurred_at as string).toLocaleString()}
              </span>
            </summary>
            <div className="px-4 pb-4 grid gap-3 md:grid-cols-3 text-xs font-mono" style={{ color: 'var(--text-body)' }}>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  Diff
                </p>
                <pre className="whitespace-pre-wrap break-all m-0 max-h-48 overflow-auto">
                  {JSON.stringify(row.diff ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  Before
                </p>
                <pre className="whitespace-pre-wrap break-all m-0 max-h-48 overflow-auto">
                  {JSON.stringify(row.before ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  After
                </p>
                <pre className="whitespace-pre-wrap break-all m-0 max-h-48 overflow-auto">
                  {JSON.stringify(row.after ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
