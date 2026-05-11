'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { Settings, Rocket, Trash2, Copy, Plus, MoreVertical, RotateCcw, Archive, ArchiveRestore, Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { setActiveTemplateAction, deleteTemplateAction, restoreTemplateToDefaultAction, archiveTemplateAction, unarchiveTemplateAction } from '@/app/admin/actions/workflow'
import TemplateMetadataModal from './TemplateMetadataModal'
import { ROLE_DEFINITIONS } from '@/lib/phases'
import type { WorkflowTemplate, WorkflowSection, WorkflowQuestion, ContactRoleLabel } from '@/types'

const GRADIENT_CLASSES: Record<string, string> = {
  '#EF4444': 'from-red-600    via-orange-600    to-red-500',
  '#F97316': 'from-orange-400 via-orange-500 to-red-600',
  '#F59E0B': 'from-amber-300  via-amber-400  to-amber-700',
  '#22C55E': 'from-green-400  via-green-500  to-green-700',
  '#14B8A6': 'from-teal-400   via-teal-500   to-teal-700',
  '#3B82F6': 'from-blue-500   via-blue-500   to-blue-600',
  '#6366F1': 'from-indigo-400 via-indigo-500 to-indigo-700',
  '#8B5CF6': 'from-violet-400 via-violet-500 to-violet-700',
  '#A52AE1': 'from-purple-400 via-purple-500 to-purple-700',
  '#EC4899': 'from-pink-600   via-pink-500   to-pink-700',
}

const DEPT_LABELS: Record<string, string> = {
  operations:       'Operations',
  engineering:      'Engineering',
  customer_success: 'Customer Success',
  enterprise:       'Enterprise',
  sales:            'Sales',
  finance:          'Finance',
  general:          'General',
}

function DocStackIllustration() {
  return (
    <svg viewBox="0 0 100 100" width="64" height="64" fill="none" aria-hidden="true">
      {/* Back page — rotated */}
      <rect x="26" y="22" width="48" height="60" rx="7"
        fill="white" fillOpacity="0.18"
        transform="rotate(-11 50 52)" />
      {/* Middle page */}
      <rect x="22" y="18" width="48" height="60" rx="7"
        fill="white" fillOpacity="0.36"
        transform="rotate(-4 46 48)" />
      {/* Front page */}
      <rect x="18" y="14" width="48" height="60" rx="7"
        fill="white" fillOpacity="0.88" />
      {/* Content lines */}
      <rect x="27" y="28" width="28" height="4" rx="2" fill="rgba(0,0,0,0.13)" />
      <rect x="27" y="37" width="20" height="3" rx="1.5" fill="rgba(0,0,0,0.09)" />
      <rect x="27" y="44" width="24" height="3" rx="1.5" fill="rgba(0,0,0,0.09)" />
      <rect x="27" y="51" width="16" height="3" rx="1.5" fill="rgba(0,0,0,0.07)" />
    </svg>
  )
}

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit' | 'duplicate'; template: WorkflowTemplate }

interface Props {
  templates:       WorkflowTemplate[]
  allSections:     WorkflowSection[]
  allQuestions:    WorkflowQuestion[]
  selectedId:      string | null
  onSelect:        (id: string) => void
  onTemplateReset: () => void
}

