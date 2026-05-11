import { Suspense } from 'react'
import LoginForm from '@/components/admin/auth/LoginForm'

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1c1e] p-4">
      <Suspense fallback={<p className="text-white/50 text-sm">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
