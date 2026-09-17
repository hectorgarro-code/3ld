import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color: 'primary' | 'secondary' | 'accent' | 'purple' | 'green'
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  isLoading?: boolean
}

const colorMap = {
  primary: {
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    value: 'text-slate-800',
  },
  secondary: {
    iconBg: 'bg-secondary/10',
    iconText: 'text-secondary',
    value: 'text-slate-800',
  },
  accent: {
    iconBg: 'bg-accent/10',
    iconText: 'text-accent',
    value: 'text-slate-800',
  },
  purple: {
    iconBg: 'bg-brand-purple/10',
    iconText: 'text-brand-purple',
    value: 'text-slate-800',
  },
  green: {
    iconBg: 'bg-brand-green/10',
    iconText: 'text-brand-green',
    value: 'text-slate-800',
  },
}

export function KpiCard({
  title,
  value,
  icon,
  color,
  trend,
  trendValue,
  isLoading = false,
}: KpiCardProps) {
  const colors = colorMap[color]

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-5 animate-pulse card-shadow">
        <div className="mb-4 h-12 w-12 rounded-full bg-slate-100" />
        <div className="mb-2 h-4 w-2/3 rounded-lg bg-slate-100" />
        <div className="h-8 w-1/2 rounded-lg bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 transition-transform hover:-translate-y-1 card-shadow flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', colors.iconBg, colors.iconText)}>
          {icon}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
          {title}
        </p>
        <p className={cn('text-2xl font-black', colors.value)}>{value}</p>

        {trend && trendValue && (
          <div
            className={cn(
              'mt-2 flex items-center gap-1 text-xs font-semibold',
              trend === 'up' ? 'text-brand-green' : trend === 'down' ? 'text-red-500' : 'text-slate-400'
            )}
          >
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  )
}
