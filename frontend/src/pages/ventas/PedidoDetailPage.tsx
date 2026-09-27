import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePedido, useCambiarEstadoPedido, useAnularPedido, useDeletePedidoItem } from '@/hooks/usePedidos'
import api from '@/lib/api'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { ChevronLeft, CheckCircle, Clock, Package, Truck, Ban, ExternalLink, Pencil, Trash2, Plus, AlertTriangle, Edit3 } from 'lucide-react'
import { EditItemModal } from '@/components/ventas/EditItemModal'
import { AddItemModal } from '@/components/ventas/AddItemModal'
import { EditPedidoModal } from '@/components/ventas/EditPedidoModal'
import type { PedidoEstado, PedidoItem } from '@/types'

const ESTADO_STEPS: PedidoEstado[] = [
  'presupuesto',
  'aprobado',
  'en_produccion',
  'terminado',
  'entregado',
  'cobrado',
]

const estadoLabels: Record<PedidoEstado, string> = {
  presupuesto: 'Presupuesto',
  aprobado: 'Pedido',
  en_produccion: 'En proceso',
  terminado: 'Terminado',
  entregado: 'Entregado',
  cobrado: 'Cobrado',
  anulado: 'Anulado',
}

const estadoColors: Record<PedidoEstado, string> = {
  presupuesto: 'text-accent',
  aprobado: 'text-brand-green',
  en_produccion: 'text-brand-purple',
  terminado: 'text-secondary',
  entregado: 'text-primary',
  cobrado: 'text-green-400',
  anulado: 'text-red-400',
}

