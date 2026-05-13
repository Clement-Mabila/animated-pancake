'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Pentagon,
  Bolt,
  Users,
  MapPin,
  AlignHorizontalJustifyCenter,
  CodeXml,
  BrainCog,
  PanelRight,
  LogOut,
  Workflow,
} from 'lucide-react'
import { signOutAction } from '@/app/admin/actions/auth'

/* ── Types ────────────────────────────────────────────────── */
type NavItemType = {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  href: string
}

/* ── Nav sections ─────────────────────────────────────────── */
const NAV_SECTIONS: NavItemType[][] = [
  [
    { icon: Pentagon,                       label: 'Overview',        href: '/admin' },
    { icon: Bolt,                           label: 'Configurations',  href: '/admin/configurations' },
    { icon: MapPin,                         label: 'Locations',       href: '/admin/locations' },
    { icon: Users,                          label: 'Contacts',        href: '/admin/contacts' },
    { icon: Workflow,                       label: 'Workflow',        href: '/admin/workflow' },
    { icon: AlignHorizontalJustifyCenter,   label: 'Audit log',       href: '/admin/audit' },
  ],
  [
    { icon: CodeXml,  label: 'Exports',     href: '/admin/exports' },
    { icon: BrainCog, label: 'Mbody Orion', href: '/admin/settings' },
  ]
]

/* ── Fading divider ───────────────────────────────────────── */
function FadingDivider() {
  return (
    <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-soft-lavender/20 to-transparent" />
  )
}

/* ── Tooltip (collapsed mode) ─────────────────────────────── */
const tooltip = `
  pointer-events-none absolute left-full ml-3 z-50
  rounded-full bg-elevated px-3 py-1.5 text-xs font-medium text-heading whitespace-nowrap
  opacity-0 translate-x-1 transition-all duration-150
  group-hover:opacity-100 group-hover:translate-x-0
  hidden lg:block
`

export default function Sidebar({
  expanded,
  onExpandChange,
  adminEmail,
}: {
  expanded: boolean
  onExpandChange: (v: boolean) => void
  adminEmail: string
}) {
  const pathname = usePathname()

  /* ── Nav item ───────────────────────────────────────────── */
    function NavItem({ icon: Icon, label, href }: NavItemType) {
      const active = pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'))

      /* collapsed */
      if (!expanded) {
        return (
          <Link
            href={href}
            title={label}
            className="group relative flex flex-col items-center justify-center w-10 mx-auto"
          >
            <span
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                active
                  ? 'bg-violet-600 text-white'
                  : 'text-body-text hover:bg-elevated hover:text-heading'
              }`}
            >
              <Icon size={17} strokeWidth={1.5} />
            </span>
            {active && (
              <span className="mt-1 w-1 h-1 rounded-full bg-violet-600" />
            )}
            <span className={tooltip}>{label}</span>
          </Link>
        )
      }

      /* expanded */
      return (
        <Link
          href={href}
          className="group flex items-center gap-3 w-full rounded-3xl px-1 py-1 transition-all duration-200 hover:bg-elevated"
        >
          <span
            className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all duration-200 ${
              active
                ? 'bg-violet-600 text-white'
                : 'text-body-text group-hover:text-heading'
            }`}
          >
            <Icon size={17} strokeWidth={1.5} />
          </span>
          <span
            className={`text-sm font-normal whitespace-nowrap flex-1 ${
              active ? 'text-heading font-medium' : 'text-body-text group-hover:text-heading'
            }`}
          >
            {label}
          </span>
          {active && (
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mr-1 shrink-0" />
          )}
        </Link>
      )
    }

  /* ── Sign out item ──────────────────────────────────────── */
  function SignOutItem() {
    if (!expanded) {
      return (
        <form action={signOutAction}>
          <button
            type="submit"
            title="Sign out"
            className="group relative flex items-center justify-center w-10 h-10 rounded-full mx-auto transition-all duration-200 text-error hover:bg-elevated"
          >
            <LogOut size={17} strokeWidth={1.5} />
            <span className={tooltip}>Sign out</span>
          </button>
        </form>
      )
    }

    return (
      <form action={signOutAction}>
        <button
          type="submit"
          className="group flex items-center gap-3 w-full rounded-full px-3 py-2.5 transition-all duration-200 text-error hover:bg-elevated"
        >
          <span className="flex items-center justify-center w-5 h-5 shrink-0">
            <LogOut size={17} strokeWidth={1.5} />
          </span>
          <span className="text-sm font-normal whitespace-nowrap">
            Sign out
          </span>
        </button>
      </form>
    )
  }

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside
        className={`
          hidden lg:flex flex-col min-h-screen fixed top-0 left-0 z-40 py-5
          overflow-hidden transition-all duration-300 ease-in-out
          bg-surface  shadow-none
          ${expanded ? 'w-56' : 'w-[72px]'}
        `}
      >
        {/* Logo + Toggle */}
        <div className="flex items-center justify-between px-4 mb-4">
          {expanded && (
            <button
              onClick={() => (window.location.href = '/admin')}
              className="text-medium font-bold text-heading hover:text-body-text transition-colors ml-3"
            >
              Orion Console
            </button>
          )}

          <button
            type="button"
            onClick={() => onExpandChange(!expanded)}
            className="flex items-center justify-center w-8 h-8 rounded-full text-muted bg-elevated  hover:text-body-text transition-all"
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <PanelRight
              size={16}
              strokeWidth={1.5}
              className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <FadingDivider />

        {/* Nav sections */}
        <nav className="flex flex-col flex-1 px-3 mt-1">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              <div className="flex flex-col gap-0.5">
                {section.map(item => (
                  <NavItem key={item.href} {...item} />
                ))}
              </div>
              {si < NAV_SECTIONS.length - 1 && <FadingDivider />}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <FadingDivider />
        <div className="px-3 space-y-1">
          {expanded && (
            <p className="text-xs px-3 truncate mb-2 text-muted">
              {adminEmail}
            </p>
          )}
          <SignOutItem />
        </div>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2 bg-surface border-t border-soft-lavender/20">
        {NAV_SECTIONS.flat().slice(0, 5).map(({ icon: Icon, label, href }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all ${
                active ? 'text-bright-violet' : 'text-muted'
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />
              <span className="text-xs font-normal">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}