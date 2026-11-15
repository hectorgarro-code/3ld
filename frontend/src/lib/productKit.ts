/** Only explicit complete kits qualify; selectable pieces are sold separately. */
export function getKitFigureCount(product: {
  title?: string; nombre?: string; description?: string; descripcion?: string;
  piezas?: unknown[]; selectedPieceIds?: string[];
}): number | null {
  if (product.piezas?.length || product.selectedPieceIds?.length) return null
  const title = product.title || product.nombre || ''
  const description = product.description || product.descripcion || ''
  const match = /\bkit\s*[x×]\s*(\d+)\b/i.exec(title)
    || /^\s*kit\s*[x×]\s*(\d+)\b/i.exec(description)
  const count = match ? Number(match[1]) : 0
  return Number.isSafeInteger(count) && count > 0 ? count : null
}
