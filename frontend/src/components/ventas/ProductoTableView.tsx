import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCambiarEstadoItem } from '@/hooks/usePedidos'
import { toast } from '@/store/toastStore'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate, cn } from '@/lib/utils'
import { ArrowUpDown } from 'lucide-react'
import type { PedidoItemFlattened, PedidoEstado } from '@/types'

const estadoColors: Record<PedidoEstado, string> = {
  presupuesto: 'bg-accent/20 text-accent',
  aprobado: 'bg-brand-green/20 text-brand-green',
  en_produccion: 'bg-brand-purple/20 text-brand-purple',
  terminado: 'bg-secondary/20 text-secondary',
  entregado: 'bg-primary/20 text-primary',
  cobrado: 'bg-green-500/20 text-green-400',
  anulado: 'bg-red-500/20 text-red-400',
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
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
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
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-100 bg-slate-50/20">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-slate-500">Total</td>
            <td className="px-4 py-3 font-mono font-bold text-primary">{formatARS(total)}</td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
