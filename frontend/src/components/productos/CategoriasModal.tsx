import React, { useState } from 'react'
import {
  X,
  Plus,
  Pencil,
  Trash2,
  FolderPlus,
  Package,
  AlertCircle,
  Check,
  Loader2,
  Tags
} from 'lucide-react'
import {
  useCategorias,
  useCreateCategoria,
  useUpdateCategoria,
  useDeleteCategoria
} from '@/hooks/useProductos'
import type { Categoria } from '@/types'
import { toast } from '@/store/toastStore'

interface CategoriasModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CategoriasModal({ isOpen, onClose }: CategoriasModalProps) {
  const { data: categorias, isLoading } = useCategorias()
  const createMutation = useCreateCategoria()
  const updateMutation = useUpdateCategoria()
  const deleteMutation = useDeleteCategoria()

  const [editingCat, setEditingCat] = useState<Categoria | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  if (!isOpen) return null

  const handleStartCreate = () => {
    setEditingCat(null)
    setNombre('')
    setDescripcion('')
  }

  const handleStartEdit = (cat: Categoria) => {
    setEditingCat(cat)
    setNombre(cat.nombre)
    setDescripcion(cat.descripcion || '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanNombre = nombre.trim()
    if (!cleanNombre) {
      toast('El nombre de la categoría es requerido', 'error')
      return
    }

    try {
      if (editingCat) {
        await updateMutation.mutateAsync({
          id: editingCat.id,
          payload: { nombre: cleanNombre, descripcion: descripcion.trim() || undefined }
        })
        toast('Categoría actualizada exitosamente', 'success')
      } else {
        await createMutation.mutateAsync({
          nombre: cleanNombre,
          descripcion: descripcion.trim() || undefined
        })
        toast('Categoría creada exitosamente', 'success')
      }
      handleStartCreate()
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar categoría'
      toast(msg, 'error')
    }
  }

  const handleDelete = async (cat: Categoria) => {
    const pCount = cat.productos_count ?? 0
    if (pCount > 0) {
      toast(`No se puede eliminar "${cat.nombre}": contiene ${pCount} producto(s) asociado(s).`, 'error')
      return
    }

    if (!confirm(`¿Estás seguro de eliminar la categoría "${cat.nombre}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(cat.id)
      toast('Categoría eliminada correctamente', 'success')
      if (editingCat?.id === cat.id) {
        handleStartCreate()
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'No se pudo eliminar la categoría'
      toast(msg, 'error')
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6B66C8]/10 text-[#6B66C8]">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">ABM de Categorías de Producto</h2>
              <p className="text-xs text-slate-500 font-medium">Creá, editá o eliminá categorías vacías</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content split */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Form Side */}
          <div className="md:col-span-5 p-5 bg-slate-50/30 flex flex-col justify-between overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
                </span>
                {editingCat && (
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="text-xs font-bold text-[#6B66C8] hover:underline"
                  >
                    + Cancelar Edición
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Categoría *</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Cortantes, Cerámica, Didácticos..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-[#6B66C8] focus:outline-none focus:ring-2 focus:ring-[#6B66C8]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción (Opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Descripción breve..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-[#6B66C8] focus:outline-none focus:ring-2 focus:ring-[#6B66C8]/20 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#6B66C8] hover:bg-[#5752B3] text-white py-2.5 px-4 text-xs font-black shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingCat ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Guardar Cambios</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4" />
                    <span>Agregar Categoría</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Regla de Eliminación:</strong> Para poder eliminar una categoría, esta debe estar completamente vacía (0 productos asociados).
              </span>
            </div>
          </div>

          {/* List Side */}
          <div className="md:col-span-7 p-5 overflow-y-auto max-h-[500px]">
            <span className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Categorías Existentes ({categorias?.length || 0})
            </span>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : !categorias || categorias.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Tags className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">No hay categorías registradas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {categorias.map((cat) => {
                  const pCount = cat.productos_count ?? 0
                  const isEditing = editingCat?.id === cat.id

                  return (
                    <div
                      key={cat.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isEditing
                          ? 'border-[#6B66C8] bg-[#EFEBFC]/40 shadow-xs'
                          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 truncate">{cat.nombre}</h4>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              pCount > 0
                                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Package className="h-3 w-3" />
                            {pCount} prod{pCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        {cat.descripcion && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{cat.descripcion}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#6B66C8] hover:bg-[#EFEBFC] transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(cat)}
                          disabled={deleteMutation.isPending}
                          className={`p-1.5 rounded-lg transition-colors ${
                            pCount > 0
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title={pCount > 0 ? 'No se puede eliminar: contiene productos' : 'Eliminar categoría vacía'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
