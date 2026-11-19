export const LOCAL_COVERAGE = 'Entrega local en La Costa, excepto Costa Esmeralda'

export function requiresPersonalization(title: string): boolean {
  return /\bfoto y nombre\b/i.test(title)
}

export function personalizationSummary(item: { title: string; qty: number; color: string; personalizedName?: string }): string {
  return item.personalizedName
    ? `${item.title} ×${item.qty} (${item.color}) · Nombre: ${item.personalizedName} · Foto por WhatsApp`
    : ''
}
