import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Calendar, DollarSign, Loader2 } from 'lucide-react'
import { useProveedor, useProveedorArticulos } from '@/hooks/useProveedores'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate } from '@/lib/utils'

export default function ProveedorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const proveedorId = Number(id)

  const { data: proveedor, isLoading: loadingProv } = useProveedor(proveedorId)
  const { data: articulos, isLoading: loadingArts } = useProveedorArticulos(proveedorId)

  if (loadingProv || loadingArts) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!proveedor) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <p className="text-xl font-bold text-slate-500">Proveedor no encontrado</p>
        <button
          onClick={() => navigate('/proveedores')}
          className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50/80"
        >
          Volver a Proveedores
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/proveedores')}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white card-shadow text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800">{proveedor.nombre}</h1>
          <p className="text-sm text-slate-500">
            {proveedor.contacto && `${proveedor.contacto} • `}
            {proveedor.email || 'Sin email'}
          </p>
        </div>
      </div>

      {/* Artículos Comprados */}
      <div className="rounded-2xl border border-slate-100 bg-white card-shadow overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/30 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            Historial de Artículos Comprados
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Artículos adquiridos de este proveedor a lo largo del tiempo.
          </p>
        </div>

        <div className="p-6">
          {articulos && articulos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {articulos.map((art) => (
                <div 
                  key={art.producto_id}
                  className="flex flex-col rounded-2xl border border-slate-100 bg-white card-shadow/50 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="mb-3">
                    <h3 className="font-bold text-slate-800">{art.nombre}</h3>
                    <p className="text-xs text-slate-400">SKU: {art.sku || '-'}</p>
                  </div>
                  
                  <div className="mt-auto space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="h-4 w-4" /> Última compra
                      </span>
                      <span className="font-medium text-slate-800">{formatDate(art.ultima_fecha_compra)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <DollarSign className="h-4 w-4" /> Último precio
                      </span>
                      <span className="font-black text-primary">{formatARS(Number(art.ultimo_precio))}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Package className="h-4 w-4" /> Total comprado
                      </span>
                      <span className="font-black text-slate-800">{Number(art.total_comprado)} uds.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Package className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-lg font-medium">No hay compras registradas</p>
              <p className="text-sm">Aún no has comprado ningún artículo a este proveedor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
