import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
type Entry = { id: string; fecha: string; pedido: string; contacto: string; observaciones: string; estado: string }
export default function ReturnsPage() {
  const requests = useQuery({ queryKey: ['return-requests'], queryFn: async () => (await api.get('/tienda/arrepentimientos')).data.data as Entry[] })
  return <main className="max-w-4xl mx-auto p-5 space-y-4"><h1 className="text-2xl font-black">Solicitudes de devolución</h1>
    <p>Responder dentro de las 24 horas. El registro no cancela ni reintegra automáticamente una compra.</p>
    <button className="px-4 py-2 rounded-xl bg-slate-900 text-white" onClick={() => requests.refetch()}>Actualizar</button>
    {requests.isLoading && <p>Cargando solicitudes…</p>}{requests.isError && <p role="alert">No se pudieron cargar las solicitudes. Volvé a intentar.</p>}
    {requests.data?.length === 0 && <p>No hay solicitudes registradas.</p>}
    {requests.data?.map(entry => <article key={entry.id} className="bg-white p-5 rounded-2xl border space-y-2"><h2 className="font-bold">{entry.id}</h2>
      <p>{new Date(entry.fecha).toLocaleString('es-AR')} · Pendiente de atención</p><p>Pedido: {entry.pedido || 'Sin informar'}</p><p>Contacto: {entry.contacto}</p><p className="whitespace-pre-wrap">{entry.observaciones || 'Sin observaciones'}</p>
    </article>)}
  </main>
}
