import { createAdminClient } from '@/lib/supabase/admin'
import {
  countCompletedInPhase,
  getConfigBucket,
  matchesBucket,
  phaseSectionCount,
} from '@/lib/admin/configBuckets'
import type { ConfigBucketTab, Configuration, ConfigSection, ConfigPhase } from '@/types'

export interface AdminConfigListRow {
  id: string
  clientName: string
  phase: ConfigPhase
  status: Configuration['status']
  staffName: string | null
  staffEmail: string | null
  locationName: string | null
  completedInPhase: number
  totalInPhase: number
  bucket: Exclude<ConfigBucketTab, 'all'>
  created_at: string
  updated_at: string
}

export async function fetchAdminConfigurationsList(tab: ConfigBucketTab): Promise<AdminConfigListRow[]> {
  const admin = createAdminClient()
  const { data: configs, error } = await admin
    .from('configurations')
    .select(
      `
      *,
      staff_user:staff_users(full_name,email),
      client_contact:client_contacts(full_name,email),
      location:locations(name),
      sub_location:sub_locations(name)
    `
    )
    .order('updated_at', { ascending: false })

  if (error) throw error
  const list = configs ?? []
  if (list.length === 0) return []

  const ids = list.map(c => c.id as string)
  const { data: sections } = await admin
    .from('config_sections')
    .select('configuration_id,section_id,is_complete')
    .in('configuration_id', ids)

  const sectionMap: Record<string, Record<string, Pick<ConfigSection, 'is_complete'> | undefined>> = {}
  for (const row of sections ?? []) {
    const cid = row.configuration_id as string
    sectionMap[cid] ??= {}
    sectionMap[cid][row.section_id as string] = { is_complete: row.is_complete === true }
  }

  const rows: AdminConfigListRow[] = list.map(c => {
    const phase = c.phase as ConfigPhase
    const sec = sectionMap[c.id] ?? {}
    const completed = countCompletedInPhase(phase, sec)
    const total = phaseSectionCount(phase)
    const status = c.status as Configuration['status']
    const bucket = getConfigBucket({ status, phase, completedInPhase: completed })
    const staff = c.staff_user as { full_name: string; email: string } | null
    const contact = c.client_contact as { full_name: string; email: string } | null
    const loc = c.location as { name: string } | null
    const sub = c.sub_location as { name: string } | null
    const clientName =
      contact?.full_name?.trim() ||
      loc?.name ||
      sub?.name ||
      (c.scope === 'mbody_role' ? `Role: ${String(c.mbody_role ?? '')}` : 'Configuration')

    return {
      id: c.id as string,
      clientName,
      phase,
      status,
      staffName: staff?.full_name ?? null,
      staffEmail: staff?.email ?? null,
      locationName: loc?.name ?? null,
      completedInPhase: completed,
      totalInPhase: total,
      bucket,
      created_at: c.created_at as string,
      updated_at: c.updated_at as string,
    }
  })

  return rows.filter(r =>
    matchesBucket(tab, {
      status: r.status,
      phase: r.phase,
      completedInPhase: r.completedInPhase,
    })
  )
}

