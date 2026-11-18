import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Truck } from 'lucide-react'
import api from '@/lib/api'
import { DeliveryFields, emptyDelivery, type DeliveryData } from '@/components/shipping/DeliveryFields'

interface Shipment {
  ref: string
  order_id: number | null
  data: DeliveryData
  imported: boolean
  busy: boolean
  tracking: string | null
  has_label: boolean
}

const buttonClass = 'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'

export function ShipmentPanel({ orderId, manualRef, onCreated }: { orderId?: number; manualRef?: string; onCreated?: (ref: string) => void }) {
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [data, setData] = useState<DeliveryData>(emptyDelivery)
  const [draftRef, setDraftRef] = useState('')
  const [tracking, setTracking] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(!orderId && !manualRef)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const orderPath = orderId ? '/pedidos/' + orderId + '/envio' : null

  function showError(caught: unknown) {
    const problem = caught as { response?: { data?: { message?: string } } }
    setError(problem.response?.data?.message || 'No se pudo completar la operación.')
  }

  function showShipment(row: Shipment) {
    setShipment(row)
    setData({ ...emptyDelivery, ...row.data })
    setTracking(row.tracking || '')
  }

  useEffect(() => {
    const path = orderPath || (manualRef ? '/envios/' + manualRef : null)
    if (!path) return
    const request = new AbortController()
    setReady(false)
    api.get(path, { signal: request.signal }).then(({ data: result }) => {
      if (!orderPath) {
        showShipment(result.data)
      } else if (result.data.shipment) {
        showShipment(result.data.shipment)
      } else {
        setData({ ...emptyDelivery, ...result.data.defaults })
      }
      setReady(true)
    }).catch(caught => {
      if (!request.signal.aborted) showError(caught)
    })
    return () => request.abort()
  }, [orderPath, manualRef])

  async function run(action: () => Promise<void>) {
    setLoading(true)
    setError('')
    setStatus('')
    try {
      await action()
    } catch (caught) {
      showError(caught)
    } finally {
      setLoading(false)
    }
  }

  async function saveData(): Promise<Shipment> {
    const repository = shipment ? await api.put('/envios/' + shipment.ref, data)
      : orderPath ? await api.post(orderPath, { data })
      : await api.post('/envios', data)
    const row = repository.data.data as Shipment
    showShipment(row)
    if (!shipment) onCreated?.(row.ref)
    return row
  }

  async function importToCarrier() {
    const row = shipment ?? await saveData()
    // Persist edited details before handing the shipment to MiCorreo.
    if (shipment) await saveData()
    const { data: result } = await api.post('/envios/' + row.ref + '/importar')
    showShipment(result.data)
    setStatus('Envío preparado en MiCorreo. Buscalo en Mis envíos para abonarlo y descargar el rótulo.')
  }

  async function attachPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!shipment || !pdf) return
    const payload = new FormData()
    payload.set('tracking', tracking)
    payload.set('pdf', pdf)
    await run(async () => {
      const { data: result } = await api.post('/envios/' + shipment.ref + '/rotulo', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      showShipment(result.data)
      setPdf(null)
      setStatus('Rótulo y seguimiento guardados.')
    })
  }

  async function downloadPdf() {
    if (!shipment) return
    const { data: blob } = await api.get('/envios/' + shipment.ref + '/rotulo', { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Rotulo-' + shipment.ref + '.pdf'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setStatus('Rótulo descargado. Abrí el PDF para imprimirlo.')
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Envío">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-slate-600" aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-900">Envío</h2>
      </div>
      {shipment && <p className="text-xs text-slate-600">Referencia {shipment.ref}
        {shipment.imported && ' · Preparado en MiCorreo'}
        {shipment.has_label && ' · Rótulo guardado'}
        {shipment.busy && ' · Preparando en MiCorreo'}
      </p>}
      {!ready && !error && <p role="status" className="text-sm text-slate-600">Cargando datos del envío…</p>}
      {ready && !shipment && orderPath && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
          event.preventDefault()
          void run(async () => {
            const { data: result } = await api.post(orderPath, { ref: draftRef.trim() })
            showShipment(result.data.shipment)
            setStatus('Datos de WhatsApp vinculados al pedido.')
          })
        }}>
          <label className="text-sm text-slate-700">
            Referencia de envío recibida por WhatsApp
            <input className={inputClass} value={draftRef} onChange={event => setDraftRef(event.target.value)} required maxLength={20} />
          </label>
          <button className={buttonClass} disabled={loading}>Cargar datos</button>
        </form>
      )}
      {ready && <form className="space-y-4" onSubmit={event => {
        event.preventDefault()
        void run(async () => { await saveData(); setStatus('Datos del envío guardados.') })
      }}>
        <fieldset disabled={loading || shipment?.imported || shipment?.busy || shipment?.has_label}>
          <DeliveryFields value={data} onChange={setData} packageFields />
        </fieldset>
        {!shipment?.imported && !shipment?.busy && !shipment?.has_label && (
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={loading} className={buttonClass}>Guardar datos</button>
            <button type="button" disabled={loading} className={buttonClass} onClick={() => void run(importToCarrier)}>
              Preparar en MiCorreo
            </button>
          </div>
        )}
      </form>}
      {shipment && !shipment.busy && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h3 className="font-bold text-slate-900">Rótulo de Correo Argentino</h3>
          <p className="text-sm text-slate-600">Después de pagar el envío, descargá el PDF y copiá el seguimiento desde Mis envíos. Guardá ambos acá para volver a imprimirlo.</p>
          <a className="text-sm font-semibold text-blue-700 underline" href="https://micorreo.correoargentino.com.ar/home" target="_blank" rel="noreferrer">Abrir MiCorreo</a>
          <form onSubmit={attachPdf} className="flex flex-wrap items-end gap-2">
            <label className="text-sm text-slate-700">
              Número de seguimiento
              <input className={inputClass} value={tracking} onChange={event => setTracking(event.target.value)} required maxLength={80} />
            </label>
            <label className="text-sm text-slate-700">
              PDF oficial de MiCorreo
              <input key={shipment.tracking || 'new'} className={inputClass} type="file" accept="application/pdf,.pdf"
                onChange={event => setPdf(event.target.files?.[0] ?? null)} required />
            </label>
            <button disabled={loading || !pdf} className={buttonClass}>Guardar rótulo</button>
          </form>
          {shipment.has_label && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonClass} disabled={loading} onClick={() => void run(downloadPdf)}>Descargar rótulo para imprimir</button>
              <button type="button" className={buttonClass} disabled={loading} onClick={() => void run(async () => {
                await navigator.clipboard.writeText(shipment.tracking || '')
                setStatus('Seguimiento copiado.')
              })}>Copiar seguimiento</button>
            </div>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {status && <p role="status" className="text-sm text-emerald-800">{status}</p>}
    </section>
  )
}

export default function ManualShipmentPage() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const [searchReference, setSearchReference] = useState('')
  return <div className="space-y-4">
    <Link to="/pedidos" className="text-sm font-semibold text-blue-700">Volver a Pedidos</Link>
    {!ref && <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
      event.preventDefault()
      navigate('/pedidos/envios/' + searchReference.trim().toUpperCase())
    }}>
      <label className="text-sm text-slate-700">
        Recuperar envío por referencia
        <input className={inputClass} value={searchReference} onChange={event => setSearchReference(event.target.value)}
          pattern="[A-Fa-f0-9]{20}" maxLength={20} required />
      </label>
      <button className={buttonClass}>Buscar</button>
    </form>}
    <ShipmentPanel key={ref || 'manual'} manualRef={ref} onCreated={reference => navigate('/pedidos/envios/' + reference, { replace: true })} />
  </div>
}