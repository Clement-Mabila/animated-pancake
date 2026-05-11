'use client'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-8 max-w-lg mx-auto text-center space-y-4">
      <h2 className="text-xl font-semibold" style={{ color: 'var(--error)' }}>
        Something went wrong
      </h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {error.message}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer text-white"
        style={{ background: 'linear-gradient(135deg, #A52AE1, #3999FE)' }}
      >
        Try again
      </button>
    </div>
  )
}
