import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Bookmark, BookmarkPlus, Check, Sparkles, RefreshCw } from 'lucide-react'
import { useEstructurasPrecio, type EstructuraPrecioCantidad } from '@/hooks/useEstructurasPrecio'
import { toast } from '@/store/toastStore'

interface PreciosCantidadManagerProps {
  value: { cantidad: number; precio: number }[]
  onChange: (newValue: { cantidad: number; precio: number }[]) => void
  estructuraPrecioId?: number | null
  onEstructuraChange?: (estructuraId: number | null) => void
  precioVentaActual?: number
}

export function PreciosCantidadManager({
  value,
  onChange,
  estructuraPrecioId = null,
  onEstructuraChange,
  precioVentaActual = 0,
}: PreciosCantidadManagerProps) {
  const { estructuras, isLoading, saveMutation } = useEstructurasPrecio()
  const [selectedPlantillaId, setSelectedPlantillaId] = useState<string>(
    estructuraPrecioId ? String(estructuraPrecioId) : ''
  )
  const [isSavingPlantilla, setIsSavingPlantilla] = useState(false)
  const [nombreNuevaPlantilla, setNombreNuevaPlantilla] = useState('')

  useEffect(() => {
    if (estructuraPrecioId) {
      setSelectedPlantillaId(String(estructuraPrecioId))
    }
  }, [estructuraPrecioId])

  const handleCargarPlantilla = (idStr: string) => {
    setSelectedPlantillaId(idStr)
    if (!idStr) {
      if (onEstructuraChange) onEstructuraChange(null)
      return
    }

    const idNum = Number(idStr)
    const encontrada = estructuras.find((p) => p.id === idNum)
    if (encontrada && Array.isArray(encontrada.escalas)) {
      onChange(encontrada.escalas.map((e) => ({ ...e })))
      if (onEstructuraChange) onEstructuraChange(idNum)
      toast(`Estructura "${encontrada.nombre}" cargada`, 'success')
    }
  }

  const handleGuardarPlantilla = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreNuevaPlantilla.trim()) {
      toast('Ingresá un nombre para la estructura (ej: Llaveros)', 'warning')
      return
    }
    if (value.length === 0) {
      toast('Agregá al menos una escala antes de guardar la estructura', 'warning')
      return
    }

    try {
      const guardada = await saveMutation.mutateAsync({
        nombre: nombreNuevaPlantilla.trim(),
        escalas: value,
      })
      setSelectedPlantillaId(String(guardada.id))
      if (onEstructuraChange) onEstructuraChange(guardada.id)
      setIsSavingPlantilla(false)
      setNombreNuevaPlantilla('')
      toast(`Estructura "${guardada.nombre}" guardada con éxito en el servidor`, 'success')
    } catch (err: any) {
      toast(err.response?.data?.message || 'Error al guardar estructura', 'error')
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
              {estructuras.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.escalas.map((e) => `≥${e.cantidad}: $${e.precio}`).join(' | ')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isSavingPlantilla ? (
          <button
            type="button"
            onClick={() => setIsSavingPlantilla(true)}
            disabled={value.length === 0}
            className="px-2.5 py-1.5 bg-white border border-teal-300 hover:bg-teal-100/60 text-teal-900 font-bold text-xs rounded-xl flex items-center gap-1 transition shadow-2xs disabled:opacity-50"
            title="Guardar las escalas actuales en el servidor para usarlas en otros productos (ej: Llaveros)"
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
              placeholder="Nombre de la estructura..."
              className="bg-white border border-teal-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-teal-600 shadow-2xs w-48"
            />
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="p-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 font-bold text-xs flex items-center gap-1 shadow-xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSavingPlantilla(false)
                setNombreNuevaPlantilla('')
              }}
              className="p-1.5 text-slate-500 hover:bg-teal-100/50 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Escalas actuales */}
      {value.length === 0 ? (
        <div className="text-center py-3 border border-dashed border-teal-200 rounded-xl bg-white/60">
          <p className="text-[11px] font-bold text-teal-800">
            Este producto se vende al precio unitario estándar sin escalas de volumen.
          </p>
          <p className="text-[10px] text-teal-600">
            Hacé clic en "+ Agregar Escala" o elegí una estructura guardada arriba.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {value.map((tier, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-teal-200/90 shadow-2xs"
            >
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-bold text-teal-900 shrink-0">A partir de</span>
                <input
                  type="number"
                  min="1"
                  value={tier.cantidad || ''}
                  onChange={(e) => handleUpdateTier(idx, 'cantidad', parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg text-center focus:border-teal-500 focus:outline-none bg-slate-50"
                  placeholder="Cant"
                />
                <span className="text-xs text-slate-500 shrink-0">unid:</span>
              </div>

              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-bold text-teal-900 shrink-0">Precio unitario: $</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tier.precio || ''}
                  onChange={(e) => handleUpdateTier(idx, 'precio', parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 text-xs font-bold border border-slate-200 rounded-lg text-right focus:border-teal-500 focus:outline-none bg-slate-50"
                  placeholder="Precio"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemoveTier(idx)}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                title="Eliminar escalón"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
