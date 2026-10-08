import { useState } from 'react'
import { Package, Layers, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardAlertasResult } from '@/types'

interface Props {
  alertas: DashboardAlertasResult
}

export function StockPanel({ alertas }: Props) {
  const filamentosBajos = alertas?.filamentos_bajos || []
  const insumosBajos = alertas?.insumos_bajos || []
  const productosBajos = alertas?.productos_bajos || []

  // Seleccionar automáticamente la pestaña con alertas
  const defaultTab = productosBajos.length > 0 
    ? 'productos' 
    : filamentosBajos.length > 0 
      ? 'filamentos' 
      : 'insumos'

  const [activeTab, setActiveTab] = useState<'productos' | 'filamentos' | 'insumos'>(defaultTab)

  const totalAlertas = productosBajos.length + filamentosBajos.length + insumosBajos.length

  return (
    <div className="flex flex-col rounded-2xl bg-white card-shadow overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Alertas de Stock</h3>
            <p className="text-[11px] text-slate-400 font-medium">Materiales y artículos bajo nivel mínimo</p>
          </div>
        </div>
        <span className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-bold",
          totalAlertas > 0 ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
        )}>
          {totalAlertas} {totalAlertas === 1 ? 'alerta' : 'alertas'}
        </span>
      </div>

      {/* Segmented Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('productos')}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-xs font-bold transition-all",
            activeTab === 'productos' 
              ? "bg-white text-slate-800 shadow-xs" 
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
          )}
        >
          <AlertCircle className="h-3.5 w-3.5 text-secondary" />
          <span>Productos</span>
          <span className={cn(
            "rounded-full px-1.5 py-0.2 text-[10px]",
            productosBajos.length > 0 ? "bg-secondary/15 text-secondary" : "bg-slate-200/60 text-slate-500"
          )}>
            {productosBajos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('filamentos')}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-xs font-bold transition-all",
            activeTab === 'filamentos' 
              ? "bg-white text-slate-800 shadow-xs" 
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
          )}
        >
          <Layers className="h-3.5 w-3.5 text-red-500" />
          <span>Filamentos</span>
          <span className={cn(
            "rounded-full px-1.5 py-0.2 text-[10px]",
            filamentosBajos.length > 0 ? "bg-red-100 text-red-600" : "bg-slate-200/60 text-slate-500"
          )}>
            {filamentosBajos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('insumos')}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-xs font-bold transition-all",
            activeTab === 'insumos' 
              ? "bg-white text-slate-800 shadow-xs" 
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
          )}
        >
          <Package className="h-3.5 w-3.5 text-accent" />
          <span>Insumos</span>
          <span className={cn(
            "rounded-full px-1.5 py-0.2 text-[10px]",
            insumosBajos.length > 0 ? "bg-accent/15 text-accent" : "bg-slate-200/60 text-slate-500"
          )}>
            {insumosBajos.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-3 overflow-y-auto max-h-[300px] space-y-1.5">
        {activeTab === 'productos' && (
          productosBajos.length > 0 ? (
            productosBajos.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl p-2.5 bg-slate-50 hover:bg-slate-100/70 transition-colors border border-slate-100">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-slate-800 truncate" title={p.nombre}>{p.nombre}</p>
                  <p className="text-[10px] font-medium text-slate-400">SKU: {p.sku || '-'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block text-xs font-black text-red-600 bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                    {p.stock_actual}
                  </span>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Mín: {p.stock_minimo}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
              <p className="text-xs font-bold text-slate-700">Stock de productos en orden</p>
              <p className="text-[11px] text-slate-400">Todos los productos superan el stock mínimo</p>
            </div>
          )
        )}

        {activeTab === 'filamentos' && (
          filamentosBajos.length > 0 ? (
            filamentosBajos.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl p-2.5 bg-slate-50 hover:bg-slate-100/70 transition-colors border border-slate-100">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-slate-800 truncate">{f.nombre} ({f.color})</p>
                  <p className="text-[10px] font-medium text-slate-400">{f.marca}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block text-xs font-black text-red-600 bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                    {f.peso_restante_g}g
                  </span>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Mín: {f.stock_minimo_g}g</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
              <p className="text-xs font-bold text-slate-700">Stock de filamentos en orden</p>
              <p className="text-[11px] text-slate-400">No hay bobinas bajo el nivel crítico</p>
            </div>
          )
        )}

        {activeTab === 'insumos' && (
          insumosBajos.length > 0 ? (
            insumosBajos.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl p-2.5 bg-slate-50 hover:bg-slate-100/70 transition-colors border border-slate-100">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-slate-800 truncate">{i.nombre}</p>
                  <p className="text-[10px] font-medium text-slate-400">SKU: {i.sku || '-'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block text-xs font-black text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
                    {i.stock_actual}
                  </span>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">Mín: {i.stock_minimo}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
              <p className="text-xs font-bold text-slate-700">Stock de insumos en orden</p>
              <p className="text-[11px] text-slate-400">Todos los insumos tienen stock disponible</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
