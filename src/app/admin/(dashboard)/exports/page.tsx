import { fetchExportVersions } from '@/lib/admin/fetchAdminData'

export default async function AdminExportsPage() {
  const rows = await fetchExportVersions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-normal mb-2" style={{ color: 'var(--text-primary)' }}>
          Export history
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Metadata for JSON exports. Payloads are not stored server-side.
        </p>
      </div>

      <div
        className="rounded-xl overflow-x-auto"
        style={{ border: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <table className="w-full text-left text-sm min-w-[720px]">
          <thead>
            <tr style={{ borderBottom: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th className="p-3 font-semibold">When</th>
              <th className="p-3 font-semibold">Scope</th>
              <th className="p-3 font-semibold">Count</th>
              <th className="p-3 font-semibold">Version</th>
              <th className="p-3 font-semibold">Size</th>
              <th className="p-3 font-semibold">SHA-256</th>
              <th className="p-3 font-semibold">Incomplete</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id as string} style={{ borderBottom: 'var(--border-subtle)' }}>
                <td className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(row.generated_at as string).toLocaleString()}
                </td>
                <td className="p-3 text-xs font-semibold">{String(row.scope)}</td>
                <td className="p-3 text-xs">{(row.configuration_ids as string[])?.length ?? 0}</td>
                <td className="p-3 text-xs">{String(row.version)}</td>
                <td className="p-3 text-xs">{Number(row.payload_size_bytes).toLocaleString()} B</td>
                <td className="p-3 text-[10px] font-mono break-all max-w-[180px]">
                  {String(row.payload_sha256).slice(0, 16)}…
                </td>
                <td className="p-3 text-xs">
                  {row.included_incomplete ? (
                    <span style={{ color: 'var(--warning)' }}>Yes</span>
                  ) : (
                    <span style={{ color: 'var(--success)' }}>No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No exports yet.
          </p>
        )}
      </div>
    </div>
  )
}
