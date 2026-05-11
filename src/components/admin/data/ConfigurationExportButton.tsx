'use client'

import { useState, useTransition } from 'react'
import IncompleteExportConfirm from '@/components/admin/modals/IncompleteExportConfirm'
import {
  evaluateExportCompletenessAction,
  exportConfigurationsAction,
} from '@/app/admin/actions/export'
import type { ExportCompletenessRow } from '@/lib/admin/exportPayload'

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

export default function ConfigurationExportButton({ configurationId }: { configurationId: string }) {
  const [modal, setModal] = useState<ExportCompletenessRow[] | null>(null)
  const [pending, startTransition] = useTransition()

  async function onExport() {
    const evalRes = await evaluateExportCompletenessAction([configurationId])
    if (!evalRes.ok) {
      alert('error' in evalRes ? evalRes.error : 'Evaluation failed')
      return
    }
    const incomplete = evalRes.perConfig.filter(p => !p.allComplete)
    if (!evalRes.allComplete && incomplete.length > 0) {
      setModal(incomplete)
      return
    }
    startTransition(async () => {
      const res = await exportConfigurationsAction({
        scope: 'one',
        configurationIds: [configurationId],
        typedConfirm: '',
        includedIncomplete: false,
      })
      if (res.ok) downloadBase64(res.base64, res.filename)
      else alert(res.error)
    })
  }

  function confirmIncomplete(typed: string, included: boolean) {
    setModal(null)
    startTransition(async () => {
      const res = await exportConfigurationsAction({
        scope: 'one',
        configurationIds: [configurationId],
        typedConfirm: typed,
        includedIncomplete: included,
      })
      if (res.ok) downloadBase64(res.base64, res.filename)
      else alert(res.error)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={onExport}
        disabled={pending}
        className="text-sm font-semibold px-4 py-2 rounded-lg border-none cursor-pointer text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #A52AE1, #3999FE)' }}
      >
        {pending ? 'Exporting…' : 'Export JSON'}
      </button>
      <IncompleteExportConfirm
        open={modal !== null}
        title="Incomplete configuration"
        rows={modal ?? []}
        onCancel={() => setModal(null)}
        onConfirm={confirmIncomplete}
      />
    </>
  )
}
