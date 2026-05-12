'use client'

import { useState, useRef, useEffect } from 'react'
import type { ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, MoreHorizontal,
  AlignLeft, List, ToggleRight, Hash, Type, ListFilter, GripVertical, RotateCcw, Undo2,
  CheckSquare, Users, CalendarClock, Blocks, UserCog,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PHASE_ORDER } from '@/lib/phases'
import {
  deleteWorkflowSectionAction,
  reorderWorkflowSectionsAction,
  deleteWorkflowQuestionAction,
  reorderWorkflowQuestionsAction,
  restoreWorkflowSectionAction,
  restoreWorkflowQuestionAction,
  importSectionFromPrimaryAction,
  importQuestionFromPrimaryAction,
} from '@/app/admin/actions/workflow'
import SectionModal  from './SectionModal'
import QuestionModal from './QuestionModal'
import type { WorkflowSection, WorkflowQuestion, ConfigPhase } from '@/types'

/* ── Phase colors ───────────────────────────────────────────── */
const PHASE_COLORS: Record<ConfigPhase, string> = {
  early:      '#928CE3',
  pre_deploy: '#0081FF',
  deploy:     '#A52AE1',
  post:       '#22C55E',
}

const PHASE_SHORT: Record<ConfigPhase, string> = {
  early:      'Early',
  pre_deploy: 'Pre-Deploy',
  deploy:     'Deploy',
  post:       'Post',
}

/* ── Field type config ──────────────────────────────────────── */
type FieldCfg = {
  color: string
  bg:    string
  icon:  ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
}

const FIELD_TYPE_CONFIG: Record<string, FieldCfg> = {
  text:        { color: '#928CE3', bg: 'rgba(146,140,227,0.15)', icon: Type        },
  textarea:    { color: '#928CE3', bg: 'rgba(146,140,227,0.15)', icon: AlignLeft   },
  select:      { color: '#0081FF', bg: 'rgba(0,129,255,0.15)',   icon: ListFilter  },
  multiselect: { color: '#0081FF', bg: 'rgba(0,129,255,0.15)',   icon: List        },
  boolean:     { color: '#22C55E', bg: 'rgba(34,197,94,0.15)',   icon: ToggleRight },
  number:      { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  icon: Hash        },
  checkpoint:                { color: '#22C55E', bg: 'rgba(34,197,94,0.15)',    icon: CheckSquare   },
  orchestrator_user_selector:{ color: '#A52AE1', bg: 'rgba(165,42,225,0.15)',  icon: Users         },
  schedule_amend_selector:   { color: '#0081FF', bg: 'rgba(0,129,255,0.15)',   icon: CalendarClock },
  integration_block:         { color: '#E65100', bg: 'rgba(245,124,0,0.15)',   icon: Blocks        },
  contact_picker:            { color: '#7B1FA2', bg: 'rgba(123,31,162,0.15)',  icon: UserCog       },
}

const DEFAULT_FIELD_CFG: FieldCfg = {
  color: '#928CE3', bg: 'rgba(146,140,227,0.15)', icon: Type,
}

/* ── Sortable section row ────────────────────────────────────── */
interface SortableSectionRowProps {
  s:               WorkflowSection
  idx:             number
  filteredIdx:     number
  filteredCount:   number
  sections:        WorkflowSection[]
  questions:       WorkflowQuestion[]
  selectedSlug:    string | null
  readOnly:        boolean
  showHandle:      boolean
  openSectionMenu: string | null
  deletingSection: string | null
  selectMode:      boolean
  isSelected:      boolean
  setSelectedSlug:    (slug: string) => void
  setOpenSectionMenu: (id: string | null) => void
  setSectionModal:    (m: { open: boolean; section: WorkflowSection | null }) => void
  moveSection:        (idx: number, dir: 'up' | 'down') => void
  handleDeleteSection:(s: WorkflowSection) => void
  closeMenus:         () => void
  onToggleSelect:     (id: string) => void
}

