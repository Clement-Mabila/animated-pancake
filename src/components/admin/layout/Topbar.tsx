'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef } from 'react'
import { Search, Bell, Bolt, Sun, Moon, Settings, LogOut, User, ShieldOff, ShieldCheck } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import Avatar from '@/components/admin/common/Avatar'
import { toggleSkipOtpAction, signOutAction } from '@/app/admin/actions/auth'
import { useToast } from '@/context/ToastContext'

export default function Topbar({
  adminName,
  adminEmail,
  initialSkipOtp,
}: {
  adminName:      string
  adminEmail:     string
  initialSkipOtp: boolean
}) {
  const { theme, toggle } = useTheme()
  const router = useRouter()
  const { showToast } = useToast()
  const [q, setQ] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [skipOtp, setSkipOtp] = useState(initialSkipOtp)

  const handleToggleOtp = async () => {
    const next = !skipOtp
    setSkipOtp(next)
    const result = await toggleSkipOtpAction(next)
    if (!result.ok) {
      setSkipOtp(!next)
      showToast('error', result.error ?? 'Failed to update OTP setting.')
    } else {
      showToast('complete', next ? 'OTP disabled for your account.' : 'OTP enabled for your account.')
    }
  }

  const onSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const term = q.trim()
      if (!term) return
      router.push(`/admin/configurations?q=${encodeURIComponent(term)}`)
    },
    [q, router]
  )

  /** Open immediately on mouse enter */
  const handleAvatarEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setDropdownOpen(true)
  }

  /** Delay close so the cursor can travel from avatar → panel */
  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setDropdownOpen(false), 120)
  }

  /** Cancel the delayed close when the cursor reaches the panel */
  const handlePanelEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  return (
    <header className="h-[68px] bg-surface flex items-center px-4 gap-3 sticky top-0 z-30 shadow-none border-none">

      {/* Search pill */}
      <form onSubmit={onSearch} className="flex-1 max-w-sm">
        <div className="flex items-center gap-2 bg-elevated rounded-full px-4 py-2.5">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            type="text"
            placeholder="Search configurations…"
            className="bg-transparent text-sm text-body-text placeholder:text-muted outline-none w-full font-normal"
          />
          <button type="submit" aria-label="Search" className="shrink-0">
            <Search size={17} strokeWidth={2} className="text-body-text" />
          </button>
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto">

        {/* Bolt */}
        <button
          type="button"
          aria-label="Quick actions"
          className="flex items-center justify-center w-8 h-8 bg-elevated rounded-full text-body-text hover:text-heading transition-all"
        >
          <Bolt size={16} strokeWidth={1.5} />
        </button>

        {/* Bell — red dot */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex items-center justify-center w-8 h-8 bg-elevated rounded-full text-body-text hover:text-heading transition-all"
        >
          <Bell size={16} strokeWidth={1.5} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-error ring-1 ring-surface" />
        </button>

        {/* Avatar + Dropdown */}
        <div
          className="relative"
          onMouseEnter={handleAvatarEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Trigger */}
          <button type="button" aria-label="User menu" className="flex items-center">
            <Avatar name={adminName} email={adminEmail} size="sm" glow />
          </button>

          {/* Dropdown panel */}
          <div
            onMouseEnter={handlePanelEnter}
            onMouseLeave={handleMouseLeave}
            className={`
              absolute right-0 top-[calc(100%+10px)] w-64
              rounded-2xl border overflow-hidden
              transition-all duration-200 origin-top-right
              ${dropdownOpen
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none'}
            `}
            style={{
              background:  'var(--bg-surface)',
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              boxShadow:   theme === 'dark'
                ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)',
            }}
          >
            {/* ── User info ── */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <Avatar name={adminName} email={adminEmail} size="md" glow />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-heading truncate leading-tight">
                  {adminName}
                </p>
                <p className="text-xs text-muted truncate mt-0.5 leading-tight">
                  {adminEmail}
                </p>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="h-px mx-3" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />

            {/* ── Menu items ── */}
            <div className="px-2 py-2 flex flex-col gap-0.5">

              {/* Profile */}
              <button
                type="button"
                onClick={() => router.push('/admin/profile')}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-body-text hover:bg-elevated hover:text-heading transition-colors text-left"
              >
                <User size={16} strokeWidth={1.6} className="shrink-0 text-body-text" />
                <span>Profile</span>
              </button>

              {/* Dark mode toggle row */}
              <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-elevated transition-colors">
                <span className="shrink-0 text-body-text">
                  {theme === 'dark'
                    ? <Moon size={16} strokeWidth={1.6} />
                    : <Sun  size={16} strokeWidth={1.6} />}
                </span>
                <span className="flex-1 text-sm text-body-text">
                  {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                </span>
                {/* Toggle pill */}
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  className={`
                    relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full
                    transition-colors duration-200 focus:outline-none
                  `}
                  style={{
                    background: theme === 'dark' ? 'var(--text-primary)' : 'var(--bg-elevated)',
                    border: theme === 'dark' ? 'none' : '1.5px solid rgba(0,0,0,0.18)',
                  }}
                >
                  <span
                    className={`
                      inline-block h-3.5 w-3.5 rounded-full shadow
                      absolute top-[3px]
                      transition-transform duration-200
                      ${theme === 'dark' ? 'translate-x-[18px] bg-surface' : 'translate-x-[3px] bg-body-text'}
                    `}
                  />
                </button>
              </div>

              {/* OTP toggle row */}
              <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-elevated transition-colors">
                <span className="shrink-0 text-body-text">
                  {skipOtp
                    ? <ShieldOff size={16} strokeWidth={1.6} />
                    : <ShieldCheck size={16} strokeWidth={1.6} />}
                </span>
                <span className="flex-1 text-sm text-body-text">
                  {skipOtp ? 'OTP disabled' : 'OTP enabled'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleOtp}
                  aria-label={skipOtp ? 'Enable OTP' : 'Disable OTP'}
                  className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none"
                  style={{
                    background: skipOtp ? 'var(--text-primary)' : 'var(--bg-elevated)',
                    border: skipOtp ? 'none' : '1.5px solid rgba(0,0,0,0.18)',
                  }}
                >
                  <span
                    className={`
                      inline-block h-3.5 w-3.5 rounded-full shadow
                      absolute top-[3px]
                      transition-transform duration-200
                      ${skipOtp ? 'translate-x-[18px] bg-surface' : 'translate-x-[3px] bg-body-text'}
                    `}
                  />
                </button>
              </div>

              {/* Settings */}
              <button
                type="button"
                onClick={() => router.push('/admin/settings')}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-body-text hover:bg-elevated hover:text-heading transition-colors text-left"
              >
                <Settings size={16} strokeWidth={1.6} className="shrink-0 text-body-text" />
                <span>Settings</span>
              </button>
            </div>

            {/* ── Divider ── */}
            <div className="h-px mx-3" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />

            {/* ── Sign out ── */}
            <div className="px-2 py-2">
              <button
                type="button"
                onClick={() => signOutAction()}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-body-text hover:bg-elevated hover:text-heading transition-colors text-left"
              >
                <LogOut size={16} strokeWidth={1.6} className="shrink-0 text-body-text" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}