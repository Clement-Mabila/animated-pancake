import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchClientContactDetail } from '@/lib/admin/fetchAdminData'
import JsonViewer from '@/components/admin/data/JsonViewer'
import StatusBadge from '@/components/admin/data/StatusBadge'
import type { ConfigStatus } from '@/types'

export default async function AdminContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await fetchClientContactDetail(id)
  if (!detail) notFound()

  const { contact, configurations } = detail

  return (
    <div className="space-y-6">
      <Link href="/admin/contacts" className="text-xs font-semibold no-underline" style={{ color: 'var(--text-muted)' }}>
        ← All contacts
      </Link>
      <h1 className="text-3xl font-normal" style={{ color: 'var(--text-primary)' }}>
        {contact.full_name as string}
      </h1>
      <JsonViewer title="Contact record" data={contact} />

      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Linked configurations
      </h2>
      {configurations.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No configurations linked.
        </p>
      )}
      <ul className="space-y-3">
        {configurations.map(c => (
          <li
            key={c.id as string}
            className="rounded-lg p-4 flex flex-wrap justify-between gap-2 items-center"
            style={{ background: 'var(--bg-elevated)', border: 'var(--border-subtle)' }}
          >
            <Link
              href={`/admin/configurations/${c.id}`}
              className="font-mono text-sm no-underline"
              style={{ color: 'var(--electric-blue)' }}
            >
              {String(c.id)}
            </Link>
            <StatusBadge status={c.status as ConfigStatus} />
          </li>
        ))}
      </ul>
    </div>
  )
}
