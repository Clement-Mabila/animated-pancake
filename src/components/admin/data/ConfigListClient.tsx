'use client'

import Link from 'next/link'
import { Suspense, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import IncompleteExportConfirm from '@/components/admin/modals/IncompleteExportConfirm'
import {
  evaluateExportCompletenessAction,
  exportConfigurationsAction,
} from '@/app/admin/actions/export'
import type { AdminConfigListRow } from '@/lib/admin/fetchAdminData'
import type { ExportCompletenessRow } from '@/lib/admin/exportPayload'
import PhaseBadge from '@/components/admin/data/PhaseBadge'
import StatusBadge from '@/components/admin/data/StatusBadge'

function downloadBase64(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const TABS = [
  { id: 'draft', label: 'Draft' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'complete', label: 'Complete' },
  { id: 'all', label: 'All' },
] as const

function ConfigListInner({
  rows,
  allConfigurationIds,
}: {
  rows: AdminConfigListRow[]
  allConfigurationIds: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = (searchParams.get('tab') ?? 'all') as (typeof TABS)[number]['id']
  const q = (searchParams.get('q') ?? '').toLowerCase().trim()
  const sort = searchParams.get('sort') ?? 'updated_desc'

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<{
    open: boolean
    scope: 'one' | 'many' | 'all'
    ids: string[] | 'all'
    incompleteRows: ExportCompletenessRow[]
  } | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      list = list.filter(
        r =>
          r.clientName.toLowerCase().includes(q) ||
          (r.staffEmail ?? '').toLowerCase().includes(q) ||
          (r.locationName ?? '').toLowerCase().includes(q)
      )
    }
    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sort === 'created_asc') return a.created_at.localeCompare(b.created_at)
      if (sort === 'created_desc') return b.created_at.localeCompare(a.created_at)
      if (sort === 'client_asc') return a.clientName.localeCompare(b.clientName)
      return b.updated_at.localeCompare(a.updated_at)
    })
    return sorted
  }, [rows, q, sort])

  function setTab(next: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', next)
    router.push(`/admin/configurations?${p.toString()}`)
  }

  function toggleSort() {
    const p = new URLSearchParams(searchParams.toString())
    const next = sort === 'updated_desc' ? 'updated_asc' : 'updated_desc'
    p.set('sort', next)
    router.push(`/admin/configurations?${p.toString()}`)
  }

  async function runExport(scope: 'one' | 'many' | 'all', ids: string[] | 'all') {
    const idList = ids === 'all' ? allConfigurationIds : ids
    const evalRes = await evaluateExportCompletenessAction(idList)
    if (!evalRes.ok) {
      alert('error' in evalRes ? evalRes.error : 'Could not evaluate export')
      return
    }
    const incomplete = evalRes.perConfig.filter(p => !p.allComplete)

    if (!evalRes.allComplete && incomplete.length > 0) {
      setModal({ open: true, scope, ids, incompleteRows: incomplete })
      return
    }

    startTransition(async () => {
      const res = await exportConfigurationsAction({
        scope,
        configurationIds: ids,
        typedConfirm: '',
        includedIncomplete: false,
      })
      if (res.ok) downloadBase64(res.base64, res.filename)
      else alert(res.error)
    })
  }

  function confirmIncomplete(typed: string, included: boolean) {
    if (!modal) return
    const { scope, ids } = modal
    setModal(null)
    startTransition(async () => {
      const res = await exportConfigurationsAction({
        scope,
        configurationIds: ids,
        typedConfirm: typed,
        includedIncomplete: included,
      })
      if (res.ok) downloadBase64(res.base64, res.filename)
      else alert(res.error)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer transition-opacity"
              style={{
                background: tab === t.id ? 'linear-gradient(135deg, #A52AE1, #3999FE)' : 'var(--bg-elevated)',
                color: tab === t.id ? '#fff' : 'var(--text-body)',
                border: tab === t.id ? 'none' : 'var(--border-subtle)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleSort}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            Sort: {sort}
          </button>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={() => runExport('many', [...selected])}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer text-white bg-gradient-to-br from-fuchsia-500 to-blue-500 disabled:opacity-40"
          >
            Export selected
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => runExport('all', 'all')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: 'var(--border-subtle)',
            }}
          >
            Export all
          </button>
        </div>
      </div>

      <div
        className="rounded-xl overflow-x-auto"
        style={{ border: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <table className="w-full text-left text-sm min-w-[720px]">
          <thead>
            <tr style={{ borderBottom: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th className="p-3 w-10">
                <span className="sr-only">Select</span>
              </th>
              <th className="p-3 font-semibold">Client</th>
              <th className="p-3 font-semibold">Phase</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Onboarding contact</th>
              <th className="p-3 font-semibold">Location</th>
              <th className="p-3 font-semibold">Progress</th>
              <th className="p-3 font-semibold">Updated</th>
              <th className="p-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderBottom: 'var(--border-subtle)' }}>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={e => {
                      setSelected(prev => {
                        const n = new Set(prev)
                        if (e.target.checked) n.add(r.id)
                        else n.delete(r.id)
                        return n
                      })
                    }}
                  />
                </td>
                <td className="p-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {r.clientName}
                </td>
                <td className="p-3">
                  <PhaseBadge phase={r.phase} />
                </td>
                <td className="p-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="p-3 text-xs" style={{ color: 'var(--text-body)' }}>
                  {r.staffName ?? '—'}
                  <br />
                  <span style={{ color: 'var(--text-muted)' }}>{r.staffEmail ?? ''}</span>
                </td>
                <td className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {r.locationName ?? '—'}
                </td>
                <td className="p-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {r.completedInPhase}/{r.totalInPhase}
                </td>
                <td className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(r.updated_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      href={`/admin/configurations/${r.id}`}
                      className="text-xs font-semibold px-2 py-1 rounded-md no-underline"
                      style={{ color: 'var(--electric-blue)' }}
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/configurations/${r.id}/edit`}
                      className="text-xs font-semibold px-2 py-1 rounded-md no-underline"
                      style={{ color: 'var(--soft-lavender)' }}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="text-xs font-semibold px-2 py-1 rounded-md border-none cursor-pointer bg-transparent"
                      style={{ color: 'var(--text-muted)' }}
                      onClick={() => runExport('one', [r.id])}
                      disabled={pending}
                    >
                      Export
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No configurations in this view.
          </p>
        )}
      </div>

      <IncompleteExportConfirm
        open={!!modal?.open}
        title="Incomplete configurations"
        rows={modal?.incompleteRows ?? []}
        onCancel={() => setModal(null)}
        onConfirm={confirmIncomplete}
      />
    </div>
  )
}

export default function ConfigListClient(props: {
  rows: AdminConfigListRow[]
  allConfigurationIds: string[]
}) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading…
        </div>
      }
    >
      <ConfigListInner {...props} />
    </Suspense>
  )
}
