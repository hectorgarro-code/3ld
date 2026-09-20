import { CalendarClock, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate } from '@/lib/utils'
import type { DashboardAlertasResult } from '@/types'

interface Props {
  alertas: DashboardAlertasResult
}

export function EntregasPanel({ alertas }: Props) {
  const entregas_pendientes = alertas?.entregas_pendientes || []

  if (entregas_pendientes.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-2xl bg-white card-shadow text-slate-400">
        <CalendarClock className="mb-2 h-6 w-6 opacity-50" />
        <p className="text-sm font-bold text-slate-400">Sin entregas próximas</p>
      </div>
    )
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  return (
    <div className="flex flex-col rounded-2xl bg-white card-shadow overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <CalendarClock className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Entregas Vencidas y Próximas</h3>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
          {entregas_pendientes.length}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-2">
        {entregas_pendientes.map((e) => {
          const fechaE = new Date(e.fecha_entrega_estimada)
          const esVencidaOHoy = fechaE <= hoy
          const color = esVencidaOHoy ? 'text-red-500' : 'text-accent'
          const bg = esVencidaOHoy ? 'bg-red-50 hover:bg-red-100/50' : 'hover:bg-slate-50'

          return (
            <Link 
              to={`/ventas/${e.id}`}
              key={e.id} 
              className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${bg}`}
            >
              <div>
                <p className="text-sm font-black text-slate-800">{e.numero_pedido}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {esVencidaOHoy && <AlertCircle className="h-3 w-3 text-red-500" />}
                  <p className={`text-xs font-bold ${color}`}>
                    {esVencidaOHoy ? 'Vence Hoy / Atrasado' : 'Mañana'} - {formatDate(e.fecha_entrega_estimada)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">{formatARS(e.total)}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{e.estado.replace('_', ' ')}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