function SortableSectionRow({
  s, idx, filteredIdx, filteredCount, sections, questions, selectedSlug, readOnly,
  showHandle, openSectionMenu, deletingSection, selectMode, isSelected,
  setSelectedSlug, setOpenSectionMenu, setSectionModal, moveSection, handleDeleteSection, closeMenus, onToggleSelect,
}: SortableSectionRowProps) {
  const {
    setNodeRef, setActivatorNodeRef, attributes, listeners,
    transform, transition, isDragging,
  } = useSortable({ id: s.id, disabled: selectMode })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
    zIndex:     isDragging ? 50 : undefined,
    position:   isDragging ? 'relative' as const : undefined,
  }

  const isActive  = s.slug === selectedSlug
  const gate      = questions.find(q => q.section_slug === s.slug && q.field_key === '__all__')
  const primaryPh = (gate?.visible_in_phases?.[0] ?? 'early') as ConfigPhase
  const dotColor  = PHASE_COLORS[primaryPh]
  const qCount    = questions.filter(q => q.section_slug === s.slug && q.field_key !== '__all__').length

  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={() => selectMode ? onToggleSelect(s.id) : setSelectedSlug(s.slug)}
        className={`group flex items-center gap-3 py-3 cursor-pointer rounded-lg transition-colors ${
          selectMode && isSelected ? 'bg-bright-violet/10' : ''
        }`}
      >
        {/* Drag handle — hidden in select mode */}
        {!selectMode && showHandle ? (
          <span
            ref={setActivatorNodeRef}
            {...listeners}
            onClick={e => e.stopPropagation()}
            className="shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted"
          >
            <GripVertical size={14} />
          </span>
        ) : null}

        <span className="w-2 h-2 rounded-full shrink-0 transition-colors" style={{ backgroundColor: selectMode && isSelected ? '#A52AE1' : dotColor }} />

        <span className={`flex-1 text-sm font-medium truncate transition-colors ${
          isActive ? 'text-bright-violet' : 'text-heading group-hover:text-bright-violet'
        }`}>
          {s.title}
        </span>

        {/* 3-dots menu — hidden in select mode */}
        {!readOnly && !selectMode && (
          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpenSectionMenu(openSectionMenu === s.id ? null : s.id)}
              className="p-1 rounded-lg text-muted hover:text-heading hover:bg-elevated opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreHorizontal size={14} />
            </button>

            {openSectionMenu === s.id && (
              <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-surface py-1 shadow-lg">
                <button
                  onClick={() => { moveSection(idx, 'up'); closeMenus() }}
                  disabled={idx === 0}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated disabled:opacity-30 transition-colors"
                >
                  <ChevronUp size={12} /> Move up
                </button>
                <button
                  onClick={() => { moveSection(idx, 'down'); closeMenus() }}
                  disabled={idx === sections.length - 1}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated disabled:opacity-30 transition-colors"
                >
                  <ChevronDown size={12} /> Move down
                </button>
                <div className="h-px bg-border mx-2 my-1" />
                <button
                  onClick={() => { setSectionModal({ open: true, section: s }); closeMenus() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated transition-colors"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => { handleDeleteSection(s); closeMenus() }}
                  disabled={deletingSection === s.id}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-error/10 disabled:opacity-50 transition-colors"
                  style={{ color: '#EF4444' }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pills */}
        {!s.active && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
          >
            off
          </span>
        )}
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: 'rgba(146,140,227,0.15)', color: '#928CE3' }}
        >
          {qCount} field{qCount !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredIdx < filteredCount - 1 && (
        <div className="h-px bg-border ml-5" />
      )}
    </li>
  )
}

/* ── Sortable question card ──────────────────────────────────── */
interface SortableQuestionCardProps {
  q:               WorkflowQuestion
  idx:             number
  sectionQLen:     number
  readOnly:        boolean
  openQuestionMenu: string | null
  deletingQ:       string | null
  selectMode:      boolean
  isSelected:      boolean
  setOpenQuestionMenu: (id: string | null) => void
  setQuestionModal:    (m: { open: boolean; question: WorkflowQuestion | null }) => void
  moveQuestion:        (idx: number, dir: 'up' | 'down') => void
  handleDeleteQuestion:(q: WorkflowQuestion) => void
  closeMenus:          () => void
  onToggleSelect:      (id: string) => void
}

