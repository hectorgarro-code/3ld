import { useState } from 'react'
import { useImpresoras, useCambiarEstadoImpresora, useCreateImpresora, useDeleteImpresora } from '@/hooks/useImpresoras'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/store/toastStore'
import { cn } from '@/lib/utils'
import { Plus, X, Loader2, Printer, Trash2 } from 'lucide-react'
import type { Impresora, ImpresoraEstado } from '@/types'

const estadoConfig: Record<
  ImpresoraEstado,
  { label: string; color: string; dot: string }
> = {
  libre: { label: 'Libre', color: 'bg-brand-green/20 text-brand-green', dot: 'bg-brand-green' },
  ocupada: { label: 'Ocupada', color: 'bg-primary/20 text-primary', dot: 'bg-primary' },
  mantenimiento: { label: 'Mantenimiento', color: 'bg-accent/20 text-accent', dot: 'bg-accent' },
  fuera_de_servicio: { label: 'Fuera de servicio', color: 'bg-red-500/20 text-red-400', dot: 'bg-red-500' },
}

const ESTADO_OPTIONS: ImpresoraEstado[] = [
  'libre',
  'ocupada',
  'mantenimiento',
  'fuera_de_servicio',
]

function ImpresoraCard({ impresora }: { impresora: Impresora }) {
  const cambiarEstado = useCambiarEstadoImpresora()
  const cfg = estadoConfig[impresora.estado]
  const pctVida = Math.min(
    100,
    Math.round((impresora.horas_acumuladas / impresora.vida_util_horas) * 100)
  )

  const deleteImpresora = useDeleteImpresora()

  const handleEstadoChange = async (estado: ImpresoraEstado) => {
    try {
      await cambiarEstado.mutateAsync({ id: impresora.id, estado })
      toast(`Estado cambiado a: ${estadoConfig[estado].label}`, 'success')
    } catch {
      toast('Error al cambiar estado', 'error')
    }
  }

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la impresora "${impresora.nombre}"?`)) {
      try {
        await deleteImpresora.mutateAsync(impresora.id)
        toast('Impresora eliminada', 'success')
      } catch {
        toast('Error al eliminar la impresora', 'error')
      }
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
            <Printer className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="font-black text-slate-800">{impresora.nombre}</p>
            <p className="text-xs text-slate-500">
              {impresora.marca} {impresora.modelo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', cfg.color)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </div>
          <button
            onClick={handleDelete}
            disabled={deleteImpresora.isPending}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-colors hover:bg-red-100 hover:text-red-500 disabled:opacity-50"
            title="Eliminar impresora"
          >
            {deleteImpresora.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Lifetime bar */}
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>Vida útil</span>
        <span>{impresora.horas_acumuladas}h / {impresora.vida_util_horas}h</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-50">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pctVida < 60 ? 'bg-brand-green' : pctVida < 80 ? 'bg-accent' : 'bg-red-500'
          )}
          style={{ width: `${pctVida}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">{pctVida}% usado</p>

      {/* Quick status buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        {ESTADO_OPTIONS.filter((e) => e !== impresora.estado).map((estado) => {
          const ecfg = estadoConfig[estado]
          return (
            <button
              key={estado}
              onClick={() => handleEstadoChange(estado)}
              disabled={cambiarEstado.isPending}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all disabled:opacity-50',
                ecfg.color,
                'border border-current/20 hover:opacity-90'
              )}
            >
              {ecfg.label}
            </button>
          )
        })}
      </div>

      {/* Power info */}
      <p className="mt-2 text-xs text-slate-400">
        Consumo: {impresora.consumo_watts}W
      </p>
    </div>
  )
}

const impresoraSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  modelo: z.string().min(1, 'Requerido'),
  marca: z.string().optional(),
  consumo_watts: z.coerce.number().min(1, 'Debe ser mayor a 0'),
  valor_compra: z.coerce.number().min(0, 'No puede ser negativo'),
  vida_util_horas: z.coerce.number().min(1, 'Debe ser mayor a 0'),
  horas_acumuladas: z.coerce.number().min(0),
  notas: z.string().optional(),
})

