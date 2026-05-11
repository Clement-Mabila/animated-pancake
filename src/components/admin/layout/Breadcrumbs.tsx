'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LABELS: Record<string, string> = {
  admin: 'Admin',
  configurations: 'Configurations',
  contacts: 'Contacts',
  audit: 'Audit log',
  exports: 'Exports',
  settings: 'Settings',
  edit: 'Edit',
  login: 'Login',
  verify: 'Verify',
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)

  if (parts.length <= 1) return null

  const crumbs: { href: string; label: string }[] = []
  let acc = ''
  for (const p of parts) {
    acc += `/${p}`
    const label = LABELS[p] ?? p.replace(/-/g, ' ')
    crumbs.push({ href: acc, label })
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs flex-wrap" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5">
          {i > 0 && (
            <span style={{ color: 'var(--text-muted)' }} className="select-none">
              /
            </span>
          )}
          {i === crumbs.length - 1 ? (
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {c.label}
            </span>
          ) : (
            <Link
              href={c.href}
              className="hover:underline font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
