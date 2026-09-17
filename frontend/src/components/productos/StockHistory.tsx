import { useMovimientosStock } from '@/hooks/useProductos'
import type { MovimientoStock } from '@/types/productos'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface StockHistoryProps {
  productoId: number
}

const TIPO_MOVIMIENTO_LABELS: Record<MovimientoStock['tipo_movimiento'], string> = {
  ajuste_manual: 'Ajuste Manual',
  venta: 'Venta',
  compra: 'Compra',
  produccion: 'Producción',
  devolucion: 'Devolución',
  anulacion_venta: 'Anulación de Venta',
}

const TIPO_MOVIMIENTO_COLORS: Record<MovimientoStock['tipo_movimiento'], string> = {
  ajuste_manual: 'bg-yellow-100 text-yellow-800',
  venta: 'bg-red-100 text-red-800',
  compra: 'bg-green-100 text-green-800',
  produccion: 'bg-blue-100 text-blue-800',
  devolucion: 'bg-purple-100 text-purple-800',
  anulacion_venta: 'bg-orange-100 text-orange-800',
}

export function StockHistory({ productoId }: StockHistoryProps) {
  const { data: movimientos = [], isLoading, isError } = useMovimientosStock(productoId)

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md">
        Error al cargar el historial de movimientos.
      </div>
    )
  }

  if (movimientos.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No hay movimientos de stock registrados para este producto.
      </div>
    )
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
              Fecha
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Tipo
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Cantidad
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Notas
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {movimientos.map((movimiento) => (
            <tr key={movimiento.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                {format(new Date(movimiento.created_at), "d 'de' MMM, yyyy HH:mm", { locale: es })}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                    TIPO_MOVIMIENTO_COLORS[movimiento.tipo_movimiento]
                  }`}
                >
                  {TIPO_MOVIMIENTO_LABELS[movimiento.tipo_movimiento]}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium">
                <span className={movimiento.cantidad > 0 ? 'text-green-600' : 'text-red-600'}>
                  {movimiento.cantidad > 0 ? '+' : ''}{movimiento.cantidad}
                </span>
              </td>
              <td className="px-3 py-4 text-sm text-gray-500">
                {movimiento.notas || '-'}
                {movimiento.referencia_id && (
                  <span className="text-xs text-gray-400 ml-2">
                    (Ref: #{movimiento.referencia_id})
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
