import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAdminConfigurationsList } from '@/lib/admin/fetchAdminData'
import type { ConfigBucketTab } from '@/types'
import ConfigListClient from '@/components/admin/data/ConfigListClient'

const VALID_TABS: ConfigBucketTab[] = ['draft', 'in_progress', 'complete', 'all']

export default async function AdminConfigurationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab } = await searchParams
  const tab = (VALID_TABS.includes(rawTab as ConfigBucketTab) ? rawTab : 'all') as ConfigBucketTab

  const rows = await fetchAdminConfigurationsList(tab)

  const admin = createAdminClient()
  const { data: allRows } = await admin.from('configurations').select('id')
  const allConfigurationIds = (allRows ?? []).map(r => r.id as string)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-normal mb-2" style={{ color: 'var(--text-primary)' }}>
          Configurations
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Search, sort, export, and open client onboarding records.
        </p>
      </div>
      <ConfigListClient rows={rows} allConfigurationIds={allConfigurationIds} />
    </div>
  )
}
