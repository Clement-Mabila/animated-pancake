'use client'

import { useToast, type Toast, type ToastType } from '@/context/ToastContext'

function getToastStyles(type: ToastType) {
  switch (type) {
    case 'complete':
      return {
        background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
        border: 'none',
        iconColor: 'white',
        textColor: 'white',
        timeColor: 'rgba(255,255,255,0.7)',
        dismissColor: 'rgba(255,255,255,0.7)',
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5" />
            <path d="M4.5 7L6.5 9L9.5 5" stroke="white" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      }
    case 'draft':
      return {
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(34,197,94,0.35)',
        iconColor: '#22C55E',
        textColor: 'var(--text-primary)',
        timeColor: 'var(--text-muted)',
        dismissColor: 'var(--text-muted)',
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 10.5V12h1.5l4.5-4.5-1.5-1.5L2 10.5z" fill="#22C55E" />
            <path d="M11.7 3.3a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0L7.5 1.5 10.5 4.5l1.2-1.2z" fill="#22C55E" />
          </svg>
        ),
      }
    case 'autosave':
      return {
        background: 'var(--bg-elevated)',
        border: 'var(--border-subtle)',
        iconColor: 'var(--soft-lavender)',
        textColor: 'var(--text-muted)',
        timeColor: 'var(--text-muted)',
        dismissColor: 'var(--text-muted)',
        icon: (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="var(--soft-lavender)" strokeWidth="1.2" />
            <path d="M6.5 4v2.5l1.5 1.5" stroke="var(--soft-lavender)" strokeWidth="1.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      }
    case 'error':
      return {
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(239,68,68,0.35)',
        iconColor: '#EF4444',
        textColor: 'var(--text-primary)',
        timeColor: 'var(--text-muted)',
        dismissColor: 'var(--text-muted)',
        icon: (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#EF4444" strokeWidth="1.5" />
            <path d="M7 4v3M7 9.5v.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ),
      }
  }
}

function ToastItem({ toast }: { toast: Toast }) {
  const { dismissToast } = useToast()
  const styles = getToastStyles(toast.type)
  const isAutosave = toast.type === 'autosave'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: isAutosave ? '8px 12px' : '11px 14px',
        borderRadius: '10px',
        background: styles.background,
        border: styles.border,
        boxShadow: isAutosave
          ? '0 2px 8px rgba(0,0,0,0.15)'
          : '0 4px 20px rgba(0,0,0,0.25)',
        minWidth: isAutosave ? '160px' : '220px',
        maxWidth: '300px',
        animation: 'toastSlideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Icon */}
      <div style={{ flexShrink: 0 }}>
        {styles.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: isAutosave ? '11px' : '13px',
          fontWeight: isAutosave ? 500 : 600,
          color: styles.textColor,
          lineHeight: 1.3,
        }}>
          {toast.message}
        </div>
        {!isAutosave && (
          <div style={{
            fontSize: '10px',
            color: styles.timeColor,
            marginTop: '1px',
          }}>
            {toast.time}
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => dismissToast(toast.id)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: styles.dismissColor,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '72px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}