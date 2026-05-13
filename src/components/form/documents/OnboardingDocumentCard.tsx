'use client'

import { useRef } from 'react'
import { Check, Upload, Trash2, Download, Loader2, FileText } from 'lucide-react'
import type { WorkflowQuestion, ConfigPhase } from '@/types'
import type { OnboardingDocumentUploadMeta } from '@/app/actions/onboardingDocuments'

export type DocStatus = 'not_requested' | 'requested' | 'received'

const STATUS_OPTIONS: { value: DocStatus; label: string; color: string; bg: string; border: string }[] = [
  { value: 'not_requested', label: 'Not requested', color: 'var(--text-muted)', bg: 'var(--bg-elevated)', border: 'rgba(146,140,227,0.2)' },
  { value: 'requested', label: 'Requested', color: '#E65100', bg: 'rgba(245,124,0,0.08)', border: 'rgba(245,124,0,0.35)' },
  { value: 'received', label: 'Received', color: '#16A34A', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.35)' },
]

export function formatDocBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

interface OnboardingDocumentCardProps {
  question: WorkflowQuestion
  phase: ConfigPhase
  fieldKey: string
  status: DocStatus
  note: string
  upload?: OnboardingDocumentUploadMeta
  uploadingKey: string | null
  onPatch: (patch: { status?: DocStatus; note?: string; upload?: OnboardingDocumentUploadMeta | null }) => void
  onPickFile: (fieldKey: string, files: FileList | null) => void
  onRemoveFile: (fieldKey: string) => void
  onDownload: (meta: OnboardingDocumentUploadMeta) => void
}

export default function OnboardingDocumentCard({
  question,
  phase: _phase,
  fieldKey,
  status,
  note,
  upload,
  uploadingKey,
  onPatch,
  onPickFile,
  onRemoveFile,
  onDownload,
}: OnboardingDocumentCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const title = question.label ?? fieldKey
  const priority = question.dummy_value?.trim() || 'HIGH — Blocking'
  const formatHint = question.placeholder ?? ''
  const desc = question.instruction_pre_deploy
  const why = question.instruction_post_deploy

  const statusMeta = STATUS_OPTIONS.find(s => s.value === status)!

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        borderRadius: '10px', overflow: 'hidden',
        border: status === 'received'
          ? '1px solid rgba(34,197,94,0.3)'
          : status === 'requested'
            ? '1px solid rgba(245,124,0,0.25)'
            : 'var(--border-subtle)',
        transition: 'border-color 0.2s',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '12px', padding: '14px 16px',
          background: 'var(--bg-surface)',
          borderBottom: 'var(--border-subtle)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-heading)' }}>{title}</span>
              <span style={{
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em',
                padding: '2px 7px', borderRadius: '10px', textTransform: 'uppercase',
                background: 'rgba(239,68,68,0.1)', color: '#DC2626',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                {priority}
              </span>
            </div>
            {desc && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                {desc}
              </p>
            )}
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
            fontSize: '11px', fontWeight: 600, flexShrink: 0,
            color: statusMeta.color,
            background: statusMeta.bg,
            border: `1px solid ${statusMeta.border}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            {status === 'received' && (
              <Check size={12} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0 }} />
            )}
            {statusMeta.label}
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)' }}>
          {formatHint && (
            <div style={{
              fontSize: '11px', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'flex-start', gap: '6px',
              marginBottom: '12px',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--electric-blue)', flexShrink: 0 }}>Format:</span>
              {formatHint}
            </div>
          )}
          {why && (
            <div style={{
              fontSize: '11px', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'flex-start', gap: '6px',
              marginBottom: '14px',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--soft-lavender)', flexShrink: 0 }}>Why:</span>
              {why}
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPatch({ status: opt.value })}
                style={{
                  fontSize: '11px', fontWeight: 600,
                  padding: '5px 12px', borderRadius: '20px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'var(--font-family)',
                  color: status === opt.value ? opt.color : 'var(--text-muted)',
                  background: status === opt.value ? opt.bg : 'var(--bg-surface)',
                  border: status === opt.value
                    ? `1.5px solid ${opt.border}`
                    : '1.5px solid rgba(146,140,227,0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {opt.value === 'received' && (
                  <Check size={12} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0 }} />
                )}
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '6px' }}>
              File (optional)
            </div>
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.csv,.txt,.zip,.doc,.docx,.xls,.xlsx,.dwg,.dxf,application/pdf,image/*"
                onChange={e => onPickFile(fieldKey, e.target.files)}
                disabled={uploadingKey === fieldKey}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={uploadingKey === fieldKey}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    fontSize: '11px', fontWeight: 600,
                    padding: '6px 12px', borderRadius: '8px',
                    cursor: uploadingKey === fieldKey ? 'not-allowed' : 'pointer',
                    opacity: uploadingKey === fieldKey ? 0.6 : 1,
                    border: '1px solid rgba(146,140,227,0.35)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-heading)',
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {uploadingKey === fieldKey ? (
                    <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
                  ) : (
                    <Upload size={14} className="shrink-0" aria-hidden />
                  )}
                  {upload ? 'Replace file' : 'Upload file'}
                </button>
                {upload && (
                  <>
                    <span
                        style={{
                          fontSize: '11px', color: 'var(--text-muted)',
                          display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '200px',
                        }}
                        title={upload.name}
                      >
                        <FileText size={12} className="shrink-0" aria-hidden />
                        <span className="truncate">{upload.name}</span>
                        <span className="shrink-0">({formatDocBytes(upload.size)})</span>
                      </span>
                      <button
                        type="button"
                        disabled={uploadingKey === fieldKey}
                        onClick={() => onDownload(upload)}
                        style={{
                          fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px',
                          border: '1px solid rgba(57,153,254,0.35)', background: 'rgba(57,153,254,0.08)',
                          color: '#1d4ed8', cursor: uploadingKey === fieldKey ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        <Download size={12} aria-hidden /> Download
                      </button>
                      <button
                        type="button"
                        disabled={uploadingKey === fieldKey}
                        onClick={() => onRemoveFile(fieldKey)}
                        style={{
                          fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px',
                          border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)',
                          color: '#b91c1c', cursor: uploadingKey === fieldKey ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        <Trash2 size={12} aria-hidden /> Remove
                      </button>
                    </>
                  )}
              </div>
            </>
          </div>

          <textarea
            rows={2}
            placeholder="Reference link, storage location, or notes (optional if you uploaded a file)"
            value={note}
            onChange={e => onPatch({ note: e.target.value })}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg-surface)',
              border: '1px solid rgba(146,140,227,0.2)',
              borderRadius: '6px', padding: '8px 10px',
              fontSize: '12px', color: 'var(--text-primary)',
              fontFamily: 'var(--font-family)', lineHeight: 1.5,
              resize: 'vertical', outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}
