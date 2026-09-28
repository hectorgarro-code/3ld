import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreatePedido } from '@/hooks/usePedidos'
import { useClientes } from '@/hooks/useClientes'
import { useProductos } from '@/hooks/useProductos'
import { toast } from '@/store/toastStore'
import { ChevronLeft, Plus, Trash2, Loader2, PackagePlus } from 'lucide-react'
import { formatARS } from '@/lib/cost-calculator'
import { ProductoFormModal } from '@/components/productos/ProductoFormModal'
import { calcularPrecioProductoCliente } from '@/lib/pricing'

const nuevoPedidoSchema = z.object({
  cliente_id: z.coerce.number().min(1, 'Seleccioná un cliente'),
  descuento_pct: z.coerce.number().min(0).max(100).optional(),
  fecha_entrega_estimada: z.string().optional(),
  notas: z.string().optional(),
  items: z
    .array(
      z.object({
        producto_id: z.coerce.number().min(0).optional(),
        cantidad: z.coerce.number().min(1, 'Mínimo 1'),
        precio_unit: z.coerce.number().min(0, 'Precio inválido'),
        descripcion: z.string().optional(),
        notas: z.string().max(15, 'Máximo 15 caracteres').optional(),
      })
    )
    .min(1, 'Agregá al menos un ítem'),
})

type NuevoPedidoForm = z.infer<typeof nuevoPedidoSchema>

const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  let addedDays = 0
  while (addedDays < days) {
    result.setDate(result.getDate() + 1)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++
    }
  }
  return result
}