export default function PedidoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: pedido, isLoading } = usePedido(id)
  const cambiarEstado = useCambiarEstadoPedido()
  const anularPedido = useAnularPedido()
  const deleteItem = useDeletePedidoItem()

  const [showSimulacion, setShowSimulacion] = useState(false)
  const [simulacionData, setSimulacionData] = useState<any[]>([])
  const [isSimulating, setIsSimulating] = useState(false)

  const [showEditPedido, setShowEditPedido] = useState(false)
  const [editingItem, setEditingItem] = useState<PedidoItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAnularModal, setShowAnularModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)

  const handleCambiarEstado = async (nuevoEstado: PedidoEstado) => {
    if (!pedido) return
    if (nuevoEstado === 'entregado' && pedido.estado !== 'entregado') {
      try {
        setIsSimulating(true)
        const { data } = await api.get(`/pedidos/${pedido.id}/simular-entrega`)
        setSimulacionData(data.data.impactos)
        setShowSimulacion(true)
      } catch (e: any) {
        toast(e.response?.data?.message || 'Error al simular entrega', 'error')
      } finally {
        setIsSimulating(false)
      }
    } else {
      try {
        await cambiarEstado.mutateAsync({ id: pedido.id, estado: nuevoEstado })
        toast('Estado actualizado', 'success')
      } catch (e: any) {
        toast(e.response?.data?.message || 'Error al actualizar estado', 'error')
      }
    }
  }

  const confirmarEntrega = async () => {
    if (!pedido) return
    try {
      await cambiarEstado.mutateAsync({ id: pedido.id, estado: 'entregado' })
      toast('Pedido entregado y stock actualizado', 'success')
      setShowSimulacion(false)
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error al confirmar entrega', 'error')
    }
  }

  const handleConfirmAnular = async () => {
    if (!pedido) return
    try {
      await anularPedido.mutateAsync(pedido.id)
      toast('Pedido anulado correctamente', 'success')
      setShowAnularModal(false)
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error al anular pedido', 'error')
    }
  }

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return
    try {
      await deleteItem.mutateAsync(itemToDelete)
      toast('Ítem eliminado del pedido', 'success')
      setItemToDelete(null)
    } catch (e: any) {
      toast(e.response?.data?.message || 'Error al eliminar ítem', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-white card-shadow" />
        <div className="h-32 animate-pulse rounded-2xl bg-white card-shadow" />
        <div className="h-24 animate-pulse rounded-2xl bg-white card-shadow" />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-slate-500">Pedido no encontrado</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary">Volver</button>
      </div>
    )
  }

  const currentStep = ESTADO_STEPS.indexOf(pedido.estado)

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white card-shadow text-slate-500 hover:text-slate-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-bold text-slate-400">{pedido.numero_pedido}</p>
            <h2 className="text-lg font-black text-slate-800">
              {pedido.cliente_nombre ?? pedido.cliente?.nombre ?? 'Cliente'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {pedido.estado !== 'anulado' && (
            <>
              <button
                type="button"
                onClick={() => setShowEditPedido(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors card-shadow"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editar Pedido
              </button>

              <button
                type="button"
                onClick={() => setShowAnularModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
              >
                <Ban className="h-3.5 w-3.5" />
                Anular Pedido
              </button>
            </>
          )}

          <select
            value={pedido.estado}
            onChange={(e) => handleCambiarEstado(e.target.value as PedidoEstado)}
            disabled={cambiarEstado.isPending || isSimulating}
            className={cn(
              'appearance-none rounded-full px-4 py-1.5 text-center text-sm font-black outline-none transition-colors hover:ring-2 hover:ring-white/50 cursor-pointer',
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
      </div>

      {/* Banner if Anulado */}
      {pedido.estado === 'anulado' && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-500">
          <Ban className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-bold">
            Este pedido se encuentra <strong>ANULADO</strong>. Los movimientos de inventario asociados han sido restaurados.
          </p>
        </div>
      )}

      {/* Totals card */}
      <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-lg font-black text-primary">{formatARS(pedido.total)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Costo</p>
            <p className="text-lg font-black text-slate-400">{formatARS(pedido.costo_total ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Margen</p>
            <p className="text-lg font-black text-brand-green">
              {pedido.margen != null ? `${pedido.margen.toFixed(1)}%` : '-'}
            </p>
          </div>
        </div>
        {pedido.fecha_entrega_estimada && (
          <p className="mt-3 text-center text-xs text-slate-400">
            📅 Entrega estimada: {formatDate(pedido.fecha_entrega_estimada)}
          </p>
        )}
        {pedido.notas && (
          <p className="mt-2 text-center text-xs italic text-slate-500 bg-slate-50 rounded-lg p-2">
            Nota general: {pedido.notas}
          </p>
        )}
      </div>

      {/* Estado stepper */}
      {pedido.estado !== 'anulado' && (
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
            Progreso
          </p>
          <div className="relative flex justify-between">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-50" />
            {ESTADO_STEPS.map((step, i) => (
              <div key={step} className="relative flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2',
                    i < currentStep
                      ? 'border-brand-green bg-brand-green/20 text-brand-green'
                      : i === currentStep
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-slate-100 bg-slate-50/50 text-gray-600'
                  )}
                >
                  {i < currentStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : i === currentStep ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </div>
                <p className="text-center text-[10px] font-semibold text-slate-400 max-w-[52px]">
                  {estadoLabels[step]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Items ({pedido.items ? pedido.items.length : 0})
          </p>
          {pedido.estado !== 'anulado' && (
            <button
              type="button"
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar Ítem
            </button>
          )}
        </div>

        {pedido.items && pedido.items.length > 0 ? (
          <div className="space-y-2">
            {pedido.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 hover:bg-slate-100/70 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-800">
                      {item.producto?.nombre ?? item.producto_nombre ?? item.descripcion ?? item.descripcion_custom ?? 'Ítem'}
                    </p>
                    {(item.archivo_url || item.producto?.archivo_url) && (
                      <a
                        href={item.archivo_url || item.producto?.archivo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-200 transition-colors"
                        title="Descargar/Imprimir archivo original del modelo 3D"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Descargar STL
                      </a>
                    )}
                  </div>
                  {item.notas && (
                    <p className="text-xs italic text-brand-purple">{item.notas}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>
                      {item.cantidad} × {formatARS(item.precio_unit ?? item.precio_unitario ?? 0)}
                    </span>
                    {item.costo_unitario != null && (
                      <span className="text-[10px] bg-slate-200/70 rounded px-1.5 py-0.2 text-slate-600">
                        Costo: {formatARS(item.costo_unitario)}
                      </span>
                    )}
                    {item.descuento_pct && item.descuento_pct > 0 ? (
                      <span className="text-[10px] text-primary font-bold">
                        (-{item.descuento_pct}%)
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="text-sm font-black text-primary">{formatARS(item.subtotal)}</p>

                  {pedido.estado !== 'anulado' && (
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                      <button
                        type="button"
                        title="Editar ítem"
                        onClick={() => setEditingItem(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-primary transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar ítem"
                        onClick={() => setItemToDelete(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-slate-400 py-4">No hay ítems en este pedido.</p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          {(pedido.descuento ?? 0) > 0 && (
            <div className="flex justify-between font-bold text-red-500">
              <span>Descuento ({pedido.descuento_pct}%)</span>
              <span>-{formatARS(pedido.descuento ?? 0)}</span>
            </div>
          )}
          <p className="ml-auto text-base font-black text-slate-800">
            Total: {formatARS(pedido.total)}
          </p>
        </div>
      </div>

      {/* History timeline */}
      {pedido.historial && pedido.historial.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Historial
          </p>
          <div className="relative space-y-3 pl-4 before:absolute before:left-1.5 before:top-0 before:bottom-0 before:w-px before:bg-slate-50">
            {pedido.historial.map((h) => (
              <div key={h.id} className="relative">
                <div className="absolute -left-4 mt-1 h-2 w-2 rounded-full bg-primary" />
                <p className="text-xs font-bold text-slate-800">{estadoLabels[h.estado_nuevo]}</p>
                <p className="text-xs text-slate-400">{formatDateTime(h.created_at)}</p>
                {(h.nota ?? h.notas) && <p className="text-xs italic text-slate-500">{h.nota ?? h.notas}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Editar Pedido */}
      {showEditPedido && (
        <EditPedidoModal
          pedido={pedido}
          onClose={() => setShowEditPedido(false)}
        />
      )}

      {/* Modal Editar Ítem */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Modal Agregar Ítem */}
      {showAddItem && (
        <AddItemModal
          pedidoId={pedido.id}
          onClose={() => setShowAddItem(false)}
        />
      )}

      {/* Modal Confirmar Anulación de Pedido */}
      {showAnularModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">¿Anular Pedido?</h3>
                <p className="text-xs text-slate-500 font-semibold">{pedido.numero_pedido}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción marcará el pedido y sus artículos como anulados. Si el inventario había sido descontado, será restaurado a su estado anterior.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAnularModal(false)}
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
                {anularPedido.isPending ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar Ítem */}
      {itemToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">¿Eliminar Ítem?</h3>
                <p className="text-xs text-slate-500">Se recalcularán los totales del pedido.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={deleteItem.isPending}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                disabled={deleteItem.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {deleteItem.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Simulación */}
      {showSimulacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-slate-50/50-secondary shadow-2xl">
            <div className="border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-xl font-black text-slate-800">Confirmar Entrega</h2>
              <p className="text-sm text-slate-500">
                Se realizarán los siguientes movimientos de stock al entregar:
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-6 bg-slate-50">
              {simulacionData.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-4">No hay impactos de stock.</p>
              ) : (
                <div className="space-y-3">
                  {simulacionData.map((imp, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{imp.nombre}</p>
                        <p className="text-xs text-slate-400">{imp.accion}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-red-50 px-2 py-1 text-sm font-bold text-red-500">
                          -{imp.cantidad}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                          {imp.tipo === 'insumo' ? 'INSUMO' : 'PROD'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 rounded-xl bg-blue-50 p-3">
                <p className="text-xs font-bold text-blue-600">
                  ℹ️ Si necesitas ajustar stock manualmente, hazlo antes o después de confirmar.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                onClick={() => setShowSimulacion(false)}
                className="rounded-xl px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEntrega}
                disabled={cambiarEstado.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 font-bold text-white shadow-lg shadow-primary/30 transition-transform active:scale-95 disabled:opacity-50"
              >
                {cambiarEstado.isPending ? 'Confirmando...' : 'Aceptar y Entregar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
