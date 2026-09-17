import { useState } from 'react'
import { useProveedores, useCreateProveedor, useUpdateProveedor, useDeleteProveedor } from '@/hooks/useProveedores'
import { Plus, Search, Edit3, Trash2, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Proveedor } from '@/types'
import { useForm } from 'react-hook-form'
import { toast } from '@/store/toastStore'

function ProveedorModal({
  isOpen,
  onClose,
  proveedor,
}: {
  isOpen: boolean
  onClose: () => void
  proveedor?: Proveedor | null
}) {
  const { register, handleSubmit, reset } = useForm<Partial<Proveedor>>()
  const createMutation = useCreateProveedor()
  const updateMutation = useUpdateProveedor()

  useState(() => {
    if (proveedor) reset(proveedor)
    else reset({ nombre: '', contacto: '', telefono: '', email: '', direccion: '', notas: '' })
  })

  const onSubmit = async (data: Partial<Proveedor>) => {
    try {
      if (proveedor) {
        await updateMutation.mutateAsync({ id: proveedor.id, payload: data })
        toast('Proveedor actualizado', 'success')
      } else {
        await createMutation.mutateAsync(data)
        toast('Proveedor creado', 'success')
      }
      onClose()
    } catch {
      toast('Error al guardar', 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-50/50-secondary p-6">
        <h2 className="mb-4 text-lg font-black text-slate-800">{proveedor ? 'Editar' : 'Nuevo'} Proveedor</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <input {...register('nombre')} placeholder="Razón social *" required className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800" />
          <input {...register('contacto')} placeholder="Persona de contacto" className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800" />
          <input {...register('telefono')} placeholder="Teléfono" className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800" />
          <input {...register('email')} type="email" placeholder="Email" className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800" />
          <input {...register('direccion')} placeholder="Dirección" className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800" />
          <textarea {...register('notas')} placeholder="Notas" className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800" />
          
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-500">Cancelar</button>
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProveedoresPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useProveedores({ q: search })
  const deleteMutation = useDeleteProveedor()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selected, setSelected] = useState<Proveedor | null>(null)

  const handleEdit = (p: Proveedor) => { setSelected(p); setIsModalOpen(true); }
  const handleDelete = async (p: Proveedor) => {
    if (confirm(`Eliminar a ${p.nombre}?`)) {
      try {
        await deleteMutation.mutateAsync(p.id)
        toast('Eliminado', 'success')
      } catch {
        toast('No se puede eliminar porque tiene compras asociadas', 'error')
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800">Proveedores</h2>
        <button onClick={() => { setSelected(null); setIsModalOpen(true); }} className="flex gap-2 items-center bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input 
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..." 
          className="w-full bg-white card-shadow rounded-xl border border-slate-100 pl-10 pr-4 py-2.5 text-sm text-slate-800"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data.map(p => (
          <div 
            key={p.id} 
            onClick={() => navigate(`/proveedores/${p.id}`)}
            className="bg-white card-shadow border border-slate-100 p-4 rounded-2xl relative group cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="bg-slate-50 p-3 rounded-xl"><Building2 className="w-5 h-5 text-slate-500" /></div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{p.nombre}</p>
                <p className="text-xs text-slate-500">{p.telefono || 'Sin teléfono'}</p>
                <p className="text-xs text-slate-500">{p.email || 'Sin email'}</p>
              </div>
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); handleEdit(p); }} 
                className="p-1 text-slate-500 hover:text-primary bg-white card-shadow rounded"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(p); }} 
                className="p-1 text-slate-500 hover:text-red-400 bg-white card-shadow rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ProveedorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} proveedor={selected} />
    </div>
  )
}
