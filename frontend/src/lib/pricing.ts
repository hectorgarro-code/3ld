import type { Cliente } from '@/types/clientes'
import type { Producto } from '@/types/productos'

/**
 * Calcula el precio mayorista por defecto (20% de descuento sobre el precio de lista/venta)
 */
export function calcularPrecioMayoristaDefault(precioVenta: number): number {
  const precio = Number(precioVenta) || 0
  return Math.round(precio * 0.8 * 100) / 100
}

/**
 * Determina si un cliente tiene categoría comercial mayorista
 */
export function esClienteMayorista(cliente?: Partial<Cliente> | null): boolean {
  if (!cliente) return false
  return cliente.tipo_cliente === 'mayorista'
}

export interface CalcularPrecioOptions {
  producto: Pick<Producto, 'id' | 'precio_venta'> & {
    precio_mayorista?: number | null
    piezas?: any
  }
  cliente?: Partial<Cliente> | null
  precioBaseInicial?: number
  todasLasPiezasSeleccionadas?: boolean
}

/**
 * Calcula el precio unitario efectivo de un producto para un cliente determinado,
 * respetando la jerarquía de precios de 3LD:
 * 1. Precio Especial asignado al cliente para ese producto específico
 * 2. Si el cliente es 'mayorista':
 *    - Usa precio_mayorista explícito si está definido y > 0 (si se seleccionó el set completo)
 *    - Si no está definido (o es 0), aplica el 20% de descuento por defecto sobre el precio base
 * 3. Aplica descuento porcentual adicional del cliente si lo tiene configurado
 */
export function calcularPrecioProductoCliente({
  producto,
  cliente,
  precioBaseInicial,
  todasLasPiezasSeleccionadas = true,
}: CalcularPrecioOptions): number {
  let precio = precioBaseInicial !== undefined 
    ? Number(precioBaseInicial) || 0 
    : Number(producto.precio_venta) || 0

  if (!cliente) {
    return Math.max(0, Math.round(precio * 100) / 100)
  }

  // 1. Prioridad: Precios especiales individuales cliente-producto
  const specialPrice = cliente.precios_especiales?.find(
    (pe: any) => Number(pe.producto_id) === Number(producto.id)
  )
  if (specialPrice && Number(specialPrice.precio_especial) > 0) {
    precio = Number(specialPrice.precio_especial)
  } else if (cliente.tipo_cliente === 'mayorista') {
    // 2. Cliente Mayorista
    const tieneMayoristaExplicito = 
      producto.precio_mayorista != null && Number(producto.precio_mayorista) > 0

    if (todasLasPiezasSeleccionadas && tieneMayoristaExplicito) {
      precio = Number(producto.precio_mayorista)
    } else {
      // Regla de Negocio: Fallback del 20% automático para mayoristas
      precio = calcularPrecioMayoristaDefault(precio)
    }
  }

  // 3. Descuento porcentual acumulable del cliente (si está definido)
  const descuentoPct = Number(cliente.descuento_porcentaje) || 0
  if (descuentoPct > 0) {
    precio = precio * (1 - descuentoPct / 100)
  }

  return Math.max(0, Math.round(precio * 100) / 100)
}
