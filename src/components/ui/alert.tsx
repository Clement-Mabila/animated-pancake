import { XCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react'

export type AlertVariant = 'error' | 'warning' | 'info' | 'success'

interface AlertProps {
  variant?:   AlertVariant
  title?:     string
  children:   React.ReactNode
  onDismiss?: () => void
  className?: string
}

const CONFIG: Record<AlertVariant, {
  container: string
  iconCls:   string
  Icon:      React.ComponentType<{ size?: number; className?: string }>
}> = {
  error:   { container: 'bg-red-500/10 border-red-500/20 text-red-400',     iconCls: 'text-red-400',     Icon: XCircle       },
  warning: { container: 'bg-amber-500/10 border-amber-500/20 text-amber-400', iconCls: 'text-amber-400', Icon: AlertTriangle  },
  info:    { container: 'bg-blue-500/10 border-blue-500/20 text-blue-400',   iconCls: 'text-blue-400',   Icon: Info           },
  success: { container: 'bg-green-500/10 border-green-500/20 text-green-400', iconCls: 'text-green-400', Icon: CheckCircle    },
}

export function Alert({ variant = 'error', title, children, onDismiss, className = '' }: AlertProps) {
  const { container, iconCls, Icon } = CONFIG[variant]
  return (
    <div role="alert" className={`flex gap-2.5 py-2.5 px-3 rounded-lg border text-xs ${container} ${className}`}>
      <Icon size={14} className={`${iconCls} shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold m-0 mb-0.5">{title}</p>}
        <p className="m-0 leading-relaxed opacity-90">{children}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 bg-transparent border-none p-0 leading-none cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
