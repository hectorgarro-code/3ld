import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProveedores } from '@/hooks/useProveedores'
import { useProductos } from '@/hooks/useProductos'
import { useCreateCompra } from '@/hooks/useCompras'
import { toast } from '@/store/toastStore'
import { ChevronLeft, Plus, Trash2, Loader2, PackagePlus } from 'lucide-react'
import { formatARS } from '@/lib/cost-calculator'
import { ProductoFormModal } from '@/components/productos/ProductoFormModal'

const nuevaCompraSchema = z.object({
  proveedor_id: z.coerce.number().min(1, 'Seleccioná un proveedor'),
  fecha: z.string(),
  numero_comprobante: z.string().optional(),
  notas: z.string().optional(),
  items: z
    .array(
      z.object({
        producto_id: z.coerce.number().min(1, 'Seleccioná un artículo'),
        cantidad: z.coerce.number().min(1, 'Mínimo 1'),
        precio_unitario: z.coerce.number().min(0, 'Precio inválido'),
      })
    )
    .min(1, 'Agregá al menos un ítem'),
})

type NuevaCompraForm = z.infer<typeof nuevaCompraSchema>

export default function NuevaCompraPage() {
  const navigate = useNavigate()
  const createCompra = useCreateCompra()
  const { data: proveedores } = useProveedores({ per_page: 100 })
  const { data: productos } = useProductos({ per_page: 200 })
  
  const [isProductoModalOpen, setIsProductoModalOpen] = useState(false)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(nuevaCompraSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      items: [{ producto_id: 0, cantidad: 1, precio_unitario: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const total = items.reduce(
    (sum: number, item: any) => sum + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
    0
  )

  const onSubmit = async (data: NuevaCompraForm) => {
    try {
      await createCompra.mutateAsync(data as any)
      toast('Compra registrada exitosamente', 'success')
      navigate('/compras')
    } catch {
      toast('Error al registrar compra', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white card-shadow text-slate-500 hover:text-slate-800">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-black text-slate-800">Registrar Compra</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-500">Datos Principales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Proveedor *</label>
              <select {...register('proveedor_id')} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-primary">
                <option value="">-- Seleccionar --</option>
                {proveedores?.data.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              {errors.proveedor_id && <p className="mt-1 text-xs text-red-400">{errors.proveedor_id.message}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fecha *</label>
              <input type="date" {...register('fecha')} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nº Comprobante</label>
              <input {...register('numero_comprobante')} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notas</label>
              <input {...register('notas')} className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500">Ítems comprados</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsProductoModalOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-50/80 hover:text-slate-800 transition-colors"
                title="Crear Nuevo Producto"
              >
                <PackagePlus className="h-4 w-4" /> Nuevo
              </button>
              <button type="button" onClick={() => append({ producto_id: 0, cantidad: 1, precio_unitario: 0 })} className="flex items-center gap-1 rounded-xl bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/30">
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <select {...register(`items.${i}.producto_id`)} className="w-full rounded-lg border border-surface-card bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary">
                      <option value="">-- Artículo --</option>
                      {productos?.data.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    {errors.items?.[i]?.producto_id && <p className="text-[10px] text-red-400">{errors.items[i]?.producto_id?.message}</p>}
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Cantidad</label>
                        <input type="number" min={1} {...register(`items.${i}.cantidad`)} className="w-full rounded-lg border border-surface-card bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Costo unit.</label>
                        <input type="number" step="0.01" min={0} {...register(`items.${i}.precio_unitario`)} className="w-full rounded-lg border border-surface-card bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary" />
                      </div>
                    </div>
                    <p className="text-right text-xs font-bold text-primary">
                      Subtotal: {formatARS(Number(items[i]?.cantidad || 0) * Number(items[i]?.precio_unitario || 0))}
                    </p>
                  </div>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="mt-1 text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {errors.items && <p className="mt-2 text-xs text-red-400">{errors.items.message}</p>}
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">Total de Compra</span>
            <span className="text-2xl font-black text-primary">{formatARS(total)}</span>
          </div>
          <button type="submit" disabled={createCompra.isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3.5 text-sm font-black text-white disabled:opacity-60">
            {createCompra.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar Compra
          </button>
        </div>
      </form>

      {/* Modal Alta Producto */}
      <ProductoFormModal
        isOpen={isProductoModalOpen}
        onClose={() => setIsProductoModalOpen(false)}
      />
    </div>
  )
}
