import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate, cn } from '@/lib/utils'
import { useCambiarEstadoPedido, useAnularPedido } from '@/hooks/usePedidos'
import { toast } from '@/store/toastStore'
import { Trash2, AlertTriangle } from 'lucide-react'
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
  const cambiarEstado = useCambiarEstadoPedido()
  const anularPedido = useAnularPedido()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const handleEstadoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const nuevoEstado = e.target.value as PedidoEstado
    try {
      await cambiarEstado.mutateAsync({ id: pedido.id, estado: nuevoEstado })
      toast(`Estado actualizado a ${estadoLabels[nuevoEstado]}`, 'success')
    } catch {
      toast('Error al cambiar el estado del pedido', 'error')
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await anularPedido.mutateAsync(pedido.id)
      toast(`Pedido ${pedido.numero_pedido} eliminado correctamente`, 'success')
      setShowConfirmDelete(false)
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error al eliminar el pedido', 'error')
    }
  }

  return (
    <>
      <div
        onClick={() => navigate(`/pedidos/${pedido.id}`)}
        className="w-full cursor-pointer rounded-2xl border border-slate-100 bg-white card-shadow p-4 text-left transition-all hover:border-primary/40 hover:bg-slate-50 active:scale-[0.99] space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-400">{pedido.numero_pedido}</p>
            <p className="truncate text-base font-black text-slate-800">
              {pedido.cliente_nombre ?? pedido.cliente?.nombre ?? 'Cliente desconocido'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="print:hidden">
              <select
                value={pedido.estado}
                onChange={handleEstadoChange}
                disabled={cambiarEstado.isPending}
                className={cn(
                  'cursor-pointer appearance-none rounded-full px-2.5 py-1 text-center text-xs font-bold outline-none transition-colors hover:ring-1 hover:ring-slate-300',
                  estadoColors[pedido.estado]
                )}
              >
                {Object.entries(estadoLabels).map(([val, label]) => (
                  <option key={val} value={val} className="bg-white text-slate-800">
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <span className={cn(
              "hidden print:inline-block px-2 py-0.5 rounded text-[10px] font-bold border",
              estadoColors[pedido.estado]
            )}>
              {estadoLabels[pedido.estado] || pedido.estado}
            </span>

            <button
              type="button"
              title="Borrar pedido permanentemente"
              onClick={(e) => {
                e.stopPropagation()
                setShowConfirmDelete(true)
              }}
              className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-all shadow-2xs active:scale-90 print:hidden"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-lg font-black text-primary">{formatARS(pedido.total)}</p>
          <p className="text-xs text-slate-400">{formatDate(pedido.created_at)}</p>
        </div>

        {pedido.fecha_entrega_estimada && (
          <p className="text-xs text-slate-400">
            Entrega estimada: {formatDate(pedido.fecha_entrega_estimada)}
          </p>
        )}
      </div>

      {/* Modal de confirmación de borrado */}
      {showConfirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="rounded-2xl bg-red-50 p-2.5 border border-red-100">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">¿Eliminar Pedido?</h3>
                <p className="text-xs text-slate-500 font-bold">{pedido.numero_pedido}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              El pedido será eliminado permanentemente del sistema para liberar espacio en la lista.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowConfirmDelete(false)
                }}
                disabled={anularPedido.isPending}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={anularPedido.isPending}
                className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md shadow-red-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {anularPedido.isPending ? 'Eliminando...' : 'Eliminar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
