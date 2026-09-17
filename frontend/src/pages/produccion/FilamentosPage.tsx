import { useState } from 'react'
import { useFilamentos, useCreateFilamento, useUpdateFilamento, useUpdateStockFilamento } from '@/hooks/useFilamentos'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/store/toastStore'
import { cn } from '@/lib/utils'
import { formatARS } from '@/lib/cost-calculator'
import { Plus, Minus, X, Loader2, AlertTriangle, Edit3, Copy } from 'lucide-react'
import type { Filamento } from '@/types'

const filamentoSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  tipo: z.string().min(1, 'Requerido'),
  color: z.string().min(1, 'Requerido'),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color HEX inválido'),
  stock_rollos: z.coerce.number().min(0, 'Mínimo 0'),
  stock_minimo_rollos: z.coerce.number().min(0, 'Mínimo 0'),
  precio_compra: z.coerce.number().min(0),
  proveedor: z.string().optional(),
})

type FilamentoForm = z.infer<typeof filamentoSchema>

const TIPOS = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Resina', 'Nylon']

function FilamentoCard({
  filamento,
  onEdit,
  onDuplicate,
}: {
  filamento: Filamento
  onEdit: (f: Filamento) => void
  onDuplicate: (f: Filamento) => void
}) {
  const isBajo = filamento.stock_rollos <= filamento.stock_minimo_rollos
  const updateStock = useUpdateStockFilamento()

  const handleStockChange = async (delta: number) => {
    if (filamento.stock_rollos + delta < 0) return
    try {
      await updateStock.mutateAsync({ id: filamento.id, delta })
    } catch {
      toast('Error al actualizar stock', 'error')
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white card-shadow p-4',
        isBajo ? 'border-red-500/40' : 'border-slate-100'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Color swatch */}
          <div
            className="h-12 w-12 flex-shrink-0 rounded-xl border-2 border-white/20 shadow-lg"
            style={{ backgroundColor: filamento.color_hex }}
          />
          <div>
            <p className="text-lg font-black text-slate-800">{filamento.nombre}</p>
            <p className="text-xs text-slate-500">
              {filamento.tipo} · {filamento.color_nombre ?? filamento.color}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isBajo && <AlertTriangle className="h-5 w-5 text-red-400" />}
          <button
            onClick={() => onDuplicate(filamento)}
            className="text-slate-400 hover:text-slate-800 p-1"
            title="Duplicar filamento"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(filamento)}
            className="text-slate-400 hover:text-slate-800 p-1"
            title="Editar filamento"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unidades</span>
          <span className="text-2xl font-black text-slate-800">
            {filamento.stock_rollos} <span className="text-sm font-normal text-slate-500">rollos</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50/50 rounded-xl p-1 border border-surface-card shadow-sm">
          <button
            onClick={() => handleStockChange(-1)}
            disabled={filamento.stock_rollos <= 0 || updateStock.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white card-shadow text-slate-500 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 transition-colors"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleStockChange(1)}
            disabled={updateStock.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white card-shadow text-slate-500 hover:bg-brand-green/20 hover:text-brand-green disabled:opacity-50 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Costo por Rollo: <span className="font-bold text-slate-800">{formatARS(filamento.precio_compra ?? 0)}</span>
        </p>
        <p className="text-xs text-slate-400">
          Min: {filamento.stock_minimo_rollos}
        </p>
      </div>
    </div>
  )
}

