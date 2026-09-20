import React, { useState, useEffect } from 'react'
import { X, Calculator, Check, Zap, Scale, DollarSign } from 'lucide-react'

interface CostoImpresionModalProps {
  isOpen: boolean
  onClose: () => void
  initialHoras: number
  initialGramos: number
  onApply: (precioCosto: number, horas: number, gramos: number) => void
}

export function CostoImpresionModal({
  isOpen,
  onClose,
  initialHoras,
  initialGramos,
  onApply,
}: CostoImpresionModalProps) {
  const [horas, setHoras] = useState<number>(initialHoras || 0)
  const [gramos, setGramos] = useState<number>(initialGramos || 0)
  
  // Guardar en localStorage para recordar la última tarifa de filamento y hora de máquina usada
  const [costoFilamentoKg, setCostoFilamentoKg] = useState<number>(() => {
    const saved = localStorage.getItem('costo_filamento_kg_default')
    return saved ? parseFloat(saved) : 15000
  })

  const [costoHoraMaquina, setCostoHoraMaquina] = useState<number>(() => {
    const saved = localStorage.getItem('costo_hora_maquina_default')
    return saved ? parseFloat(saved) : 500
  })

  useEffect(() => {
    if (isOpen) {
      setHoras(initialHoras || 0)
      setGramos(initialGramos || 0)
    }
  }, [isOpen, initialHoras, initialGramos])

  if (!isOpen) return null

  // Cálculos de Costo
  const costoMaterial = (gramos / 1000) * costoFilamentoKg
  const costoEnergiaTiempo = horas * costoHoraMaquina
  const costoTotalEstimado = Math.round(costoMaterial + costoEnergiaTiempo)

  const handleApply = () => {
    // Persistir las tarifas por defecto
    localStorage.setItem('costo_filamento_kg_default', costoFilamentoKg.toString())
    localStorage.setItem('costo_hora_maquina_default', costoHoraMaquina.toString())
    
    onApply(costoTotalEstimado, horas, gramos)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-none">Calculadora de Costo 3D</h3>
              <p className="text-[11px] text-amber-400 font-medium mt-1">
                Genera el costo del artículo según horas y peso de filamento
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Parámetros del Modelo */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3">
            <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
              1. Datos del Modelo (MakerWorld / Manual)
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Horas de Impresión
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={horas}
                    onChange={(e) => setHoras(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 pr-8 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="absolute right-3 top-2.5 font-extrabold text-slate-400">h</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5 text-blue-500" />
                  Peso del Modelo
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={gramos}
                    onChange={(e) => setGramos(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 pr-8 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="absolute right-3 top-2.5 font-extrabold text-slate-400">g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarifas de Producción */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-3">
            <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
              2. Costos de Insumo y Desgaste
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Costo Filamento ($/Kg)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-extrabold text-slate-400">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={costoFilamentoKg}
                    onChange={(e) => setCostoFilamentoKg(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 pl-7 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Costo Hora Máquina ($/h)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-extrabold text-slate-400">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={costoHoraMaquina}
                    onChange={(e) => setCostoHoraMaquina(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 pl-7 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desglose de Resultados */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200/80 space-y-2">
            <div className="flex justify-between items-center text-slate-600 text-[11px]">
              <span>Costo Material ({gramos}g a ${costoFilamentoKg}/kg):</span>
              <span className="font-bold text-slate-800">${costoMaterial.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 text-[11px]">
              <span>Costo Tiempo / Energía ({horas}h a ${costoHoraMaquina}/h):</span>
              <span className="font-bold text-slate-800">${costoEnergiaTiempo.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-slate-900">
              <span className="font-black text-sm">Costo Total Estimado:</span>
              <span className="font-black text-lg text-amber-700">${costoTotalEstimado.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 bg-slate-900 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            <span>Aplicar Precio de Costo (${costoTotalEstimado.toLocaleString('es-AR')})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
