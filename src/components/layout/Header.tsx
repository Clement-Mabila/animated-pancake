'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface HeaderProps {
  progress?: number        // 0–100
  sectionsComplete?: number
  totalSections?: number
}

export default function Header({
  progress = 0,
  sectionsComplete = 0,
  totalSections = 10,
}: HeaderProps) {
  const { theme, toggle } = useTheme()

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-10 h-[60px]"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid rgba(165,42,225,0.10)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 1px 24px rgba(165,42,225,0.06)',
      }}
    >
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 no-underline">
        <svg
          width="32" height="32" viewBox="0 0 32 32"
          fill="none" xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0"
        >
          <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0081FF" />
              <stop offset="100%" stopColor="#A52AE1" />
            </linearGradient>
          </defs>
          <path d="M16 4C10.5 4 6 8.5 6 14c0 2.2.7 4.2 1.9 5.8L7 22l2.5-.5c1.2.8 2.7 1.3 4.3 1.4"
            stroke="url(#lg1)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M16 4c5.5 0 10 4.5 10 10 0 2.2-.7 4.2-1.9 5.8L25 22l-2.5-.5c-1.2.8-2.7 1.3-4.3 1.4"
            stroke="url(#lg1)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <line x1="16" y1="4" x2="16" y2="23" stroke="url(#lg1)" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="9.5" cy="12" r="1.2" fill="url(#lg1)" />
          <circle cx="8" cy="17" r="1" fill="url(#lg1)" />
          <line x1="9.5" y1="12" x2="8" y2="17" stroke="url(#lg1)" strokeWidth="0.9" />
          <line x1="9.5" y1="12" x2="13" y2="12" stroke="url(#lg1)" strokeWidth="0.9" />
          <circle cx="22.5" cy="12" r="1.2" fill="url(#lg1)" />
          <circle cx="24" cy="17" r="1" fill="url(#lg1)" />
          <line x1="22.5" y1="12" x2="24" y2="17" stroke="url(#lg1)" strokeWidth="0.9" />
          <line x1="22.5" y1="12" x2="19" y2="12" stroke="url(#lg1)" strokeWidth="0.9" />
          <circle cx="13" cy="12" r="1" fill="url(#lg1)" />
          <circle cx="19" cy="12" r="1" fill="url(#lg1)" />
          <line x1="13" y1="12" x2="13" y2="18" stroke="url(#lg1)" strokeWidth="0.9" />
          <line x1="19" y1="12" x2="19" y2="18" stroke="url(#lg1)" strokeWidth="0.9" />
          <line x1="13" y1="18" x2="16" y2="22" stroke="url(#lg1)" strokeWidth="0.9" />
          <line x1="19" y1="18" x2="16" y2="22" stroke="url(#lg1)" strokeWidth="0.9" />
          <circle cx="16" cy="22" r="1.3" fill="url(#lg1)" />
          <circle cx="16" cy="4" r="1.5" fill="url(#lg1)" />
        </svg>
        <span
          className="text-base font-semibold tracking-tight"
          style={{
            background: 'linear-gradient(90deg, #0081FF 0%, #A52AE1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          MBody AI
        </span>
      </a>

      {/* Centre label */}
      <span
        className="absolute left-1/2 -translate-x-1/2 text-[11px] font-medium uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        Orchestrator · Client Onboarding
      </span>

      {/* Right side — progress + theme toggle */}
      <div className="flex items-center gap-3">

        {/* Sections counter */}
        <span
          className="text-xs font-medium mr-5"
          style={{ color: 'var(--text-muted)' }}
        >
          {sectionsComplete} / {totalSections}
        </span>

        {/* Progress track — matches HTML version exactly */}
        <div
          style={{
            width: '100px',
            height: '4px',
            background: 'rgba(165,42,225,0.12)',
            borderRadius: '99px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(135deg, #0081FF 0%, #A52AE1 100%)',
              borderRadius: '99px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Percentage label */}
        <span
          className="text-xs font-semibold"
          style={{
            minWidth: '32px',
            background: 'linear-gradient(135deg, #0081FF 0%, #A52AE1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {progress}%
        </span>

        {/* Theme toggle — rounded-full pill with gradient border */}
        <button
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 hover:scale-105"
          style={{
            background:
              theme === 'dark'
                ? 'linear-gradient(135deg, rgba(0,129,255,0.15) 0%, rgba(165,42,225,0.15) 100%)'
                : 'linear-gradient(135deg, rgba(165,42,225,0.08) 0%, rgba(0,129,255,0.08) 100%)',
            boxShadow:
              theme === 'dark'
                ? '0 0 0 1px rgba(0,129,255,0.30), 0 2px 8px rgba(0,129,255,0.15)'
                : '0 0 0 1px rgba(165,42,225,0.20), 0 2px 8px rgba(165,42,225,0.08)',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          {theme === 'dark' ? (
            <Sun
              size={15}
              strokeWidth={1.8}
              style={{
                color: '#3999FE',
                filter: 'drop-shadow(0 0 4px rgba(0,129,255,0.5))',
              }}
            />
          ) : (
            <Moon
              size={15}
              strokeWidth={1.8}
              style={{
                color: '#A52AE1',
                filter: 'drop-shadow(0 0 4px rgba(165,42,225,0.4))',
              }}
            />
          )}
        </button>
      </div>
    </header>
  )
}