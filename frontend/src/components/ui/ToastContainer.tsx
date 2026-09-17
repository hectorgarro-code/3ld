import { useToastStore } from '@/store/toastStore'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const icons = {
  success: <CheckCircle className="h-5 w-5 text-brand-green" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-accent" />,
  info: <Info className="h-5 w-5 text-secondary" />,
}

const styles = {
  success: 'border-brand-green/30 bg-brand-green/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-accent/30 bg-accent/10',
  info: 'border-secondary/30 bg-secondary/10',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'toast-enter flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm',
            'min-w-[280px] max-w-[360px]',
            styles[t.type]
          )}
        >
          {icons[t.type]}
          <p className="flex-1 text-sm font-semibold text-slate-800">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-500 transition-colors hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
