'use client'

import { useToast } from '@/context/ToastContext'
import { Loader2, Check, ArrowRight } from 'lucide-react'

interface SaveButtonsProps {
  onSaveDraft: () => void
  onComplete: () => void
  isSaving: boolean
  isComplete: boolean
}

export default function SaveButtons({
  onSaveDraft,
  onComplete,
  isSaving,
  isComplete,
}: SaveButtonsProps) {
  const { showToast } = useToast()

  function handleDraft() {
    onSaveDraft()
    showToast('draft')
  }

  function handleComplete() {
    onComplete()
    showToast('complete', 'Section complete')
  }

  return (
    <div className="flex flex-col gap-2 mt-1">

      {/* Save draft */}
      {!isComplete && (
        <button
          onClick={handleDraft}
          disabled={isSaving}
          className={`
            w-full
            py-2.5
            rounded-2xl
            text-sm
            font-semibold
            border
            border-slate-500
            text-heading
            bg-transparent
            transition-all
            flex
            items-center
            justify-center
            gap-2
            ${isSaving ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:border-slate-400"}
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            "Save draft"
          )}
        </button>
      )}

      {/* Mark complete */}
      <button
        onClick={handleComplete}
        disabled={isSaving || isComplete}
        className={`
          w-full
          py-3
          rounded-2xl
          text-sm
          font-semibold
          flex
          items-center
          justify-center
          gap-2
          transition-all
          font-sans
          ${
            isComplete
              ? "bg-blue-50 border border-blue-200 text-blue-600 cursor-default"
              : "text-white shadow-md bg-violet-500 hover:bg-violet-700"
          }
          ${isSaving ? "opacity-70 cursor-not-allowed" : ""}
        `}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : isComplete ? (
          <>
            <Check className="h-4 w-4" />
            Section complete
          </>
        ) : (
          <>
            Mark section complete
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

    </div>
  )
}