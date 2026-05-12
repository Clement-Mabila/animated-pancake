'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { ConfigPerson, OrchestratorAccessScope, SubLocation } from '@/types'

export async function getPersonsForConfigAction(configurationId: string): Promise<ConfigPerson[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('config_persons')
    .select('*')
    .eq('configuration_id', configurationId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as ConfigPerson[]
}

export async function upsertConfigPersonAction(params: {
  id?:                 string
  configurationId:     string
  fullName:            string
  email:               string
  phone?:              string | null
  contactRoles?:       string[]
  accessScope?:        OrchestratorAccessScope | null
  subLocationIds?:     string[]
  canAmendSchedules?:  boolean
}): Promise<{ ok: true; person: ConfigPerson } | { ok: false; error: string }> {
  if (!params.fullName.trim()) return { ok: false, error: 'Name is required' }
  if (!params.email.trim())    return { ok: false, error: 'Email is required' }

  const db = createAdminClient()
  const payload = {
    configuration_id:    params.configurationId,
    full_name:           params.fullName.trim(),
    email:               params.email.toLowerCase().trim(),
    phone:               params.phone?.trim() || null,
    contact_roles:       params.contactRoles ?? [],
    access_scope:        params.accessScope ?? null,
    sub_location_ids:    params.subLocationIds ?? [],
    can_amend_schedules: params.canAmendSchedules ?? false,
  }

  if (params.id) {
    const { data, error } = await db
      .from('config_persons')
      .update(payload)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, person: data as ConfigPerson }
  }

  const { data, error } = await db
    .from('config_persons')
    .insert(payload)
    .select()
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, person: data as ConfigPerson }
}

export async function deleteConfigPersonAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient()
  const { error } = await db
    .from('config_persons')
    .delete()
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Used by OrchestratorUserSelector to promote a section-4 contact into a report recipient
export async function updatePersonScopeAction(params: {
  id:                  string
  accessScope:         OrchestratorAccessScope | null
  subLocationIds?:     string[]
  canAmendSchedules?:  boolean
}): Promise<{ ok: true; person: ConfigPerson } | { ok: false; error: string }> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('config_persons')
    .update({
      access_scope:        params.accessScope,
      sub_location_ids:    params.subLocationIds ?? [],
      can_amend_schedules: params.canAmendSchedules ?? false,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, person: data as ConfigPerson }
}

export async function updatePersonAmendAction(
  id: string,
  canAmendSchedules: boolean,
): Promise<{ ok: true; person: ConfigPerson } | { ok: false; error: string }> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('config_persons')
    .update({ can_amend_schedules: canAmendSchedules })
    .eq('id', id)
    .select()
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, person: data as ConfigPerson }
}

export async function getSubLocationsAction(locationId: string): Promise<SubLocation[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('sub_locations')
    .select('*')
    .eq('location_id', locationId)
    .order('name')
  if (error) throw error
  return (data ?? []) as SubLocation[]
}

export type ClientContactRow = {
  id:               string
  full_name:        string
  email:            string
  phone:            string | null
  role_label:       string
  role_label_custom: string | null
}

export async function getClientContactsForLocationAction(locationId: string): Promise<ClientContactRow[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('client_contacts')
    .select('id, full_name, email, phone, role_label, role_label_custom')
    .eq('location_id', locationId)
    .order('full_name')
  if (error) throw error
  return (data ?? []) as ClientContactRow[]
}
