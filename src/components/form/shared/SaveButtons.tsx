'use client'

import { useToast } from '@/context/ToastContext'

interface SaveButtonsProps {
  onSaveDraft: () => void
  onComplete: () => void
  isSaving: boolean
  isComplete: boolean
}

export default function SaveButtons({
  onSaveDraft,
  onComplete,
  isSaving,
  isComplete,
}: SaveButtonsProps) {
  const { showToast } = useToast()

  function handleDraft() {
    onSaveDraft()
    showToast('draft')
  }

  function handleComplete() {
    onComplete()
    showToast('complete', 'Section complete ✓')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
      {/* Save draft */}
      {!isComplete && (
        <button
          onClick={handleDraft}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            background: 'transparent',
            border: 'var(--border-subtle)',
            color: 'var(--text-muted)',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-family)',
          }}
          onMouseEnter={e => {
            if (!isSaving) {
              e.currentTarget.style.borderColor = 'rgba(146,140,227,0.4)'
              e.currentTarget.style.color = 'var(--text-body)'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = ''
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          {isSaving ? 'Saving...' : 'Save draft'}
        </button>
      )}

      {/* Mark complete */}
      <button
        onClick={handleComplete}
        disabled={isSaving || isComplete}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'var(--font-family)',
          transition: 'all 0.2s',
          ...(isComplete
            ? {
                background: 'rgba(0,129,255,0.08)',
                border: '1px solid rgba(0,129,255,0.25)',
                color: 'var(--electric-blue)',
                cursor: 'default',
              }
            : {
                background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
                border: 'none',
                color: 'white',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: '0 2px 12px rgba(0,129,255,0.25)',
              }
          ),
        }}
        onMouseEnter={e => {
          if (!isSaving && !isComplete) e.currentTarget.style.opacity = '0.88'
        }}
        onMouseLeave={e => {
          if (!isSaving && !isComplete) e.currentTarget.style.opacity = '1'
        }}
      >
        {isSaving
          ? 'Saving...'
          : isComplete
          ? '✓ Section complete'
          : 'Mark section complete →'}
      </button>
    </div>
  )
}