import { useState } from 'react'
import { usePedidos, usePedidoItems } from '@/hooks/usePedidos'
import { useClientes } from '@/hooks/useClientes'
import { useFilterStore } from '@/store/filterStore'
import { cn } from '@/lib/utils'
import { Search, Plus, Package, Layers, Printer, Users } from 'lucide-react'
import type { PedidoEstado } from '@/types'
import { ProductoTableView } from '@/components/ventas/ProductoTableView'
import { PedidoCard } from '@/components/ventas/PedidoCard'
import { MultiSelectFilter } from '@/components/ui/MultiSelectFilter'

const ESTADOS: { value: PedidoEstado; label: string; color: string }[] = [
  { value: 'presupuesto', label: 'Presupuesto', color: 'bg-accent/20 text-accent' },
  { value: 'aprobado', label: 'Pedido', color: 'bg-brand-green/20 text-brand-green' },
  { value: 'en_produccion', label: 'En proceso', color: 'bg-brand-purple/20 text-brand-purple' },
  { value: 'terminado', label: 'Terminado', color: 'bg-secondary/20 text-secondary' },
  { value: 'entregado', label: 'Entregado', color: 'bg-primary/20 text-primary' },
  { value: 'cobrado', label: 'Cobrado', color: 'bg-green-500/20 text-green-400' },
  { value: 'anulado', label: 'Anulado', color: 'bg-red-500/20 text-red-400' },
]

export default function VentasPage() {
  const [vista, setVista] = useState<'producto' | 'pedido'>('producto')
  const [search, setSearch] = useState('')

  const { ventasEstados, ventasClientes, setVentasEstados, setVentasClientes } = useFilterStore()
  const { data: clientesData } = useClientes()

  const pedidosQuery = usePedidos({
    estados: ventasEstados,
    cliente_ids: ventasClientes,
    search: search || undefined,
  })

  const itemsQuery = usePedidoItems({
    estados: ventasEstados,
    cliente_ids: ventasClientes,
    search: search || undefined,
  })

  const isLoading = vista === 'pedido' ? pedidosQuery.isLoading : itemsQuery.isLoading

  return (
    <div className="relative space-y-4 pb-4">
      <div className="flex flex-col sm:flex-row gap-4 print-hidden justify-between items-start sm:items-center">
        {/* View Toggle */}
        <div className="flex gap-2 rounded-xl bg-white card-shadow p-1 w-full sm:w-64">
          <button
            onClick={() => setVista('producto')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-all',
              vista === 'producto' ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            )}
          >
            <Layers className="h-4 w-4" />
            Por Producto
          </button>
          <button
            onClick={() => setVista('pedido')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-all',
              vista === 'pedido' ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            )}
          >
            <Package className="h-4 w-4" />
            Por Pedido
          </button>
        </div>

        {/* Print Button */}
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 rounded-xl bg-white card-shadow px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:text-primary w-full sm:w-auto"
        >
          <Printer className="h-4 w-4" />
          Imprimir Listado
        </button>
      </div>

      {/* Search */}
      <div className="relative print-hidden">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder={vista === 'producto' ? "Buscar por producto, cliente o pedido..." : "Buscar por cliente o número..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-100 bg-white card-shadow py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-gray-500 outline-none transition-colors focus:border-primary"
        />
      </div>

      {/* Filtros Multi-Selección */}
      <div className="flex flex-wrap gap-3 pb-1 print-hidden items-center relative z-10">
        <MultiSelectFilter
          label="Estado"
          options={ESTADOS}
          selectedValues={ventasEstados}
          onChange={(vals) => setVentasEstados(vals as PedidoEstado[])}
        />

        <MultiSelectFilter
          label="Cliente"
          icon={<Users className="h-3.5 w-3.5" />}
          options={clientesData?.data.map(c => ({ label: c.nombre, value: c.id })) || []}
          selectedValues={ventasClientes}
          onChange={(vals) => setVentasClientes(vals as number[])}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white card-shadow" />
          ))}
        </div>
      ) : vista === 'producto' ? (
        itemsQuery.data?.data && itemsQuery.data.data.length > 0 ? (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <ProductoTableView items={itemsQuery.data.data} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="mb-3 h-12 w-12 text-gray-600" />
            <p className="text-base font-bold text-slate-500">Sin artículos</p>
            <p className="text-sm text-gray-600">No hay productos en este estado</p>
          </div>
        )
      ) : (
        pedidosQuery.data?.data && pedidosQuery.data.data.length > 0 ? (
          <div className="space-y-3">
            {pedidosQuery.data.data.map((pedido) => (
              <PedidoCard key={pedido.id} pedido={pedido} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="mb-3 h-12 w-12 text-gray-600" />
            <p className="text-base font-bold text-slate-500">Sin pedidos</p>
            <p className="text-sm text-gray-600">No hay pedidos en este estado</p>
          </div>
        )
      )}
    </div>
  )
}
