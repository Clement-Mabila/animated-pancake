export default function AdminLoading() {
  return (
    <div className="space-y-4 animate-pulse p-2">
      <div className="h-8 rounded-lg w-48" style={{ background: 'var(--bg-elevated)' }} />
      <div className="h-4 rounded-lg w-96 max-w-full" style={{ background: 'var(--bg-elevated)' }} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-xl" style={{ background: 'var(--bg-surface)' }} />
        ))}
      </div>
    </div>
  )
}
