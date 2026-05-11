export default function Forbidden() {
  return (
    <div className="p-12 text-center">
      <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Forbidden
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        You do not have access to this resource.
      </p>
    </div>
  )
}
