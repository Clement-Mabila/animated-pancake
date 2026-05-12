'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bot,
  CalendarDays,
  ClipboardCheck,
  ShieldCheck,
  GraduationCap,
  Check,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { getWorkflowDeployTasks } from '@/lib/supabase/queries'
import { updateDeployChecklistAction } from '@/app/actions/session'
import type { WorkflowDeployTask } from '@/types'

interface DeployChecklistProps {
  configId:         string
  /** Must match the workflow template used for questions / admin deploy tasks */
  templateId:       string
  initialChecklist: Record<string, boolean>
  onProgressChange: (allComplete: boolean, checked: number, total: number) => void
}

const TASK_ICONS: Record<string, React.ElementType> = {
  ingest_robots:             Bot,
  report_cadence:            CalendarDays,
  robot_register_validation: ClipboardCheck,
  validate_access_controls:  ShieldCheck,
  orchestrator_training:     GraduationCap,
}

const TASK_COLORS: Record<string, {
  badge:  string
  icon:   string
  border: string
}> = {
  ingest_robots:             { badge: 'bg-blue-50 border-blue-200 text-blue-600',    icon: 'text-blue-500',   border: 'border-blue-200'   },
  report_cadence:            { badge: 'bg-purple-50 border-purple-200 text-purple-600', icon: 'text-purple-500', border: 'border-purple-200' },
  robot_register_validation: { badge: 'bg-green-50 border-green-200 text-green-700',  icon: 'text-green-600',  border: 'border-green-200'  },
  validate_access_controls:  { badge: 'bg-orange-50 border-orange-200 text-orange-600', icon: 'text-orange-500', border: 'border-orange-200' },
  orchestrator_training:     { badge: 'bg-violet-50 border-violet-200 text-violet-700', icon: 'text-violet-600', border: 'border-violet-200' },
}

const DEFAULT_COLORS = TASK_COLORS['ingest_robots']

export default function DeployChecklist({
  configId,
  templateId,
  initialChecklist,
  onProgressChange,
}: DeployChecklistProps) {
  const [tasks,     setTasks]     = useState<WorkflowDeployTask[]>([])
  const [checklist, setChecklist] = useState<Record<string, boolean>>(initialChecklist)
  const [notes,     setNotes]     = useState<Record<string, string>>({})
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getWorkflowDeployTasks(templateId)
      .then(data => { if (!cancelled) setTasks(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [templateId])

  const checkedCount = tasks.filter(t => checklist[t.task_key]).length
  const totalCount   = tasks.length
  const allComplete  = totalCount > 0 && checkedCount === totalCount
  const progressPct  = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  useEffect(() => {
    onProgressChange(allComplete, checkedCount, totalCount)
  }, [allComplete, checkedCount, totalCount, onProgressChange])

  const toggleTask = useCallback(async (taskKey: string) => {
    const updated = { ...checklist, [taskKey]: !checklist[taskKey] }
    setChecklist(updated)
    setSaving(taskKey)
    try {
      await updateDeployChecklistAction(configId, updated)
    } finally {
      setSaving(null)
    }
  }, [checklist, configId])

  if (loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-500">Loading checklist...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          All 5 tasks below must be completed by the MBody team before handover to the client.
          These are operational system tasks — not data collection questions.
        </p>

        {/* Progress bar */}
        <div className={`p-4 rounded-xl border transition-all duration-300 ${
          allComplete
            ? 'bg-gradient-to-br from-green-50 to-blue-50 border-green-300'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-gray-900">
              {allComplete
                ? 'All tasks complete — ready for handover'
                : `${checkedCount} of ${totalCount} tasks complete`}
            </span>
            <span className={`text-xs font-bold transition-colors ${
              allComplete ? 'text-green-600' : 'text-gray-400'
            }`}>
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allComplete
                  ? 'bg-gradient-to-r from-green-500 to-blue-500'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Task cards */}
      <div className="flex flex-col gap-2.5 mb-5">
        {tasks.map((task, idx) => {
          const done         = !!checklist[task.task_key]
          const colors       = TASK_COLORS[task.task_key] ?? DEFAULT_COLORS
          const Icon         = TASK_ICONS[task.task_key]  ?? Bot
          const isSavingThis = saving === task.task_key

          return (
            <div
              key={task.id}
              className={`rounded-xl overflow-hidden border transition-all duration-200 ${
                done ? 'border-green-300' : 'border-gray-200'
              }`}
            >
              {/* Task header row */}
              <div
                className={`flex items-start gap-3.5 p-4 transition-colors cursor-pointer select-none ${
                  done ? 'bg-green-50/50' : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => !isSavingThis && toggleTask(task.task_key)}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 shrink-0 mt-0.5 rounded-md flex items-center justify-center transition-all duration-150 ${
                  isSavingThis ? 'cursor-wait' : 'cursor-pointer'
                } ${
                  done
                    ? 'bg-green-600 shadow-sm shadow-green-200'
                    : 'bg-gray-50 border border-gray-300'
                }`}>
                  {isSavingThis ? (
                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                  ) : done ? (
                    <Check className="w-3 h-3 text-white stroke-2" />
                  ) : null}
                </div>

                {/* Label + title + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${colors.badge}`}>
                      <Icon className={`w-3 h-3 ${colors.icon}`} />
                      Task {idx + 1}
                    </span>
                    {done && (
                      <span className="text-xs font-bold tracking-wide uppercase text-green-600">
                        Complete
                      </span>
                    )}
                  </div>
                  <div className={`text-sm font-bold mb-0.5 transition-all duration-200 ${
                    done ? 'text-green-600 line-through decoration-green-400' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-xs text-gray-500 leading-relaxed">
                      {task.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes field */}
              <div className="px-4 pt-2.5 pb-3 bg-gray-50 border-t border-gray-100">
                <textarea
                  rows={1}
                  placeholder="Operational notes (e.g. completed by, timestamp, any issues encountered)..."
                  value={notes[task.task_key] ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [task.task_key]: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-900 leading-relaxed resize-y outline-none placeholder:text-gray-400 focus:ring-1 focus:ring-purple-300 focus:border-purple-300 transition-all"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Handover notice */}
      {allComplete && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-blue-50 border border-green-300 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span className="text-sm font-bold text-green-700">All deploy tasks complete</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed pl-6">
            Click "Advance to Post-Deployment" below to move this configuration into the
            Post-Deploy phase for +2 week review and tuning.
          </p>
        </div>
      )}
    </div>
  )
}