function FilamentoModal({
  filamento,
  onClose,
  isDuplicate = false,
}: {
  filamento?: Filamento
  onClose: () => void
  isDuplicate?: boolean
}) {
  const createFilamento = useCreateFilamento()
  const updateFilamento = useUpdateFilamento()
  const isEditing = !!filamento && !isDuplicate

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(filamentoSchema),
    defaultValues: filamento
      ? {
          nombre:              isDuplicate ? `${filamento.nombre} (Copia)` : filamento.nombre,
          tipo:                filamento.tipo,
          color:               filamento.color ?? filamento.color_nombre ?? '',
          color_hex:           filamento.color_hex,
          stock_rollos:        isDuplicate ? 1 : filamento.stock_rollos,
          stock_minimo_rollos: filamento.stock_minimo_rollos,
          precio_compra:       filamento.precio_compra ?? 0,
          proveedor:           filamento.proveedor ?? '',
        }
      : { color_hex: '#FF6B35', tipo: 'PLA', stock_rollos: 1, stock_minimo_rollos: 0, precio_compra: 0 },
  })

  const colorHex = watch('color_hex')

  const onSubmit = async (data: FilamentoForm) => {
    try {
      if (isEditing && filamento) {
        await updateFilamento.mutateAsync({ id: filamento.id, payload: data })
        toast('Filamento actualizado', 'success')
      } else {
        await createFilamento.mutateAsync(data)
        toast('Filamento creado', 'success')
      }
      onClose()
    } catch {
      toast('Error al guardar', 'error')
    }
  }

  const isPending = createFilamento.isPending || updateFilamento.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
              <span className="text-xl">🎨</span>
            </div>
            <h2 className="text-xl font-black text-slate-800">
              {isEditing ? 'Editar Filamento' : isDuplicate ? 'Duplicar Filamento' : 'Nuevo Filamento'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sección: Detalles Básicos */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Detalles del Filamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Nombre *</label>
                  <input
                    {...register('nombre')}
                    className={cn(
                      "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors",
                      errors.nombre ? "border-red-500/50" : "border-slate-200 focus:border-primary focus:bg-white"
                    )}
                  />
                  {errors.nombre && <p className="mt-1 text-xs text-red-400">{errors.nombre.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Tipo *</label>
                  <select
                    {...register('tipo')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  >
                    {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Proveedor</label>
                  <input
                    {...register('proveedor')}
                    placeholder="Grilon3, Printalot..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Color */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Color</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Nombre del Color *</label>
                  <input
                    {...register('color')}
                    placeholder="Ej: Rojo Pasión, Blanco..."
                    className={cn(
                      "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors",
                      errors.color ? "border-red-500/50" : "border-slate-200 focus:border-primary focus:bg-white"
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Color Hexadecimal *</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      {...register('color_hex')}
                      className="h-12 w-16 rounded-xl border-none p-0 cursor-pointer overflow-hidden bg-transparent shadow-sm"
                    />
                    <input
                      type="text"
                      {...register('color_hex')}
                      placeholder="#FFFFFF"
                      className={cn(
                        "flex-1 rounded-xl border bg-slate-50 px-4 py-3 text-sm font-bold uppercase text-slate-800 outline-none transition-colors",
                        errors.color_hex ? "border-red-500/50" : "border-slate-200 focus:border-primary focus:bg-white"
                      )}
                    />
                  </div>
                  {errors.color_hex && <p className="mt-1 text-xs text-red-400">{errors.color_hex.message}</p>}
                </div>
              </div>
            </div>

            {/* Sección: Inventario y Costos */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Inventario y Costos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Stock (rollos) *</label>
                  <input
                    type="number"
                    {...register('stock_rollos')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500" title="Notificar cuando queden pocos rollos">Stock Min.</label>
                  <input
                    type="number"
                    {...register('stock_minimo_rollos')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Precio de Compra ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('precio_compra')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar Filamento' : isDuplicate ? 'Duplicar Filamento' : 'Crear Filamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FilamentosPage() {
  const { data: filamentos, isLoading } = useFilamentos()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Filamento | undefined>()
  const [isDuplicate, setIsDuplicate] = useState(false)

  const handleEdit = (f: Filamento) => {
    setEditing(f)
    setIsDuplicate(false)
    setShowModal(true)
  }

  const handleDuplicate = (f: Filamento) => {
    setEditing(f)
    setIsDuplicate(true)
    setShowModal(true)
  }

  const handleClose = () => {
    setShowModal(false)
    setEditing(undefined)
    setIsDuplicate(false)
  }

  const bajosStock = filamentos?.filter(
    (f) => f.stock_rollos <= f.stock_minimo_rollos
  ).length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Filamentos</h2>
          {bajosStock > 0 && (
            <p className="text-xs font-bold text-red-400">
              ⚠️ {bajosStock} con stock bajo
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-dark px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/30"
        >
          <Plus className="h-4 w-4" /> Nuevo
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white card-shadow" />
          ))}
        </div>
      ) : filamentos && filamentos.length > 0 ? (
        <div className="space-y-3">
          {filamentos.map((f) => (
            <FilamentoCard key={f.id} filamento={f} onEdit={handleEdit} onDuplicate={handleDuplicate} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 text-5xl">🎨</div>
          <p className="font-bold text-slate-500">Sin filamentos</p>
          <p className="text-sm text-gray-600">Agregá tus primeros colores</p>
        </div>
      )}

      {showModal && <FilamentoModal filamento={editing} isDuplicate={isDuplicate} onClose={handleClose} />}
    </div>
  )
}
