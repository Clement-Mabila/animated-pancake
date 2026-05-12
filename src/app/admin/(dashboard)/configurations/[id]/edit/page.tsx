import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchConfigurationDetail } from '@/lib/admin/fetchAdminData'
import AdminConfigEditor from '@/components/admin/editor/AdminConfigEditor'
import type { ConfigurationWithStaff, ConfigSection } from '@/types'

export default async function AdminConfigurationEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await fetchConfigurationDetail(id)
  if (!detail) notFound()

  const { configuration, sections, questions } = detail
  const mapped = (sections as ConfigSection[]).reduce(
    (acc, sec) => {
      acc[sec.section_id] = sec
      return acc
    },
    {} as Record<string, ConfigSection>
  )

  const cfg = configuration as ConfigurationWithStaff & {
    location?: { industry: string | null } | null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/configurations/${id}`}
          className="text-xs font-semibold no-underline"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back to detail
        </Link>
      </div>
      <h1 className="text-3xl font-normal" style={{ color: 'var(--text-primary)' }}>
        Edit configuration
      </h1>
      <AdminConfigEditor initialConfiguration={cfg} initialSections={mapped} questions={questions} />
    </div>
  )
}
