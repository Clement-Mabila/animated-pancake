import RegisterForm from '@/components/admin/auth/RegisterForm'

export default function AdminRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: 'var(--bg-primary)' }}>
      <RegisterForm />
    </div>
  )
}
