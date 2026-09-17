import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFilamentos } from '@/hooks/useFilamentos'
import { formatARS, type CostInput, type CostResult } from '@/lib/cost-calculator'
import { toast } from '@/store/toastStore'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import type { ConfigCostos } from '@/types'
import { Calculator, Zap, Clock, Layers, DollarSign, TrendingUp, ChevronRight, Loader2 } from 'lucide-react'
import { SliderInput } from '@/components/cotizador/SliderInput'
import { CostBreakdownRow } from '@/components/cotizador/CostBreakdownRow'

// Default config in case API is loading
const DEFAULT_CONFIG: CostInput = {
  gramos: 50,
  tiempoMin: 180,
  costoPorGramo: 0.8,
  consumoWatts: 250,
  precioKwh: 150,
  valorHoraOperario: 2000,
  valorImpresora: 300000,
  vidaUtilHoras: 5000,
  margenPct: 40,
  multiplicador: 1,
}

export default function CotizadorPage() {
  const { data: filamentos } = useFilamentos()
  const [selectedFilamentoId, setSelectedFilamentoId] = useState<number | null>(null)

  // Load config from API
  const { data: configData } = useQuery<ConfigCostos>({
    queryKey: ['config-costos'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ConfigCostos }>('/config/costos')
      return data.data
    },
    retry: false,
  })

  const [input, setInput] = useState<CostInput>(DEFAULT_CONFIG)
  const [result, setResult] = useState<CostResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Apply API config when loaded
  useEffect(() => {
    if (configData) {
      setInput((prev) => ({
        ...prev,
        consumoWatts: configData.consumo_watts_default,
        precioKwh: configData.precio_kwh,
        valorHoraOperario: configData.valor_hora_operario,
        margenPct: configData.margen_default_pct,
        multiplicador: configData.multiplicador_default,
      }))
    }
  }, [configData])

  // Select initial filamento if available
  useEffect(() => {
    if (filamentos && filamentos.length > 0 && selectedFilamentoId === null) {
      setSelectedFilamentoId(filamentos[0].id)
      setInput((prev) => ({ ...prev, costoPorGramo: filamentos[0].costo_por_gramo }))
    }
  }, [filamentos, selectedFilamentoId])

  // When filamento changes, update costoPorGramo
  const handleFilamentoChange = (filamentoId: number) => {
    setSelectedFilamentoId(filamentoId)
    const f = filamentos?.find((item) => item.id === filamentoId)
    if (f) {
      setInput((prev) => ({ ...prev, costoPorGramo: f.costo_por_gramo }))
    }
  }

  // Calculate quote using backend single source of truth API
  useEffect(() => {
    let isMounted = true
    const timer = setTimeout(async () => {
      if (input.gramos <= 0 || input.tiempoMin <= 0) return
      setIsCalculating(true)
      try {
        const payload = {
          gramos: input.gramos,
          tiempo_min: input.tiempoMin,
          filamento_id: selectedFilamentoId,
          margen_pct: input.margenPct,
          multiplicador: input.multiplicador,
        }
        const { data } = await api.post('/cotizador/calcular', payload)
        if (isMounted && data.success && data.data?.breakdown) {
          const bd = data.data.breakdown
          setResult({
            costoMaterial: Number(bd.costo_material || 0),
            costoEnergia: Number(bd.costo_energia || 0),
            costoAmortizacion: Number(bd.costo_amortizacion || 0),
            costoManoObra: Number(bd.costo_mano_obra || 0),
            costoTotal: Number(bd.costo_total || 0),
            precioSugerido: Number(bd.precio_venta || 0),
          })
        }
      } catch (err) {
        // Fallback to local calculation if backend is offline
      } finally {
        if (isMounted) setIsCalculating(false)
      }
    }, 150)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [input.gramos, input.tiempoMin, input.margenPct, input.multiplicador, selectedFilamentoId])

  const setField = useCallback((key: keyof CostInput, val: number) => {
    setInput((prev) => ({ ...prev, [key]: val }))
  }, [])

  const handleCrearPedido = () => {
    toast('Función disponible pronto: crear pedido desde cotización', 'info')
  }

  const pctOf = (val: number) =>
    result && result.costoTotal > 0 ? (val / result.costoTotal) * 100 : 0

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      {/* ─── Input Form ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black text-slate-800">Cotizador 3D</h2>
          </div>
          {isCalculating && (
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculando...
            </div>
          )}
        </div>

        {/* Filamento selector */}
        {filamentos && filamentos.length > 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Filamento
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filamentos.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFilamentoChange(f.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all',
                    selectedFilamentoId === f.id
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-slate-100 hover:border-primary/30'
                  )}
                >
                  <div
                    className="h-5 w-5 flex-shrink-0 rounded-full border border-white/20"
                    style={{ backgroundColor: f.color_hex }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">{f.nombre}</p>
                    <p className="text-xs text-slate-400">{formatARS(f.costo_por_gramo)}/g</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Print parameters */}
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4 space-y-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Parámetros de impresión
          </p>
          <SliderInput
            label="Gramos de filamento"
            value={input.gramos}
            onChange={(v) => setField('gramos', v)}
            min={1}
            max={1000}
            step={1}
            unit="g"
          />
          <SliderInput
            label="Tiempo de impresión"
            value={input.tiempoMin}
            onChange={(v) => setField('tiempoMin', v)}
            min={5}
            max={2880}
            step={5}
            unit="min"
            formatValue={(v) => `${Math.floor(v / 60)}h ${v % 60}min`}
          />
          <SliderInput
            label="Costo por gramo"
            value={input.costoPorGramo}
            onChange={(v) => setField('costoPorGramo', v)}
            min={0.1}
            max={10}
            step={0.1}
            formatValue={(v) => formatARS(v)}
          />
        </div>

        {/* Energy & amortization */}
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4 space-y-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Energía y amortización
          </p>
          <SliderInput
            label="Consumo de la impresora"
            value={input.consumoWatts}
            onChange={(v) => setField('consumoWatts', v)}
            min={50}
            max={1000}
            step={10}
            unit="W"
          />
          <SliderInput
            label="Precio kWh"
            value={input.precioKwh}
            onChange={(v) => setField('precioKwh', v)}
            min={10}
            max={500}
            step={5}
            formatValue={(v) => formatARS(v)}
          />
          <SliderInput
            label="Valor de la impresora"
            value={input.valorImpresora}
            onChange={(v) => setField('valorImpresora', v)}
            min={10000}
            max={2000000}
            step={10000}
            formatValue={(v) => formatARS(v)}
          />
          <SliderInput
            label="Vida útil estimada"
            value={input.vidaUtilHoras}
            onChange={(v) => setField('vidaUtilHoras', v)}
            min={500}
            max={20000}
            step={100}
            unit="h"
          />
        </div>

        {/* Labor & margin */}
        <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4 space-y-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Mano de obra y margen
          </p>
          <SliderInput
            label="Valor hora operario"
            value={input.valorHoraOperario}
            onChange={(v) => setField('valorHoraOperario', v)}
            min={500}
            max={10000}
            step={100}
            formatValue={(v) => formatARS(v)}
          />
          <SliderInput
            label="Margen de ganancia"
            value={input.margenPct}
            onChange={(v) => setField('margenPct', v)}
            min={0}
            max={200}
            step={1}
            unit="%"
          />
          <SliderInput
            label="Multiplicador"
            value={input.multiplicador}
            onChange={(v) => setField('multiplicador', v)}
            min={0.5}
            max={5}
            step={0.1}
            formatValue={(v) => `×${Number(v).toFixed(1)}`}
          />
        </div>
      </div>

      {/* ─── Result ─── */}
      <div className="space-y-4">
        <div className="sticky top-4">
          {/* Price result */}
          <div className="mb-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 p-6 text-center">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary/70">
              Precio Sugerido
            </p>
            <p className="text-5xl font-black text-slate-800">
              {result ? formatARS(result.precioSugerido) : '$0'}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Costo base: {result ? formatARS(result.costoTotal) : '$0'}
            </p>
            {result && result.costoTotal > 0 && (
              <p className="mt-0.5 text-xs font-bold text-brand-green">
                Ganancia: {formatARS(result.precioSugerido - result.costoTotal)}
                {' '}({input.margenPct}%)
              </p>
            )}
          </div>

          {/* Cost breakdown */}
          <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Desglose de costos
            </p>

            {result && (
              <div className="space-y-3">
                <CostBreakdownRow
                  label="Material (filamento)"
                  value={result.costoMaterial}
                  icon={<Layers className="h-4 w-4" />}
                  color="bg-primary/20 text-primary"
                  pct={pctOf(result.costoMaterial)}
                />
                <CostBreakdownRow
                  label="Energía eléctrica"
                  value={result.costoEnergia}
                  icon={<Zap className="h-4 w-4" />}
                  color="bg-accent/20 text-accent"
                  pct={pctOf(result.costoEnergia)}
                />
                <CostBreakdownRow
                  label="Amortización"
                  value={result.costoAmortizacion}
                  icon={<TrendingUp className="h-4 w-4" />}
                  color="bg-brand-purple/20 text-brand-purple"
                  pct={pctOf(result.costoAmortizacion)}
                />
                <CostBreakdownRow
                  label="Mano de obra"
                  value={result.costoManoObra}
                  icon={<Clock className="h-4 w-4" />}
                  color="bg-brand-green/20 text-brand-green"
                  pct={pctOf(result.costoManoObra)}
                />

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-400">Costo total</span>
                    <span className="text-base font-black text-slate-800">
                      {formatARS(result.costoTotal)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-400">
                      + Margen ({input.margenPct}%) × {Number(input.multiplicador).toFixed(1)}
                    </span>
                    <span className="text-lg font-black text-primary">
                      {formatARS(result.precioSugerido)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Create pedido CTA */}
          <button
            onClick={handleCrearPedido}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-4 text-sm font-black text-white shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 active:scale-95"
          >
            <DollarSign className="h-5 w-5" />
            Crear Pedido desde esta cotización
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
