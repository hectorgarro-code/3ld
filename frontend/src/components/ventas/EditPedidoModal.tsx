import { useState } from 'react'
import { useUpdatePedido } from '@/hooks/usePedidos'
import { useClientes } from '@/hooks/useClientes'
import { toast } from '@/store/toastStore'
import { X, Save, Loader2 } from 'lucide-react'
import type { Pedido } from '@/types'

interface EditPedidoModalProps {
  pedido: Pedido
  onClose: () => void
  onSuccess?: () => void
}

export function EditPedidoModal({ pedido, onClose, onSuccess }: EditPedidoModalProps) {
  const updatePedido = useUpdatePedido()
  const { data: clientesData } = useClientes({ per_page: 200 })

  const [clienteId, setClienteId] = useState<number>(pedido.cliente_id)
  const [descuentoPct, setDescuentoPct] = useState<number>(Number(pedido.descuento_pct) || 0)
  const [fechaEntrega, setFechaEntrega] = useState<string>(
    pedido.fecha_entrega_estimada ? pedido.fecha_entrega_estimada.split('T')[0] : ''
  )
  const [notas, setNotas] = useState<string>(pedido.notas ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updatePedido.mutateAsync({
        id: pedido.id,
        payload: {
          cliente_id: clienteId,
          descuento_pct: Number(descuentoPct),
          fecha_entrega_estimada: fechaEntrega || undefined,
          notas: notas.trim() || undefined,
        },
      })
      toast('Pedido actualizado correctamente', 'success')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error al actualizar pedido', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Editar Datos del Pedido {pedido.numero_pedido}
            </h3>
            <p className="text-xs text-slate-400">Modificá cliente, fecha de entrega o notas</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Cliente
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none bg-white"
            >
              {clientesData?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.empresa ? `(${c.empresa})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Descuento General (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={descuentoPct}
                onChange={(e) => setDescuentoPct(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Fecha Entrega Estimada
              </label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Notas Generales del Pedido
            </label>
            <textarea
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones o detalles generales..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={updatePedido.isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updatePedido.isPending}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {updatePedido.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
