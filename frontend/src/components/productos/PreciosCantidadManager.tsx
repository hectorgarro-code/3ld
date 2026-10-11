import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Bookmark, BookmarkPlus, Check, Sparkles } from 'lucide-react'
import {
  getPlantillasPrecios,
  savePlantillaPrecios,
  deletePlantillaPrecios,
  type PlantillaPrecioCantidad,
} from '@/lib/volumePricingTemplates'
import { toast } from '@/store/toastStore'

interface PreciosCantidadManagerProps {
  value: { cantidad: number; precio: number }[]
  onChange: (newValue: { cantidad: number; precio: number }[]) => void
  precioVentaActual?: number
}

export function PreciosCantidadManager({
  value,
  onChange,
  precioVentaActual = 0,
}: PreciosCantidadManagerProps) {
  const [plantillas, setPlantillas] = useState<PlantillaPrecioCantidad[]>([])
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<string>('')
  const [isSavingPlantilla, setIsSavingPlantilla] = useState(false)
  const [nombreNuevaPlantilla, setNombreNuevaPlantilla] = useState('')

  useEffect(() => {
    setPlantillas(getPlantillasPrecios())
  }, [])

  const handleCargarPlantilla = (id: string) => {
    setSelectedPlantillaId(id)
    if (!id) return
    const encontrada = plantillas.find((p) => p.id === id)
    if (encontrada && Array.isArray(encontrada.escalas)) {
      onChange(encontrada.escalas.map((e) => ({ ...e })))
      toast(`Estructura "${encontrada.nombre}" cargada`, 'success')
    }
  }

  const handleGuardarPlantilla = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreNuevaPlantilla.trim()) {
      toast('Ingresá un nombre para la estructura (ej: Llaveros)', 'warning')
      return
    }
    if (value.length === 0) {
      toast('Agregá al menos una escala antes de guardar la estructura', 'warning')
      return
    }

    const guardada = savePlantillaPrecios(nombreNuevaPlantilla.trim(), value)
    const actualizadas = getPlantillasPrecios()
    setPlantillas(actualizadas)
    setSelectedPlantillaId(guardada.id)
    setIsSavingPlantilla(false)
    setNombreNuevaPlantilla('')
    toast(`Estructura "${guardada.nombre}" guardada con éxito`, 'success')
  }

  const handleEliminarPlantilla = (id: string, nombre: string) => {
    if (confirm(`¿Eliminar la estructura guardada "${nombre}"?`)) {
      const actualizadas = deletePlantillaPrecios(id)
      setPlantillas(actualizadas)
      if (selectedPlantillaId === id) {
        setSelectedPlantillaId('')
      }
      toast('Estructura eliminada', 'info')
    }
  }

  const handleAddTier = () => {
    const nextQty =
      value.length > 0 ? Math.max(...value.map((pc) => Number(pc.cantidad) || 0)) + 5 : 5
    const suggestedPrice = precioVentaActual > 0 ? Math.round(precioVentaActual * 0.9) : 0
    onChange([...value, { cantidad: nextQty, precio: suggestedPrice }])
  }

  const handleUpdateTier = (index: number, field: 'cantidad' | 'precio', val: number) => {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: val }
    onChange(updated)
  }

  const handleRemoveTier = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-gradient-to-br from-teal-50/80 to-emerald-50/50 p-4 rounded-2xl border border-teal-200/90 space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
            📦 Precios por Cantidad (Escala por Volumen)
          </span>
          <p className="text-[11px] text-teal-700 font-medium mt-0.5">
            Definí escalas o elegí una estructura guardada (ej. Llaveros). Se aplicará si se iguala o supera la cantidad.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddTier}
          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 shadow-xs transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Escala</span>
        </button>
      </div>

      {/* Selector y Gestión de Estructuras Guardadas */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-teal-200/60">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1 shrink-0">
              <Bookmark className="w-3.5 h-3.5 text-teal-600" />
              Estructura:
            </span>
            <select
              value={selectedPlantillaId}
              onChange={(e) => handleCargarPlantilla(e.target.value)}
              className="flex-1 bg-white border border-teal-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500 shadow-2xs"
            >
              <option value="">-- Cargar estructura guardada --</option>
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.escalas.map((e) => `≥${e.cantidad}: $${e.precio}`).join(' | ')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedPlantillaId && (
          <button
            type="button"
            onClick={() => {
              const p = plantillas.find((item) => item.id === selectedPlantillaId)
              if (p) handleEliminarPlantilla(p.id, p.nombre)
            }}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
            title="Eliminar estructura guardada seleccionada"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {!isSavingPlantilla ? (
          <button
            type="button"
            onClick={() => setIsSavingPlantilla(true)}
            disabled={value.length === 0}
            className="px-2.5 py-1.5 bg-white border border-teal-300 hover:bg-teal-100/60 text-teal-900 font-bold text-xs rounded-xl flex items-center gap-1 transition shadow-2xs disabled:opacity-50"
            title="Guardar las escalas actuales para usarlas en otros productos (ej: Llaveros)"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-teal-700" />
            <span>Guardar como estructura</span>
          </button>
        ) : (
          <form onSubmit={handleGuardarPlantilla} className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={nombreNuevaPlantilla}
              onChange={(e) => setNombreNuevaPlantilla(e.target.value)}
              placeholder="Nombre (ej. Llaveros)"
              className="w-40 bg-white border border-teal-400 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSavingPlantilla(false)
                setNombreNuevaPlantilla('')
              }}
              className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Lista de Escalas Actuales */}
      {value.length === 0 ? (
        <div className="text-center py-3 px-4 border border-dashed border-teal-300/70 rounded-xl bg-white/70 text-xs font-semibold text-teal-800">
          Sin escalas configuradas. Podés agregar una manualmente o seleccionar una estructura guardada arriba.
        </div>
      ) : (
        <div className="space-y-2">
          {value.map((tier, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-white/95 p-2.5 rounded-xl border border-teal-100 shadow-2xs"
            >
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  A partir de (cantidad)
                </label>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-extrabold text-slate-400">≥</span>
                  <input
                    type="number"
                    min={2}
                    value={tier.cantidad || ''}
                    onChange={(e) =>
                      handleUpdateTier(idx, 'cantidad', parseInt(e.target.value, 10) || 0)
                    }
                    placeholder="Ej: 5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500 focus:bg-white"
                  />
                  <span className="text-xs text-slate-500 font-semibold">unid.</span>
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Precio Unitario ($)
                </label>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-extrabold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={tier.precio !== undefined ? tier.precio : ''}
                    onChange={(e) =>
                      handleUpdateTier(idx, 'precio', parseFloat(e.target.value) || 0)
                    }
                    placeholder="Ej: 800"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => handleRemoveTier(idx)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                  title="Eliminar escala"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
