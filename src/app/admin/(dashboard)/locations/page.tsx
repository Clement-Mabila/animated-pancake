// src/app/admin/(dashboard)/locations/page.tsx
import { fetchLocationsWithSubLocations } from '@/lib/admin/fetchAdminData'
import LocationsClient from '@/components/admin/locations/LocationsClient'

export default async function AdminLocationsPage() {
  const locations = await fetchLocationsWithSubLocations()
  return <LocationsClient locations={locations} />
}
