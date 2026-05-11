/** Shallow object diff for audit (nested objects compared by JSON string). */
export function shallowDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): Record<string, { from: unknown; to: unknown }> {
  const a = before ?? {}
  const b = after ?? {}
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const out: Record<string, { from: unknown; to: unknown }> = {}
  for (const k of keys) {
    const va = a[k]
    const vb = b[k]
    const same =
      typeof va === 'object' && va !== null && typeof vb === 'object' && vb !== null
        ? JSON.stringify(va) === JSON.stringify(vb)
        : va === vb
    if (!same) out[k] = { from: va, to: vb }
  }
  return out
}
