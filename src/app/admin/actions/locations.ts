'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Location, SubLocation } from '@/types'

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return 'Something went wrong'
}

export async function adminCreateLocationWithSubsAction(input: {
  name:             string
  industry?:        string | null
  country?:         string | null
  city?:            string | null
  subLocationNames: string[]
}): Promise<{ ok: true; location: Location } | { ok: false; error: string }> {
  await requireAdminSession()
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Location name is required' }

  const subs = input.subLocationNames.map(s => s.trim()).filter(Boolean)
  const admin = createAdminClient()

  const { data: loc, error: locErr } = await admin
    .from('locations')
    .insert({
      name,
      industry: input.industry?.trim() || null,
      country:  input.country?.trim()  || null,
      city:     input.city?.trim()     || null,
    })
    .select()
    .single()

  if (locErr || !loc) {
    return { ok: false, error: locErr?.message ?? 'Failed to create location' }
  }

  if (subs.length > 0) {
    const { error: subErr } = await admin.from('sub_locations').insert(
      subs.map(n => ({ location_id: loc.id as string, name: n })),
    )
    if (subErr) {
      await admin.from('locations').delete().eq('id', loc.id as string)
      return { ok: false, error: subErr.message }
    }
  }

  revalidatePath('/admin/locations')
  return { ok: true, location: loc as Location }
}

export async function adminAddSubLocationAction(input: {
  locationId: string
  name:       string
}): Promise<{ ok: true; subLocation: SubLocation } | { ok: false; error: string }> {
  await requireAdminSession()
  const n = input.name.trim()
  if (!n) return { ok: false, error: 'Sub-location name is required' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sub_locations')
    .insert({ location_id: input.locationId, name: n })
    .select()
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Failed to create sub-location' }
  }
  revalidatePath('/admin/locations')
  return { ok: true, subLocation: data as SubLocation }
}

export async function adminUpdateLocationAction(input: {
  id:        string
  name:      string
  industry?: string | null
  country?:  string | null
  city?:     string | null
}): Promise<{ ok: true; location: Location } | { ok: false; error: string }> {
  await requireAdminSession()
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Location name is required' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('locations')
    .update({
      name,
      industry: input.industry?.trim() || null,
      country:  input.country?.trim()  || null,
      city:     input.city?.trim()     || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Failed to update location' }
  }
  revalidatePath('/admin/locations')
  return { ok: true, location: data as Location }
}

export async function adminDeleteSubLocationAction(
  subLocationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession()
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('sub_locations').delete().eq('id', subLocationId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/admin/locations')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

/** Deletes all sub-locations for the location, then the location row. */
export async function adminDeleteLocationAction(
  locationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession()
  try {
    const admin = createAdminClient()
    const { error: subErr } = await admin.from('sub_locations').delete().eq('location_id', locationId)
    if (subErr) return { ok: false, error: subErr.message }

    const { error: locErr } = await admin.from('locations').delete().eq('id', locationId)
    if (locErr) return { ok: false, error: locErr.message }

    revalidatePath('/admin/locations')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}
