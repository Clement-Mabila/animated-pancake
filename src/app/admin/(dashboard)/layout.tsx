import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import AdminShell from '@/components/admin/layout/AdminShell'
import ToastContainer from '@/components/ui/ToastContainer'

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { adminUser } = await requireAdminSession()

  return (
    <AdminShell
      adminEmail={adminUser.email}
      adminName={adminUser.full_name ?? adminUser.email}
      initialSkipOtp={adminUser.skip_otp ?? false}
    >
      <ToastContainer />
      {children}
    </AdminShell>
  )
}