export default function TemplateLibrary({
  templates,
  allSections,
  allQuestions,
  selectedId,
  onSelect,
  onTemplateReset,
}: Props) {
  const router = useRouter()
  const [openMenu,       setOpenMenu]       = useState<string | null>(null)
  const [modal,          setModal]          = useState<ModalState>({ open: false })
  const [error,          setError]          = useState<string | null>(null)
  const [pending,        startTransition]   = useTransition()
  const [canScrollLeft,  setCanScrollLeft]  = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
  }, [checkScroll])

  function scrollBy(px: number) {
    scrollRef.current?.scrollBy({ left: px, behavior: 'smooth' })
  }

  function closeMenu() { setOpenMenu(null) }

  function handleSetActive(template: WorkflowTemplate) {
    if (template.is_active) return
    const current = templates.find(t => t.is_active)
    const msg = current
      ? `Set "${template.name}" as the live template?\n\n"${current.name}" will be archived.`
      : `Set "${template.name}" as the live template?`
    if (!confirm(msg)) return
    setError(null)
    startTransition(async () => {
      const result = await setActiveTemplateAction(template.id)
      if (!result.ok) { setError(result.error); return }
      router.refresh()
    })
  }

  function handleArchive(template: WorkflowTemplate) {
    if (!confirm(`Archive "${template.name}"? It will be hidden from the editor but can be unarchived later.`)) return
    setError(null)
    startTransition(async () => {
      const result = await archiveTemplateAction(template.id)
      if (!result.ok) { setError(result.error); return }
      router.refresh()
    })
  }

  function handleUnarchive(template: WorkflowTemplate) {
    if (!confirm(`Unarchive "${template.name}"? It will return to Draft and become editable again.`)) return
    setError(null)
    startTransition(async () => {
      const result = await unarchiveTemplateAction(template.id)
      if (!result.ok) { setError(result.error); return }
      router.refresh()
    })
  }

  function handleDelete(template: WorkflowTemplate) {
    if (template.is_active) { setError('Cannot delete the active template'); return }
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteTemplateAction(template.id)
      if (!result.ok) { setError(result.error); return }
      router.refresh()
    })
  }

  function handleRestoreToDefault(template: WorkflowTemplate) {
    if (template.is_active) { setError('Cannot restore the active template'); return }
    if (!confirm(`Reset "${template.name}" to default questions? All current sections and fields will be replaced.`)) return
    setError(null)
    startTransition(async () => {
      const result = await restoreTemplateToDefaultAction(template.id)
      if (!result.ok) { setError(result.error); return }
      onTemplateReset()
      router.refresh()
    })
  }

  function onSaved() {
    setModal({ open: false })
    router.refresh()
  }

  return (
    <>
      {error && (
        <div className="mb-3 px-4 py-2.5 rounded-xl border border-error/30 bg-error/10 text-xs text-error font-medium">
          {error}
        </div>
      )}

      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => scrollBy(-188)}
          aria-label="Scroll left"
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-border shadow-md transition-all duration-200 -translate-x-1 ${
            canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronLeft size={15} className="text-body-text" strokeWidth={1.8} />
        </button>

        {/* Right arrow */}
        <button
          onClick={() => scrollBy(188)}
          aria-label="Scroll right"
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-border shadow-md transition-all duration-200 translate-x-1 ${
            canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronRight size={15} className="text-body-text" strokeWidth={1.8} />
        </button>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        onClick={() => openMenu && closeMenu()}
      >
        {/* ── Template cards ──────────────────────────────────── */}
        {templates.map(template => {
          const color        = template.color ?? '#EF4444'
          const gradClasses  = GRADIENT_CLASSES[color] ?? 'from-red-400 via-red-500 to-red-700'
          const isSelected   = selectedId === template.id
          const isActive     = template.is_active
          const isDraft      = template.is_draft
          const isArchived   = template.is_archived
          const isDefault    = template.is_default
          const sectionCount = allSections.filter(s => s.template_id === template.id).length
          const dept         = template.department ? DEPT_LABELS[template.department] : null

          return (
            <div key={template.id} className="relative shrink-0 group">

              {/* Card button */}
              <button
                onClick={() => { onSelect(template.id); closeMenu() }}
                className={`relative flex flex-col w-40 h-44 rounded-3xl bg-gradient-to-br ${gradClasses} transition-all duration-200 focus:outline-none ${
                  isSelected ? 'scale-105' : 'hover:scale-105'
                }`}
              >
                {/* Glass highlight — top half shine */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-3xl pointer-events-none z-10" />

                {/* Bottom depth — improves text legibility */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/20 to-transparent rounded-b-3xl pointer-events-none z-10" />

                {/* Selection border */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-3xl border-2 border-white/60 pointer-events-none z-20" />
                )}
                {/* Status pill — top-right */}
                <div className="absolute top-3 right-3 z-10">
                  {isActive ? (
                    <span className="flex items-center gap-1 bg-black/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-300 shrink-0" />
                      Live
                    </span>
                  ) : isDefault && !isArchived ? (
                    <span className="flex items-center gap-1 bg-black/20 text-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
                      Primary
                    </span>
                  ) : isArchived ? (
                    <span className="flex items-center gap-1 bg-black/25 text-white/70 text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                      Archived
                    </span>
                  ) : isDraft ? (
                    <span className="flex items-center gap-1 bg-black/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      Draft
                    </span>
                  ) : null}
                </div>

                {/* Illustration */}
                <div className="relative z-20 flex-1 flex items-center justify-center pt-6 pb-1">
                  <DocStackIllustration />
                </div>

                {/* Name + department */}
                <div className="relative z-20 px-3.5 pb-9">
                  <p className="text-white font-semibold text-sm leading-snug line-clamp-2">
                    {template.name}
                  </p>
                  {template.location_id ? (
                    <p className="text-white/65 text-[11px] mt-0.5 truncate">
                      {template.contact_role
                        ? `${ROLE_DEFINITIONS[template.contact_role as ContactRoleLabel]?.label ?? template.contact_role} · bound`
                        : 'Location bound'}
                    </p>
                  ) : dept ? (
                    <p className="text-white/65 text-[11px] mt-0.5 truncate">{dept}</p>
                  ) : (
                    <p className="text-white/65 text-[11px] mt-0.5">{sectionCount} section{sectionCount !== 1 ? 's' : ''}</p>
                  )}
                </div>

                {/* Bottom-left: settings */}
                <div
                  className="absolute bottom-2.5 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer"
                  onClick={e => { e.stopPropagation(); setModal({ open: true, mode: 'edit', template }) }}
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-black/25 hover:bg-black/40 transition-colors">
                    <Settings size={11} color="white" strokeWidth={1.8} />
                  </span>
                </div>

              </button>

              {/* Bottom-right: Start Onboarding — outside the card button so it's always independently clickable */}
              <button
                onClick={e => { e.stopPropagation(); router.push('/onboarding?template_id=' + template.id) }}
                title="Start onboarding"
                className="absolute bottom-2.5 right-3 z-30 flex items-center justify-center w-6 h-6 rounded-full bg-black/25 hover:bg-black/45 opacity-0 group-hover:opacity-100 transition-all cursor-pointer focus:outline-none"
              >
                <Rocket size={11} color="white" strokeWidth={1.8} />
              </button>

              {/* 3-dots menu — top-left, shown on hover */}
              <div
                className="absolute top-2.5 left-3 z-20"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setOpenMenu(openMenu === template.id ? null : template.id)}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-black/25 hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <MoreVertical size={12} color="white" strokeWidth={1.8} />
                </button>

                {openMenu === template.id && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={closeMenu} />
                    <div className="absolute left-0 top-full z-40 mt-1 w-44 rounded-xl border border-border bg-surface py-1 shadow-xl">
                      <button
                        onClick={() => { setModal({ open: true, mode: 'edit', template }); closeMenu() }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated transition-colors"
                      >
                        <Settings size={12} /> Edit details
                      </button>
                      <button
                        onClick={() => { setModal({ open: true, mode: 'duplicate', template }); closeMenu() }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated transition-colors"
                      >
                        <Copy size={12} /> Duplicate
                      </button>
                      {!isActive && (
                        <>
                          <button
                            onClick={() => { handleRestoreToDefault(template); closeMenu() }}
                            disabled={pending}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated disabled:opacity-40 transition-colors"
                          >
                            <RotateCcw size={12} /> Restore to default
                          </button>
                          <button
                            onClick={() => { handleSetActive(template); closeMenu() }}
                            disabled={pending}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated disabled:opacity-40 transition-colors"
                          >
                            <Play size={12} /> Set as active
                          </button>
                          {isArchived ? (
                            <button
                              onClick={() => { handleUnarchive(template); closeMenu() }}
                              disabled={pending}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated disabled:opacity-40 transition-colors"
                            >
                              <ArchiveRestore size={12} /> Unarchive
                            </button>
                          ) : (
                            <button
                              onClick={() => { handleArchive(template); closeMenu() }}
                              disabled={pending}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated disabled:opacity-40 transition-colors"
                            >
                              <Archive size={12} /> Archive
                            </button>
                          )}
                          {!isDefault && (
                            <>
                              <div className="h-px bg-border mx-2 my-1" />
                              <button
                                onClick={() => { handleDelete(template); closeMenu() }}
                                disabled={pending}
                                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-error/10 disabled:opacity-40 transition-colors"
                                style={{ color: '#EF4444' }}
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {/* ── New Template card ──────────────────────────────── */}
        <button
          onClick={() => setModal({ open: true, mode: 'create' })}
          className="shrink-0 flex flex-col items-center justify-center gap-3 w-40 h-44 rounded-3xl border-2 border-dashed border-border hover:border-bright-violet/40 hover:bg-elevated/60 transition-all duration-200 group"
        >
          <span className="flex items-center justify-center w-12 h-12 rounded-full border border-border bg-elevated group-hover:border-bright-violet/30 group-hover:bg-bright-violet/5 transition-colors">
            <Plus size={20} className="text-muted group-hover:text-bright-violet transition-colors" strokeWidth={1.5} />
          </span>
          <p className="text-xs font-medium text-body-text group-hover:text-heading transition-colors">
            New Template
          </p>
        </button>
      </div>
      </div>

      {/* Modals */}
      {modal.open && modal.mode === 'create' && (
        <TemplateMetadataModal mode="create" onClose={() => setModal({ open: false })} onSaved={onSaved} />
      )}
      {modal.open && (modal.mode === 'edit' || modal.mode === 'duplicate') && (
        <TemplateMetadataModal
          mode={modal.mode}
          template={modal.template}
          onClose={() => setModal({ open: false })}
          onSaved={onSaved}
        />
      )}
    </>
  )
}
