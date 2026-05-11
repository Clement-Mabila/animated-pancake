'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { upsertWorkflowSectionAction } from '@/app/admin/actions/workflow'
import type { WorkflowSection } from '@/types'

interface Props {
  templateId: string
  section:    WorkflowSection | null  // null = add mode
  onClose:    () => void
  onSaved:    () => void
}

export default function SectionModal({ templateId, section, onClose, onSaved }: Props) {
  const [title,           setTitle]           = useState(section?.title            ?? '')
  const [subtitle,        setSubtitle]        = useState(section?.subtitle         ?? '')
  const [description,     setDescription]     = useState(section?.description      ?? '')
  const [slug,            setSlug]            = useState(section?.slug             ?? '')
  const [checkpointCount, setCheckpointCount] = useState(section?.checkpoint_count ?? 0)
  const [active,          setActive]          = useState(section?.active           ?? true)
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  // Auto-slug from title in add mode
  useEffect(() => {
    if (!section) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''))
    }
  }, [title, section])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await upsertWorkflowSectionAction({
      id:              section?.id,
      templateId,
      slug,
      title,
      subtitle:        subtitle     || null,
      description:     description  || null,
      checkpointCount,
      active,
    })
    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-heading">
            {section ? 'Edit section' : 'Add section'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-heading transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              placeholder="e.g. KPIs & performance metrics"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Subtitle</label>
            <input
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              placeholder="e.g. Dashboard metric configuration"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
              placeholder="Intro paragraph shown at the top of the section form"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Slug {section && <span className="text-muted/60">(locked)</span>}
              </label>
              <input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                readOnly={!!section}
                required
                className={`w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${
                  section ? 'bg-elevated/50 text-muted cursor-not-allowed' : 'bg-elevated text-heading'
                }`}
                placeholder="section_slug"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Checkpoints</label>
              <input
                type="number"
                min={0}
                max={99}
                value={checkpointCount}
                onChange={e => setCheckpointCount(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-heading">Active</p>
              <p className="text-xs text-muted">Hidden from onboarding flow when off</p>
            </div>
            <button
              type="button"
              onClick={() => setActive(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                active ? 'bg-violet-600' : 'bg-border'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-heading transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : section ? 'Save changes' : 'Add section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
