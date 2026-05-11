'use client'

import { useState, useEffect, useCallback } from 'react'
import { getWorkflowDeployTasks } from '@/lib/supabase/queries'
import { updateDeployChecklistAction } from '@/app/actions/session'
import type { WorkflowDeployTask } from '@/types'

interface DeployChecklistProps {
  configId:         string
  initialChecklist: Record<string, boolean>
  onProgressChange: (allComplete: boolean, checked: number, total: number) => void
}

const TASK_ICONS: Record<string, string> = {
  ingest_robots:             '🤖',
  report_cadence:            '📅',
  robot_register_validation: '✓',
  validate_access_controls:  '🔐',
  orchestrator_training:     '🎓',
}

const TASK_COLORS: Record<string, { dot: string; bg: string; border: string }> = {
  ingest_robots:             { dot: '#3999FE', bg: 'rgba(57,153,254,0.08)',   border: 'rgba(57,153,254,0.25)'  },
  report_cadence:            { dot: '#A52AE1', bg: 'rgba(165,42,225,0.08)',   border: 'rgba(165,42,225,0.25)'  },
  robot_register_validation: { dot: '#16A34A', bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.25)'   },
  validate_access_controls:  { dot: '#E65100', bg: 'rgba(245,124,0,0.08)',    border: 'rgba(245,124,0,0.25)'   },
  orchestrator_training:     { dot: '#7B1FA2', bg: 'rgba(165,42,225,0.08)',   border: 'rgba(165,42,225,0.25)'  },
}

export default function DeployChecklist({
  configId,
  initialChecklist,
  onProgressChange,
}: DeployChecklistProps) {
  const [tasks,     setTasks]     = useState<WorkflowDeployTask[]>([])
  const [checklist, setChecklist] = useState<Record<string, boolean>>(initialChecklist)
  const [notes,     setNotes]     = useState<Record<string, string>>({})
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState<string | null>(null)

  useEffect(() => {
    getWorkflowDeployTasks()
      .then(setTasks)
      .finally(() => setLoading(false))
  }, [])

  const checkedCount = tasks.filter(t => checklist[t.task_key]).length
  const totalCount   = tasks.length
  const allComplete  = totalCount > 0 && checkedCount === totalCount

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
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading checklist...</p>
      </div>
    )
  }

  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '16px' }}>
          All 5 tasks below must be completed by the MBody team before handover to the client.
          These are operational system tasks — not data collection questions.
        </p>

        {/* Progress bar */}
        <div style={{
          padding: '14px 16px', borderRadius: '10px',
          background: allComplete
            ? 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(57,153,254,0.06))'
            : 'var(--bg-surface)',
          border: allComplete
            ? '1px solid rgba(34,197,94,0.3)'
            : '1px solid rgba(146,140,227,0.15)',
          transition: 'all 0.3s',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: '10px',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>
              {allComplete
                ? 'All tasks complete — ready for handover'
                : `${checkedCount} of ${totalCount} tasks complete`}
            </span>
            <span style={{
              fontSize: '11px', fontWeight: 700,
              color: allComplete ? '#16A34A' : 'var(--text-muted)',
            }}>
              {progressPct}%
            </span>
          </div>
          <div style={{
            height: '6px', borderRadius: '3px',
            background: 'rgba(146,140,227,0.15)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '3px',
              width: `${progressPct}%`,
              background: allComplete
                ? 'linear-gradient(90deg, #16A34A, #3999FE)'
                : 'linear-gradient(90deg, #A52AE1, #3999FE)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Task cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {tasks.map((task, idx) => {
          const done    = !!checklist[task.task_key]
          const colors  = TASK_COLORS[task.task_key] ?? TASK_COLORS['ingest_robots']
          const icon    = TASK_ICONS[task.task_key] ?? '◆'
          const isSavingThis = saving === task.task_key

          return (
            <div
              key={task.id}
              style={{
                borderRadius: '10px', overflow: 'hidden',
                border: done
                  ? '1px solid rgba(34,197,94,0.35)'
                  : 'var(--border-subtle)',
                transition: 'all 0.2s',
              }}
            >
              {/* Task header */}
              <div
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  padding: '14px 16px',
                  background: done ? 'rgba(34,197,94,0.04)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onClick={() => !isSavingThis && toggleTask(task.task_key)}
              >
                {/* Checkbox */}
                <div style={{
                  width: '22px', height: '22px', borderRadius: '6px',
                  flexShrink: 0, marginTop: '1px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isSavingThis ? 'wait' : 'pointer',
                  transition: 'all 0.15s',
                  background: done ? '#16A34A' : 'var(--bg-elevated)',
                  border: done ? 'none' : '1.5px solid rgba(146,140,227,0.35)',
                  boxShadow: done ? '0 2px 8px rgba(22,163,74,0.25)' : 'none',
                }}>
                  {isSavingThis ? (
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: 'white',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                  ) : done ? (
                    <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                      <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </div>

                {/* Step number + content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                      padding: '2px 7px', borderRadius: '10px',
                      color: colors.dot, background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      textTransform: 'uppercase',
                    }}>
                      {icon} Task {idx + 1}
                    </span>
                    {done && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                        color: '#16A34A', textTransform: 'uppercase',
                      }}>
                        Complete
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '13px', fontWeight: 700,
                    color: done ? '#16A34A' : 'var(--text-heading)',
                    marginBottom: '3px',
                    textDecoration: done ? 'line-through' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {task.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes field — always visible for operational notes */}
              <div style={{
                padding: '10px 16px 12px',
                background: 'var(--bg-elevated)',
                borderTop: 'var(--border-subtle)',
              }}>
                <textarea
                  rows={1}
                  placeholder="Operational notes (e.g. completed by, timestamp, any issues encountered)..."
                  value={notes[task.task_key] ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [task.task_key]: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--bg-surface)',
                    border: '1px solid rgba(146,140,227,0.18)',
                    borderRadius: '6px', padding: '7px 10px',
                    fontSize: '12px', color: 'var(--text-primary)',
                    fontFamily: 'var(--font-family)', lineHeight: 1.5,
                    resize: 'vertical', outline: 'none',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Handover notice */}
      {allComplete && (
        <div style={{
          padding: '14px 16px', borderRadius: '10px', marginBottom: '8px',
          background: 'linear-gradient(135deg, rgba(34,197,94,0.07), rgba(57,153,254,0.07))',
          border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A', marginBottom: '4px' }}>
            ✓ All deploy tasks complete
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Click "Advance to Post-Deployment" below to move this configuration into the
            Post-Deploy phase for +2 week review and tuning.
          </div>
        </div>
      )}
    </div>
  )
}
