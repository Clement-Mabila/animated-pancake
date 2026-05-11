'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, CheckSquare } from 'lucide-react'
import {
  upsertDeployTaskAction,
  deleteDeployTaskAction,
  reorderDeployTasksAction,
  restoreDeployTaskAction,
} from '@/app/admin/actions/workflow'
import type { WorkflowDeployTask } from '@/types'

interface Props {
  templateId:  string
  deployTasks: WorkflowDeployTask[]
  readOnly:    boolean
}

interface TaskForm {
  id?:         string
  taskKey:     string
  title:       string
  description: string
}

const EMPTY_FORM: TaskForm = { taskKey: '', title: '', description: '' }

export default function DeployTasksTab({ templateId, deployTasks, readOnly }: Props) {
  const router = useRouter()
  const [tasks,        setTasks]        = useState<WorkflowDeployTask[]>(deployTasks)
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [addingNew,    setAddingNew]    = useState(false)
  const [form,         setForm]         = useState<TaskForm>(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [error,        setError]        = useState<string | null>(null)

  type HistoryEntry = { undo: () => Promise<void>; redo: () => Promise<void> }
  const historyRef    = useRef<HistoryEntry[]>([])
  const historyPosRef = useRef(-1)

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

  function startEdit(task: WorkflowDeployTask) {
    setAddingNew(false)
    setEditingId(task.id)
    setForm({ id: task.id, taskKey: task.task_key, title: task.title, description: task.description ?? '' })
    setError(null)
  }

  function startAdd() {
    setEditingId(null)
    setAddingNew(true)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setAddingNew(false)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.taskKey.trim() && !editingId) { setError('Task key is required'); return }
    setSaving(true)
    setError(null)
    const result = await upsertDeployTaskAction({
      id:          form.id,
      templateId,
      taskKey:     form.taskKey || form.id!,
      title:       form.title,
      description: form.description || null,
    })
    setSaving(false)
    if (!result.ok) { setError(result.error); return }
    setTasks(prev =>
      editingId
        ? prev.map(t => t.id === editingId ? result.task : t)
        : [...prev, result.task]
    )
    cancelEdit()
    router.refresh()
  }

  async function handleDelete(id: string) {
    const prevTasks  = tasks
    const deletedTask = tasks.find(t => t.id === id)!

    setDeletingId(id)
    await deleteDeployTaskAction(id)
    setTasks(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
    router.refresh()

    pushHistory({
      undo: async () => {
        await restoreDeployTaskAction(deletedTask)
        setTasks(prevTasks)
        router.refresh()
      },
      redo: async () => {
        await deleteDeployTaskAction(id)
        setTasks(prevTasks.filter(t => t.id !== id))
        router.refresh()
      },
    })
  }

  async function moveTask(index: number, direction: 'up' | 'down') {
    const before  = [...tasks]
    const next    = [...tasks]
    const swapIdx = direction === 'up' ? index - 1 : index + 1
    if (swapIdx < 0 || swapIdx >= next.length) return
    ;[next[index], next[swapIdx]] = [next[swapIdx], next[index]]
    setTasks(next)
    await reorderDeployTasksAction(next.map((t, i) => ({ id: t.id, sortOrder: i + 1 })))
    router.refresh()

    pushHistory({
      undo: async () => {
        setTasks(before)
        await reorderDeployTasksAction(before.map((t, i) => ({ id: t.id, sortOrder: i + 1 })))
        router.refresh()
      },
      redo: async () => {
        setTasks(next)
        await reorderDeployTasksAction(next.map((t, i) => ({ id: t.id, sortOrder: i + 1 })))
        router.refresh()
      },
    })
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-heading">Deploy phase checklist</h3>
          <p className="text-xs text-muted mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} · MBody team completes these before client handover
          </p>
        </div>
        {!readOnly && !addingNew && !editingId && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors"
          >
            <Plus size={13} /> Add task
          </button>
        )}
      </div>

      <div className="space-y-2">
        {tasks.map((task, idx) => (
          <div key={task.id}>
            {editingId === task.id ? (
              <TaskForm
                form={form}
                setForm={setForm}
                onSave={handleSave}
                onCancel={cancelEdit}
                saving={saving}
                error={error}
                isEdit
              />
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 group">
                {/* Order badge */}
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-50 border border-violet-200 text-violet-600 text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>

                <CheckSquare size={16} className="text-muted shrink-0 mt-1" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-heading">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{task.description}</p>
                  )}
                  <p className="text-[10px] font-mono text-muted/60 mt-1">{task.task_key}</p>
                </div>

                {!readOnly && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => moveTask(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-muted hover:text-heading disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveTask(idx, 'down')}
                      disabled={idx === tasks.length - 1}
                      className="p-1 rounded text-muted hover:text-heading disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={() => startEdit(task)}
                      className="p-1 rounded text-muted hover:text-violet-600 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={deletingId === task.id}
                      className="p-1 rounded text-muted hover:text-red-500 disabled:opacity-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {addingNew && (
          <TaskForm
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onCancel={cancelEdit}
            saving={saving}
            error={error}
            isEdit={false}
          />
        )}

        {tasks.length === 0 && !addingNew && (
          <div className="text-center py-10 text-muted text-sm">
            No deploy tasks yet.{!readOnly && ' Click "Add task" to create the first one.'}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskForm({
  form, setForm, onSave, onCancel, saving, error, isEdit,
}: {
  form:     TaskForm
  setForm:  (f: TaskForm) => void
  onSave:   () => void
  onCancel: () => void
  saving:   boolean
  error:    string | null
  isEdit:   boolean
}) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/30 px-4 py-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className={isEdit ? 'col-span-2' : ''}>
          <label className="block text-xs font-medium text-muted mb-1">Title</label>
          <input
            autoFocus
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            placeholder="Task title"
          />
        </div>
        {!isEdit && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Task key</label>
            <input
              value={form.taskKey}
              onChange={e => setForm({ ...form, taskKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-mono text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              placeholder="task_key"
            />
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
          placeholder="Optional description shown in the deploy checklist"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} type="button" className="px-3 py-1.5 text-xs text-muted hover:text-heading transition-colors">
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          type="button"
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Add task'}
        </button>
      </div>
    </div>
  )
}
