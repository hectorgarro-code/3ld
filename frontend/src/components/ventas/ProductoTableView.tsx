import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCambiarEstadoItem, useCambiarEstadoItemsBulk, useAnularPedido } from '@/hooks/usePedidos'
import { toast } from '@/store/toastStore'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate, cn } from '@/lib/utils'
import { ArrowUpDown, Pencil, Ban, Trash2, ExternalLink, AlertTriangle, Layers } from 'lucide-react'
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
  const cambiarEstadoBulk = useCambiarEstadoItemsBulk()
  const anularPedido = useAnularPedido()
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [editingItem, setEditingItem] = useState<PedidoItemFlattened | null>(null)
  const [pedidoToAnular, setPedidoToAnular] = useState<{ id: number; numero: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

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

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedItems.length && sortedItems.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(sortedItems.map(i => i.id))
    }
  }

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleBulkChangeEstado = async (nuevoEstado: PedidoEstado) => {
    if (selectedIds.length === 0) return
    try {
      await cambiarEstadoBulk.mutateAsync({ ids: selectedIds, estado: nuevoEstado })
      toast(`${selectedIds.length} ${selectedIds.length === 1 ? 'ítem actualizado' : 'ítems actualizados'} a "${estadoLabels[nuevoEstado]}"`, 'success')
      setSelectedIds([])
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error al actualizar estados en lote', 'error')
    }
  }

  const total = sortedItems.reduce((acc, curr) => acc + Number(curr.subtotal) * (1 - (curr.pedido_descuento_pct || 0) / 100), 0)

  return (
    <div className="w-full">
      {/* Sticky Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-30 mb-4 bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200 print:hidden">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white font-extrabold text-xs shrink-0">
              {selectedIds.length}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-200">
              {selectedIds.length === 1 ? '1 ítem seleccionado' : `${selectedIds.length} ítems seleccionados`}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white underline ml-1 cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 font-semibold hidden md:inline">Cambiar estado a:</span>
            <select
              value=""
              disabled={cambiarEstadoBulk.isPending}
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkChangeEstado(e.target.value as PedidoEstado)
                }
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-primary cursor-pointer transition disabled:opacity-50"
            >
              <option value="" disabled>
                {cambiarEstadoBulk.isPending ? 'Actualizando...' : 'Seleccionar nuevo estado...'}
              </option>
              {Object.entries(estadoLabels).map(([val, label]) => (
                <option key={val} value={val} className="bg-slate-900 text-white">
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto print:overflow-visible rounded-xl border border-slate-100 bg-white card-shadow pb-8 print:border-none print:shadow-none print:pb-0 print:rounded-none">
        <table className="w-full whitespace-nowrap print:whitespace-normal text-left text-sm print:text-[11px] text-slate-400 print:text-slate-800 table-auto print:table-fixed">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500 print:bg-slate-100 print:text-slate-900">
            <tr>
              <th className="px-3 py-3 w-10 text-center print:hidden">
                <input
                  type="checkbox"
                  checked={sortedItems.length > 0 && selectedIds.length === sortedItems.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  title="Seleccionar todos los ítems"
                />
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-slate-800 print:px-2 print:py-1.5 print:w-[28%]" onClick={() => handleSort('articulo')}>
                <div className="flex items-center gap-1.5 font-normal print:font-bold">
                  <span className="font-serif italic text-slate-400 text-[13px] print:hidden">Aa</span> Artículo {sortKey === 'articulo' && <ArrowUpDown className="h-3 w-3 print:hidden" />}
                </div>
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-slate-800 print:px-2 print:py-1.5 print:w-[18%]" onClick={() => handleSort('nota')}>
                <div className="flex items-center gap-1.5 font-normal print:font-bold">
                  <span className="text-[13px] opacity-70 print:hidden">📝</span> Nota {sortKey === 'nota' && <ArrowUpDown className="h-3 w-3 print:hidden" />}
                </div>
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-slate-800 print:px-2 print:py-1.5 print:w-[14%]" onClick={() => handleSort('cliente')}>
                <div className="flex items-center gap-1.5 font-normal print:font-bold">
                  <span className="text-[13px] opacity-70 print:hidden">👤</span> Cliente {sortKey === 'cliente' && <ArrowUpDown className="h-3 w-3 print:hidden" />}
                </div>
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-slate-800 print:px-2 print:py-1.5 print:w-[12%]" onClick={() => handleSort('monto')}>
                <div className="flex items-center gap-1.5 font-normal print:font-bold">
                  <span className="text-[13px] opacity-70 print:hidden">💵</span> Monto {sortKey === 'monto' && <ArrowUpDown className="h-3 w-3 print:hidden" />}
                </div>
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-slate-800 print:px-2 print:py-1.5 print:w-[9%]" onClick={() => handleSort('fecha')}>
                <div className="flex items-center gap-1.5 font-normal print:font-bold">
                  <span className="text-[13px] opacity-70 print:hidden">📅</span> Fecha {sortKey === 'fecha' && <ArrowUpDown className="h-3 w-3 print:hidden" />}
                </div>
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-slate-800 print:px-2 print:py-1.5 print:w-[9%]" onClick={() => handleSort('fecha_est')}>
                <div className="flex items-center gap-1.5 font-normal print:font-bold">
                  <span className="text-[13px] opacity-70 print:hidden">📅</span> Fecha Est. {sortKey === 'fecha_est' && <ArrowUpDown className="h-3 w-3 print:hidden" />}
                </div>
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-slate-800 print:px-2 print:py-1.5 print:w-[10%]" onClick={() => handleSort('estado')}>
                <div className="flex items-center gap-1.5 font-normal print:font-bold">
                  <span className="text-[13px] opacity-70 print:hidden">📊</span> Estado {sortKey === 'estado' && <ArrowUpDown className="h-3 w-3 print:hidden" />}
                </div>
              </th>
              <th className="px-4 py-3 text-right print:hidden">
                <span className="text-[13px] opacity-70">⚙️</span> Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-elevated print:divide-slate-200">
            {sortedItems.map(item => {
              const isSelected = selectedIds.includes(item.id)
              return (
                <tr
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-colors print:break-inside-avoid print:border-b print:border-slate-200",
                    isSelected ? "bg-indigo-50/70 hover:bg-indigo-50/90" : "hover:bg-slate-50/50"
                  )}
                  onClick={() => navigate(`/pedidos/${item.pedido_id}`)}
                >
                  <td className="px-3 py-3 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(item.id)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 print:px-2 print:py-1.5 font-medium text-slate-800 break-words">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>
                        {item.cantidad > 1 ? `${item.cantidad}x ` : ''}
                        {item.producto_nombre ?? item.descripcion_custom} {item.producto_variante ? `(${item.producto_variante})` : ''}
                      </span>
                      {item.archivo_url && (
                        <a
                          href={item.archivo_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-200 transition-colors print:hidden"
                          title="Descargar STL / Archivo"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          STL
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 print:px-2 print:py-1.5 text-xs print:text-[10px] text-slate-500 italic break-words">
                    {item.notas || '-'}
                  </td>
                  <td className="px-4 py-3 print:px-2 print:py-1.5 break-words">
                    <span className="rounded bg-brand-purple/20 px-1.5 py-0.5 text-xs font-medium text-brand-purple print:text-slate-800 print:bg-slate-100 print:border print:border-slate-200 print:text-[10px]">
                      {item.cliente_nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 print:px-2 print:py-1.5 text-slate-800 font-mono">
                    <div className="flex flex-col">
                      <span className={cn(item.pedido_descuento_pct && item.pedido_descuento_pct > 0 ? "text-primary font-bold" : "")}>
                        {formatARS(Number(item.subtotal) * (1 - (item.pedido_descuento_pct || 0) / 100))}
                      </span>
                      {item.pedido_descuento_pct && item.pedido_descuento_pct > 0 ? (
                        <span className="text-[10px] text-brand-purple line-through opacity-70 print:hidden">
                          {formatARS(item.subtotal)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 print:px-2 print:py-1.5 text-slate-400 print:text-slate-700 print:text-[10px]">{item.pedido_fecha ? formatDate(item.pedido_fecha) : '-'}</td>
                  <td className="px-4 py-3 print:px-2 print:py-1.5 text-slate-400 print:text-slate-700 print:text-[10px]">{item.fecha_entrega_estimada ? formatDate(item.fecha_entrega_estimada) : '-'}</td>
                  <td className="px-4 py-3 print:px-2 print:py-1.5" onClick={e => e.stopPropagation()}>
                    <div className="print:hidden">
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
                    </div>
                    <span className={cn(
                      "hidden print:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border",
                      estadoColors[item.estado || 'presupuesto']
                    )}>
                      {estadoLabels[item.estado || 'presupuesto'] || item.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right print:hidden" onClick={e => e.stopPropagation()}>
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
              )
            })}
          </tbody>
          <tfoot className="border-t border-slate-100 bg-slate-50/20 print:bg-slate-100 print:border-slate-300">
            <tr>
              <td colSpan={4} className="px-4 py-3 print:hidden text-right text-sm font-bold text-slate-700">Total</td>
              <td colSpan={3} className="hidden print:table-cell px-2 py-1.5 text-right text-xs font-bold text-slate-700">Total</td>
              <td className="px-4 py-3 print:px-2 print:py-1.5 font-mono font-bold text-primary print:text-slate-900 print:text-xs">{formatARS(total)}</td>
              <td colSpan={4} className="print:hidden"></td>
              <td colSpan={3} className="hidden print:table-cell"></td>
            </tr>
          </tfoot>
        </table>
      </div>

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
