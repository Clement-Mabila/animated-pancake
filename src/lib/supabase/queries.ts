import { createClient } from './client'
import type {
  Location,
  SubLocation,
  Robot,
  Configuration,
  ConfigurationWithStaff,
  ConfigurationWithRelations,
  ConfigSection,
  ConfigSuggestion,
  ClientContact,
  ContactRoleLabel,
  SectionId,
  MBodyRole,
  ConfigScope,
  StaffUser,
  StaffIdentity,
  WorkflowDeployTask,
} from '@/types'

// ── Reference data ──────────────────────────────────────────

export async function getLocations(): Promise<Location[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function getSubLocations(locationId: string): Promise<SubLocation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sub_locations')
    .select('*')
    .eq('location_id', locationId)
    .order('name')
  if (error) throw error
  return data
}

export async function getRobotsBySubLocation(subLocationId: string): Promise<Robot[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('robots')
    .select('*')
    .eq('sub_location_id', subLocationId)
    .order('alias')
  if (error) throw error
  return data
}

export async function getRobotsForLocation(locationId: string): Promise<Robot[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('robots')
    .select('*, sub_locations!inner(location_id)')
    .eq('sub_locations.location_id', locationId)
  if (error) throw error
  return data
}

// ── Staff users ─────────────────────────────────────────────

