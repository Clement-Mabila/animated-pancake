'use client'

interface Checkpoint {
  id: string
  label: string
  hint?: string
}

interface CheckpointListProps {
  checkpoints: Checkpoint[]
  checked: Record<string, boolean>
  onChange: (id: string, value: boolean) => void
  label?: string
}

export default function CheckpointList({
  checkpoints,
  checked,
  onChange,
  label = 'Completion checkpoints',
}: CheckpointListProps) {
  return (
    <div>
      {/* Divider */}
      <div className="my-4" style={{ height: '1px', background: 'rgba(146,140,227,0.12)' }} />

      <span
        className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-label)' }}
      >
        {label}
      </span>

      <ul className="flex flex-col gap-1.5 mb-4 list-none p-0">
        {checkpoints.map(cp => {
          const isChecked = !!checked[cp.id]
          return (
            <li
              key={cp.id}
              onClick={() => onChange(cp.id, !isChecked)}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-150 select-none"
              style={{
                background: isChecked
                  ? 'rgba(0,129,255,0.05)'
                  : 'var(--bg-elevated)',
                border: isChecked
                  ? '1px solid rgba(0,129,255,0.25)'
                  : 'var(--border-subtle)',
              }}
            >
              {/* Checkbox */}
              <div
                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-150"
                style={
                  isChecked
                    ? {
                        background: 'linear-gradient(135deg, #A52AE1, #3999FE)',
                        border: 'none',
                      }
                    : {
                        background: 'var(--bg-surface)',
                        border: '1.5px solid rgba(146,140,227,0.3)',
                      }
                }
              >
                {isChecked && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path
                      d="M1 3.5L3.5 6L8 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: isChecked ? 'var(--text-muted)' : 'var(--text-secondary)',
                    textDecoration: isChecked ? 'line-through' : 'none',
                  }}
                >
                  {cp.label}
                </p>
                {cp.hint && (
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {cp.hint}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}