function SortableQuestionCard({
  q, idx, sectionQLen, readOnly,
  openQuestionMenu, deletingQ, selectMode, isSelected,
  setOpenQuestionMenu, setQuestionModal, moveQuestion, handleDeleteQuestion, closeMenus, onToggleSelect,
}: SortableQuestionCardProps) {
  const {
    setNodeRef, setActivatorNodeRef, attributes, listeners,
    transform, transition, isDragging,
  } = useSortable({ id: q.id, disabled: selectMode })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
  }

  const isAll = q.field_key === '__all__'
  const cfg   = FIELD_TYPE_CONFIG[q.field_type] ?? DEFAULT_FIELD_CFG
  const Icon  = cfg.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => { if (selectMode && !isAll) onToggleSelect(q.id) }}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all duration-150 ${
        selectMode && isSelected
          ? 'bg-bright-violet/10 border-bright-violet/40'
          : `bg-elevated border-border hover:border-soft-lavender/40 ${isDragging ? 'shadow-lg' : 'hover:shadow-sm'}`
      } ${!q.active && !isSelected ? 'opacity-40' : ''} ${selectMode && !isAll ? 'cursor-pointer' : ''}`}
    >
      {/* Drag handle — hidden in select mode */}
      {!selectMode && !readOnly && (
        <span
          ref={setActivatorNodeRef}
          {...listeners}
          className="shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted"
        >
          <GripVertical size={14} />
        </span>
      )}

      {/* Type icon bubble */}
      <span
        className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
        style={{ backgroundColor: isAll ? 'rgba(146,140,227,0.15)' : cfg.bg }}
      >
        <Icon size={15} strokeWidth={1.5} style={{ color: isAll ? '#928CE3' : cfg.color }} />
      </span>

      {/* field_key + sublabel */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-heading truncate leading-tight">{q.field_key}</p>
        <p className="text-[11px] text-muted truncate mt-0.5">
          {isAll ? 'section gate' : (q.label || q.field_type)}
        </p>
      </div>

      {/* 3-dots menu — hidden in select mode */}
      {!readOnly && !selectMode && (
        <div className="relative shrink-0">
          <button
            onClick={() => setOpenQuestionMenu(openQuestionMenu === q.id ? null : q.id)}
            className="p-1 rounded-lg text-muted hover:text-heading hover:bg-surface opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal size={14} />
          </button>

          {openQuestionMenu === q.id && (
            <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-surface py-1 shadow-lg">
              <button
                onClick={() => { moveQuestion(idx, 'up'); closeMenus() }}
                disabled={idx === 0}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated disabled:opacity-30 transition-colors"
              >
                <ChevronUp size={12} /> Move up
              </button>
              <button
                onClick={() => { moveQuestion(idx, 'down'); closeMenus() }}
                disabled={idx === sectionQLen - 1}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated disabled:opacity-30 transition-colors"
              >
                <ChevronDown size={12} /> Move down
              </button>
              <div className="h-px bg-border mx-2 my-1" />
              <button
                onClick={() => { setQuestionModal({ open: true, question: q }); closeMenus() }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-body-text hover:bg-elevated transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
              {!isAll && (
                <button
                  onClick={() => { handleDeleteQuestion(q); closeMenus() }}
                  disabled={deletingQ === q.id}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-error/10 disabled:opacity-50 transition-colors"
                  style={{ color: '#EF4444' }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pills */}
      {q.is_partial && (
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
          style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
        >
          partial
        </span>
      )}
      {!isAll && (
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {q.field_type}
        </span>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────── */
interface Props {
  templateId:        string
  sections:          WorkflowSection[]
  questions:         WorkflowQuestion[]
  deletedSections:   WorkflowSection[]
  deletedQuestions:  WorkflowQuestion[]
  readOnly:          boolean
  primarySections?:  WorkflowSection[]
  primaryQuestions?: WorkflowQuestion[]
}

export default function SectionsTab({ templateId, sections: initSections, questions: initQuestions, deletedSections, deletedQuestions, readOnly, primarySections = [], primaryQuestions = [] }: Props) {
  const router = useRouter()

  const [sections,         setSections]         = useState<WorkflowSection[]>(initSections)
  const [questions,        setQuestions]        = useState<WorkflowQuestion[]>(initQuestions)
  const [selectedSlug,     setSelectedSlug]     = useState<string | null>(initSections[0]?.slug ?? null)
  const [activePhase,      setActivePhase]      = useState<ConfigPhase | 'all'>('all')
  const [sectionModal,     setSectionModal]     = useState<{ open: boolean; section: WorkflowSection | null }>({ open: false, section: null })
  const [questionModal,    setQuestionModal]    = useState<{ open: boolean; question: WorkflowQuestion | null }>({ open: false, question: null })
  const [deletingSection,  setDeletingSection]  = useState<string | null>(null)
  const [deletingQ,        setDeletingQ]        = useState<string | null>(null)
  const [openSectionMenu,  setOpenSectionMenu]  = useState<string | null>(null)
  const [openQuestionMenu, setOpenQuestionMenu] = useState<string | null>(null)

  const [sectionSelectMode,   setSectionSelectMode]   = useState(false)
  const [questionSelectMode,  setQuestionSelectMode]  = useState(false)
  const [selectedSectionIds,  setSelectedSectionIds]  = useState<Set<string>>(new Set())
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set())

  // Sections whose section is also deleted belong to trashedSectionQs; the rest are individually deleted
  const [trashedSections,  setTrashedSections]  = useState<WorkflowSection[]>(deletedSections)
  const [trashedSectionQs, setTrashedSectionQs] = useState<WorkflowQuestion[]>(
    deletedQuestions.filter(q => deletedSections.some(s => s.slug === q.section_slug))
  )
  const [trashedQuestions, setTrashedQuestions] = useState<WorkflowQuestion[]>(
    deletedQuestions.filter(q => !deletedSections.some(s => s.slug === q.section_slug))
  )
  const [trashModal,       setTrashModal]       = useState<'sections' | 'questions' | null>(null)
  const [trashSectionIds,  setTrashSectionIds]  = useState<Set<string>>(new Set())
  const [trashQuestionIds, setTrashQuestionIds] = useState<Set<string>>(new Set())

  const [addSectionPickerOpen, setAddSectionPickerOpen] = useState(false)
  const [addFieldPickerOpen,   setAddFieldPickerOpen]   = useState(false)
  const [importingSection,     setImportingSection]     = useState<string | null>(null)
  const [importingQuestion,    setImportingQuestion]    = useState<string | null>(null)

  type HistoryEntry = { undo: () => Promise<void>; redo: () => Promise<void> }
  const historyRef    = useRef<HistoryEntry[]>([])
  const historyPosRef = useRef(-1)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  function pushHistory(entry: HistoryEntry) {
    historyRef.current = historyRef.current.slice(0, historyPosRef.current + 1)
    historyRef.current.push(entry)
    historyPosRef.current = historyRef.current.length - 1
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const isUndo = e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z'
      const isRedo = e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      if (!isUndo && !isRedo) return
      e.preventDefault()
      if (isUndo) {
        if (historyPosRef.current < 0) return
        const entry = historyRef.current[historyPosRef.current]
        historyPosRef.current--
        entry.undo()
      } else {
        if (historyPosRef.current >= historyRef.current.length - 1) return
        historyPosRef.current++
        historyRef.current[historyPosRef.current].redo()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const selectedSection  = sections.find(s => s.slug === selectedSlug) ?? null
  const sectionQuestions = questions
    .filter(q => q.section_slug === selectedSlug)
    .sort((a, b) => a.sort_order - b.sort_order)

  const filteredSections = activePhase === 'all'
    ? sections
    : sections.filter(s => {
        const gate = questions.find(q => q.section_slug === s.slug && q.field_key === '__all__')
        return gate?.visible_in_phases?.includes(activePhase) ?? false
      })

  function countForPhase(phase: ConfigPhase) {
    return sections.filter(s => {
      const gate = questions.find(q => q.section_slug === s.slug && q.field_key === '__all__')
      return gate?.visible_in_phases?.includes(phase) ?? false
    }).length
  }

  function closeMenus() {
    setOpenSectionMenu(null)
    setOpenQuestionMenu(null)
  }

  /* ── Drag end ─────────────────────────────────────────────── */
  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const before = [...sections]
    const oldIdx = sections.findIndex(s => s.id === active.id)
    const newIdx = sections.findIndex(s => s.id === over.id)
    const next   = arrayMove(sections, oldIdx, newIdx)

    setSections(next)
    reorderWorkflowSectionsAction(next.map((s, i) => ({ id: s.id, sortOrder: i + 1 })))
    router.refresh()

    pushHistory({
      undo: async () => {
        setSections(before)
        await reorderWorkflowSectionsAction(before.map((s, i) => ({ id: s.id, sortOrder: i + 1 })))
        router.refresh()
      },
      redo: async () => {
        setSections(next)
        await reorderWorkflowSectionsAction(next.map((s, i) => ({ id: s.id, sortOrder: i + 1 })))
        router.refresh()
      },
    })
  }

  function handleQuestionDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const before    = [...questions]
    const oldIdx    = sectionQuestions.findIndex(q => q.id === active.id)
    const newIdx    = sectionQuestions.findIndex(q => q.id === over.id)
    const reordered = arrayMove(sectionQuestions, oldIdx, newIdx)

    const afterQ = questions.map(q => {
      const found = reordered.findIndex(x => x.id === q.id)
      return found >= 0 ? { ...q, sort_order: found + 1 } : q
    })

    setQuestions(afterQ)
    reorderWorkflowQuestionsAction(reordered.map((q, i) => ({ id: q.id, sortOrder: i + 1 })))
    router.refresh()

    pushHistory({
      undo: async () => {
        setQuestions(before)
        await reorderWorkflowQuestionsAction(
          before
            .filter(q => q.section_slug === selectedSlug)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((q, i) => ({ id: q.id, sortOrder: i + 1 }))
        )
        router.refresh()
      },
      redo: async () => {
        setQuestions(afterQ)
        await reorderWorkflowQuestionsAction(reordered.map((q, i) => ({ id: q.id, sortOrder: i + 1 })))
        router.refresh()
      },
    })
  }

  /* ── Section actions ──────────────────────────────────────── */
  async function handleDeleteSection(section: WorkflowSection) {
    if (!confirm(`Delete section "${section.title}"? All its questions will also be deleted.`)) return

    const prevSections  = sections
    const prevQuestions = questions
    const prevSlug      = selectedSlug
    const deletedQs     = questions.filter(q => q.section_slug === section.slug)

    setDeletingSection(section.id)
    await deleteWorkflowSectionAction(section.id)
    setSections(prev => prev.filter(s => s.id !== section.id))
    setQuestions(prev => prev.filter(q => q.section_slug !== section.slug))
    if (selectedSlug === section.slug) setSelectedSlug(sections.find(s => s.id !== section.id)?.slug ?? null)
    setTrashedSections(prev => [...prev, section])
    setTrashedSectionQs(prev => [...prev, ...deletedQs])
    setDeletingSection(null)

    pushHistory({
      undo: async () => {
        await restoreWorkflowSectionAction(section, deletedQs)
        setSections(prevSections)
        setQuestions(prevQuestions)
        setSelectedSlug(prevSlug)
        router.refresh()
      },
      redo: async () => {
        await deleteWorkflowSectionAction(section.id)
        setSections(prevSections.filter(s => s.id !== section.id))
        setQuestions(prevQuestions.filter(q => q.section_slug !== section.slug))
        router.refresh()
      },
    })
  }

  async function moveSection(idx: number, dir: 'up' | 'down') {
    const before = [...sections]
    const next   = [...sections]
    const swap   = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setSections(next)
    await reorderWorkflowSectionsAction(next.map((s, i) => ({ id: s.id, sortOrder: i + 1 })))
    router.refresh()

    pushHistory({
      undo: async () => {
        setSections(before)
        await reorderWorkflowSectionsAction(before.map((s, i) => ({ id: s.id, sortOrder: i + 1 })))
        router.refresh()
      },
      redo: async () => {
        setSections(next)
        await reorderWorkflowSectionsAction(next.map((s, i) => ({ id: s.id, sortOrder: i + 1 })))
        router.refresh()
      },
    })
  }

  /* ── Question actions ─────────────────────────────────────── */
  async function handleDeleteQuestion(q: WorkflowQuestion) {
    if (q.field_key === '__all__') { alert('Cannot delete the section visibility gate (__all__). Edit phase visibility via the Phase Matrix tab instead.'); return }
    if (!confirm(`Delete question "${q.field_key}"?`)) return

    const prevQuestions = questions

    setDeletingQ(q.id)
    await deleteWorkflowQuestionAction(q.id)
    setQuestions(prev => prev.filter(x => x.id !== q.id))
    setTrashedQuestions(prev => [...prev, q])
    setDeletingQ(null)

    pushHistory({
      undo: async () => {
        await restoreWorkflowQuestionAction(q)
        setQuestions(prevQuestions)
        router.refresh()
      },
      redo: async () => {
        await deleteWorkflowQuestionAction(q.id)
        setQuestions(prevQuestions.filter(x => x.id !== q.id))
        router.refresh()
      },
    })
  }

  async function moveQuestion(idx: number, dir: 'up' | 'down') {
    const before = [...questions]
    const qs     = [...sectionQuestions]
    const swap   = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= qs.length) return
    ;[qs[idx], qs[swap]] = [qs[swap], qs[idx]]
    const afterQ = questions.map(q => {
      const found = qs.findIndex(x => x.id === q.id)
      return found >= 0 ? { ...q, sort_order: found + 1 } : q
    })
    setQuestions(afterQ)
    await reorderWorkflowQuestionsAction(qs.map((q, i) => ({ id: q.id, sortOrder: i + 1 })))
    router.refresh()

    pushHistory({
      undo: async () => {
        setQuestions(before)
        await reorderWorkflowQuestionsAction(
          before
            .filter(q => q.section_slug === selectedSlug)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((q, i) => ({ id: q.id, sortOrder: i + 1 }))
        )
        router.refresh()
      },
      redo: async () => {
        setQuestions(afterQ)
        await reorderWorkflowQuestionsAction(qs.map((q, i) => ({ id: q.id, sortOrder: i + 1 })))
        router.refresh()
      },
    })
  }

  /* ── Bulk actions ─────────────────────────────────────────── */
  async function handleBulkDeleteSections() {
    const ids = [...selectedSectionIds]
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} section${ids.length !== 1 ? 's' : ''}? All their questions will also be deleted.`)) return
    const sectionsToDelete  = ids.map(id => sections.find(s => s.id === id)).filter((s): s is WorkflowSection => !!s)
    const questionsToDelete = sectionsToDelete.flatMap(s => questions.filter(q => q.section_slug === s.slug))
    for (const section of sectionsToDelete) {
      await deleteWorkflowSectionAction(section.id)
      setSections(prev => prev.filter(s => s.id !== section.id))
      setQuestions(prev => prev.filter(q => q.section_slug !== section.slug))
      if (selectedSlug === section.slug) setSelectedSlug(sections.find(s => s.id !== section.id)?.slug ?? null)
    }
    setTrashedSections(prev => [...prev, ...sectionsToDelete])
    setTrashedSectionQs(prev => [...prev, ...questionsToDelete])
    setSelectedSectionIds(new Set())
    setSectionSelectMode(false)
  }

  async function handleBulkDeleteQuestions() {
    const ids = [...selectedQuestionIds].filter(id => {
      const q = questions.find(q => q.id === id)
      return q && q.field_key !== '__all__'
    })
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} field${ids.length !== 1 ? 's' : ''}?`)) return
    const questionsToDelete = ids.map(id => questions.find(q => q.id === id)).filter((q): q is WorkflowQuestion => !!q)
    for (const id of ids) {
      await deleteWorkflowQuestionAction(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
    }
    setTrashedQuestions(prev => [...prev, ...questionsToDelete])
    setSelectedQuestionIds(new Set())
    setQuestionSelectMode(false)
  }

  function toggleSectionSelect(id: string) {
    setSelectedSectionIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleQuestionSelect(id: string) {
    setSelectedQuestionIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function navigateToSection(slug: string) {
    setSelectedSlug(slug)
    setQuestionSelectMode(false)
    setSelectedQuestionIds(new Set())
  }

  /* ── Restore (trash) actions ──────────────────────────────── */
  async function handleRestoreSection(s: WorkflowSection) {
    const qs = trashedSectionQs.filter(q => q.section_slug === s.slug)
    const result = await restoreWorkflowSectionAction(s, qs)
    if (!result.ok) { alert(`Restore failed: ${result.error}`); return }
    setSections(prev => [...prev, s])
    setQuestions(prev => [...prev, ...qs])
    setTrashedSections(prev => prev.filter(x => x.id !== s.id))
    setTrashedSectionQs(prev => prev.filter(q => q.section_slug !== s.slug))
    setTrashSectionIds(prev => { const n = new Set(prev); n.delete(s.id); return n })
  }

  async function handleBulkRestoreSections() {
    for (const id of [...trashSectionIds]) {
      const s = trashedSections.find(x => x.id === id)
      if (s) await handleRestoreSection(s)
    }
    setTrashSectionIds(new Set())
  }

  async function handleRestoreQuestion(q: WorkflowQuestion) {
    const result = await restoreWorkflowQuestionAction(q)
    if (!result.ok) { alert(`Restore failed: ${result.error}`); return }
    setQuestions(prev => [...prev, q])
    setTrashedQuestions(prev => prev.filter(x => x.id !== q.id))
    setTrashQuestionIds(prev => { const n = new Set(prev); n.delete(q.id); return n })
  }

  async function handleBulkRestoreQuestions() {
    for (const id of [...trashQuestionIds]) {
      const q = trashedQuestions.find(x => x.id === id)
      if (q) await handleRestoreQuestion(q)
    }
    setTrashQuestionIds(new Set())
  }

  /* ── Primary-template picker helpers ─────────────────────────── */
  const missingSections = primarySections.filter(ps => !sections.some(s => s.slug === ps.slug))

  const missingQuestionsForSection = primaryQuestions.filter(
    pq => pq.section_slug === selectedSlug
       && pq.field_key !== '__all__'
       && !sectionQuestions.some(q => q.field_key === pq.field_key)
  )

  async function handleImportSection(ps: WorkflowSection) {
    setImportingSection(ps.id)
    const result = await importSectionFromPrimaryAction(ps.id, templateId)
    setImportingSection(null)
    if (!result.ok) { alert(`Import failed: ${result.error}`); return }
    setSections(prev => [...prev, result.section])
    setQuestions(prev => [...prev, ...result.questions])
    setSelectedSlug(result.section.slug)
    setAddSectionPickerOpen(false)
    router.refresh()
  }

  async function handleImportQuestion(pq: WorkflowQuestion) {
    setImportingQuestion(pq.id)
    const result = await importQuestionFromPrimaryAction(pq.id, templateId)
    setImportingQuestion(null)
    if (!result.ok) { alert(`Import failed: ${result.error}`); return }
    setQuestions(prev => [...prev, result.question])
    router.refresh()
  }

  const showSectionHandle = !readOnly && activePhase === 'all'

  return (
    <>
      {(openSectionMenu !== null || openQuestionMenu !== null) && (
        <div className="fixed inset-0 z-40" onClick={closeMenus} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Left col-span-2 ─────────────────────────────── */}
        <div className="lg:col-span-2 rounded-2xl bg-surface border border-border p-6 flex flex-col" style={{ minHeight: '520px' }}>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-heading">Sections</h2>
              <p className="text-xs text-muted mt-0.5">
                {sections.length} section{sections.length !== 1 ? 's' : ''} across all phases
              </p>
            </div>
            {!readOnly && (
              <button
                onClick={() => missingSections.length > 0 ? setAddSectionPickerOpen(true) : setSectionModal({ open: true, section: null })}
                className="text-xs font-medium text-violet-500 hover:opacity-75 transition-opacity shrink-0 mt-0.5"
              >
                + Add →
              </button>
            )}
          </div>

          {/* Phase filter tabs */}
          <div className="flex items-center gap-1 mb-4 flex-wrap">
            <button
              onClick={() => setActivePhase('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                activePhase === 'all' ? 'bg-heading text-canvas' : 'text-muted hover:text-body-text hover:bg-elevated'
              }`}
            >
              All
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                activePhase === 'all' ? 'bg-white/20 text-white' : 'bg-elevated text-muted'
              }`}>
                {sections.length}
              </span>
            </button>

            {PHASE_ORDER.map(phase => {
              const active = phase === activePhase
              const count  = countForPhase(phase)
              return (
                <button
                  key={phase}
                  onClick={() => setActivePhase(phase)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    active ? 'bg-heading text-canvas' : 'text-muted hover:text-body-text hover:bg-elevated'
                  }`}
                >
                  {!active && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PHASE_COLORS[phase] }} />
                  )}
                  {PHASE_SHORT[phase]}
                  {count > 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white/20 text-white' : 'bg-elevated text-muted'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Select / bulk-action pills */}
            {!readOnly && (
              <div className="ml-auto flex items-center gap-1">
                {sectionSelectMode && selectedSectionIds.size > 0 && (
                  <>
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-elevated text-body-text whitespace-nowrap">
                      {selectedSectionIds.size} selected
                    </span>
                    <button
                      onClick={handleBulkDeleteSections}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-error/15 hover:bg-error/25 transition-colors whitespace-nowrap"
                      style={{ color: '#EF4444' }}
                    >
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setSectionSelectMode(v => !v); setSelectedSectionIds(new Set()) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    sectionSelectMode
                      ? 'bg-bright-violet/15 text-bright-violet'
                      : 'bg-elevated text-body-text hover:text-heading'
                  }`}
                >
                  {sectionSelectMode ? 'Cancel' : 'Select'}
                </button>
              </div>
            )}
          </div>

          {/* Section rows */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {filteredSections.length === 0 ? (
              <p className="text-sm text-muted py-4">No sections in this phase.</p>
            ) : (
              <DndContext id="sections-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-0">
                    {filteredSections.map((s, filteredIdx) => (
                      <SortableSectionRow
                        key={s.id}
                        s={s}
                        idx={sections.findIndex(x => x.id === s.id)}
                        filteredIdx={filteredIdx}
                        filteredCount={filteredSections.length}
                        sections={sections}
                        questions={questions}
                        selectedSlug={selectedSlug}
                        readOnly={readOnly}
                        showHandle={showSectionHandle}
                        openSectionMenu={openSectionMenu}
                        deletingSection={deletingSection}
                        selectMode={sectionSelectMode}
                        isSelected={selectedSectionIds.has(s.id)}
                        setSelectedSlug={navigateToSection}
                        setOpenSectionMenu={setOpenSectionMenu}
                        setSectionModal={setSectionModal}
                        moveSection={moveSection}
                        handleDeleteSection={handleDeleteSection}
                        closeMenus={closeMenus}
                        onToggleSelect={toggleSectionSelect}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {!readOnly && (
            <div className="flex justify-end mt-3 pt-3 border-t border-border">
              <button
                onClick={() => setTrashModal('sections')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-elevated text-body-text hover:text-heading transition-colors"
              >
                <Undo2 size={11} />
                Restore{trashedSections.length > 0 ? ` · ${trashedSections.length}` : ''}
              </button>
            </div>
          )}
        </div>

        {/* ── Right col-span-3 ────────────────────────────── */}
        <div className="lg:col-span-3">
          {selectedSection ? (
            <div className="rounded-2xl bg-surface border border-border px-6 pt-6 pb-5 flex flex-col" style={{ minHeight: '520px' }}>

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-heading">{selectedSection.title}</h2>
                  <p className="text-xs text-muted mt-0.5">
                    {sectionQuestions.filter(q => q.field_key !== '__all__').length} field{sectionQuestions.filter(q => q.field_key !== '__all__').length !== 1 ? 's' : ''} · {selectedSection.checkpoint_count} checkpoints
                  </p>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5 flex-wrap justify-end">
                    <button
                      onClick={() => setSectionModal({ open: true, section: selectedSection })}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-elevated text-body-text hover:text-heading transition-colors whitespace-nowrap"
                    >
                      Edit section
                    </button>
                    <button
                      onClick={() => { setQuestionSelectMode(v => !v); setSelectedQuestionIds(new Set()) }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                        questionSelectMode
                          ? 'bg-bright-violet/15 text-bright-violet'
                          : 'bg-elevated text-body-text hover:text-heading'
                      }`}
                    >
                      {questionSelectMode ? 'Cancel' : 'Select'}
                    </button>
                    {questionSelectMode && selectedQuestionIds.size > 0 && (
                      <>
                        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-elevated text-body-text whitespace-nowrap">
                          {selectedQuestionIds.size} selected
                        </span>
                        <button
                          onClick={handleBulkDeleteQuestions}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-error/15 hover:bg-error/25 transition-colors whitespace-nowrap"
                          style={{ color: '#EF4444' }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => missingQuestionsForSection.length > 0 ? setAddFieldPickerOpen(true) : setQuestionModal({ open: true, question: null })}
                      className="text-xs font-medium text-violet-500 hover:opacity-75 transition-opacity px-1"
                    >
                      + Add field →
                    </button>
                  </div>
                )}
              </div>

              {/* Field cards */}
              <div className="flex flex-col gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <DndContext id="questions-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
                  <SortableContext items={sectionQuestions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                    {sectionQuestions.map((q, idx) => (
                      <SortableQuestionCard
                        key={q.id}
                        q={q}
                        idx={idx}
                        sectionQLen={sectionQuestions.length}
                        readOnly={readOnly}
                        openQuestionMenu={openQuestionMenu}
                        deletingQ={deletingQ}
                        selectMode={questionSelectMode}
                        isSelected={selectedQuestionIds.has(q.id)}
                        setOpenQuestionMenu={setOpenQuestionMenu}
                        setQuestionModal={setQuestionModal}
                        moveQuestion={moveQuestion}
                        handleDeleteQuestion={handleDeleteQuestion}
                        closeMenus={closeMenus}
                        onToggleSelect={toggleQuestionSelect}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {!readOnly && (
                  <button
                    onClick={() => missingQuestionsForSection.length > 0 ? setAddFieldPickerOpen(true) : setQuestionModal({ open: true, question: null })}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border hover:border-electric-blue/40 hover:bg-electric-blue/5 px-4 py-3 text-xs font-medium text-muted hover:text-electric-blue transition-all duration-200"
                  >
                    <Plus size={14} /> Add field
                  </button>
                )}

                {sectionQuestions.length === 0 && readOnly && (
                  <p className="text-sm text-muted py-4">No fields in this section yet.</p>
                )}
              </div>

              {!readOnly && (
                <div className="flex justify-end mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => setTrashModal('questions')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-elevated text-body-text hover:text-heading transition-colors"
                  >
                    <Undo2 size={11} />
                    Restore{trashedQuestions.length > 0 ? ` · ${trashedQuestions.length}` : ''}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface border border-border flex items-center justify-center" style={{ minHeight: '520px' }}>
              <p className="text-sm text-muted">Select a section to view its fields.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Section picker ───────────────────────────── */}
      {addSectionPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAddSectionPickerOpen(false)}>
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-heading">Add Section</h3>
                <p className="text-xs text-muted mt-0.5">Create new or import from the primary template</p>
              </div>
              <button onClick={() => setAddSectionPickerOpen(false)} className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-elevated transition-colors">
                <X size={14} />
              </button>
            </div>

            <button
              onClick={() => { setAddSectionPickerOpen(false); setSectionModal({ open: true, section: null }) }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-elevated transition-colors text-left"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-xl shrink-0" style={{ backgroundColor: 'rgba(146,140,227,0.15)' }}>
                <Plus size={14} style={{ color: '#928CE3' }} />
              </span>
              <span className="text-sm font-medium text-heading">Create new section</span>
            </button>

            {missingSections.length > 0 && (
              <>
                <div className="h-px bg-border my-3" />
                <p className="text-xs text-muted mb-2 px-1">From primary template</p>
                <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {missingSections.map(ps => {
                    const qCount = primaryQuestions.filter(pq => pq.section_slug === ps.slug && pq.field_key !== '__all__').length
                    return (
                      <li key={ps.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-elevated transition-colors">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#928CE3' }} />
                        <span className="flex-1 text-sm font-medium text-heading truncate">{ps.title}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(146,140,227,0.15)', color: '#928CE3' }}>
                          {qCount} field{qCount !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => handleImportSection(ps)}
                          disabled={importingSection === ps.id}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-bright-violet/15 text-bright-violet hover:bg-bright-violet/25 transition-colors disabled:opacity-50"
                        >
                          {importingSection === ps.id ? '…' : '+ Add'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add Field picker ─────────────────────────────── */}
      {addFieldPickerOpen && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAddFieldPickerOpen(false)}>
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-heading">Add Field</h3>
                <p className="text-xs text-muted mt-0.5">Create new or import from the primary template</p>
              </div>
              <button onClick={() => setAddFieldPickerOpen(false)} className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-elevated transition-colors">
                <X size={14} />
              </button>
            </div>

            <button
              onClick={() => { setAddFieldPickerOpen(false); setQuestionModal({ open: true, question: null }) }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-elevated transition-colors text-left"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-xl shrink-0" style={{ backgroundColor: 'rgba(146,140,227,0.15)' }}>
                <Plus size={14} style={{ color: '#928CE3' }} />
              </span>
              <span className="text-sm font-medium text-heading">Create new field</span>
            </button>

            {missingQuestionsForSection.length > 0 && (
              <>
                <div className="h-px bg-border my-3" />
                <p className="text-xs text-muted mb-2 px-1">From primary template · {selectedSection.title}</p>
                <ul className="flex flex-col gap-1.5 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {missingQuestionsForSection.map(pq => {
                    const cfg  = FIELD_TYPE_CONFIG[pq.field_type] ?? DEFAULT_FIELD_CFG
                    const Icon = cfg.icon
                    return (
                      <li key={pq.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-elevated transition-colors">
                        <span className="flex items-center justify-center w-7 h-7 rounded-xl shrink-0" style={{ backgroundColor: cfg.bg }}>
                          <Icon size={13} strokeWidth={1.5} style={{ color: cfg.color }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-heading truncate">{pq.field_key}</p>
                          {pq.label && <p className="text-[11px] text-muted truncate">{pq.label}</p>}
                        </div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          {pq.field_type}
                        </span>
                        <button
                          onClick={() => handleImportQuestion(pq)}
                          disabled={importingQuestion === pq.id}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-bright-violet/15 text-bright-violet hover:bg-bright-violet/25 transition-colors disabled:opacity-50"
                        >
                          {importingQuestion === pq.id ? '…' : '+ Add'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {sectionModal.open && (
        <SectionModal
          templateId={templateId}
          section={sectionModal.section}
          onClose={() => setSectionModal({ open: false, section: null })}
          onSaved={() => { setSectionModal({ open: false, section: null }); router.refresh() }}
        />
      )}
      {questionModal.open && selectedSection && (
        <QuestionModal
          templateId={templateId}
          sectionSlug={selectedSection.slug}
          question={questionModal.question}
          onClose={() => setQuestionModal({ open: false, question: null })}
          onSaved={() => { setQuestionModal({ open: false, question: null }); router.refresh() }}
        />
      )}
      {/* ── Sections trash modal ─────────────────────────── */}
      {trashModal === 'sections' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setTrashModal(null)}>
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-heading">Deleted Sections</h3>
                <p className="text-xs text-muted mt-0.5">{trashedSections.length} section{trashedSections.length !== 1 ? 's' : ''} removed this session</p>
              </div>
              <button onClick={() => setTrashModal(null)} className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-elevated transition-colors">
                <X size={14} />
              </button>
            </div>

            {trashSectionIds.size > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-elevated text-body-text">
                  {trashSectionIds.size} selected
                </span>
                <button
                  onClick={handleBulkRestoreSections}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-bright-violet/15 text-bright-violet hover:bg-bright-violet/25 transition-colors"
                >
                  <RotateCcw size={11} /> Restore selected
                </button>
              </div>
            )}

            {trashedSections.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">Nothing deleted yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                {trashedSections.map(s => {
                  const isSel    = trashSectionIds.has(s.id)
                  const gate     = trashedSectionQs.find(q => q.section_slug === s.slug && q.field_key === '__all__')
                  const ph       = (gate?.visible_in_phases?.[0] ?? 'early') as ConfigPhase
                  const qCount   = trashedSectionQs.filter(q => q.section_slug === s.slug && q.field_key !== '__all__').length
                  return (
                    <li
                      key={s.id}
                      onClick={() => setTrashSectionIds(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isSel ? 'bg-bright-violet/10' : 'hover:bg-elevated'}`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0 transition-colors" style={{ backgroundColor: isSel ? '#A52AE1' : PHASE_COLORS[ph] }} />
                      <span className="flex-1 text-sm font-medium text-heading truncate">{s.title}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(146,140,227,0.15)', color: '#928CE3' }}>
                        {qCount} field{qCount !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleRestoreSection(s) }}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-bright-violet/15 text-bright-violet hover:bg-bright-violet/25 transition-colors"
                      >
                        <RotateCcw size={10} /> Restore
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Questions trash modal ─────────────────────────── */}
      {trashModal === 'questions' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setTrashModal(null)}>
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-heading">Deleted Fields</h3>
                <p className="text-xs text-muted mt-0.5">{trashedQuestions.length} field{trashedQuestions.length !== 1 ? 's' : ''} removed this session</p>
              </div>
              <button onClick={() => setTrashModal(null)} className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-elevated transition-colors">
                <X size={14} />
              </button>
            </div>

            {trashQuestionIds.size > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-elevated text-body-text">
                  {trashQuestionIds.size} selected
                </span>
                <button
                  onClick={handleBulkRestoreQuestions}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-bright-violet/15 text-bright-violet hover:bg-bright-violet/25 transition-colors"
                >
                  <RotateCcw size={11} /> Restore selected
                </button>
              </div>
            )}

            {trashedQuestions.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">Nothing deleted yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                {trashedQuestions.map(q => {
                  const isSel  = trashQuestionIds.has(q.id)
                  const cfg    = FIELD_TYPE_CONFIG[q.field_type] ?? DEFAULT_FIELD_CFG
                  const Icon   = cfg.icon
                  const parent = sections.find(s => s.slug === q.section_slug) ?? trashedSections.find(s => s.slug === q.section_slug)
                  return (
                    <li
                      key={q.id}
                      onClick={() => setTrashQuestionIds(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n })}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isSel ? 'bg-bright-violet/10' : 'hover:bg-elevated'}`}
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-xl shrink-0" style={{ backgroundColor: cfg.bg }}>
                        <Icon size={13} strokeWidth={1.5} style={{ color: cfg.color }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-heading truncate">{q.field_key}</p>
                        {parent && <p className="text-[11px] text-muted truncate">{parent.title}</p>}
                      </div>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        {q.field_type}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleRestoreQuestion(q) }}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-bright-violet/15 text-bright-violet hover:bg-bright-violet/25 transition-colors"
                      >
                        <RotateCcw size={10} /> Restore
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}
