import { useEffect, useState } from 'react'
import { estimateDelivery } from '@/lib/deliveryEstimate'

type Props = { requiresManufacturing?: boolean; method?: 'pickup' | 'shipping' }

export function DeliveryEstimate({ requiresManufacturing = true, method = 'shipping' }: Props) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const update = () => setNow(new Date())
    const timer = window.setInterval(update, 60_000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  const estimate = estimateDelivery(now, requiresManufacturing)
  return (
    <div className="my-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-950" data-testid="delivery-estimate">
      <p className="font-extrabold">
        {method === 'pickup' ? 'Disponibilidad estimada para retiro' : 'Entrega local estimada'}:
      </p>
      <p className="mt-1 font-bold">
        {method === 'pickup' ? estimate.readyLabel : `${estimate.deliveryLabel}, después de las 17 h`}
      </p>
      <p className="mt-1 leading-relaxed">
        Si confirmás el pedido hoy. {requiresManufacturing ? 'Incluye 4 días de fabricación, de lunes a viernes. ' : 'Para la disponibilidad en stock indicada. '}
        {method === 'shipping' ? 'Válida dentro de los 45 km de Mar de Ajó, con entrega coordinada martes o jueves. ' : 'Te avisamos cuando esté listo para coordinar el retiro. '}
        Fecha tentativa: feriados, cantidades especiales y disponibilidad pueden modificarla. La confirmamos con vos.
      </p>
    </div>
  )
}
