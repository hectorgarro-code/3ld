import { Trophy } from 'lucide-react'
import { formatARS } from '@/lib/cost-calculator'
import { cn } from '@/lib/utils'
import type { DashboardKpis } from '@/types'

interface Props {
  productos: DashboardKpis['top_productos']
}

export function TopProductosPanel({ productos }: Props) {
  return (
    <div className="flex flex-col rounded-2xl bg-white card-shadow overflow-hidden h-full">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Top Vendidos</h3>
            <p className="text-[11px] text-slate-400 font-medium">Artículos con mayor facturación</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
          Top {productos?.length || 0}
        </span>
      </div>

      <div className="flex-1 p-3 overflow-y-auto max-h-[300px]">
        {productos && productos.length > 0 ? (
          <div className="space-y-2">
            {productos.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl p-2.5 bg-slate-50 hover:bg-slate-100/70 transition-colors border border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                    i === 0 ? "bg-amber-100 text-amber-700 font-black border border-amber-200" :
                    i === 1 ? "bg-slate-200 text-slate-700 font-bold border border-slate-300" :
                    i === 2 ? "bg-orange-100 text-orange-700 font-bold border border-orange-200" :
                    "bg-slate-100 text-slate-500"
                  )}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate" title={p.nombre}>{p.nombre}</p>
                    <p className="text-[10px] font-medium text-slate-400">{p.cantidad_vendida} uds. vendidas</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-900 font-mono">
                    {formatARS(p.total_generado)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Trophy className="h-8 w-8 text-slate-300 mb-2 opacity-50" />
            <p className="text-xs font-bold text-slate-600">Sin ventas registradas</p>
            <p className="text-[11px] text-slate-400">Los artículos destacados aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
  )
}
