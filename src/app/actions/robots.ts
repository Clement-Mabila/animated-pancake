'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { saveSuggestionAction } from '@/app/actions/session'
import { z } from 'zod'

const robotInput = z.object({
  sub_location_id:  z.string().uuid(),
  serial_id:        z.string().max(100).nullable().optional(),
  alias:            z.string().max(100).nullable().optional(),
  map_name:         z.string().max(200).nullable().optional(),
  map_verified:     z.boolean().optional(),
  model:            z.string().max(100).nullable().optional(),
  firmware_version: z.string().max(100).nullable().optional(),
  floor_level:      z.number().int().nullable().optional(),
  commissioned_at:  z.string().nullable().optional(),
})

function toRow(p: z.infer<typeof robotInput>) {
  return {
    sub_location_id:  p.sub_location_id,
    serial_id:        p.serial_id?.trim()        || null,
    alias:            p.alias?.trim()            || null,
    map_name:         p.map_name?.trim()         || null,
    map_verified:     p.map_verified             ?? false,
    model:            p.model?.trim()            || null,
    firmware_version: p.firmware_version?.trim() || null,
    floor_level:      p.floor_level              ?? null,
    commissioned_at:  p.commissioned_at          || null,
  }
}

async function saveSuggestions(p: z.infer<typeof robotInput>) {
  if (p.model?.trim())
    saveSuggestionAction('fleet', 'robot_model', p.model.trim()).catch(() => {})
  if (p.firmware_version?.trim())
    saveSuggestionAction('fleet', 'robot_firmware', p.firmware_version.trim()).catch(() => {})
}

export async function addRobotAction(
  input: z.infer<typeof robotInput>
): Promise<void> {
  const p = robotInput.parse(input)
  const supabase = createAdminClient()
  const { error } = await supabase.from('robots').insert(toRow(p))
  if (error) throw error
  await saveSuggestions(p)
}

export async function updateRobotAction(
  robotId: string,
  input: z.infer<typeof robotInput>
): Promise<void> {
  z.string().uuid().parse(robotId)
  const p = robotInput.parse(input)
  const supabase = createAdminClient()
  const { error } = await supabase.from('robots').update(toRow(p)).eq('id', robotId)
  if (error) throw error
  await saveSuggestions(p)
}

export async function deleteRobotAction(robotId: string): Promise<void> {
  z.string().uuid().parse(robotId)
  const supabase = createAdminClient()
  const { error } = await supabase.from('robots').delete().eq('id', robotId)
  if (error) throw error
}

export async function importRobotsAction(
  robots: z.infer<typeof robotInput>[]
): Promise<{ count: number }> {
  const parsed = z.array(robotInput).min(1).max(500).parse(robots)
  const supabase = createAdminClient()
  const { error } = await supabase.from('robots').insert(parsed.map(toRow))
  if (error) throw error
  // Save unique model/firmware suggestions from the batch
  const models   = [...new Set(parsed.map(r => r.model?.trim()).filter(Boolean))] as string[]
  const firmwares = [...new Set(parsed.map(r => r.firmware_version?.trim()).filter(Boolean))] as string[]
  models.forEach(v   => saveSuggestionAction('fleet', 'robot_model',    v).catch(() => {}))
  firmwares.forEach(v => saveSuggestionAction('fleet', 'robot_firmware', v).catch(() => {}))
  return { count: parsed.length }
}
