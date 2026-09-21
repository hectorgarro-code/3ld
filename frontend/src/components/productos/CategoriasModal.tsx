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
  Tags,
  Star,
  Smile,
  Search
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

interface EmojiCategory {
  name: string
  icon: string
  emojis: string[]
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Populares',
    icon: '✨',
    emojis: [
      '✨', '🍪', '🏺', '🧩', '🪴', '🤖', '🏷️', '🎁', '💡', '🐾', '⚽', '🎮',
      '🎨', '👓', '🏠', '🛠️', '🌸', '💖', '🚀', '📦', '🍰', '☕', '🎄', '👑',
      '🧸', '💍', '🎧', '🌟', '🦄', '🎯'
    ]
  },
  {
    name: 'Caritas',
    icon: '😃',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝',
      '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒',
      '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
      '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
    ]
  },
  {
    name: 'Objetos',
    icon: '🛍️',
    emojis: [
      '📦', '🏷️', '🎁', '🛒', '🛍️', '🎉', '🎊', '✨', '💡', '👑', '💍', '💎',
      '🕶️', '👓', '🧦', '🎒', '🎓', '🎩', '🏆', '🏅', '🎖️', '📌', '📍', '🔍',
      '🔎', '📕', '📗', '📘', '📓', '📱', '💻', '⌨️', '🖥️', '🖨️', '📸', '🎥',
      '📺', '⏰', '⌚', '🔮', '🔑', '🗝️', '💰', '💵', '💳'
    ]
  },
  {
    name: 'Comida',
    icon: '🍪',
    emojis: [
      '🍪', '🍰', '🧁', '🥧', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍞',
      '🥖', '🥨', '🥞', '🧀', '🍕', '🍔', '🍟', '🌭', '🥪', '☕', '🍵',
      '🥤', '🧃', '🍺', '🍻', '🥂', '🍹', '🍾', '🍇', '🍎', '🍓', '🍒', '🍑'
    ]
  },
  {
    name: 'Herramientas',
    icon: '🛠️',
    emojis: [
      '🛠️', '🔧', '🔨', '⚒️', '⛏️', '🔩', '⚙️', '🧱', '🎨', '🖌️', '✏️', '✒️',
      '📐', '📏', '✂️', '📍', '🗑️', '🧰', '⛓️', '🧲', '🧪', '🔬', '🔭', '🧵',
      '🪡', '🪢', '🧹', '🧺', '🕯️'
    ]
  },
  {
    name: 'Juegos',
    icon: '🧩',
    emojis: [
      '🧩', '🤖', '🧸', '🎲', '🎯', '🎮', '🕹️', '🎰', '♟️', '🎳', '🏎️', '🚀',
      '🚗', '🛵', '🚲', '🪁', '🎠', '🎡', '🎢', '🔮', '🪀', '⚽', '🏀',
      '🏈', '🎾', '🏐', '🏓', '🏸'
    ]
  },
  {
    name: 'Hogar',
    icon: '🪴',
    emojis: [
      '🏠', '🏡', '🪴', '🌸', '🌹', '🌻', '🌺', '🌾', '🌿', '🍃', '🌱', '☘️',
      '🍀', '🍁', '🍂', '🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🦁', '🐮', '🐷',
      '🐵', '🐙', '🦑', '🦀', '🦄', '🐾', '🦋', '🐝', '🐞'
    ]
  },
  {
    name: 'Corazones & Símbolos',
    icon: '💖',
    emojis: [
      '💖', '💗', '💓', '💞', '💕', '❣️', '❤️', '🧡', '💛', '💚', '💙', '💜',
      '🖤', '🤍', '🤎', '💯', '⭐', '🌟', '💥', '🔥', '⚡', '💫', '☀️', '🌙',
      '🌈', '✅', '❌', '⭕', '🔴', '🔵', '🟠', '🟡', '🟢', '🟣'
    ]
  }
]

