/** Parse stored robot_models_confirmed / multi_entry JSON or comma-separated string into tags. */
export function parseModels(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'string' && raw.startsWith('[')) {
    try {
      return JSON.parse(raw) as string[]
    } catch {
      /* fall through */
    }
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}