export default function NuevoPedidoPage() {
  const navigate = useNavigate()
  const createPedido = useCreatePedido()
  const { data: clientesData } = useClientes({ per_page: 200 })
  const { data: productosData } = useProductos({ per_page: 200 })
  
  const [isProductoModalOpen, setIsProductoModalOpen] = useState(false)

  const defaultFecha = addBusinessDays(new Date(), 3).toISOString().split('T')[0]

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(nuevoPedidoSchema),
    defaultValues: {
      descuento_pct: 0,
      fecha_entrega_estimada: defaultFecha,
      items: [{ producto_id: 0, cantidad: 1, precio_unit: 0, descripcion: '', notas: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const descuentoPct = Number(watch('descuento_pct') || 0)

  const subtotal = items.reduce(
    (sum: number, item: any) => sum + Number(item.cantidad || 0) * Number(item.precio_unit || 0),
    0
  )
  const total = subtotal * (1 - descuentoPct / 100)

  const selectedClienteId = Number(watch('cliente_id'))
  const selectedCliente = clientesData?.data?.find((c) => c.id === selectedClienteId)

  const handleProductoChange = (index: number, productoId: number) => {
    const found = productosData?.data.find((p) => p.id === productoId)
    if (found) {
      const price = calcularPrecioProductoCliente({
        producto: found,
        cliente: selectedCliente,
      })
      setValue(`items.${index}.precio_unit`, price)
    }
  }

  const onSubmit = async (data: NuevoPedidoForm) => {
    try {
      const pedido = await createPedido.mutateAsync({
        ...data,
        impuesto_pct: 0,
        items: data.items.map((item) => ({
          ...item,
          // Backend expects precio_unit, send both for compatibility
          precio_unit: item.precio_unit,
          subtotal: item.cantidad * item.precio_unit,
        })),
      } as Parameters<typeof createPedido.mutateAsync>[0])
      toast('Pedido creado exitosamente', 'success')
      navigate('/pedidos')
    } catch {
      toast('Error al crear el pedido', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white card-shadow text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-black text-slate-800">Nuevo Pedido</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Cliente */}
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500">Cliente</h3>
            {selectedCliente && (
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  selectedCliente.tipo_cliente === 'mayorista'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {selectedCliente.tipo_cliente === 'mayorista'
                  ? '⭐ Mayorista (-20%)'
                  : selectedCliente.tipo_cliente || 'Minorista'}
              </span>
            )}
          </div>
          <select
            {...register('cliente_id')}
            onChange={(e) => {
              register('cliente_id').onChange(e)
              const newId = Number(e.target.value)
              const client = clientesData?.data.find((c) => c.id === newId)
              setValue('descuento_pct', client?.descuento_porcentaje ?? 0)

              // Recalcular ítems ya seleccionados en el pedido
              const currentItems = watch('items') || []
              currentItems.forEach((it: any, idx: number) => {
                if (it.producto_id) {
                  const prod = productosData?.data.find((p) => p.id === Number(it.producto_id))
                  if (prod) {
                    const newPrice = calcularPrecioProductoCliente({
                      producto: prod,
                      cliente: client,
                    })
                    setValue(`items.${idx}.precio_unit`, newPrice)
                  }
                }
              })
            }}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-primary"
          >
            <option value="">-- Seleccionar cliente --</option>
            {clientesData?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.tipo_cliente === 'mayorista' ? ' [Mayorista]' : ''}
              </option>
            ))}
          </select>
          {selectedCliente?.tipo_cliente === 'mayorista' && (
            <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
              <span>⭐ Tarifa mayorista activa: los productos se agregan con precio mayorista o 20% de descuento.</span>
            </div>
          )}
          {errors.cliente_id && (
            <p className="mt-1 text-xs text-red-400">{errors.cliente_id.message}</p>
          )}
        </div>

        {/* Fecha entrega */}
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-500">Fecha de entrega estimada</h3>
          <input
            type="date"
            {...register('fecha_entrega_estimada')}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-primary"
          />
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500">Ítems</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsProductoModalOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-50/80 hover:text-slate-800 transition-colors"
                title="Crear Nuevo Producto"
              >
                <PackagePlus className="h-4 w-4" /> Nuevo
              </button>
              <button
                type="button"
                onClick={() =>
                  append({ producto_id: 0, cantidad: 1, precio_unit: 0, descripcion: '', notas: '' })
                }
                className="flex items-center gap-1 rounded-xl bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/30"
              >
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={field.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <select
                      {...register(`items.${i}.producto_id`)}
                      onChange={(e) => {
                        register(`items.${i}.producto_id`).onChange(e)
                        handleProductoChange(i, Number(e.target.value))
                      }}
                      className="w-full rounded-lg border border-surface-card bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary"
                    >
                      <option value="">-- Producto --</option>
                      {productosData?.data.filter(p => p.es_vendible !== 0).map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Cantidad</label>
                        <input
                          type="number"
                          min={1}
                          {...register(`items.${i}.cantidad`)}
                          className="w-full rounded-lg border border-surface-card bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-400">Precio unit.</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          {...register(`items.${i}.precio_unit`)}
                          className="w-full rounded-lg border border-surface-card bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="Nota breve (opcional, máx 15 chars)"
                        {...register(`items.${i}.notas`)}
                        className="w-full rounded-lg border border-surface-card bg-slate-50/50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary placeholder:text-gray-600"
                      />
                      {errors.items?.[i]?.notas && (
                        <p className="mt-1 text-[10px] text-red-400">{errors.items[i]?.notas?.message}</p>
                      )}
                    </div>
                    <p className="text-right text-xs font-bold text-primary">
                      Subtotal: {formatARS(Number(items[i]?.cantidad || 0) * Number(items[i]?.precio_unit || 0))}
                    </p>
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="mt-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {errors.items && (
            <p className="mt-2 text-xs text-red-400">{errors.items.message}</p>
          )}
        </div>

        {/* Descuento y Notas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-500">Descuento del Pedido (%)</h3>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('descuento_pct')}
              className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-primary"
            />
            {errors.descuento_pct && (
              <p className="mt-1 text-xs text-red-400">{errors.descuento_pct.message}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-500">Notas</h3>
            <textarea
              {...register('notas')}
              rows={3}
              placeholder="Notas adicionales..."
              className="w-full resize-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-gray-500 outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Total + Submit */}
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-6">
          <div className="mb-4 space-y-2">
            {descuentoPct > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-500">Subtotal</span>
                <span className="font-bold text-slate-800">{formatARS(subtotal)}</span>
              </div>
            ) : null}
            {descuentoPct > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-500">Descuento ({descuentoPct}%)</span>
                <span className="font-bold text-brand-green">-{formatARS(subtotal * (descuentoPct / 100))}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-primary/20 pt-2">
              <span className="text-sm font-bold text-slate-500">Total estimado</span>
              <span className="text-2xl font-black text-primary">{formatARS(total)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={createPedido.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3.5 text-sm font-black text-white disabled:opacity-60"
          >
            {createPedido.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear Pedido
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
