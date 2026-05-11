import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchConfigurationDetail } from '@/lib/admin/fetchAdminData'
import JsonViewer from '@/components/admin/data/JsonViewer'
import ConfigurationExportButton from '@/components/admin/data/ConfigurationExportButton'

export default async function AdminConfigurationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await fetchConfigurationDetail(id)
  if (!detail) notFound()

  const { configuration, sections } = detail

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-3xl font-normal mb-2" style={{ color: 'var(--text-primary)' }}>
            Configuration
          </h1>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfigurationExportButton configurationId={id} />
          <Link
            href={`/admin/configurations/${id}/edit`}
            className="text-sm font-semibold px-4 py-2 rounded-lg no-underline inline-flex items-center"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: 'var(--border-subtle)',
            }}
          >
            Edit
          </Link>
          <Link
            href={`/admin/audit?entityType=config_section`}
            className="text-sm font-semibold px-4 py-2 rounded-lg no-underline"
            style={{ color: 'var(--soft-lavender)' }}
          >
            Audit history
          </Link>
        </div>
      </div>

      <JsonViewer title="Configuration row" data={configuration} />

      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Sections
      </h2>
      {sections.map(sec => (
        <JsonViewer key={sec.id} title={`Section: ${sec.section_id}`} data={sec} />
      ))}
    </div>
  )
}
