'use client'

import { useState } from 'react'
import Sidebar from '@/components/admin/layout/Sidebar'
import Topbar from '@/components/admin/layout/Topbar'

export default function AdminShell({
  children,
  adminEmail,
  adminName,
  initialSkipOtp,
}: {
  children: React.ReactNode
  adminEmail: string
  adminName: string
  initialSkipOtp: boolean
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        expanded={sidebarExpanded}
        onExpandChange={setSidebarExpanded}
        adminEmail={adminEmail}
      />

      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          sidebarExpanded ? 'lg:pl-56' : 'lg:pl-[72px]'
        }`}
      >
        <Topbar adminName={adminName} adminEmail={adminEmail} initialSkipOtp={initialSkipOtp} />
        <main className="flex-1 p-20 sm:p-10 pb-24 lg:pb-8 w-full ">{children}</main>
      </div>
    </div>
  )
}