export function CategoriasModal({ isOpen, onClose }: CategoriasModalProps) {
  const { data: categorias, isLoading } = useCategorias()
  const createMutation = useCreateCategoria()
  const updateMutation = useUpdateCategoria()
  const deleteMutation = useDeleteCategoria()

  const [editingCat, setEditingCat] = useState<Categoria | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [icono, setIcono] = useState('✨')
  const [esDestacada, setEsDestacada] = useState(false)

  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0)
  const [emojiSearch, setEmojiSearch] = useState('')

  if (!isOpen) return null

  const handleStartCreate = () => {
    setEditingCat(null)
    setNombre('')
    setDescripcion('')
    setIcono('✨')
    setEsDestacada(false)
  }

  const handleStartEdit = (cat: Categoria) => {
    setEditingCat(cat)
    setNombre(cat.nombre)
    setDescripcion(cat.descripcion || '')
    setIcono(cat.icono || '✨')
    setEsDestacada(Boolean(cat.es_destacada))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanNombre = nombre.trim()
    if (!cleanNombre) {
      toast('El nombre de la categoría es requerido', 'error')
      return
    }

    try {
      const payload = {
        nombre: cleanNombre,
        descripcion: descripcion.trim() || undefined,
        icono: icono.trim() || '✨',
        es_destacada: esDestacada ? 1 : 0
      }

      if (editingCat) {
        await updateMutation.mutateAsync({
          id: editingCat.id,
          payload
        })
        toast('Categoría actualizada exitosamente', 'success')
      } else {
        await createMutation.mutateAsync(payload)
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
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6B66C8]/10 text-[#6B66C8]">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">ABM de Categorías de Producto</h2>
              <p className="text-xs text-slate-500 font-medium">Asigná íconos/emojis y destacá las más utilizadas en la tienda</p>
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

              {/* Selector de Icono / Emoji estilo WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Smile className="h-3.5 w-3.5 text-[#6B66C8]" />
                  Ícono o Emoticono
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border-2 border-[#6B66C8] text-2xl shadow-xs">
                    {icono || '✨'}
                  </div>
                  <input
                    type="text"
                    value={icono}
                    onChange={(e) => setIcono(e.target.value)}
                    placeholder="Escribí o seleccioná abajo..."
                    maxLength={10}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-semibold focus:border-[#6B66C8] focus:outline-none focus:ring-2 focus:ring-[#6B66C8]/20 transition"
                  />
                </div>

                {/* Panel selector estilo WhatsApp */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  {/* Categorías de pestañas */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-1 py-1 overflow-x-auto no-scrollbar">
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          setActiveEmojiCategory(idx)
                          setEmojiSearch('')
                        }}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition ${
                          activeEmojiCategory === idx && !emojiSearch
                            ? 'bg-white shadow-2xs text-base border border-slate-200 scale-105'
                            : 'opacity-70 hover:opacity-100 hover:bg-slate-200/50'
                        }`}
                        title={cat.name}
                      >
                        {cat.icon}
                      </button>
                    ))}
                  </div>

                  {/* Buscador rápido de emojis */}
                  <div className="px-2 pt-1.5 pb-1 bg-white border-b border-slate-100 flex items-center gap-1.5">
                    <Search className="h-3 w-3 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                      placeholder="Buscar emoticones..."
                      className="w-full text-[11px] text-slate-700 bg-transparent focus:outline-none"
                    />
                    {emojiSearch && (
                      <button
                        type="button"
                        onClick={() => setEmojiSearch('')}
                        className="text-[10px] text-slate-400 hover:text-slate-600 px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Grilla de Emojis */}
                  <div className="grid grid-cols-7 gap-1 p-2 max-h-36 overflow-y-auto custom-scrollbar bg-slate-50/20">
                    {emojiSearch ? (
                      (() => {
                        const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis)
                        const filtered = Array.from(new Set(allEmojis))
                        return filtered.map((emoji, idx) => (
                          <button
                            key={`${emoji}-${idx}`}
                            type="button"
                            onClick={() => setIcono(emoji)}
                            className={`h-7 w-7 flex items-center justify-center text-lg rounded-lg transition-transform hover:scale-120 hover:bg-white hover:shadow-2xs ${
                              icono === emoji ? 'bg-[#6B66C8]/20 border border-[#6B66C8]' : ''
                            }`}
                            title={`Elegir ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))
                      })()
                    ) : (
                      EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji, idx) => (
                        <button
                          key={`${emoji}-${idx}`}
                          type="button"
                          onClick={() => setIcono(emoji)}
                          className={`h-7 w-7 flex items-center justify-center text-lg rounded-lg transition-transform hover:scale-120 hover:bg-white hover:shadow-2xs ${
                            icono === emoji ? 'bg-[#6B66C8]/20 border border-[#6B66C8]' : ''
                          }`}
                          title={`Elegir ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))
                    )}
                  </div>
                </div>
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
                  rows={2}
                  placeholder="Descripción breve..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-[#6B66C8] focus:outline-none focus:ring-2 focus:ring-[#6B66C8]/20 transition resize-none"
                />
              </div>

              {/* Destacar como más utilizada */}
              <label className="flex items-center gap-2.5 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl cursor-pointer hover:bg-amber-50 transition">
                <input
                  type="checkbox"
                  checked={esDestacada}
                  onChange={(e) => setEsDestacada(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500 text-amber-500 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    Más utilizada / Destacada
                  </p>
                  <p className="text-[10px] text-amber-700">Se mostrará directamente en la barra rápida de la tienda en celular</p>
                </div>
              </label>

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

            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-600 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
              <span>
                Las categorías con productos se reflejan automáticamente en el catálogo de la tienda web.
              </span>
            </div>
          </div>

          {/* List Side */}
          <div className="md:col-span-7 p-5 overflow-y-auto max-h-[520px]">
            <span className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Categorías Registradas ({categorias?.length || 0})
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
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                          {cat.icono || '✨'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-black text-slate-900 truncate">{cat.nombre}</h4>
                            {cat.es_destacada ? (
                              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                Más utilizada
                              </span>
                            ) : null}
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
