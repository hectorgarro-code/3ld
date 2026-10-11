import type { Cliente } from '@/types/clientes'
import type { Producto, ProductoPrecioCantidad } from '@/types/productos'

/**
 * Obtiene el precio por cantidad correspondiente según los tramos configurados.
 * Si iguala o supera la cantidad definida, aplica el precio de ese escalón.
 * Si califica para más de un escalón, aplica el de mayor cantidad alcanzada.
 */
export function obtenerPrecioPorCantidad(
  preciosCantidad?: ProductoPrecioCantidad[] | string | null,
  cantidad = 1
): number | null {
  if (!preciosCantidad) return null
  let escalas: ProductoPrecioCantidad[] = []
  try {
    escalas = typeof preciosCantidad === 'string'
      ? JSON.parse(preciosCantidad)
      : preciosCantidad
  } catch {
    return null
  }

  if (!Array.isArray(escalas) || escalas.length === 0) return null

  // Filtrar escalas válidas cuya cantidad mínima sea alcanzada (cantidad >= e.cantidad)
  const escalasAlcanzadas = escalas
    .filter((e) => Number(e.cantidad) > 0 && Number(e.precio) >= 0 && Number(cantidad) >= Number(e.cantidad))
    .sort((a, b) => Number(b.cantidad) - Number(a.cantidad)) // De mayor a menor cantidad requerida

  if (escalasAlcanzadas.length > 0) {
    return Number(escalasAlcanzadas[0].precio)
  }

  return null
}

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
    precios_cantidad?: ProductoPrecioCantidad[] | any
  }
  cliente?: Partial<Cliente> | null
  cantidad?: number
  precioBaseInicial?: number
  todasLasPiezasSeleccionadas?: boolean
}

/**
 * Calcula el precio unitario efectivo de un producto para un cliente y cantidad determinada:
 * 1. Precio Especial asignado al cliente para ese producto específico
 * 2. Precio por volumen/escala de cantidad si aplica (cantidad >= escalón)
 * 3. Si el cliente es 'mayorista': usa precio_mayorista explícito o -20% por defecto (aplica el menor si hay escala)
 * 4. Aplica descuento porcentual adicional del cliente si lo tiene configurado
 */
export function calcularPrecioProductoCliente({
  producto,
  cliente,
  cantidad = 1,
  precioBaseInicial,
  todasLasPiezasSeleccionadas = true,
}: CalcularPrecioOptions): number {
  let precio = precioBaseInicial !== undefined 
    ? Number(precioBaseInicial) || 0 
    : Number(producto.precio_venta) || 0

  // 1. Escala por cantidad (si todas las piezas están seleccionadas o no tiene piezas)
  const precioPorEscala = todasLasPiezasSeleccionadas
    ? obtenerPrecioPorCantidad(producto.precios_cantidad, cantidad)
    : null

  if (precioPorEscala !== null) {
    precio = precioPorEscala
  }

  if (!cliente) {
    return Math.max(0, Math.round(precio * 100) / 100)
  }

  // 2. Prioridad: Precios especiales individuales cliente-producto
  const specialPrice = cliente.precios_especiales?.find(
    (pe: any) => Number(pe.producto_id) === Number(producto.id)
  )
  if (specialPrice && Number(specialPrice.precio_especial) > 0) {
    precio = Number(specialPrice.precio_especial)
  } else if (cliente.tipo_cliente === 'mayorista') {
    // 3. Cliente Mayorista: toma el mejor precio entre escala por cantidad y tarifa mayorista
    const tieneMayoristaExplicito = 
      producto.precio_mayorista != null && Number(producto.precio_mayorista) > 0

    let precioMayorista = 0
    if (todasLasPiezasSeleccionadas && tieneMayoristaExplicito) {
      precioMayorista = Number(producto.precio_mayorista)
    } else {
      const baseReferencia = precioBaseInicial !== undefined ? Number(precioBaseInicial) : Number(producto.precio_venta)
      precioMayorista = calcularPrecioMayoristaDefault(baseReferencia)
    }

    if (precioPorEscala !== null) {
      precio = Math.min(precioPorEscala, precioMayorista)
    } else {
      precio = precioMayorista
    }
  }

  // 4. Descuento porcentual acumulable del cliente (si está definido)
  const descuentoPct = Number(cliente.descuento_porcentaje) || 0
  if (descuentoPct > 0) {
    precio = precio * (1 - descuentoPct / 100)
  }

  return Math.max(0, Math.round(precio * 100) / 100)
}
