import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowRight
} from 'lucide-react'
import { useEstructurasPrecio, type EstructuraPrecioCantidad } from '@/hooks/useEstructurasPrecio'
import api from '@/lib/api'
import { toast } from '@/store/toastStore'
import { resolveImageUrl, getThumbnailUrl } from '@/lib/utils'

interface EstructuraModalProduct {
  id: number
  nombre: string
  sku?: string
  precio_venta: number
  imagen_url?: string
  categoria_nombre?: string
  estructura_precio_id?: number | null
  precios_cantidad?: { cantidad: number; precio: number }[]
}

interface EstructuraPreciosModalProps {
  isOpen: boolean
  onClose: () => void
  initialEstructuraId?: number | null
  onUpdated?: () => void
}

export function EstructurasPreciosModal({
  isOpen,
  onClose,
  initialEstructuraId,
  onUpdated,
}: EstructuraPreciosModalProps) {
  const { estructuras, isLoading, saveMutation, deleteMutation, applyMutation } = useEstructurasPrecio()

  const [selectedEstructuraId, setSelectedEstructuraId] = useState<number | null>(null)
  const [editingNombre, setEditingNombre] = useState('')
  const [escalasEditadas, setEscalasEditadas] = useState<{ cantidad: number; precio: number }[]>([])

  // Lista de productos asociados a la estructura
  const [associatedProducts, setAssociatedProducts] = useState<EstructuraModalProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<Record<number, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Estado para crear nueva estructura
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newNombre, setNewNombre] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (initialEstructuraId && estructuras.some((e) => e.id === initialEstructuraId)) {
        loadEstructura(initialEstructuraId)
      } else if (estructuras.length > 0) {
        loadEstructura(estructuras[0].id)
      } else {
        setSelectedEstructuraId(null)
        setEditingNombre('')
        setEscalasEditadas([])
        setAssociatedProducts([])
      }
    }
  }, [isOpen, initialEstructuraId, estructuras.length])

  const loadEstructura = async (id: number) => {
    setSelectedEstructuraId(id)
    setIsCreatingNew(false)
    const encontrada = estructuras.find((e) => e.id === id)
    if (encontrada) {
      setEditingNombre(encontrada.nombre)
      setEscalasEditadas(encontrada.escalas.map((e) => ({ ...e })))
    }

    setIsLoadingProducts(true)
    try {
      const res = await api.get(`/estructuras-precio/${id}/productos`)
      const list = (res.data?.data || []) as EstructuraModalProduct[]
      setAssociatedProducts(list)
      // Seleccionar todos por defecto
      const map: Record<number, boolean> = {}
      list.forEach((p) => {
        map[p.id] = true
      })
      setSelectedProductIds(map)
    } catch (err) {
      toast('Error al cargar artículos asociados', 'error')
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const handleAddEscala = () => {
    const nextQty =
      escalasEditadas.length > 0
        ? Math.max(...escalasEditadas.map((e) => Number(e.cantidad) || 0)) + 10
        : 10
    setEscalasEditadas([...escalasEditadas, { cantidad: nextQty, precio: 0 }])
  }

  const handleUpdateEscala = (idx: number, field: 'cantidad' | 'precio', val: number) => {
    const updated = [...escalasEditadas]
    updated[idx] = { ...updated[idx], [field]: val }
    setEscalasEditadas(updated)
  }

  const handleRemoveEscala = (idx: number) => {
    setEscalasEditadas(escalasEditadas.filter((_, i) => i !== idx))
  }

  // Guardar cambios de nombre/escalas en la estructura
  const handleSaveEstructuraOnly = async () => {
    if (!selectedEstructuraId && !isCreatingNew) return
    if (!editingNombre.trim()) {
      toast('El nombre de la estructura no puede estar vacío', 'warning')
      return
    }
    if (escalasEditadas.length === 0) {
      toast('Debes agregar al menos una escala de cantidad y precio', 'warning')
      return
    }

    try {
      const res = await saveMutation.mutateAsync({
        id: selectedEstructuraId || undefined,
        nombre: editingNombre.trim(),
        escalas: escalasEditadas,
      })
      toast('Estructura guardada exitosamente en el servidor', 'success')
      if (isCreatingNew) {
        setIsCreatingNew(false)
        loadEstructura(res.id)
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error al guardar estructura', 'error')
    }
  }

  // Crear nueva estructura en blanco
  const handleStartCreateNew = () => {
    setIsCreatingNew(true)
    setSelectedEstructuraId(null)
    setEditingNombre('')
    setEscalasEditadas([
      { cantidad: 10, precio: 700 },
      { cantidad: 50, precio: 500 },
    ])
    setAssociatedProducts([])
    setSelectedProductIds({})
  }

  // Aplicar cambios en lote a los productos seleccionados
  const handleApplyToProducts = async () => {
    if (!selectedEstructuraId) return

    const selectedIds = Object.keys(selectedProductIds)
      .map(Number)
      .filter((id) => selectedProductIds[id])

    if (selectedIds.length === 0) {
      toast('Seleccioná al menos un artículo para actualizar sus precios de escala', 'warning')
      return
    }

    try {
      await applyMutation.mutateAsync({
        estructura_id: selectedEstructuraId,
        product_ids: selectedIds,
        escalas: escalasEditadas,
      })
      toast(`¡Precios de escala actualizados para ${selectedIds.length} artículo(s)!`, 'success')
      loadEstructura(selectedEstructuraId)
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error al aplicar cambios en lote', 'error')
    }
  }

  const toggleSelectAll = () => {
    const allSelected = associatedProducts.every((p) => selectedProductIds[p.id])
    const map: Record<number, boolean> = {}
    if (!allSelected) {
      associatedProducts.forEach((p) => {
        map[p.id] = true
      })
    }
    setSelectedProductIds(map)
  }

  const toggleSelectProduct = (id: number) => {
    setSelectedProductIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredAssociatedProducts = useMemo(() => {
    if (!searchTerm.trim()) return associatedProducts
    const q = searchTerm.toLowerCase().trim()
    return associatedProducts.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(q))
    )
  }, [associatedProducts, searchTerm])

  const selectedCount = Object.values(selectedProductIds).filter(Boolean).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-gradient-to-r from-teal-800 to-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-teal-300 flex items-center justify-center font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                Gestor de Estructuras & Precios por Volumen
              </h2>
              <p className="text-xs text-teal-200/80 font-medium">
                Definí escalas mayoristas y actualizá los precios en lote en todos los artículos asociados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-teal-200 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Fila superior: Selector de Estructura y Creación */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50/60 p-3.5 rounded-2xl border border-teal-200">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-bold text-teal-900 shrink-0">Estructura activa:</span>
              {!isCreatingNew ? (
                <select
                  value={selectedEstructuraId || ''}
                  onChange={(e) => loadEstructura(Number(e.target.value))}
                  className="bg-white border border-teal-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-600 shadow-2xs flex-1 max-w-md"
                >
                  {estructuras.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.nombre} ({est.productos_count || 0} artículos)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl">
                  ✨ Nueva Estructura
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isCreatingNew ? (
                <button
                  type="button"
                  onClick={handleStartCreateNew}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Nueva</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false)
                    if (estructuras.length > 0) loadEstructura(estructuras[0].id)
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Editor de la Estructura (Nombre y Escalas) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex-1 max-w-md">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nombre de la Estructura:
                </label>
                <input
                  type="text"
                  value={editingNombre}
                  onChange={(e) => setEditingNombre(e.target.value)}
                  placeholder="Ej: Llaveros (10+ y 50+)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleAddEscala}
                  className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Escala</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveEstructuraOnly}
                  disabled={saveMutation.isPending}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
                >
                  Guardar Estructura
                </button>
              </div>
            </div>

            {/* Fila de Escalas */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              {escalasEditadas.map((esc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <span className="font-bold text-slate-600">≥</span>
                  <input
                    type="number"
                    min="1"
                    value={esc.cantidad || ''}
                    onChange={(e) => handleUpdateEscala(idx, 'cantidad', parseInt(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 border border-slate-300 rounded text-center font-bold bg-white text-xs"
                  />
                  <span className="text-slate-500 font-medium">un: $</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={esc.precio || ''}
                    onChange={(e) => handleUpdateEscala(idx, 'precio', parseFloat(e.target.value) || 0)}
                    className="w-20 px-1.5 py-0.5 border border-slate-300 rounded text-right font-bold bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveEscala(idx)}
                    className="text-slate-400 hover:text-red-500 p-0.5 transition"
                    title="Quitar escala"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla de Artículos que tienen esta Estructura Asignada */}
          {!isCreatingNew && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-3 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    📦 Artículos con esta Estructura ({associatedProducts.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Marcá los artículos en los que querés aplicar los nuevos valores de escala.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar artículo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white outline-none w-48"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    {associatedProducts.every((p) => selectedProductIds[p.id])
                      ? 'Desmarcar todos'
                      : 'Marcar todos'}
                  </button>
                </div>
              </div>

              {isLoadingProducts ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                  <span className="text-xs font-bold">Cargando artículos asociados...</span>
                </div>
              ) : associatedProducts.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                  <p className="text-xs font-bold text-slate-600">
                    Ningún producto tiene asignada esta estructura todavía.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Podés asignarla desde el formulario de producto o en lote desde la Gestión de Tienda.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72 border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              associatedProducts.length > 0 &&
                              associatedProducts.every((p) => selectedProductIds[p.id])
                            }
                            onChange={toggleSelectAll}
                            className="rounded accent-teal-600 cursor-pointer"
                          />
                        </th>
                        <th className="p-2.5">Producto</th>
                        <th className="p-2.5 text-right">Precio Base</th>
                        <th className="p-2.5">Escalas Actuales</th>
                        <th className="p-2.5 text-emerald-700">Nuevas Escalas a Aplicar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAssociatedProducts.map((p) => {
                        const isChecked = Boolean(selectedProductIds[p.id])
                        return (
                          <tr
                            key={p.id}
                            onClick={() => toggleSelectProduct(p.id)}
                            className={`hover:bg-slate-50 cursor-pointer transition ${
                              isChecked ? 'bg-teal-50/20' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectProduct(p.id)}
                                className="rounded accent-teal-600 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getThumbnailUrl(p.imagen_url, 80)}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                                <div className="min-w-0">
                                  <p className="truncate max-w-xs">{p.nombre}</p>
                                  {p.sku && <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-black text-slate-900">
                              ${Number(p.precio_venta).toLocaleString('es-AR')}
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-500 font-medium">
                              {p.precios_cantidad && p.precios_cantidad.length > 0 ? (
                                p.precios_cantidad.map((e) => `≥${e.cantidad}: $${e.precio}`).join(' | ')
                              ) : (
                                <span className="text-slate-300 italic">Sin escala</span>
                              )}
                            </td>
                            <td className="p-2.5 text-[11px] font-black text-emerald-800">
                              {escalasEditadas.map((e) => `≥${e.cantidad}: $${e.precio}`).join(' | ')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition"
          >
            Cerrar
          </button>

          {!isCreatingNew && (
            <button
              type="button"
              onClick={handleApplyToProducts}
              disabled={applyMutation.isPending || selectedCount === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-black shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              {applyMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Aplicando cambios...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-teal-200" />
                  <span>Aplicar nueva escala a los {selectedCount} artículo(s)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
