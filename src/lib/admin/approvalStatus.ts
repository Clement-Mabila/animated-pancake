import type { AdminApprovalStatus } from '@/types'

/** Treat missing column (pre-migration) as active for backwards compatibility. */
export function normalizeApprovalStatus(row: { approval_status?: string | null } | null): AdminApprovalStatus {
  const s = row?.approval_status
  if (s === 'pending_email_verify' || s === 'awaiting_approval' || s === 'active') return s
  return 'active'
}
