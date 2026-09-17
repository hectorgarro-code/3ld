import { cn } from '@/lib/utils'
import { formatARS } from '@/lib/cost-calculator'

export function CostBreakdownRow({
  label,
  value,
  icon,
  color,
  pct,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  pct: number
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-slate-500">{label}</span>
          <span className="text-xs font-bold text-slate-800">{formatARS(value)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-50">
          <div
            className={cn('h-full rounded-full transition-all', color.includes('primary') ? 'bg-primary' : color.includes('green') ? 'bg-brand-green' : color.includes('accent') ? 'bg-accent' : 'bg-brand-purple')}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
