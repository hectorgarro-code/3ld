import { useNavigate } from 'react-router-dom'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate, cn } from '@/lib/utils'
import type { Pedido, PedidoEstado } from '@/types'

const estadoColors: Record<PedidoEstado, string> = {
  presupuesto: 'bg-slate-100 text-slate-700 border border-slate-200',
  aprobado: 'bg-sky-100 text-sky-800 border border-sky-200',
  en_produccion: 'bg-amber-100 text-amber-800 border border-amber-200',
  terminado: 'bg-teal-100 text-teal-800 border border-teal-200',
  entregado: 'bg-purple-100 text-purple-800 border border-purple-200',
  cobrado: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  anulado: 'bg-rose-100 text-rose-800 border border-rose-200',
}

const estadoLabels: Record<PedidoEstado, string> = {
  presupuesto: 'Presupuesto',
  aprobado: 'Pedido',
  en_produccion: 'En proceso',
  terminado: 'Terminado',
  entregado: 'Entregado',
  cobrado: 'Cobrado',
  anulado: 'Anulado',
}

export function PedidoCard({ pedido }: { pedido: Pedido }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/pedidos/${pedido.id}`)}
      className="w-full cursor-pointer rounded-2xl border border-slate-100 bg-white card-shadow p-4 text-left transition-all hover:border-primary/40 hover:bg-slate-50 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400">{pedido.numero_pedido}</p>
          <p className="truncate text-base font-black text-slate-800">
            {pedido.cliente_nombre ?? pedido.cliente?.nombre ?? 'Cliente desconocido'}
          </p>
        </div>
        <span
          className={cn(
            'flex-shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-bold',
            estadoColors[pedido.estado]
          )}
        >
          {estadoLabels[pedido.estado]}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-lg font-black text-primary">{formatARS(pedido.total)}</p>
        <p className="text-xs text-slate-400">{formatDate(pedido.created_at)}</p>
      </div>
      {pedido.fecha_entrega_estimada && (
        <p className="mt-1 text-xs text-slate-400">
          Entrega estimada: {formatDate(pedido.fecha_entrega_estimada)}
        </p>
      )}
    </div>
  )
}
