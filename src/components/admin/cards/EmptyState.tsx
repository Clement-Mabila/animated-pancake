import type { ReactNode } from 'react'

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div
      className="rounded-xl p-12 text-center max-w-md mx-auto"
      style={{ border: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
    >
      <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {description && (
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