// Upsert staff user — create if new, update name/role if email exists
export async function upsertStaffUser(identity: StaffIdentity): Promise<StaffUser> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_users')
    .upsert(
      {
        email:     identity.email,
        full_name: identity.fullName,
        role:      identity.role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getStaffUserByEmail(email: string): Promise<StaffUser | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_users')
    .select('*')
    .eq('email', email)
    .single()
  if (error) return null
  return data
}

// ── Configurations ──────────────────────────────────────────

export async function getConfigurationsForLocation(
  locationId: string
): Promise<ConfigurationWithStaff[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('configurations')
    .select('*, staff_user:staff_users(*)')
    .eq('location_id', locationId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getConfigurationsForSubLocation(
  subLocationId: string
): Promise<ConfigurationWithStaff[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('configurations')
    .select('*, staff_user:staff_users(*)')
    .eq('sub_location_id', subLocationId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getConfigurationsForRole(
  role: MBodyRole
): Promise<ConfigurationWithStaff[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('configurations')
    .select('*, staff_user:staff_users(*)')
    .eq('mbody_role', role)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getConfigurationsForUser(
  email: string
): Promise<ConfigurationWithStaff[]> {
  const supabase = createClient()

  // First get staff user id from email
  const staffUser = await getStaffUserByEmail(email)
  if (!staffUser) return []

  const { data, error } = await supabase
    .from('configurations')
    .select('*, staff_user:staff_users(*)')
    .eq('staff_user_id', staffUser.id)
    .eq('scope', 'user')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getConfiguration(
  configId: string
): Promise<ConfigurationWithStaff | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('configurations')
    .select('*, staff_user:staff_users(*), location:locations(industry)')
    .eq('id', configId)
    .single()
  if (error) return null
  return data
}

export async function createConfiguration(params: {
  scope:          ConfigScope
  staffUserId:    string
  locationId?:    string
  subLocationId?: string
  mbodyRole?:     MBodyRole
  email:          string
}): Promise<Configuration> {
  const supabase = createClient()

  const insert: Record<string, unknown> = {
    scope:           params.scope,
    status:          'draft',
    staff_user_id:   params.staffUserId,
    last_edited_by:  params.email,
    last_edited_at:  new Date().toISOString(),
  }

  if (params.locationId)    insert.location_id     = params.locationId
  if (params.subLocationId) insert.sub_location_id = params.subLocationId
  if (params.mbodyRole)     insert.mbody_role      = params.mbodyRole

  const { data, error } = await supabase
    .from('configurations')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateConfigurationStatus(
  configId: string,
  status: Configuration['status'],
  completedByEmail?: string
): Promise<void> {
  const supabase = createClient()
  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'client_complete') {
    payload.client_submitted_at = new Date().toISOString()
  }
  if (status === 'mbody_complete' || status === 'live') {
    payload.mbody_completed_at = new Date().toISOString()
    if (completedByEmail) payload.mbody_completed_by = completedByEmail
  }
  const { error } = await supabase
    .from('configurations')
    .update(payload)
    .eq('id', configId)
  if (error) throw error
}

export async function updateConfigurationLastEdited(
  configId: string,
  email: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('configurations')
    .update({
      last_edited_by: email,
      last_edited_at: new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })
    .eq('id', configId)
  if (error) throw error
}

// ── Config sections ─────────────────────────────────────────

export async function getConfigSection(
  configId: string,
  sectionId: SectionId
): Promise<ConfigSection | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('config_sections')
    .select('*')
    .eq('configuration_id', configId)
    .eq('section_id', sectionId)
    .single()
  if (error) return null
  return data
}

export async function getAllConfigSections(
  configId: string
): Promise<ConfigSection[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('config_sections')
    .select('*')
    .eq('configuration_id', configId)
  if (error) throw error
  return data ?? []
}

export async function upsertConfigSection(
  configId: string,
  sectionId: SectionId,
  data: Record<string, unknown>,
  isComplete: boolean = false,
  completedByEmail?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('config_sections')
    .upsert(
      {
        configuration_id: configId,
        section_id:       sectionId,
        data,
        is_complete:      isComplete,
        completed_by:     completedByEmail ?? null,
        saved_at:         new Date().toISOString(),
      },
      { onConflict: 'configuration_id,section_id' }
    )
  if (error) throw error
}

// ── Field ownership ─────────────────────────────────────────

export async function getFieldOwnership(): Promise<
  { section_id: string; field_key: string; owner: string }[]
> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('field_ownership')
    .select('section_id, field_key, owner')
  if (error) throw error
  return data ?? []
}

// ── Config suggestions ──────────────────────────────────────

export async function getSuggestionsForField(
  sectionId: string,
  fieldKey: string,
  industry?: string | null
): Promise<ConfigSuggestion[]> {
  const supabase = createClient()
  let query = supabase
    .from('config_suggestions')
    .select('*')
    .eq('section_id', sectionId)
    .eq('field_key', fieldKey)
    .order('is_mbody_default', { ascending: false })
    .order('usage_count', { ascending: false })

  if (industry) {
    query = query.or(`industry.eq.${industry},industry.is.null`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function incrementSuggestionUsage(
  sectionId: string,
  fieldKey: string,
  value: string,
  industry?: string | null
): Promise<void> {
  const supabase = createClient()
  const trimmed = value.trim()

  const { data: existing } = await supabase
    .from('config_suggestions')
    .select('id, usage_count')
    .eq('section_id', sectionId)
    .eq('field_key', fieldKey)
    .ilike('value', trimmed)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('config_suggestions')
      .update({
        usage_count: existing.usage_count + 1,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('config_suggestions')
      .insert({
        section_id:       sectionId,
        field_key:        fieldKey,
        value:            trimmed,
        usage_count:      1,
        is_mbody_default: false,
        industry:         industry ?? null,
      })
  }
}

// ── Client contacts ─────────────────────────────────────────

// All contacts for a location — used to populate the contact dropdown
export async function getClientContactsForLocation(
  locationId: string
): Promise<ClientContact[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('location_id', locationId)
    .order('full_name')
  if (error) throw error
  return data ?? []
}

// Deduplication check — prevents creating a duplicate contact for the same person
export async function getClientContactByEmail(
  email: string,
  locationId: string
): Promise<ClientContact | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('location_id', locationId)
    .single()
  if (error) return null
  return data
}

// All configurations for a location with client_contact joined —
// used by the resume panel to show each contact's phase + status
export async function getConfigurationsForLocationWithPhases(
  locationId: string
): Promise<ConfigurationWithRelations[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('configurations')
    .select('*, staff_user:staff_users(*), client_contact:client_contacts(*)')
    .eq('location_id', locationId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ConfigurationWithRelations[]
}

export async function getConfigurationsForTemplate(
  templateId: string
): Promise<ConfigurationWithRelations[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('configurations')
    .select('*, staff_user:staff_users(*), client_contact:client_contacts(*)')
    .eq('workflow_template_id', templateId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ConfigurationWithRelations[]
}

export async function createClientContact(params: {
  locationId?:      string
  subLocationId?:   string
  fullName:         string
  email:            string
  roleLabel:        string
  roleLabelCustom?: string
}): Promise<{ id: string; magic_token: string }> {
  const supabase = createClient()
  const magicToken = crypto.randomUUID()
  const expiresAt  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('client_contacts')
    .insert({
      location_id:       params.locationId    ?? null,
      sub_location_id:   params.subLocationId ?? null,
      full_name:         params.fullName,
      email:             params.email,
      role_label:        params.roleLabel,
      role_label_custom: params.roleLabelCustom ?? null,
      magic_token:       magicToken,
      token_expires_at:  expiresAt,
    })
    .select('id, magic_token')
    .single()
  if (error) throw error
  return data
}

export async function getClientContactByToken(token: string): Promise<{
  id: string
  full_name: string
  email: string
  location_id: string | null
  sub_location_id: string | null
} | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('client_contacts')
    .select('id, full_name, email, location_id, sub_location_id')
    .eq('magic_token', token)
    .gt('token_expires_at', new Date().toISOString())
    .single()
  if (error) return null

  await supabase
    .from('client_contacts')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', data.id)

  return data
}

// ── Notifications ───────────────────────────────────────────

export async function logNotification(params: {
  configurationId: string
  type:            string
  recipientEmail:  string
  metadata?:       Record<string, unknown>
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .insert({
      configuration_id: params.configurationId,
      type:             params.type,
      recipient_email:  params.recipientEmail,
      metadata:         params.metadata ?? {},
    })
  if (error) throw error
}


export async function createLocation(params: {
  name:      string
  industry?: string
  country?:  string
  city?:     string
}): Promise<Location> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('locations')
    .insert({
      name:     params.name.trim(),
      industry: params.industry?.trim() || null,
      country:  params.country?.trim()  || null,
      city:     params.city?.trim()     || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
 
export async function createSubLocation(params: {
  locationId: string
  name:       string
}): Promise<SubLocation> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sub_locations')
    .insert({
      location_id: params.locationId,
      name:        params.name.trim(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Workflow ────────────────────────────────────────────────

export async function getWorkflowDeployTasks(
  templateId = '11111111-1111-1111-1111-111111111111'
): Promise<WorkflowDeployTask[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workflow_deploy_tasks')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

// ── Template routing ────────────────────────────────────────

export async function resolveTemplateForSession(params: {
  locationId?:  string
  contactRole?: string
}): Promise<string | null> {
  const supabase = createClient()

  if (params.locationId && params.contactRole) {
    const { data } = await supabase
      .from('workflow_templates')
      .select('id')
      .eq('location_id', params.locationId)
      .eq('contact_role', params.contactRole)
      .eq('is_archived', false)
      .maybeSingle()
    if (data?.id) return data.id
  }

  if (params.locationId) {
    const { data } = await supabase
      .from('workflow_templates')
      .select('id')
      .eq('location_id', params.locationId)
      .is('contact_role', null)
      .eq('is_archived', false)
      .maybeSingle()
    if (data?.id) return data.id
  }

  return null
}

// ── Inheritance helper ──────────────────────────────────────

export async function getInheritableConfig(params: {
  locationId?:    string
  subLocationId?: string
  mbodyRole?:     MBodyRole
}): Promise<Configuration | null> {
  const supabase = createClient()

  // Sub-location inherits from its parent location
  if (params.subLocationId) {
    const { data: sl } = await supabase
      .from('sub_locations')
      .select('location_id')
      .eq('id', params.subLocationId)
      .single()

    if (sl?.location_id) {
      const { data } = await supabase
        .from('configurations')
        .select('*')
        .eq('location_id', sl.location_id)
        .single()
      if (data) return data
    }
  }

  // Personal config inherits from role config
  if (params.mbodyRole) {
    const { data } = await supabase
      .from('configurations')
      .select('*')
      .eq('mbody_role', params.mbodyRole)
      .single()
    if (data) return data
  }

  return null
}