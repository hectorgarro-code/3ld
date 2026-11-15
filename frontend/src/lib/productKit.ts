/** Only explicit complete kits qualify; selectable pieces are sold separately. */
export function getKitFigureCount(product: {
  title?: string; nombre?: string; description?: string; descripcion?: string;
  figuras_por_kit?: number | string | null;
  piezas?: unknown[]; selectedPieceIds?: string[];
}): number | null {
  if (product.piezas?.length || product.selectedPieceIds?.length) return null
  if (product.figuras_por_kit != null) {
    const count = Number(product.figuras_por_kit)
    return Number.isSafeInteger(count) && count > 0 && count <= 10000 ? count : null
  }
  const title = product.title || product.nombre || ''
  const description = product.description || product.descripcion || ''
  const match = /\bkit\s*[x×]\s*(\d+)\b/i.exec(title)
    || /^\s*kit\s*[x×]\s*(\d+)\b/i.exec(description)
  const count = match ? Number(match[1]) : 0
  return Number.isSafeInteger(count) && count > 0 && count <= 10000 ? count : null
}

export function formatWhatsAppCartLine(item: {
  title: string; qty: number; color: string; price: number;
  figuras_por_kit?: number | string | null; selectedPieceIds?: string[];
}): string {
  const figures = getKitFigureCount(item)
  const quantity = figures ? `${item.qty} ${item.qty === 1 ? 'kit' : 'kits'}` : `${item.qty}x`
  const contents = figures ? `  - Kit completo: ${figures} ${figures === 1 ? 'figura' : 'figuras'} por kit\n  - Total: ${item.qty * figures} figuras\n` : ''
  return `• *${quantity}* ${item.title}\n${contents}  - Color PLA: ${item.color}\n  - Subtotal: $${(item.price * item.qty).toLocaleString('es-AR')}\n`
}
