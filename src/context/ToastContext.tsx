'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'

export type ToastType = 'draft' | 'complete' | 'autosave' | 'error'

export interface Toast {
  id: string
  type: ToastType
  message: string
  time: string
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (type: ToastType, message?: string) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const showToast = useCallback((type: ToastType, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const now = new Date()
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const defaultMessages: Record<ToastType, string> = {
      draft:    'Draft saved',
      complete: 'Section complete',
      autosave: 'Auto-saved',
      error:    'Something went wrong',
    }

    const toast: Toast = {
      id,
      type,
      message: message ?? defaultMessages[type],
      time,
    }

    setToasts(prev => [...prev.slice(-4), toast]) // max 5 toasts

    const duration = type === 'complete' ? 4000 : type === 'autosave' ? 2500 : 3000

    timers.current[id] = setTimeout(() => {
      dismissToast(id)
    }, duration)
  }, [dismissToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}