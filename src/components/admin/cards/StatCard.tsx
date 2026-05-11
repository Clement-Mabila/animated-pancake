export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div
      className="rounded-xl p-5 min-w-[140px] flex-1"
      style={{
        background: 'var(--bg-surface)',
        border: 'var(--border-subtle)',
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-3xl font-normal tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}
