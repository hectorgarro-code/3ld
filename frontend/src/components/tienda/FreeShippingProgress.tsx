import type { ReactNode } from 'react'
import { Truck, Check } from 'lucide-react'
import { LOCAL_FREE_SHIPPING_THRESHOLD } from '@/lib/freeShipping'

type Props = { subtotal: number; preview?: boolean; children?: ReactNode }
export function FreeShippingProgress({ subtotal, preview = false, children }: Props) {
  const remaining = Math.max(0, LOCAL_FREE_SHIPPING_THRESHOLD - Math.round(subtotal * 100) / 100)
  const progress = Math.max(0, Math.min(100, subtotal / LOCAL_FREE_SHIPPING_THRESHOLD * 100))
  const money = (value: number) => '$' + value.toLocaleString('es-AR', { maximumFractionDigits: 2 })
  const reached = remaining === 0
  return <section className={`rounded-2xl border p-3 ${reached ? 'border-emerald-200 bg-emerald-50' : 'border-cyan-200 bg-cyan-50/70'}`} aria-label="Meta de envío local gratis" data-testid="free-shipping-progress">
    <div className="flex items-start gap-2">
      {reached ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> : <Truck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />}
      <p className="text-sm leading-snug text-slate-800" aria-live="polite">
        {reached ? <strong className="text-emerald-800">{preview ? 'Con esta selección alcanzás el envío local gratis' : 'Tu compra ya tiene envío local gratis'}</strong> : <>{preview ? 'Con esta selección, te faltan ' : 'Te faltan '}<strong>{money(remaining)}</strong> para el envío local gratis</>}
      </p>
    </div>
    <div role="progressbar" aria-label="Progreso hacia el envío local gratis" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={reached ? 'Meta alcanzada' : `Faltan ${money(remaining)} de una meta de ${money(LOCAL_FREE_SHIPPING_THRESHOLD)}`} className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white">
      <div className={`h-full rounded-full transition-[width] motion-reduce:transition-none ${reached ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${progress}%` }} />
    </div>
    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Desde {money(LOCAL_FREE_SHIPPING_THRESHOLD)} en productos. En nuestra zona de La Costa, excepto Costa Esmeralda.</p>
    {!reached && children}
  </section>
}
