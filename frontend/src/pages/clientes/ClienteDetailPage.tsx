import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCliente, useUpdateCliente } from '@/hooks/useClientes'
import { usePedidos } from '@/hooks/usePedidos'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate, cn } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { ChevronLeft, Phone, Mail, MapPin, Edit3, ShoppingBag, Calendar } from 'lucide-react'
import type { PedidoEstado } from '@/types'
import { ClienteFormModal } from '@/components/clientes/ClienteFormModal'

const estadoColors: Record<PedidoEstado, string> = {
  presupuesto: 'bg-accent/20 text-accent',
  aprobado: 'bg-brand-green/20 text-brand-green',
  en_produccion: 'bg-brand-purple/20 text-brand-purple',
  terminado: 'bg-secondary/20 text-secondary',
  entregado: 'bg-primary/20 text-primary',
  cobrado: 'bg-green-500/20 text-green-400',
  anulado: 'bg-red-500/20 text-red-400',
}

const estadoLabels: Record<PedidoEstado, string> = {
  presupuesto: 'Presupuesto',
  aprobado: 'Aprobado',
  en_produccion: 'Producción',
  terminado: 'Terminado',
  entregado: 'Entregado',
  cobrado: 'Cobrado',
  anulado: 'Anulado',
}

export default function ClienteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showEditModal, setShowEditModal] = useState(false)
  const { data: cliente, isLoading } = useCliente(id)
  const { data: pedidosData } = usePedidos({ per_page: 10 })

  // Filter pedidos for this client (API should handle this, but we filter locally for now)
  const pedidosCliente = pedidosData?.data.filter(
    (p) => p.cliente_id === Number(id)
  ) ?? []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-white card-shadow" />
        <div className="h-32 animate-pulse rounded-2xl bg-white card-shadow" />
        <div className="h-24 animate-pulse rounded-2xl bg-white card-shadow" />
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-slate-500">Cliente no encontrado</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-secondary">Volver</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white card-shadow text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 text-xl font-black text-secondary">
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">{cliente.nombre}</h2>
            <p className="text-xs text-slate-400">
              Cliente desde {formatDate(cliente.created_at)}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white card-shadow text-slate-500 hover:text-secondary transition-colors"
          title="Editar Cliente"
        >
          <Edit3 className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-4 text-center">
          <p className="text-xs text-slate-500">Total Compras</p>
          <p className="text-xl font-black text-brand-green">
            {formatARS(cliente.total_compras ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-center">
          <p className="text-xs text-slate-500">Pedidos</p>
          <p className="text-xl font-black text-secondary">{cliente.cantidad_pedidos ?? 0}</p>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Información de contacto
        </h3>
        {cliente.email && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-800">{cliente.email}</span>
          </div>
        )}
        {cliente.telefono && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-800">{cliente.telefono}</span>
          </div>
        )}
        {cliente.direccion && (
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-800">{cliente.direccion}</span>
          </div>
        )}
        {!cliente.email && !cliente.telefono && !cliente.direccion && (
          <p className="text-sm text-slate-400">Sin información de contacto</p>
        )}
        {(cliente.descuento_pct ?? 0) > 0 && (
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-4 w-4 text-brand-green" />
            <span className="text-sm font-bold text-brand-green">
              Descuento automático del {cliente.descuento_pct}%
            </span>
          </div>
        )}
        {cliente.notas && (
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Notas</p>
            <p className="text-sm text-slate-800">{cliente.notas}</p>
          </div>
        )}
      </div>

      {/* Recent pedidos */}
      <div className="rounded-2xl border border-slate-100 bg-white card-shadow p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Pedidos recientes
        </h3>
        {pedidosCliente.length > 0 ? (
          <div className="space-y-2">
            {pedidosCliente.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/pedidos/${p.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-4 w-4 text-slate-400" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-500">{p.numero_pedido}</p>
                    <p className="text-sm font-bold text-slate-800">{formatARS(p.total)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', estadoColors[p.estado])}>
                    {estadoLabels[p.estado]}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(p.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400 py-4">Sin pedidos registrados</p>
        )}
      </div>

      {showEditModal && (
        <ClienteFormModal
          initialData={cliente}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}
