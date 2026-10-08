import { useState, useEffect } from 'react'
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
  { value: 'presupuesto', label: 'Presupuesto', color: 'bg-slate-100 text-slate-700 border border-slate-200' },
  { value: 'aprobado', label: 'Pedido', color: 'bg-sky-100 text-sky-800 border border-sky-200' },
  { value: 'en_produccion', label: 'En proceso', color: 'bg-amber-100 text-amber-800 border border-amber-200' },
  { value: 'terminado', label: 'Terminado', color: 'bg-teal-100 text-teal-800 border border-teal-200' },
  { value: 'entregado', label: 'Entregado', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
  { value: 'cobrado', label: 'Cobrado', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  { value: 'anulado', label: 'Anulado', color: 'bg-rose-100 text-rose-800 border border-rose-200' },
]

export default function VentasPage() {
  const [vista, setVista] = useState<'producto' | 'pedido'>('producto')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { ventasEstados, ventasClientes, setVentasEstados, setVentasClientes } = useFilterStore()
  const { data: clientesData } = useClientes()

  const pedidosQuery = usePedidos({
    estados: ventasEstados,
    cliente_ids: ventasClientes,
    search: debouncedSearch || undefined,
    enabled: vista === 'pedido',
  })

  const itemsQuery = usePedidoItems({
    estados: ventasEstados,
    cliente_ids: ventasClientes,
    search: debouncedSearch || undefined,
    enabled: vista === 'producto',
  })

  const isLoading = vista === 'pedido' ? pedidosQuery.isLoading : itemsQuery.isLoading

  return (
    <div className="relative space-y-4 pb-4 print:space-y-2 print:pb-0 print:w-full">
      {/* Estilos específicos de impresión en A4 Horizontal */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden, header, nav, aside, footer {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          .card-shadow {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Encabezado visible únicamente al imprimir con detalle de filtros */}
      <div className="hidden print:flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-2 text-slate-900">
        <div>
          <h1 className="text-lg font-black uppercase tracking-wide">3LD · Listado de Ventas / Pedidos</h1>
          <p className="text-[11px] text-slate-600 font-medium">
            Vista: {vista === 'producto' ? 'Por Producto' : 'Por Pedido'}
            {ventasEstados.length > 0 && ` | Estados: ${ventasEstados.map(e => ESTADOS.find(x => x.value === e)?.label).filter(Boolean).join(', ')}`}
            {ventasClientes.length > 0 && ` | Clientes: ${ventasClientes.map(cid => clientesData?.data.find(c => c.id === cid)?.nombre).filter(Boolean).join(', ')}`}
            {search && ` | Búsqueda: "${search}"`}
          </p>
        </div>
        <div className="text-right text-[10px] text-slate-500 font-mono">
          <p>Fecha: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
          <p>Total ítems: {vista === 'producto' ? (itemsQuery.data?.data?.length || 0) : (pedidosQuery.data?.data?.length || 0)}</p>
        </div>
      </div>

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
