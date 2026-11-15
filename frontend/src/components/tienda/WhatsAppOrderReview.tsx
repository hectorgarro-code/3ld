import { useEffect, useRef } from 'react'
import { getKitFigureCount } from '@/lib/productKit'
import type { CartItem } from '@/store/cartStore'

interface Props {
  items: CartItem[]
  delivery: string
  shippingCost: number | null
  notes: string
  onNotesChange: (value: string) => void
  onBack: () => void
  onContinue: () => void
}

export function WhatsAppOrderReview({ items, delivery, shippingCost, notes, onNotesChange, onBack, onContinue }: Props) {
  const dialog = useRef<HTMLElement>(null)
  const money = (value: number) => '$' + value.toLocaleString('es-AR')
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = oldOverflow; previous?.focus() }
  }, [])
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 sm:p-5" onClick={e => { if (e.target === e.currentTarget) onBack() }}>
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="whatsapp-review-title"
      className="flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"
      onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); onBack() }
        if (e.key === 'Tab') {
          const buttons = dialog.current?.querySelectorAll<HTMLElement>('button, textarea')
          if (!buttons?.length) return
          const first = buttons[0], last = buttons[buttons.length - 1]
          if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus() }
          else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { e.preventDefault(); first.focus() }
        }
      }}>
      <header className="shrink-0 border-b border-slate-100 p-4 sm:p-6">
        <h2 id="whatsapp-review-title" className="text-xl font-extrabold text-slate-900">Revisá tu pedido</h2>
        <p className="mt-1 text-sm text-slate-600">Comprobá cantidades y entrega antes de abrir WhatsApp.</p>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:px-6" data-testid="whatsapp-review-content">
        <ul className="divide-y divide-slate-100">
          {items.map(item => {
            const figures = getKitFigureCount(item)
            return <li key={JSON.stringify([item.id,item.color,item.selectedPieceIds])} className="py-3 first:pt-0">
              <h3 className="break-words text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-700">{item.qty} {figures ? (item.qty === 1 ? 'kit' : 'kits') : (item.qty === 1 ? 'unidad' : 'unidades')}{figures ? ` · ${figures} figuras por kit · ${item.qty * figures} figuras en total` : ''}</p>
              <p className="mt-1 text-xs text-slate-500">Color: {item.color}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{money(item.price * item.qty)}</p>
            </li>
          })}
        </ul>
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <h3 className="text-sm font-bold text-slate-900">Entrega</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{delivery}</p>
        </div>
        <div className="mt-4">
          <label htmlFor="whatsapp-order-notes" className="block text-sm font-bold text-slate-900">Observaciones del pedido <span className="font-normal text-slate-500">(opcional)</span></label>
          <textarea id="whatsapp-order-notes" value={notes} onChange={e => onNotesChange(e.target.value.slice(0, 500))} maxLength={500} rows={3}
            placeholder="Ej.: nombres para personalizar o una aclaración para coordinar la entrega."
            aria-describedby="whatsapp-order-notes-help"
            className="mt-2 w-full resize-none rounded-xl border border-slate-300 p-3 text-base text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
          <p id="whatsapp-order-notes-help" className="mt-1 flex justify-between gap-3 text-xs text-slate-500"><span>Se incluirán en el mensaje de WhatsApp.</span><span>{notes.length}/500</span></p>
        </div>
        <dl className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex justify-between gap-3"><dt>Productos</dt><dd>{money(subtotal)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Entrega</dt><dd>{shippingCost === null ? 'A coordinar' : shippingCost === 0 ? 'Gratis' : money(shippingCost)}</dd></div>
        </dl>
      </div>
      <footer className="shrink-0 border-t border-slate-200 p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="text-sm text-slate-600">{shippingCost === null ? 'Total estimado · envío pendiente' : 'Total del pedido'}</span><strong className="text-xl font-extrabold text-slate-900">{money(subtotal + (shippingCost ?? 0))}</strong></div>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">El mensaje quedará preparado en WhatsApp para que lo revises y lo envíes.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 sm:flex-1">Volver al carrito</button>
          <button type="button" onClick={onContinue} className="min-h-11 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 sm:flex-1">Abrir WhatsApp</button>
        </div>
      </footer>
    </section>
  </div>
}
