export default function Unauthorized() {
  return (
    <div className="p-12 text-center">
      <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Unauthorized
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Please sign in to continue.
      </p>
    </div>
  )
}
