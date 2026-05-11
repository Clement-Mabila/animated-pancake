import type { ConfigStatus } from '@/types'

const LABEL: Record<ConfigStatus, string> = {
  draft: 'Draft',
  client_complete: 'Client complete',
  mbody_complete: 'MBody complete',
  live: 'Live',
}

export default function StatusBadge({ status }: { status: ConfigStatus }) {
  const isLive = status === 'live'
  const isDone = status === 'client_complete' || status === 'mbody_complete' || isLive
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: isDone ? 'rgba(34, 197, 94, 0.12)' : 'rgba(146, 140, 227, 0.12)',
        color: isDone ? 'var(--success)' : 'var(--soft-lavender)',
      }}
    >
      {LABEL[status] ?? status}
    </span>
  )
}
