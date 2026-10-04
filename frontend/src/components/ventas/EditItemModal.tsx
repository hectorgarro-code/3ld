import { useState } from 'react'
import { useUpdatePedidoItem } from '@/hooks/usePedidos'
import { toast } from '@/store/toastStore'
import { formatARS } from '@/lib/cost-calculator'
import { X, Save, Loader2, ExternalLink } from 'lucide-react'
import type { PedidoItem, PedidoItemFlattened } from '@/types'

interface EditItemModalProps {
  item: PedidoItem | PedidoItemFlattened
  onClose: () => void
  onSuccess?: () => void
}

export function EditItemModal({ item, onClose, onSuccess }: EditItemModalProps) {
  const updateItem = useUpdatePedidoItem()

  const [descripcion, setDescripcion] = useState(
    item.descripcion ?? (item as any).producto_nombre ?? ''
  )
  const [notas, setNotas] = useState(item.notas ?? '')
  const [archivoUrl, setArchivoUrl] = useState(item.archivo_url ?? '')
  const [cantidad, setCantidad] = useState<number>(Number(item.cantidad) || 1)
  const [precioUnit, setPrecioUnit] = useState<number>(
    Number(item.precio_unit ?? (item as any).precio_unitario ?? 0)
  )
  const [costoUnit, setCostoUnit] = useState<string>(
    item.costo_unitario != null ? String(item.costo_unitario) : ''
  )
  const [descuentoPct, setDescuentoPct] = useState<number>(
    Number(item.descuento_pct) || 0
  )

  const subtotal = cantidad * precioUnit * (1 - descuentoPct / 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateItem.mutateAsync({
        id: item.id,
        payload: {
          descripcion: descripcion.trim() || undefined,
          notas: notas.trim() || undefined,
          archivo_url: archivoUrl.trim() || null,
          cantidad: Number(cantidad),
          precio_unit: Number(precioUnit),
          costo_unitario: costoUnit !== '' ? Number(costoUnit) : null,
          descuento_pct: Number(descuentoPct),
        },
      })
      toast('Ítem actualizado correctamente', 'success')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error al actualizar el ítem', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Editar Ítem de Pedido</h3>
            <p className="text-xs text-slate-400">Modificá precio, costo, cantidad o detalle</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Artículo / Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Servicio IMPRESION a pedido"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nota / Detalle
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Perchero bomberos con llavero"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
              <span>URL del Archivo / STL</span>
              {archivoUrl && (
                <a
                  href={archivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 font-semibold text-[11px]"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir enlace
                </a>
              )}
            </label>
            <input
              type="url"
              value={archivoUrl}
              onChange={(e) => setArchivoUrl(e.target.value)}
              placeholder="https://drive.google.com/... o MakerWorld"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={cantidad}
                onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Precio Unit. ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={precioUnit}
                onChange={(e) => setPrecioUnit(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none font-semibold text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Costo Unit. ($) <span className="text-[10px] text-slate-400 font-normal">(Para margen)</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={costoUnit}
                onChange={(e) => setCostoUnit(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Descuento (%)
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
          </div>

          {/* Subtotal preview */}
          <div className="rounded-xl bg-slate-50 p-3 flex justify-between items-center border border-slate-100">
            <span className="text-xs font-semibold text-slate-500">Subtotal del ítem:</span>
            <span className="text-base font-bold text-primary">{formatARS(subtotal)}</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={updateItem.isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateItem.isPending}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {updateItem.isPending ? (
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
