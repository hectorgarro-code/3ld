import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePedido, useCambiarEstadoPedido } from '@/hooks/usePedidos'
import api from '@/lib/api'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { ChevronLeft, CheckCircle, Clock, Package, Truck, Ban, ExternalLink } from 'lucide-react'
import type { PedidoEstado } from '@/types'

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

  const [showSimulacion, setShowSimulacion] = useState(false)
  const [simulacionData, setSimulacionData] = useState<any[]>([])
  const [isSimulating, setIsSimulating] = useState(false)

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
        <select
          value={pedido.estado}
          onChange={(e) => handleCambiarEstado(e.target.value as PedidoEstado)}
          disabled={cambiarEstado.isPending || isSimulating}
          className={cn(
            'ml-auto appearance-none rounded-full px-4 py-1.5 text-center text-sm font-black outline-none transition-colors hover:ring-2 hover:ring-white/50 cursor-pointer',
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
      {pedido.items && pedido.items.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Items ({pedido.items.length})
          </p>
          <div className="space-y-2">
            {pedido.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <div>
                  <div className="flex items-center gap-2">
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
                  <p className="text-xs text-slate-400">
                    {item.cantidad} × {formatARS(item.precio_unit ?? item.precio_unitario ?? 0)}
                  </p>
                </div>
                <p className="text-sm font-black text-primary">{formatARS(item.subtotal)}</p>
              </div>
            ))}
          </div>
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
      )}

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
