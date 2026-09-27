import { useState } from 'react'
import { useAddPedidoItem } from '@/hooks/usePedidos'
import { useProductos } from '@/hooks/useProductos'
import { toast } from '@/store/toastStore'
import { formatARS } from '@/lib/cost-calculator'
import { X, Plus, Loader2 } from 'lucide-react'

interface AddItemModalProps {
  pedidoId: number
  onClose: () => void
  onSuccess?: () => void
}

export function AddItemModal({ pedidoId, onClose, onSuccess }: AddItemModalProps) {
  const addItem = useAddPedidoItem()
  const { data: productosData } = useProductos({ per_page: 200 })

  const [modo, setModo] = useState<'catalogo' | 'custom'>('custom')
  const [productoId, setProductoId] = useState<number | undefined>(undefined)
  const [descripcion, setDescripcion] = useState('')
  const [notas, setNotas] = useState('')
  const [cantidad, setCantidad] = useState<number>(1)
  const [precioUnit, setPrecioUnit] = useState<number>(0)
  const [costoUnit, setCostoUnit] = useState<string>('')
  const [descuentoPct, setDescuentoPct] = useState<number>(0)

  const handleSelectProducto = (idStr: string) => {
    const id = parseInt(idStr, 10)
    setProductoId(id || undefined)
    const prod = productosData?.data.find((p) => p.id === id)
    if (prod) {
      setDescripcion(prod.nombre)
      setPrecioUnit(Number(prod.precio_venta) || 0)
      setCostoUnit(prod.precio_costo != null ? String(prod.precio_costo) : '')
    }
  }

  const subtotal = cantidad * precioUnit * (1 - descuentoPct / 100)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descripcion.trim() && !productoId) {
      toast('Ingresá una descripción o seleccioná un producto', 'warning')
      return
    }

    try {
      await addItem.mutateAsync({
        pedidoId,
        payload: {
          producto_id: productoId || undefined,
          descripcion: descripcion.trim() || undefined,
          notas: notas.trim() || undefined,
          cantidad: Number(cantidad),
          precio_unit: Number(precioUnit),
          costo_unitario: costoUnit !== '' ? Number(costoUnit) : null,
          descuento_pct: Number(descuentoPct),
        },
      })
      toast('Ítem agregado correctamente', 'success')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error al agregar ítem', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Agregar Ítem al Pedido</h3>
            <p className="text-xs text-slate-400">Sumá un producto del catálogo o a medida</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 p-2 bg-slate-50/50 gap-2">
          <button
            type="button"
            onClick={() => setModo('custom')}
            className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${
              modo === 'custom'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Personalizado / Impresión 3D
          </button>
          <button
            type="button"
            onClick={() => setModo('catalogo')}
            className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${
              modo === 'catalogo'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Del Catálogo
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {modo === 'catalogo' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Seleccionar Producto
              </label>
              <select
                value={productoId ?? ''}
                onChange={(e) => handleSelectProducto(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none bg-white"
              >
                <option value="">-- Seleccionar --</option>
                {productosData?.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({formatARS(p.precio_venta)})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Descripción / Servicio
              </label>
              <input
                type="text"
                required
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Servicio IMPRESION a pedido"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none"
              />
            </div>
          )}

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

          <div className="rounded-xl bg-slate-50 p-3 flex justify-between items-center border border-slate-100">
            <span className="text-xs font-semibold text-slate-500">Subtotal:</span>
            <span className="text-base font-bold text-primary">{formatARS(subtotal)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={addItem.isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addItem.isPending}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {addItem.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Agregar Ítem
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