type ImpresoraForm = z.infer<typeof impresoraSchema>

function NuevaImpresoraModal({ onClose }: { onClose: () => void }) {
  const createImpresora = useCreateImpresora()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(impresoraSchema),
    defaultValues: {
      consumo_watts: 250,
      valor_compra: 200000,
      vida_util_horas: 5000,
      horas_acumuladas: 0,
    },
  })

  const onSubmit = async (data: ImpresoraForm) => {
    try {
      await createImpresora.mutateAsync(data)
      toast('Impresora creada exitosamente', 'success')
      onClose()
    } catch {
      toast('Error al crear la impresora', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Printer className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Nueva Impresora</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sección: Detalles de Hardware */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Detalles de Hardware</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nombre interno *
                  </label>
                  <input
                    {...register('nombre')}
                    placeholder="Ej: Ender 3 Pro - Sala 1"
                    className={cn(
                      "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors",
                      errors.nombre ? "border-red-500/50" : "border-slate-200 focus:border-primary focus:bg-white"
                    )}
                  />
                  {errors.nombre && <p className="mt-1 text-xs text-red-400">{errors.nombre.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Marca</label>
                  <input
                    {...register('marca')}
                    placeholder="Creality, Prusa..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Modelo *</label>
                  <input
                    {...register('modelo')}
                    className={cn(
                      "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors",
                      errors.modelo ? "border-red-500/50" : "border-slate-200 focus:border-primary focus:bg-white"
                    )}
                  />
                  {errors.modelo && <p className="mt-1 text-xs text-red-400">{errors.modelo.message}</p>}
                </div>
              </div>
            </div>

            {/* Sección: Costos y Vida Útil */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Información de Costos y Vida Útil</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Valor ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('valor_compra', { valueAsNumber: true })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                  {errors.valor_compra && <p className="mt-1 text-xs text-red-400">{errors.valor_compra.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500" title="Consumo eléctrico estimado">
                    Consumo (W) *
                  </label>
                  <input
                    type="number"
                    {...register('consumo_watts', { valueAsNumber: true })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                  {errors.consumo_watts && <p className="mt-1 text-xs text-red-400">{errors.consumo_watts.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500" title="Horas totales que se espera que dure la impresora">
                    Vida útil (h) *
                  </label>
                  <input
                    type="number"
                    {...register('vida_util_horas', { valueAsNumber: true })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                  {errors.vida_util_horas && <p className="mt-1 text-xs text-red-400">{errors.vida_util_horas.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500" title="Si ya tiene uso previo">
                    Horas usadas
                  </label>
                  <input
                    type="number"
                    {...register('horas_acumuladas', { valueAsNumber: true })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Notas Adicionales
              </label>
              <textarea
                {...register('notas')}
                rows={3}
                placeholder="Mantenimientos programados, particularidades..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
              />
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={createImpresora.isPending}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createImpresora.isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 disabled:opacity-60"
            >
              {createImpresora.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Impresora
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ImpresorasPage() {
  const { data: impresoras, isLoading } = useImpresoras()
  const [showModal, setShowModal] = useState(false)

  const counts = {
    libres: impresoras?.filter((i) => i.estado === 'libre').length ?? 0,
    ocupadas: impresoras?.filter((i) => i.estado === 'ocupada').length ?? 0,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Impresoras</h2>
          <p className="text-xs text-slate-500">
            {counts.libres} libres · {counts.ocupadas} ocupadas
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-dark px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/30"
        >
          <Plus className="h-4 w-4" /> Nueva
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white card-shadow" />
          ))}
        </div>
      ) : impresoras && impresoras.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {impresoras.map((imp) => (
            <ImpresoraCard key={imp.id} impresora={imp} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Printer className="mb-3 h-16 w-16 text-gray-700" />
          <p className="font-bold text-slate-500">Sin impresoras registradas</p>
        </div>
      )}

      {showModal && <NuevaImpresoraModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
