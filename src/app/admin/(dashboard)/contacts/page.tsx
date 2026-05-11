// src/app/admin/contacts/page.jsx
import { fetchClientContactsList } from '@/lib/admin/fetchAdminData'
import ContactsClient from '@/components/admin/contacts/ContactsClient'

export default async function AdminContactsPage() {
  const contacts = await fetchClientContactsList()
  return <ContactsClient contacts={contacts} />
}