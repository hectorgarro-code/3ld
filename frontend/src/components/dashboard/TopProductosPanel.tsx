import { Trophy } from 'lucide-react'
import { formatARS } from '@/lib/cost-calculator'
import type { DashboardKpis } from '@/types'

interface Props {
  productos: DashboardKpis['top_productos']
}

export function TopProductosPanel({ productos }: Props) {
  if (!productos || productos.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center font-semibold text-slate-400 bg-slate-50 rounded-xl">
        Sin ventas registradas este mes
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-6 card-shadow h-full flex flex-col">
      <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-500" /> Top 5 Vendidos del Mes
      </h3>
      <div className="space-y-4 flex-1">
        {productos.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-sm font-black text-slate-500">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{p.nombre}</p>
                <p className="text-[11px] font-medium text-slate-500">{p.cantidad_vendida} uds. vendidas</p>
              </div>
            </div>
            <div className="text-right font-black text-primary">
              {formatARS(p.total_generado)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
