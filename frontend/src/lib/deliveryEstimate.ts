/** Dates use the business timezone, independently of the shopper's device. */
export const DELIVERY_TIME_ZONE = 'America/Argentina/Buenos_Aires'
export const MANUFACTURING_BUSINESS_DAYS = 4

export function estimateDelivery(now = new Date(), requiresManufacturing = true) {
  if (!Number.isFinite(now.getTime())) throw new Error('Fecha inválida')
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DELIVERY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const part = (name: string) => Number(parts.find(p => p.type === name)?.value)
  const date = new Date(Date.UTC(part('year'), part('month') - 1, part('day'), 12))
  let remaining = requiresManufacturing ? MANUFACTURING_BUSINESS_DAYS : 0
  // Count four complete weekdays after confirmation; never count the order date.
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) remaining--
  }
  const readyDate = date.toISOString().slice(0, 10)
  // A ready item cannot join a delivery round that has already begun.
  if (!requiresManufacturing && part('hour') >= 17) date.setUTCDate(date.getUTCDate() + 1)
  while (date.getUTCDay() !== 2 && date.getUTCDay() !== 4) date.setUTCDate(date.getUTCDate() + 1)
  const deliveryDate = date.toISOString().slice(0, 10)
  const format = (key: string) => new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(key + 'T12:00:00Z'))
  return { readyDate, deliveryDate, readyLabel: format(readyDate), deliveryLabel: format(deliveryDate) }
}
