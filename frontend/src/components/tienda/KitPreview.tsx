import { useEffect, useRef, useState } from 'react'
import { resolveImageUrl } from '@/lib/utils'
import { comboWhatsAppText } from '@/lib/comboWhatsApp'
import type { ComponentProductItem } from './CrearKitModal'

interface Props {
  title: string
  cover: string
  price: number
  regular: number
  components: ComponentProductItem[]
  onClose: () => void
}

const views = ['Tarjeta de tienda', 'PDF público', 'WhatsApp'] as const
const money = (value: number) => '$' + value.toLocaleString('es-AR')

export function KitPreview({ title, cover, price, regular, components, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState<typeof views[number]>(views[0])

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  const currentCover = cover && resolveImageUrl(cover)
  const prices = <p className="flex flex-wrap items-baseline gap-2">
    <s className="text-sm text-slate-600">{money(regular)}</s>
    <strong className="text-lg text-slate-900">{money(price)}</strong>
  </p>
  const contents = <ul className="mt-2 space-y-1 text-sm text-slate-700">
    {components.map(component => <li key={component.id} className="flex justify-between gap-3">
      <span>{component.cantidad} × {component.nombre}</span>
      <s className="shrink-0">{money(component.precio_venta)}</s>
    </li>)}
  </ul>

  return <dialog ref={dialog} onClose={onClose} aria-labelledby="kit-preview-title"
    className="m-auto w-[calc(100%-1.5rem)] max-w-xl max-h-[90dvh] overflow-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/65 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <h2 id="kit-preview-title" className="text-lg font-black">Vista previa del combo</h2>
      <button type="button" autoFocus onClick={() => dialog.current?.close()} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold">Volver a editar</button>
    </div>
    <div role="group" aria-label="Formato de vista previa" className="my-4 flex flex-wrap gap-2">
      {views.map(option => <button key={option} type="button" aria-pressed={option === view} onClick={() => setView(option)}
        className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold aria-pressed:border-indigo-700 aria-pressed:bg-indigo-700 aria-pressed:text-white">{option}</button>)}
    </div>
    {view === 'Tarjeta de tienda' && <article className="mx-auto max-w-64 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <div className="relative aspect-square bg-slate-100">
        {currentCover && <img src={currentCover} alt={title} className="h-full w-full object-cover" />}
        <span className="absolute left-2 top-2 rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black text-white">🔥 COMBO AHORRO ({components.length} productos)</span>
        <div className="absolute bottom-2 left-2 flex -space-x-1">
          {components.filter(component => component.imagen_url).slice(0, 3).map(component =>
            <img key={component.id} src={resolveImageUrl(component.imagen_url)} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" />)}
        </div>
      </div>
      <div className="space-y-1 p-3">
        <p className="text-[10px] font-bold uppercase text-indigo-700">Kits y Combos</p>
        <h3 className="text-sm font-bold">{title}</h3>{prices}
      </div>
    </article>}
    {view === 'PDF público' && <article className="rounded-xl border border-slate-300 p-4">
      {currentCover && <img src={currentCover} alt={title} className="mb-3 h-40 w-full rounded-lg bg-slate-50 object-contain" />}
      <p className="text-xs font-bold uppercase text-indigo-800">Kits y Combos</p>
      <h3 className="font-bold">{title}</h3>
      <p className="mt-3 text-sm font-bold">Este combo incluye</p>
      {contents}<div className="mt-3 border-t border-slate-200 pt-2">{prices}</div>
    </article>}
    {view === 'WhatsApp' && <article className="rounded-xl bg-emerald-50 p-4">
      <div className="mb-3 overflow-hidden rounded-lg border border-emerald-200 bg-white">
        {currentCover && <img src={currentCover} alt={title} className="h-40 w-full bg-slate-50 object-contain" />}
        <div className="p-3"><h3 className="font-bold">{title} | 3LD</h3><p className="text-sm text-slate-700">{money(price)}</p></div>
      </div>
      <pre className="whitespace-pre-wrap text-sm [font-family:inherit]">{comboWhatsAppText(title, money(price), components)}</pre>
      <p className="mt-2 text-xs text-slate-600">El enlace a la ficha se genera al publicar el combo.</p>
    </article>}
    {!currentCover && <p className="mt-3 text-sm text-slate-700">La portada aparecerá cuando termine la composición o elijas una foto.</p>}
  </dialog>
}
