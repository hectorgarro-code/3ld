import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api from '@/lib/api'

type Movement = { id: string; accion: string; fecha: string; usuario?: { nombre: string }; nota: string; importe_centavos?: number; medio?: string; referencia?: string }
type Entry = { id: string; fecha: string; pedido: string; pedido_id: number | null; contacto: string; observaciones: string; tipo: string; estado: string; version: number; historial: Movement[] }
type Order = { id: number; numero_pedido: string; cliente_nombre: string; cliente_telefono?: string; cliente_email?: string; total: number }
const states: Record<string, string> = { pendiente: 'Pendiente de atención', en_gestion: 'En gestión', recibido: 'Producto recibido', cambio_entregado: 'Cambio entregado', reintegro_registrado: 'Reintegro registrado', cerrado: 'Cerrado', rechazado: 'Rechazado' }
const actions: Record<string, string> = { alta: 'Alta de ficha', nota: 'Agregar nota', contacto: 'Registrar contacto', recibir: 'Registrar recepción', entregar_cambio: 'Registrar entrega del cambio', reintegro: 'Registrar reintegro realizado', cerrar: 'Cerrar ficha', rechazar: 'Rechazar con motivo', vincular: 'Vincular pedido' }
const money = (cents: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cents / 100)
const date = (value: string) => new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
const sum = (entry: Entry) => entry.historial.reduce((total, event) => total + (event.importe_centavos || 0), 0)
const message = (error: unknown) => isAxiosError(error) ? error.response?.data?.message || 'No se pudo guardar. Actualizá y revisá el historial antes de reintentar.' : 'No se pudo guardar.'
const input = 'w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900'
const button = 'rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50'
function available(entry: Entry) {
  if (['cerrado', 'rechazado'].includes(entry.estado)) return ['nota']
  const list = ['nota', 'contacto']
  if (!entry.pedido_id) list.push('vincular')
  if (['pendiente', 'en_gestion'].includes(entry.estado)) list.push('recibir', 'rechazar')
  if (['recibido', 'reintegro_registrado', 'cambio_entregado'].includes(entry.estado)) list.push('reintegro')
  if (entry.tipo === 'cambio' && ['recibido', 'reintegro_registrado'].includes(entry.estado) && !entry.historial.some(e => e.accion === 'entregar_cambio')) list.push('entregar_cambio')
  if (entry.historial.some(e => e.accion === (entry.tipo === 'cambio' ? 'entregar_cambio' : 'reintegro'))) list.push('cerrar')
  return list
}
function OrderPicker({ orders, value, onChange }: { orders: Order[]; value: string; onChange: (value: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = orders.filter(o => String(o.id) === value || `${o.numero_pedido} ${o.cliente_nombre}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="space-y-2"><label className="block text-sm font-bold">Buscar pedido<input className={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Número o cliente" /></label>
    <label className="block text-sm font-bold">Pedido<select required className={input} value={value} onChange={e => onChange(e.target.value)}><option value="">Seleccionar pedido</option>{filtered.map(o => <option key={o.id} value={o.id}>{o.numero_pedido} · {o.cliente_nombre} · {money(Math.round(Number(o.total) * 100))}</option>)}</select></label>
    <p className="text-xs text-slate-500">Hasta 1.000 pedidos recientes.</p></div>
}
export default function ReturnsPage() {
  const client = useQueryClient()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer) }, [])
  const [selected, setSelected] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('abiertos')
  const [showNew, setShowNew] = useState(false)
  const [kind, setKind] = useState('devolucion')
  const [orderId, setOrderId] = useState('')
  const [contact, setContact] = useState('')
  const [reason, setReason] = useState('')
  const [action, setAction] = useState('nota')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('transferencia')
  const [reference, setReference] = useState('')
  const [linkOrder, setLinkOrder] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState('')
  const operation = useRef({ payload: '', key: '' })
  function keyFor(body: unknown) {
    const payload = JSON.stringify(body)
    if (operation.current.payload !== payload) operation.current = { payload, key: crypto.randomUUID() }
    return operation.current.key
  }
  const requests = useQuery({ queryKey: ['return-requests'], queryFn: async () => (await api.get('/tienda/arrepentimientos')).data.data as Entry[] })
  const ordersQuery = useQuery({ queryKey: ['returns-orders'], queryFn: async () => (await api.get('/pedidos', { params: { per_page: 1000 } })).data.data as Order[], enabled: showNew || action === 'vincular' })
  const orders = ordersQuery.data || []
  const entries = requests.data || []
  const entry = entries.find(item => item.id === selected)
  const create = useMutation({ mutationFn: async () => {
    const body = { tipo: kind, pedido_id: Number(orderId), contacto: contact, observaciones: reason }
    return (await api.post('/tienda/arrepentimientos', { ...body, operacion_id: keyFor(body) })).data.data as Entry
  }, onSuccess: async (result) => {
    await client.invalidateQueries({ queryKey: ['return-requests'] }); setSelected(result.id); setShowNew(false); setReason(''); setOrderId(''); setContact(''); setNotice('Ficha registrada.'); operation.current = { payload: '', key: '' }
  } })
  const movement = useMutation({ mutationFn: async () => {
    if (!entry) throw new Error('Seleccioná una ficha.')
    const body = { accion: action, nota: note, ...(action === 'reintegro' ? { importe: amount, medio: method, referencia: reference } : {}), ...(action === 'vincular' ? { pedido_id: Number(linkOrder) } : {}) }
    return (await api.post(`/tienda/arrepentimientos/${encodeURIComponent(entry.id)}/movimientos`, { ...body, version: entry.version, operacion_id: keyFor({ id: entry.id, ...body }) })).data.data as Entry
  }, onSuccess: async () => {
    await client.invalidateQueries({ queryKey: ['return-requests'] }); setNote(''); setAmount(''); setReference(''); setConfirmed(false); setAction('nota'); setNotice('Movimiento registrado en el historial.'); operation.current = { payload: '', key: '' }
  }, onError: () => { void client.invalidateQueries({ queryKey: ['return-requests'] }) } })
  const closed = (item: Entry) => ['cerrado', 'rechazado'].includes(item.estado)
  const filtered = entries.filter(item => (filter === 'todos' || (filter === 'abiertos' ? !closed(item) : item.estado === filter)) && `${item.id} ${item.pedido} ${item.contacto} ${item.observaciones}`.toLowerCase().includes(search.toLowerCase()))
  const busy = create.isPending || movement.isPending
  function select(item: Entry) { setSelected(item.id); setAction('nota'); setNote(''); setAmount(''); setReference(''); setConfirmed(false); setNotice(''); movement.reset() }
  return <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-black">Cambios, devoluciones y reintegros</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Seguimiento de solicitudes y movimientos realizados. Registrar un reintegro no transfiere dinero, no modifica el pedido ni ajusta el stock.</p></div><div className="flex gap-2"><button className="rounded-xl border px-4 py-3" disabled={busy} onClick={() => requests.refetch()}>Actualizar</button><button className={button} disabled={busy} onClick={() => { setShowNew(!showNew); create.reset(); setNotice('') }}>{showNew ? 'Ocultar alta' : 'Nueva ficha'}</button></div></header>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p>Fichas abiertas</p><strong className="text-2xl">{entries.filter(item => !closed(item)).length}</strong></div><div className="rounded-2xl border bg-white p-4"><p>Recibidas para reintegrar</p><strong className="text-2xl">{entries.filter(item => item.tipo === 'devolucion' && item.estado === 'recibido').length}</strong></div><div className="rounded-2xl border bg-white p-4"><p>Reintegros registrados</p><strong className="text-2xl">{money(entries.reduce((total, item) => total + sum(item), 0))}</strong></div></div>
    {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-green-900">{notice}</p>}
    {showNew && <form className="space-y-4 rounded-2xl border bg-white p-5" onSubmit={e => { e.preventDefault(); create.mutate() }}><h2 className="text-lg font-bold">Registrar solicitud recibida por WhatsApp o en persona</h2><div className="grid gap-4 md:grid-cols-2"><div className="space-y-3"><label className="block text-sm font-bold">Tipo<select className={input} value={kind} onChange={e => setKind(e.target.value)}><option value="devolucion">Devolución con reintegro</option><option value="cambio">Cambio de producto</option></select></label><OrderPicker orders={orders} value={orderId} onChange={value => { setOrderId(value); const order = orders.find(o => String(o.id) === value); setContact(order?.cliente_telefono || order?.cliente_email || '') }} />{ordersQuery.isError && <p role="alert">No se pudieron cargar los pedidos. <button type="button" className="underline" onClick={() => ordersQuery.refetch()}>Reintentar</button></p>}</div><div className="space-y-3"><label className="block text-sm font-bold">Contacto<input className={input} maxLength={200} required value={contact} onChange={e => setContact(e.target.value)} /></label><label className="block text-sm font-bold">Productos, cantidades y motivo<textarea required maxLength={2000} rows={4} className={input} value={reason} onChange={e => setReason(e.target.value)} placeholder="Qué se devuelve o cambia y qué se acordó." /></label></div></div>{create.isError && <p role="alert" className="text-red-700">{message(create.error)}</p>}<button className={button} disabled={busy || ordersQuery.isLoading}>{create.isPending ? 'Guardando…' : 'Guardar ficha'}</button></form>}
    <div className="flex flex-wrap gap-3"><label className="min-w-56 flex-1 text-sm font-bold">Buscar<input className={input} placeholder="Pedido, contacto o código de ficha" value={search} onChange={e => setSearch(e.target.value)} /></label><label className="text-sm font-bold">Estado<select className={input} value={filter} onChange={e => setFilter(e.target.value)}><option value="abiertos">Fichas abiertas</option><option value="todos">Todos los estados</option>{Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {requests.isLoading && <p>Cargando solicitudes…</p>}{requests.isError && <p role="alert">No se pudieron cargar las solicitudes. Usá Actualizar para reintentar.</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]"><section aria-label="Fichas" className="space-y-3">{!requests.isLoading && !requests.isError && filtered.length === 0 && <p className="rounded-2xl border bg-white p-6">No hay fichas para este filtro.</p>}{filtered.map(item => <button key={item.id} className={`w-full rounded-2xl border bg-white p-4 text-left ${selected === item.id ? 'border-violet-600 ring-2 ring-violet-200' : 'border-slate-200'}`} disabled={busy} onClick={() => select(item)}><span className="text-xs font-bold uppercase text-violet-700">{item.tipo === 'cambio' ? 'Cambio' : 'Devolución'}</span><h2 className="mt-1 font-bold">{item.pedido || 'Sin pedido vinculado'}</h2><p>{states[item.estado] || item.estado}</p><p className="mt-2 break-all text-sm text-slate-500">{item.contacto}</p><p className="mt-1 text-xs text-slate-500">{date(item.fecha)}</p>{item.estado === 'pendiente' && now - new Date(item.fecha).getTime() >= 86400000 && <p className="mt-2 font-bold text-amber-800">Atención pendiente hace más de 24 h</p>}{item.tipo === 'devolucion' && item.estado === 'recibido' && <p className="mt-2 font-bold text-amber-800">Reintegro pendiente desde la recepción</p>}</button>)}</section>
      <section aria-label="Detalle de ficha" className="min-w-0 rounded-2xl border bg-white p-5">{!entry ? <p className="text-slate-500">Seleccioná una ficha para ver el historial y registrar movimientos.</p> : <><div className="space-y-2 border-b pb-4"><h2 className="break-all text-lg font-bold">{entry.id}</h2><p><strong>{entry.tipo === 'cambio' ? 'Cambio' : 'Devolución'}</strong> · {states[entry.estado]}</p><p>Pedido: {entry.pedido || 'Sin informar'} · Contacto: {entry.contacto}</p><p className="whitespace-pre-wrap">{entry.observaciones || 'Sin observaciones'}</p><p className="font-bold">Total reintegrado: {money(sum(entry))}</p></div>
      <h3 className="mb-3 mt-5 font-bold">Historial</h3>{entry.historial.length === 0 && <p className="text-sm text-slate-500">Solicitud recibida el {date(entry.fecha)}. Sin movimientos de gestión.</p>}<ol className="space-y-3">{entry.historial.map(event => <li key={event.id} className="border-l-2 border-violet-200 pl-3"><p className="font-bold">{actions[event.accion] || event.accion}</p><p className="text-xs text-slate-500">{date(event.fecha)} · {event.usuario?.nombre || 'Solicitud web'}</p><p className="whitespace-pre-wrap text-sm">{event.nota}</p>{event.importe_centavos != null && <p className="break-words text-sm font-bold">{money(event.importe_centavos)} · {event.medio} · Referencia: {event.referencia}</p>}</li>)}</ol>
      <form className="mt-5 space-y-3 border-t pt-4" onSubmit={e => { e.preventDefault(); movement.mutate() }}><h3 className="font-bold">Nuevo movimiento</h3><label className="block text-sm font-bold">Acción<select className={input} disabled={busy} value={available(entry).includes(action) ? action : 'nota'} onChange={e => { setAction(e.target.value); setConfirmed(false); movement.reset() }}>{available(entry).map(value => <option key={value} value={value}>{actions[value]}</option>)}</select></label>
      {action === 'vincular' && <OrderPicker orders={orders} value={linkOrder} onChange={setLinkOrder} />}
      {action === 'reintegro' && <div className="space-y-3 rounded-xl bg-amber-50 p-3"><p className="text-sm">Completá después de realizar el reintegro. Se controla que lo registrado en todas las fichas no supere el total del pedido.</p><label className="block text-sm font-bold">Importe reintegrado (ARS)<input type="number" required min="0.01" step="0.01" max="999999999.99" className={input} value={amount} onChange={e => setAmount(e.target.value)} /></label><label className="block text-sm font-bold">Medio<select className={input} value={method} onChange={e => setMethod(e.target.value)}><option value="transferencia">Transferencia</option><option value="mercadopago">Mercado Pago</option><option value="efectivo">Efectivo</option><option value="otro">Otro</option></select></label><label className="block text-sm font-bold">Referencia de operación o comprobante<input required maxLength={160} className={input} value={reference} onChange={e => setReference(e.target.value)} /></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />Confirmo que el reintegro ya fue realizado. Guardarlo aquí no envía dinero.</label></div>}
      <label className="block text-sm font-bold">Detalle del movimiento<textarea required maxLength={2000} rows={3} className={input} value={note} onChange={e => setNote(e.target.value)} placeholder={action === 'entregar_cambio' ? 'Productos y cantidades entregados, y acuerdo con el cliente.' : 'Dejá constancia de lo realizado y acordado con el cliente.'} /></label>{movement.isError && <p role="alert" className="text-red-700">{message(movement.error)}</p>}<button className={button} disabled={busy || (action === 'reintegro' && !confirmed)}>{movement.isPending ? 'Guardando…' : 'Registrar movimiento'}</button></form></>}</section></div>
  </main>
}
