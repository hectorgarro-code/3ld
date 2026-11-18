import { useEffect, useState, type FormEvent } from 'react'
import api from '@/lib/api'
import { formatARS } from '@/lib/cost-calculator'

export function MiCorreoSettings() {
  const [config, setConfig] = useState({ username: '', password: '', customer_id: '', origin: '7111' })
  const [ready, setReady] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get('/config/mi-correo').then(({ data }) => {
      setConfigured(data.data.configured)
      setConfig(previous => ({
        ...previous,
        customer_id: data.data.customer_id || '',
        origin: data.data.origin || '7111',
      }))
      setReady(true)
    }).catch(() => setMessage('No se pudo consultar la configuración de MiCorreo.'))
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const { data } = await api.post('/config/mi-correo', config)
      const rates = data.data.rates as { service: string; price: number }[]
      setConfigured(true)
      setConfig(previous => ({ ...previous, username: '', password: '' }))
      setMessage('MiCorreo conectado. Tarifa de prueba al CP 1900. ' +
        rates.map(rate => rate.service + ' ' + formatARS(rate.price)).join(' · '))
    } catch (error: unknown) {
      const requestError = error as { response?: { data?: { message?: string } } }
      setMessage(requestError.response?.data?.message || 'No se pudo guardar la conexión con MiCorreo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4" aria-labelledby="mi-correo-title">
      <h2 id="mi-correo-title" className="font-bold text-lg">Correo Argentino · MiCorreo</h2>
      <p className="text-sm text-slate-600">{configured ? 'Conectado al punto de venta y la tienda pública' : 'Pendiente de conexión'}</p>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={save} autoComplete="off">
        {([
          ['username', 'Usuario de la API', 'text', undefined],
          ['password', 'Contraseña de la API', 'password', undefined],
          ['customer_id', 'Número de cliente de MiCorreo', 'text', '[0-9]{10}'],
          ['origin', 'Código postal de origen', 'text', '[0-9]{4}'],
        ] as const).map(([name, label, type, pattern]) => (
          <label key={name} className="text-sm font-medium">
            {label}
            <input
              className="block w-full mt-1 border rounded-xl p-3"
              type={type}
              pattern={pattern}
              inputMode={pattern ? 'numeric' : undefined}
              autoComplete={type === 'password' ? 'new-password' : 'off'}
              value={config[name]}
              onChange={event => setConfig(previous => ({ ...previous, [name]: event.target.value }))}
              required
              disabled={!ready || saving}
            />
          </label>
        ))}
        <button disabled={!ready || saving} className="w-fit bg-blue-700 text-white rounded-xl px-4 py-2 disabled:opacity-50">
          {saving ? 'Verificando conexión…' : 'Verificar y guardar'}
        </button>
      </form>
      <p role="status" className="text-sm">{message}</p>
    </section>
  )
}