import { useState } from 'react'
import { useCompras } from '@/hooks/useCompras'
import { Plus, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatARS } from '@/lib/cost-calculator'

export default function ComprasPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useCompras()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800">Historial de Compras</h2>
        <button onClick={() => navigate('/compras/nueva')} className="flex gap-2 items-center bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus className="w-4 h-4" /> Registrar Compra
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data.map(c => (
          <div key={c.id} className="bg-white card-shadow border border-slate-100 p-4 rounded-2xl relative">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-500">{new Date(c.fecha).toLocaleDateString()}</span>
              </div>
              <span className="text-xs bg-brand-green/20 text-brand-green px-2 py-1 rounded-md font-bold uppercase">{c.estado}</span>
            </div>
            
            <p className="text-lg font-black text-slate-800">{c.proveedor_nombre}</p>
            {c.numero_comprobante && <p className="text-xs text-slate-400 mb-2">Comprobante: {c.numero_comprobante}</p>}
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500">Total:</span>
              <span className="text-lg font-black text-primary">{formatARS(c.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
