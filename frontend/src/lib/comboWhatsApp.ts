export function comboWhatsAppText(
  title: string,
  formattedPrice: string,
  components: { nombre: string; cantidad?: number }[],
  url?: string,
): string {
  return [
    '¡Mirá este combo en 3LD!',
    `*${title}* · ${formattedPrice}`,
    'Incluye:',
    ...components.map(piece => `• ${piece.cantidad || 1} × ${piece.nombre}`),
    ...(url ? [url] : []),
  ].join('\n')
}
