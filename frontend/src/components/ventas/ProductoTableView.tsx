import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCambiarEstadoItem, useAnularPedido } from '@/hooks/usePedidos'
import { toast } from '@/store/toastStore'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate, cn } from '@/lib/utils'
import { ArrowUpDown, Pencil, Ban, Trash2, ExternalLink, AlertTriangle } from 'lucide-react'
import { EditItemModal } from './EditItemModal'
import type { PedidoItemFlattened, PedidoEstado } from '@/types'

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

type SortKey = 'articulo' | 'nota' | 'cliente' | 'monto' | 'fecha' | 'fecha_est' | 'estado'

export function ProductoTableView({ items }: { items: PedidoItemFlattened[] }) {
  const navigate = useNavigate()
  const cambiarEstado = useCambiarEstadoItem()
  const anularPedido = useAnularPedido()
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [editingItem, setEditingItem] = useState<PedidoItemFlattened | null>(null)
  const [pedidoToAnular, setPedidoToAnular] = useState<{ id: number; numero: string } | null>(null)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const handleConfirmAnular = async () => {
    if (!pedidoToAnular) return
    try {
      await anularPedido.mutateAsync(pedidoToAnular.id)
      toast(`Pedido ${pedidoToAnular.numero} anulado correctamente`, 'success')
      setPedidoToAnular(null)
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error al anular pedido', 'error')
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    if (!sortKey) return 0
    let valA: any = ''
    let valB: any = ''

    switch (sortKey) {
      case 'articulo':
        valA = a.producto_nombre ?? a.descripcion_custom
        valB = b.producto_nombre ?? b.descripcion_custom
        break
      case 'nota':
        valA = a.notas ?? ''
        valB = b.notas ?? ''
        break
      case 'cliente':
        valA = a.cliente_nombre
        valB = b.cliente_nombre
        break
      case 'monto':
        valA = Number(a.subtotal)
        valB = Number(b.subtotal)
        break
      case 'fecha':
        valA = a.pedido_fecha ? new Date(a.pedido_fecha).getTime() : 0
        valB = b.pedido_fecha ? new Date(b.pedido_fecha).getTime() : 0
        break
      case 'fecha_est':
        valA = a.fecha_entrega_estimada ? new Date(a.fecha_entrega_estimada).getTime() : 0
        valB = b.fecha_entrega_estimada ? new Date(b.fecha_entrega_estimada).getTime() : 0
        break
      case 'estado':
        valA = a.estado
        valB = b.estado
        break
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const total = sortedItems.reduce((acc, curr) => acc + Number(curr.subtotal) * (1 - (curr.pedido_descuento_pct || 0) / 100), 0)

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-100 bg-white card-shadow pb-8">
      <table className="w-full whitespace-nowrap text-left text-sm text-slate-400">
        <thead className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500">
          <tr>
            <th className="cursor-pointer px-4 py-3 hover:text-slate-800" onClick={() => handleSort('articulo')}>
              <div className="flex items-center gap-1.5 font-normal">
                <span className="font-serif italic text-slate-400 text-[13px]">Aa</span> Artículo {sortKey === 'articulo' && <ArrowUpDown className="h-3 w-3" />}
              </div>
            </th>
            <th className="cursor-pointer px-4 py-3 hover:text-slate-800" onClick={() => handleSort('nota')}>
              <div className="flex items-center gap-1.5 font-normal">
                <span className="text-[13px] opacity-70">📝</span> Nota {sortKey === 'nota' && <ArrowUpDown className="h-3 w-3" />}
              </div>
            </th>
            <th className="cursor-pointer px-4 py-3 hover:text-slate-800" onClick={() => handleSort('cliente')}>
              <div className="flex items-center gap-1.5 font-normal">
                <span className="text-[13px] opacity-70">👤</span> Cliente {sortKey === 'cliente' && <ArrowUpDown className="h-3 w-3" />}
              </div>
            </th>
            <th className="cursor-pointer px-4 py-3 hover:text-slate-800" onClick={() => handleSort('monto')}>
              <div className="flex items-center gap-1.5 font-normal">
                <span className="text-[13px] opacity-70">💵</span> Monto {sortKey === 'monto' && <ArrowUpDown className="h-3 w-3" />}
              </div>
            </th>
            <th className="cursor-pointer px-4 py-3 hover:text-slate-800" onClick={() => handleSort('fecha')}>
              <div className="flex items-center gap-1.5 font-normal">
                <span className="text-[13px] opacity-70">📅</span> Fecha {sortKey === 'fecha' && <ArrowUpDown className="h-3 w-3" />}
              </div>
            </th>
            <th className="cursor-pointer px-4 py-3 hover:text-slate-800" onClick={() => handleSort('fecha_est')}>
              <div className="flex items-center gap-1.5 font-normal">
                <span className="text-[13px] opacity-70">📅</span> Fecha Est. {sortKey === 'fecha_est' && <ArrowUpDown className="h-3 w-3" />}
              </div>
            </th>
            <th className="cursor-pointer px-4 py-3 hover:text-slate-800" onClick={() => handleSort('estado')}>
              <div className="flex items-center gap-1.5 font-normal">
                <span className="text-[13px] opacity-70">📊</span> Estado {sortKey === 'estado' && <ArrowUpDown className="h-3 w-3" />}
              </div>
            </th>
            <th className="px-4 py-3 text-right">
              <span className="text-[13px] opacity-70">⚙️</span> Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-elevated">
          {sortedItems.map(item => (
            <tr key={item.id} className="cursor-pointer transition-colors hover:bg-slate-50/50" onClick={() => navigate(`/pedidos/${item.pedido_id}`)}>
              <td className="px-4 py-3 font-medium text-slate-800">
                {item.cantidad > 1 ? `${item.cantidad}x ` : ''}
                {item.producto_nombre ?? item.descripcion_custom} {item.producto_variante ? `(${item.producto_variante})` : ''}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 italic">
                {item.notas || '-'}
              </td>
              <td className="px-4 py-3">
                <span className="rounded bg-brand-purple/20 px-1.5 py-0.5 text-xs font-medium text-brand-purple">
                  {item.cliente_nombre}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-800">
                <div className="flex flex-col">
                  <span className={cn(item.pedido_descuento_pct && item.pedido_descuento_pct > 0 ? "text-primary font-bold" : "")}>
                    {formatARS(Number(item.subtotal) * (1 - (item.pedido_descuento_pct || 0) / 100))}
                  </span>
                  {item.pedido_descuento_pct && item.pedido_descuento_pct > 0 ? (
                    <span className="text-[10px] text-brand-purple line-through opacity-70">
                      {formatARS(item.subtotal)}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-400">{item.pedido_fecha ? formatDate(item.pedido_fecha) : '-'}</td>
              <td className="px-4 py-3 text-slate-400">{item.fecha_entrega_estimada ? formatDate(item.fecha_entrega_estimada) : '-'}</td>
              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                <select
                  value={item.estado || 'presupuesto'}
                  onChange={async (e) => {
                    e.stopPropagation()
                    const nuevoEstado = e.target.value as PedidoEstado
                    try {
                      await cambiarEstado.mutateAsync({ id: item.id, estado: nuevoEstado })
                      toast(`Estado actualizado`, 'success')
                    } catch {
                      toast('Error al actualizar estado', 'error')
                    }
                  }}
                  disabled={cambiarEstado.isPending}
                  className={cn(
                    'cursor-pointer appearance-none rounded-full px-2.5 py-1 text-left text-xs font-semibold outline-none transition-colors hover:ring-1 hover:ring-white/20',
                    estadoColors[item.estado || 'presupuesto']
                  )}
                >
                  {Object.entries(estadoLabels).map(([val, label]) => (
                    <option key={val} value={val} className="bg-slate-50/50 text-slate-800">
                      {label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    title="Editar Ítem (precio, costo, cantidad, nota)"
                    onClick={() => setEditingItem(item)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    title="Eliminar Pedido"
                    onClick={() => setPedidoToAnular({ id: item.pedido_id, numero: item.numero_pedido })}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    title="Ver Detalle del Pedido"
                    onClick={() => navigate(`/pedidos/${item.pedido_id}`)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-100 bg-slate-50/20">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-slate-500">Total</td>
            <td className="px-4 py-3 font-mono font-bold text-primary">{formatARS(total)}</td>
            <td colSpan={4}></td>
          </tr>
        </tfoot>
      </table>

      {/* Edit Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Anular Confirmation Dialog */}
      {pedidoToAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">¿Eliminar Pedido?</h3>
                <p className="text-xs text-slate-500 font-semibold">{pedidoToAnular.numero}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              El pedido será eliminado permanentemente del sistema para liberar espacio en la lista.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPedidoToAnular(null)}
                disabled={anularPedido.isPending}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAnular}
                disabled={anularPedido.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {anularPedido.isPending ? 'Eliminando...' : 'Eliminar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
