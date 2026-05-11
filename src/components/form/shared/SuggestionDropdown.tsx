'use client'

import type { ConfigSuggestion } from '@/types'

interface SuggestionDropdownProps {
  id:          string
  suggestions: ConfigSuggestion[]
  hasMore:     boolean
  loading:     boolean
  activeIndex: number
  style:       React.CSSProperties
  onSelect:    (value: string) => void
  onShowMore:  () => void
}

export default function SuggestionDropdown({
  id,
  suggestions,
  hasMore,
  loading,
  activeIndex,
  style,
  onSelect,
  onShowMore,
}: SuggestionDropdownProps) {
  // Show loading skeleton or empty — either way render the container
  // so ARIA stays consistent
  if (!loading && suggestions.length === 0) return null

  return (
    <div
      id={id}
      role="listbox"
      aria-label="Suggestions"
      style={{
        ...style,
        background:   'var(--bg-surface, #1a1a2e)',
        border:       '1px solid rgba(146,140,227,0.25)',
        borderRadius: '10px',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(165,42,225,0.10)',
        overflow:     'hidden',
        animation:    'suggestionFadeIn 0.12s ease-out',
      }}
    >
      {/* Loading skeleton */}
      {loading && suggestions.length === 0 && (
        <div style={{ padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[0.7, 0.5, 0.6].map((w, i) => (
            <div
              key={i}
              style={{
                height:       '12px',
                borderRadius: '6px',
                width:        `${w * 100}%`,
                background:   'rgba(146,140,227,0.12)',
                animation:    `suggestionPulse 1.4s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Suggestion items */}
      {suggestions.map((s, i) => {
        const isActive = i === activeIndex
        return (
          <button
            key={s.id}
            id={`suggestion-${i}`}
            role="option"
            aria-selected={isActive}
            onMouseDown={e => e.preventDefault()} // prevent blur before click
            onClick={() => onSelect(s.value)}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              width:          '100%',
              padding:        '9px 13px',
              background:     isActive
                ? 'rgba(146,140,227,0.13)'
                : 'transparent',
              border:         'none',
              borderBottom:   i < suggestions.length - 1 || hasMore
                ? '1px solid rgba(146,140,227,0.10)'
                : 'none',
              borderLeft:     isActive
                ? '2px solid rgba(146,140,227,0.6)'
                : '2px solid transparent',
              color:          'var(--text-primary, #e0e0ff)',
              fontFamily:     'var(--font-family, inherit)',
              fontSize:       '13px',
              textAlign:      'left',
              cursor:         'pointer',
              transition:     'background 0.1s, border-left-color 0.1s',
              gap:            '8px',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = 'rgba(146,140,227,0.08)'
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{
              flex:         1,
              minWidth:     0,
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {s.value}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {s.is_mbody_default && (
                <span style={{
                  fontSize:      '9px',
                  fontWeight:    700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  padding:       '2px 6px',
                  borderRadius:  '10px',
                  background:    'rgba(165,42,225,0.12)',
                  border:        '1px solid rgba(165,42,225,0.25)',
                  color:         '#A52AE1',
                  whiteSpace:    'nowrap',
                }}>
                  Recommended
                </span>
              )}
              {!s.is_mbody_default && s.usage_count > 1 && (
                <span style={{
                  fontSize:    '10px',
                  color:       'var(--text-muted, rgba(255,255,255,0.35))',
                  fontVariant: 'tabular-nums',
                }}>
                  ×{s.usage_count}
                </span>
              )}
            </div>
          </button>
        )
      })}

      {/* Show more */}
      {hasMore && (
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={onShowMore}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '5px',
            width:          '100%',
            padding:        '8px 13px',
            background:     'rgba(146,140,227,0.05)',
            border:         'none',
            borderTop:      '1px solid rgba(146,140,227,0.10)',
            color:          'var(--text-muted, rgba(255,255,255,0.4))',
            fontFamily:     'var(--font-family, inherit)',
            fontSize:       '11px',
            fontWeight:     600,
            letterSpacing:  '0.04em',
            cursor:         'pointer',
            transition:     'background 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(146,140,227,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(146,140,227,0.05)' }}
        >
          Show more
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      <style>{`
        @keyframes suggestionFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes suggestionPulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}