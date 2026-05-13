// src/components/admin/locations/Locationsconstants.ts
import type { Location, SubLocation } from '@/types'

export type LocationRow = Location & { sub_locations: SubLocation[] }

export type LocationSortField = 'name' | 'place' | 'industry' | 'subs' | 'created' | null

export type SortDirection = 'asc' | 'desc'

export function placeSortKey(row: LocationRow): string {
  const parts = [row.city, row.country].filter(Boolean).join(' ').trim()
  return parts.toLowerCase() || '\uffff'
}