export async function fetchAdminDashboardStats() {
  const admin = createAdminClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    contactsRes,
    configsRes,
    draftRes,
    completeRes,
    auditRes,
    recentConfigs,
    newContactsRes,
    newConfigsRes,
    newLiveRes,
    recentContactsRes,
    staffUsersRes,
  ] = await Promise.all([
    admin.from('client_contacts').select('id', { count: 'exact', head: true }),
    admin.from('configurations').select('id', { count: 'exact', head: true }),
    admin.from('configurations').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    admin
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .in('status', ['client_complete', 'mbody_complete', 'live']),
    admin
      .from('admin_audit_log')
      .select('id,action,entity_type,occurred_at,admin_user_id')
      .order('occurred_at', { ascending: false })
      .limit(10),
    admin
      .from('configurations')
      .select('id,updated_at,status,phase,client_contact:client_contacts(full_name)')
      .order('updated_at', { ascending: false })
      .limit(10),
    admin
      .from('client_contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth),
    admin
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth),
    admin
      .from('configurations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'live')
      .gte('went_live_at', startOfMonth),
    // Recent client contacts for people panel
    admin
      .from('client_contacts')
      .select('id,full_name,email,role_label,role_label_custom,created_at,location:locations(name)')
      .order('created_at', { ascending: false })
      .limit(20),
    // Staff users with config status
    admin
      .from('staff_users')
      .select('id,full_name,email,role,created_at'),
  ])

  const { data: phaseRows } = await admin.from('configurations').select('phase')

  const phaseCounts: Record<string, number> = {}
  for (const p of phaseRows ?? []) {
    const ph = (p as { phase: string }).phase
    phaseCounts[ph] = (phaseCounts[ph] ?? 0) + 1
  }

  // Fetch config statuses for all staff users
  const staffIds = (staffUsersRes.data ?? []).map((s: { id: string }) => s.id)
  const { data: staffConfigs } = staffIds.length > 0
    ? await admin
        .from('configurations')
        .select('staff_user_id,status')
        .in('staff_user_id', staffIds)
    : { data: [] }

  // Map staff_user_id -> most progressed config status
  const staffStatusMap: Record<string, string> = {}
  for (const cfg of staffConfigs ?? []) {
    const sid = cfg.staff_user_id as string
    staffStatusMap[sid] = cfg.status as string
  }

  const staffUsers = (staffUsersRes.data ?? []).map((s: {
    id: string
    full_name: string
    email: string
    role: string
    created_at: string
  }) => ({
    ...s,
    config_status: staffStatusMap[s.id] ?? null,
  }))

  const totalContacts         = contactsRes.count ?? 0
  const totalConfigs          = configsRes.count ?? 0
  const draftConfigs          = draftRes.count ?? 0
  const completeConfigs       = completeRes.count ?? 0
  const newContactsThisMonth  = newContactsRes.count ?? 0
  const newConfigsThisMonth   = newConfigsRes.count ?? 0
  const newLiveThisMonth      = newLiveRes.count ?? 0

  return {
    totalContacts,
    totalConfigs,
    draftConfigs,
    completeConfigs,
    incompleteConfigs: Math.max(0, totalConfigs - completeConfigs),
    newContactsThisMonth,
    newConfigsThisMonth,
    newLiveThisMonth,
    phaseCounts,
    recentAudit:    auditRes.data ?? [],
    recentConfigs:  recentConfigs.data ?? [],
    recentContacts: recentContactsRes.data ?? [],
    staffUsers,
  }
}

export async function fetchConfigurationDetail(id: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('configurations')
    .select(
      `
      *,
      staff_user:staff_users(*),
      client_contact:client_contacts(*),
      location:locations(*),
      sub_location:sub_locations(*)
    `
    )
    .eq('id', id)
    .single()
  if (error) return null
  const { data: sections } = await admin.from('config_sections').select('*').eq('configuration_id', id)
  return { configuration: data, sections: sections ?? [] }
}

export async function fetchClientContactsList() {
  const admin = createAdminClient()
  const { data: contacts, error } = await admin
    .from('client_contacts')
    .select(
      `
      *,
      location:locations(name),
      sub_location:sub_locations(name)
    `
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  const list = contacts ?? []
  if (list.length === 0) return []

  const ids = list.map(c => c.id as string)
  const { data: cfgs } = await admin
    .from('configurations')
    .select('id,status,phase,client_contact_id')
    .in('client_contact_id', ids)

  const byContact: Record<string, { id: string; status: string; phase: string } | null> = {}
  for (const row of cfgs ?? []) {
    const cid = row.client_contact_id as string
    byContact[cid] = { id: row.id as string, status: row.status as string, phase: row.phase as string }
  }

  return list.map(c => ({
    ...c,
    linked_configuration: byContact[c.id as string] ?? null,
  }))
}

export async function fetchClientContactDetail(id: string) {
  const admin = createAdminClient()
  const { data: contact, error } = await admin
    .from('client_contacts')
    .select(
      `
      *,
      location:locations(*),
      sub_location:sub_locations(*)
    `
    )
    .eq('id', id)
    .single()
  if (error) return null
  const { data: configs } = await admin
    .from('configurations')
    .select('*')
    .eq('client_contact_id', id)
    .order('created_at', { ascending: false })
  return { contact, configurations: configs ?? [] }
}

export async function fetchAuditPage(params: {
  entityType?: string
  limit?: number
  offset?: number
}) {
  const admin = createAdminClient()
  const limit = Math.min(params.limit ?? 50, 100)
  const offset = params.offset ?? 0
  let q = admin.from('admin_audit_log').select('*', { count: 'exact' }).order('occurred_at', { ascending: false })
  if (params.entityType) q = q.eq('entity_type', params.entityType)
  const { data, error, count } = await q.range(offset, offset + limit - 1)
  if (error) throw error
  return { rows: data ?? [], total: count ?? 0 }
}

export async function fetchExportVersions() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('export_versions')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}