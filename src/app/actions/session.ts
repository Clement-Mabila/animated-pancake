'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { PHASE_ORDER, PHASE_SECTIONS } from '@/lib/phases'
import type {
  Location,
  SubLocation,
  Configuration,
  ClientContact,
  ContactRoleLabel,
  ConfigPhase,
  StaffUser,
  StaffIdentity,
  ConfigScope,
  MBodyRole,
  SectionId,
} from '@/types'

// ── Locations ───────────────────────────────────────────────

export async function createLocationAction(params: {
  name:      string
  industry?: string
  country?:  string
  city?:     string
}): Promise<Location> {
  const supabase = createAdminClient()
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

export async function updateLocationAction(params: {
  id:       string
  name:     string
  industry?: string
  country?:  string
  city?:     string
}): Promise<Location> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('locations')
    .update({
      name:     params.name.trim(),
      industry: params.industry?.trim() || null,
      country:  params.country?.trim()  || null,
      city:     params.city?.trim()     || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createSubLocationAction(params: {
  locationId: string
  name:       string
}): Promise<SubLocation> {
  const supabase = createAdminClient()
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

// ── Staff users ─────────────────────────────────────────────

export async function upsertStaffUserAction(identity: StaffIdentity): Promise<StaffUser> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('staff_users')
    .upsert(
      {
        email:      identity.email,
        full_name:  identity.fullName,
        role:       identity.role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Configurations ──────────────────────────────────────────

export async function createConfigurationAction(params: {
  scope:          ConfigScope
  staffUserId:    string
  locationId?:    string
  subLocationId?: string
  mbodyRole?:     MBodyRole
  email:          string
}): Promise<Configuration> {
  const supabase = createAdminClient()

  // Rule 2: sublocation-only — one config per sublocation (no contact)
  if (params.subLocationId) {
    const { data: existing } = await supabase
      .from('configurations')
      .select('*')
      .eq('sub_location_id', params.subLocationId)
      .is('client_contact_id', null)
      .maybeSingle()
    if (existing) return existing as Configuration
  } else if (params.locationId) {
    // Rule 1: location-only — one config per location (no sublocation, no contact)
    const { data: existing } = await supabase
      .from('configurations')
      .select('*')
      .eq('location_id', params.locationId)
      .is('sub_location_id', null)
      .is('client_contact_id', null)
      .maybeSingle()
    if (existing) return existing as Configuration
  }

  const insert: Record<string, unknown> = {
    scope:          params.scope,
    status:         'draft',
    staff_user_id:  params.staffUserId,
    last_edited_by: params.email,
    last_edited_at: new Date().toISOString(),
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

// ── Config sections ─────────────────────────────────────────

export async function upsertConfigSectionAction(
  configId:         string,
  sectionId:        SectionId,
  data:             Record<string, unknown>,
  isComplete:       boolean = false,
  completedByEmail?: string
): Promise<void> {
  const supabase = createAdminClient()
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

export async function updateConfigurationLastEditedAction(
  configId: string,
  email:    string
): Promise<void> {
  const supabase = createAdminClient()
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

// ── Client contacts ─────────────────────────────────────────

// Upsert a client contact — creates new or updates existing on (email, location_id).
// Used when staff selects "Add new contact" in the session selector.
export async function upsertClientContactAction(params: {
  fullName:            string
  email:               string
  phone?:              string
  roleLabel:           ContactRoleLabel
  roleLabelCustom?:    string
  locationId:          string
  subLocationId?:      string
  orchestratorUserId?: string
}): Promise<ClientContact> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_contacts')
    .upsert(
      {
        full_name:            params.fullName.trim(),
        email:                params.email.toLowerCase().trim(),
        phone:                params.phone?.trim()             ?? null,
        role_label:           params.roleLabel,
        role_label_custom:    params.roleLabelCustom?.trim()   ?? null,
        location_id:          params.locationId,
        sub_location_id:      params.subLocationId             ?? null,
        orchestrator_user_id: params.orchestratorUserId        ?? null,
      },
      { onConflict: 'email,location_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// Create a configuration linked to a client contact with an explicit starting phase.
// Used instead of createConfigurationAction when target = 'client'.
export async function createPhaseConfigurationAction(params: {
  scope:              ConfigScope
  staffUserId:        string
  clientContactId:    string
  phase:              ConfigPhase
  locationId?:        string
  subLocationId?:     string
  email:              string
  workflowTemplateId?: string
}): Promise<Configuration> {
  const supabase = createAdminClient()

  // Rule 4: contact + sublocation — one config per (contact, sublocation)
  if (params.subLocationId) {
    const { data: existing } = await supabase
      .from('configurations')
      .select('*')
      .eq('client_contact_id', params.clientContactId)
      .eq('sub_location_id', params.subLocationId)
      .maybeSingle()
    if (existing) return existing as Configuration
  } else if (params.locationId) {
    // Rule 3: contact + location (no sublocation) — one config per (contact, location)
    const { data: existing } = await supabase
      .from('configurations')
      .select('*')
      .eq('client_contact_id', params.clientContactId)
      .eq('location_id', params.locationId)
      .is('sub_location_id', null)
      .maybeSingle()
    if (existing) return existing as Configuration
  } else {
    // Fallback: contact with no location context — prevent any duplicate
    const { data: existing } = await supabase
      .from('configurations')
      .select('*')
      .eq('client_contact_id', params.clientContactId)
      .is('location_id', null)
      .maybeSingle()
    if (existing) return existing as Configuration
  }

  const insert: Record<string, unknown> = {
    scope:             params.scope,
    status:            'draft',
    phase:             params.phase,
    staff_user_id:     params.staffUserId,
    client_contact_id: params.clientContactId,
    last_edited_by:    params.email,
    last_edited_at:    new Date().toISOString(),
  }

  if (params.locationId)         insert.location_id          = params.locationId
  if (params.subLocationId)      insert.sub_location_id      = params.subLocationId
  if (params.workflowTemplateId) insert.workflow_template_id = params.workflowTemplateId

  const { data, error } = await supabase
    .from('configurations')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

// Advance or roll back the phase of an existing configuration.
// Advance: only one step forward is allowed per call.
// Rollback: only one step back; clears is_complete on sections that are in
//           the current phase but not in the target phase (data is preserved).
export async function advanceConfigPhaseAction(
  configId: string,
  newPhase:  ConfigPhase
): Promise<void> {
  const supabase = createAdminClient()

  // Fetch current phase to validate the transition
  const { data: current, error: fetchError } = await supabase
    .from('configurations')
    .select('phase')
    .eq('id', configId)
    .single()
  if (fetchError) throw fetchError

  const currentIdx = PHASE_ORDER.indexOf(current.phase as ConfigPhase)
  const newIdx     = PHASE_ORDER.indexOf(newPhase)

  if (Math.abs(newIdx - currentIdx) !== 1) {
    throw new Error(`Phase transition from ${current.phase} to ${newPhase} is not allowed. Only one step at a time.`)
  }

  // On rollback: clear is_complete for sections exclusive to the current phase
  if (newIdx < currentIdx) {
    // Build phase→sections map from DB (active template gate questions), fall back to hardcoded
    const { data: activeTemplate } = await supabase
      .from('workflow_templates')
      .select('id')
      .eq('is_active', true)
      .eq('is_draft', false)
      .maybeSingle()

    let phaseMap: Record<ConfigPhase, SectionId[]> = PHASE_SECTIONS
    if (activeTemplate) {
      const { data: gateRows } = await supabase
        .from('workflow_questions')
        .select('section_slug, visible_in_phases')
        .eq('template_id', activeTemplate.id)
        .eq('field_key', '__all__')
        .eq('active', true)

      if (gateRows && gateRows.length > 0) {
        phaseMap = { early: [], pre_deploy: [], deploy: [], post: [] }
        for (const row of gateRows) {
          for (const phase of row.visible_in_phases as ConfigPhase[]) {
            phaseMap[phase].push(row.section_slug as SectionId)
          }
        }
      }
    }

    const currentSections = phaseMap[current.phase as ConfigPhase]
    const targetSections  = phaseMap[newPhase]
    const sectionsToReset = currentSections.filter(s => !targetSections.includes(s))

    if (sectionsToReset.length > 0) {
      const { error: resetError } = await supabase
        .from('config_sections')
        .update({ is_complete: false })
        .eq('configuration_id', configId)
        .in('section_id', sectionsToReset)
      if (resetError) throw resetError
    }
  }

  // Update phase and reset status to draft for the new phase's work
  const { error: updateError } = await supabase
    .from('configurations')
    .update({
      phase:      newPhase,
      status:     'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', configId)
  if (updateError) throw updateError
}

// ── Deploy checklist ────────────────────────────────────────

export async function updateDeployChecklistAction(
  configId:  string,
  checklist: Record<string, boolean>
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('configurations')
    .update({
      deploy_checklist: checklist,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', configId)
  if (error) throw error
}

// ── Config suggestions ──────────────────────────────────────

export async function saveSuggestionAction(
  sectionId: string,
  fieldKey:  string,
  value:     string,
  industry?: string | null
): Promise<void> {
  const trimmed = value.trim()
  if (trimmed.length < 3) return

  const supabase = createAdminClient()

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

export async function updateConfigurationStatusAction(
  configId:          string,
  status:            Configuration['status'],
  completedByEmail?: string
): Promise<void> {
  const supabase = createAdminClient()
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