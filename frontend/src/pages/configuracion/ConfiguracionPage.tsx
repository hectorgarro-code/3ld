import React, { useState, useEffect } from 'react'
import { Settings, Save, Loader2, DollarSign, Zap, Scale, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'
import { toast } from '@/store/toastStore'

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [precioFilamentoKg, setPrecioFilamentoKg] = useState<number>(15000)
  const [valorHoraMaquina, setValorHoraMaquina] = useState<number>(500)

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      try {
        const res = await api.get('/config/costos')
        if (res.data?.success && res.data?.data) {
          const d = res.data.data
          if (d.precio_filamento_kg) setPrecioFilamentoKg(parseFloat(d.precio_filamento_kg))
          if (d.valor_hora_maquina) setValorHoraMaquina(parseFloat(d.valor_hora_maquina))
        }
      } catch (err) {
        // Fallback a localStorage si falla el backend
        const savedFil = localStorage.getItem('costo_filamento_kg_default')
        if (savedFil) setPrecioFilamentoKg(parseFloat(savedFil))
        const savedHora = localStorage.getItem('costo_hora_maquina_default')
        if (savedHora) setValorHoraMaquina(parseFloat(savedHora))
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Guardar en Backend
      await api.put('/config/costos', {
        precio_filamento_kg: precioFilamentoKg,
        valor_hora_maquina: valorHoraMaquina,
      })

      // Guardar en LocalStorage para acceso rápido síncrono en cotizadores
      localStorage.setItem('costo_filamento_kg_default', precioFilamentoKg.toString())
      localStorage.setItem('costo_hora_maquina_default', valorHoraMaquina.toString())

      toast('Configuración de costos guardada con éxito', 'success')
    } catch (err: any) {
      // Si falla endpoint backend, guardar en localStorage de todas formas
      localStorage.setItem('costo_filamento_kg_default', precioFilamentoKg.toString())
      localStorage.setItem('costo_hora_maquina_default', valorHoraMaquina.toString())
      toast('Configuración guardada localmente', 'success')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl text-white shadow-md">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Configuración del Sistema</h1>
            <p className="text-xs font-medium text-slate-500">
              Parámetros generales de costos y cotización por defecto
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Valores por Defecto del Cotizador
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Estos valores se aplicarán automáticamente para calcular el precio de costo de los artículos cuando ingreses gramos o cargues desde MakerWorld.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Valor Filamento Promedio */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <label className="font-extrabold text-sm text-slate-800 block">
                    Precio de Filamento Promedio ($/kg)
                  </label>
                  <p className="text-[11px] text-slate-500">Costo de compra promedio por rollo de 1kg</p>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 font-black text-slate-400">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={precioFilamentoKg}
                  onChange={(e) => setPrecioFilamentoKg(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                1 gramo = <span className="font-bold text-slate-700">${(precioFilamentoKg / 1000).toFixed(2)}</span>
              </p>
            </div>

            {/* Valor Hora Máquina */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <label className="font-extrabold text-sm text-slate-800 block">
                    Costo Hora de Máquina / Energía ($/h)
                  </label>
                  <p className="text-[11px] text-slate-500">Costo de luz, desgaste y amortización por hora</p>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 font-black text-slate-400">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={valorHoraMaquina}
                  onChange={(e) => setValorHoraMaquina(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                1 hora de impresión = <span className="font-bold text-slate-700">${valorHoraMaquina.toFixed(2)}</span>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-amber-400" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
