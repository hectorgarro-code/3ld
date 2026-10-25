import { obtenerPrecioPorCantidad } from './pricing'

export const LOCAL_FREE_SHIPPING_THRESHOLD = 30000

type Tier = { cantidad: number; precio: number }
export type ShippingCartLine = {
  id: string | number; color: string; qty: number; price: number; basePrice?: number
  selectedPieceIds?: string[]; precios_cantidad?: Tier[]
}
export type ShippingSelection = Omit<ShippingCartLine, 'color' | 'qty'>
const cents = (value: number) => Math.round((Number(value) || 0) * 100)
const variant = (ids?: string[]) => JSON.stringify([...(ids || [])].sort())

/** Proyecta la misma combinación de variante y escalas que aplica el carrito. */
export function projectFreeShipping(cart: ShippingCartLine[], selection: ShippingSelection, quantity: number, color: string) {
  const currentSubtotal = cart.reduce((sum, item) => sum + cents(item.price) * item.qty, 0)
  const existing = cart.find(item => item.id === selection.id && item.color === color && variant(item.selectedPieceIds) === variant(selection.selectedPieceIds))
  const otherSubtotal = currentSubtotal - (existing ? cents(existing.price) * existing.qty : 0)
  const existingQuantity = existing?.qty || 0
  const combinedQuantity = existingQuantity + quantity
  const basePrice = existing?.basePrice ?? existing?.price ?? selection.basePrice ?? selection.price
  const tiers = existing?.precios_cantidad || selection.precios_cantidad || []
  const priceAt = (qty: number) => cents(obtenerPrecioPorCantidad(tiers, qty) ?? basePrice)
  const projectedSubtotal = otherSubtotal + combinedQuantity * priceAt(combinedQuantity)
  const threshold = cents(LOCAL_FREE_SHIPPING_THRESHOLD)
  let targetQuantity: number | null = null
  let targetSubtotal = Infinity

  // Las escalas pueden bajar el subtotal al aumentar la cantidad: buscar por tramos,
  // sin suponer que el precio es constante ni que el total siempre crece.
  if (projectedSubtotal < threshold) {
    const starts = [...new Set([combinedQuantity, ...tiers.map(t => Number(t.cantidad)).filter(q => Number.isInteger(q) && q > combinedQuantity)])].sort((a, b) => a - b)
    for (let i = 0; i < starts.length; i++) {
      const start = starts[i], end = (starts[i + 1] ?? Infinity) - 1
      const unit = priceAt(start)
      if (unit <= 0) continue
      const candidate = Math.max(start, Math.ceil((threshold - otherSubtotal) / unit))
      if (Number.isSafeInteger(candidate) && candidate <= end && otherSubtotal + candidate * unit >= threshold) {
        const candidateSubtotal = otherSubtotal + candidate * unit
        // Si varias cantidades alcanzan la meta por el mismo importe, conviene
        // la que entrega más unidades (ej. 15 o 20 llaveros por $30.000).
        if (candidateSubtotal < targetSubtotal || (candidateSubtotal === targetSubtotal && candidate - existingQuantity > (targetQuantity || 0))) {
          targetQuantity = candidate - existingQuantity
          targetSubtotal = candidateSubtotal
        }
      }
    }
  }
  return { currentSubtotal: currentSubtotal / 100, projectedSubtotal: projectedSubtotal / 100, existingQuantity, combinedQuantity, unitPrice: priceAt(combinedQuantity) / 100, targetQuantity, targetSubtotal: targetQuantity === null ? null : targetSubtotal / 100 }
}
