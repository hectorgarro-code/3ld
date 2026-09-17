import { Package, Layers, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardAlertasResult } from '@/types'

interface Props {
  alertas: DashboardAlertasResult
}

export function StockPanel({ alertas }: Props) {
  const hayFilamentos = alertas.filamentos_bajos.length > 0
  const hayInsumos = alertas.insumos_bajos.length > 0
  const hayProductos = alertas.productos_bajos.length > 0

  if (!hayFilamentos && !hayInsumos && !hayProductos) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-white card-shadow py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 mb-3">
          <span className="text-2xl">✅</span>
        </div>
        <p className="text-sm font-bold text-slate-800">Stock Saludable</p>
        <p className="text-xs font-medium text-slate-400">No hay faltantes registrados</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {/* Filamentos */}
      <div className="flex flex-col rounded-2xl bg-white card-shadow overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
          <Layers className="h-5 w-5 text-red-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Filamentos Críticos</h3>
          <span className="ml-auto rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-500">
            {alertas.filamentos_bajos.length}
          </span>
        </div>
        <div className="flex-1 p-2 space-y-1 bg-slate-50/30">
          {alertas.filamentos_bajos.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-800">{f.nombre} ({f.color})</p>
                <p className="text-[10px] font-medium text-slate-500">{f.marca}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-red-500">{f.peso_restante_g}g</p>
                <p className="text-[10px] font-medium text-slate-400">Mín: {f.stock_minimo_g}g</p>
              </div>
            </div>
          ))}
          {!hayFilamentos && (
            <p className="text-center text-xs text-slate-400 py-4">Todo en orden</p>
          )}
        </div>
      </div>

      {/* Insumos */}
      <div className="flex flex-col rounded-2xl bg-white card-shadow overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
          <Package className="h-5 w-5 text-accent" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Insumos a Reponer</h3>
          <span className="ml-auto rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
            {alertas.insumos_bajos.length}
          </span>
        </div>
        <div className="flex-1 p-2 space-y-1 bg-slate-50/30">
          {alertas.insumos_bajos.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-800">{i.nombre}</p>
                <p className="text-[10px] font-medium text-slate-500">SKU: {i.sku || '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-accent">{i.stock_actual}</p>
                <p className="text-[10px] font-medium text-slate-400">Mín: {i.stock_minimo}</p>
              </div>
            </div>
          ))}
          {!hayInsumos && (
            <p className="text-center text-xs text-slate-400 py-4">Todo en orden</p>
          )}
        </div>
      </div>

      {/* Productos */}
      <div className="flex flex-col rounded-2xl bg-white card-shadow overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
          <AlertCircle className="h-5 w-5 text-secondary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Productos Faltantes</h3>
          <span className="ml-auto rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-bold text-secondary">
            {alertas.productos_bajos.length}
          </span>
        </div>
        <div className="flex-1 p-2 space-y-1 bg-slate-50/30">
          {alertas.productos_bajos.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-800">{p.nombre}</p>
                <p className="text-[10px] font-medium text-slate-500">SKU: {p.sku || '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-secondary">{p.stock_actual}</p>
                <p className="text-[10px] font-medium text-slate-400">Mín: {p.stock_minimo}</p>
              </div>
            </div>
          ))}
          {!hayProductos && (
            <p className="text-center text-xs text-slate-400 py-4">Todo en orden</p>
          )}
        </div>
      </div>
    </div>
  )
}
