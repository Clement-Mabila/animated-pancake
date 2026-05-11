export default function SectionDivider({ label }: { label?: string }) {
  if (!label) {
    return (
      <div
        className="my-4"
        style={{ height: '1px', background: 'rgba(146,140,227,0.12)' }}
      />
    )
  }

  return (
    <div className="flex items-center gap-3 my-5">
      <div
        className="flex-1"
        style={{ height: '1px', background: 'rgba(146,140,227,0.12)' }}
      />
      <span
        className="text-[10px] font-semibold uppercase tracking-widest flex-shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <div
        className="flex-1"
        style={{ height: '1px', background: 'rgba(146,140,227,0.12)' }}
      />
    </div>
  )
}