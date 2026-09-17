import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/store/toastStore'
import { X, Loader2 } from 'lucide-react'
import { useCreateCliente, useUpdateCliente } from '@/hooks/useClientes'
import type { Cliente } from '@/types'

const clienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  notas: z.string().optional(),
  descuento_pct: z.coerce.number().min(0, 'No puede ser negativo').max(100, 'Máximo 100%').optional(),
})

type ClienteForm = z.infer<typeof clienteSchema>

export function ClienteFormModal({
  onClose,
  initialData,
}: {
  onClose: () => void
  initialData?: Cliente
}) {
  const createCliente = useCreateCliente()
  const updateCliente = useUpdateCliente()
  const isEditing = !!initialData

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClienteForm>({
    resolver: zodResolver(clienteSchema) as any,
    defaultValues: {
      nombre: initialData?.nombre || '',
      email: initialData?.email || '',
      telefono: initialData?.telefono || '',
      direccion: initialData?.direccion || '',
      notas: initialData?.notas || '',
      descuento_pct: initialData?.descuento_pct || 0,
    },
  })

  const onSubmit = async (data: ClienteForm) => {
    try {
      if (isEditing && initialData) {
        await updateCliente.mutateAsync({ id: initialData.id, payload: data })
        toast('Cliente actualizado exitosamente', 'success')
      } else {
        await createCliente.mutateAsync(data)
        toast('Cliente creado exitosamente', 'success')
      }
      onClose()
    } catch {
      toast(isEditing ? 'Error al actualizar el cliente' : 'Error al crear el cliente', 'error')
    }
  }

  const isPending = createCliente.isPending || updateCliente.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'nombre' as const, label: 'Nombre *', type: 'text', placeholder: 'Ej. Juan Pérez' },
            { name: 'email' as const, label: 'Email', type: 'email', placeholder: 'juan@ejemplo.com' },
            { name: 'telefono' as const, label: 'Teléfono', type: 'tel', placeholder: '+54 11 1234-5678' },
            { name: 'direccion' as const, label: 'Dirección', type: 'text', placeholder: 'Calle Falsa 123' },
          ].map(({ name, label, type, placeholder }) => (
            <div key={name}>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                {...register(name)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all"
              />
              {errors[name] && (
                <p className="mt-1 text-xs font-medium text-red-500">{errors[name]?.message}</p>
              )}
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Notas</label>
            <textarea
              {...register('notas')}
              rows={2}
              placeholder="Información adicional del cliente..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">Descuento Automático (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('descuento_pct')}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 transition-all"
            />
            {errors.descuento_pct && (
              <p className="mt-1 text-xs font-medium text-red-500">{errors.descuento_pct?.message}</p>
            )}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-secondary-dark py-3.5 text-sm font-black text-white shadow-lg shadow-secondary/25 hover:shadow-secondary/40 transition-all disabled:opacity-60"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
