import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientes, useCreateCliente } from '@/hooks/useClientes'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/store/toastStore'
import { formatARS } from '@/lib/cost-calculator'
import { formatDate } from '@/lib/utils'
import { Search, Plus, Users, Phone } from 'lucide-react'
import type { Cliente } from '@/types'
import { ClienteFormModal } from '@/components/clientes/ClienteFormModal'
function ClienteCard({ cliente }: { cliente: Cliente }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/clientes/${cliente.id}`)}
      className="w-full rounded-2xl border border-slate-100 bg-white card-shadow p-4 text-left transition-all hover:border-secondary/40 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 text-sm font-black text-secondary">
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-black text-slate-800">{cliente.nombre}</p>
            {cliente.telefono && (
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Phone className="h-3 w-3" /> {cliente.telefono}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          {cliente.total_compras != null && (
            <p className="text-sm font-black text-brand-green">{formatARS(cliente.total_compras)}</p>
          )}
          {cliente.cantidad_pedidos != null && (
            <p className="text-xs text-slate-400">{cliente.cantidad_pedidos} pedidos</p>
          )}
        </div>
      </div>
      {cliente.ultimo_pedido && (
        <p className="mt-2 text-xs text-slate-400">
          Último pedido: {formatDate(cliente.ultimo_pedido)}
        </p>
      )}
    </button>
  )
}

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const { data, isLoading } = useClientes({ search: search || undefined })

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-white card-shadow py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-gray-500 outline-none focus:border-secondary"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-secondary-dark shadow-lg"
        >
          <Plus className="h-5 w-5 text-slate-800" />
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white card-shadow" />
          ))}
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="space-y-3">
          {data.data.map((c) => (
            <ClienteCard key={c.id} cliente={c} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <Users className="mb-3 h-16 w-16 text-gray-700" />
          <p className="text-base font-bold text-slate-500">Sin clientes</p>
          <p className="text-sm text-gray-600">
            {search ? 'No se encontraron resultados' : 'Agregá tu primer cliente'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-secondary/20 px-4 py-2 text-sm font-bold text-secondary"
          >
            <Plus className="h-4 w-4" /> Crear cliente
          </button>
        </div>
      )}

      {showModal && <ClienteFormModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
