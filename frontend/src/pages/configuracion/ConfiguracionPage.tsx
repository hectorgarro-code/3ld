import React, { useState, useEffect } from 'react'
import { Settings, Save, Loader2, DollarSign, Zap, Scale, CheckCircle2, CreditCard, Eye, EyeOff, ExternalLink, ShieldCheck } from 'lucide-react'
import api from '@/lib/api'
import { toast } from '@/store/toastStore'

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [precioFilamentoKg, setPrecioFilamentoKg] = useState<number>(15000)
  const [valorHoraMaquina, setValorHoraMaquina] = useState<number>(500)

  // Mercado Pago States
  const [mpActivo, setMpActivo] = useState(false)
  const [mpAccessToken, setMpAccessToken] = useState('')
  const [mpPublicKey, setMpPublicKey] = useState('')
  const [mpSandbox, setMpSandbox] = useState(false)
  const [mpHasToken, setMpHasToken] = useState(false)
  const [mpMaskedToken, setMpMaskedToken] = useState('')
  const [showMpToken, setShowMpToken] = useState(false)
  const [savingMp, setSavingMp] = useState(false)
  const [testingMp, setTestingMp] = useState(false)
  const [mpAccountName, setMpAccountName] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      try {
        const [costosRes, mpRes] = await Promise.all([
          api.get('/config/costos').catch(() => ({ data: null })),
          api.get('/config/mercadopago').catch(() => ({ data: null })),
        ])

        if (costosRes?.data?.success && costosRes.data?.data) {
          const d = costosRes.data.data
          if (d.precio_filamento_kg) setPrecioFilamentoKg(parseFloat(d.precio_filamento_kg))
          if (d.valor_hora_maquina) setValorHoraMaquina(parseFloat(d.valor_hora_maquina))
        }

        if (mpRes?.data?.success && mpRes.data?.data) {
          const m = mpRes.data.data
          setMpActivo(!!m.activo)
          setMpPublicKey(m.public_key || '')
          setMpSandbox(!!m.sandbox)
          setMpHasToken(!!m.has_token)
          setMpMaskedToken(m.masked_token || '')
        }
      } catch (err) {
        // Fallback a localStorage si falla el backend
        const savedFil = localStorage.getItem('costo_filamento_kg_default')
        if (savedFil) setPrecioFilamentoKg(parseFloat(savedFil))
        const savedHora = localStorage.getItem('costo_hora_maquina_default')
        if (savedHora) setValorHoraMaquina(parseFloat(savedHora))
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const handleSaveMp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingMp(true)
    try {
      await api.post('/config/mercadopago', {
        activo: mpActivo,
        access_token: mpAccessToken,
        public_key: mpPublicKey,
        sandbox: mpSandbox,
      })
      toast('Configuración de Mercado Pago guardada con éxito', 'success')
      if (mpAccessToken) {
        setMpHasToken(true)
        setMpMaskedToken(mpAccessToken.slice(0, 8) + '...' + mpAccessToken.slice(-4))
        setMpAccessToken('')
      }
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Error al guardar configuración de Mercado Pago', 'error')
    } finally {
      setSavingMp(false)
    }
  }

  const handleTestMp = async () => {
    setTestingMp(true)
    setMpAccountName(null)
    try {
      const res = await api.post('/config/mercadopago/test', {
        access_token: mpAccessToken,
      })
      if (res.data?.success) {
        setMpAccountName(res.data.data?.nickname || 'Vendedor Mercado Pago')
        toast(`¡Conexión exitosa! Cuenta: ${res.data.data?.nickname}`, 'success')
      }
    } catch (err: any) {
      toast(err?.response?.data?.error || 'Credencial de Mercado Pago inválida', 'error')
    } finally {
      setTestingMp(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Guardar en Backend
      await api.put('/config/costos', {
        precio_filamento_kg: precioFilamentoKg,
        valor_hora_maquina: valorHoraMaquina,
      })

      // Guardar en LocalStorage para acceso rápido síncrono en cotizadores
      localStorage.setItem('costo_filamento_kg_default', precioFilamentoKg.toString())
      localStorage.setItem('costo_hora_maquina_default', valorHoraMaquina.toString())

      toast('Configuración de costos guardada con éxito', 'success')
    } catch (err: any) {
      // Si falla endpoint backend, guardar en localStorage de todas formas
      localStorage.setItem('costo_filamento_kg_default', precioFilamentoKg.toString())
      localStorage.setItem('costo_hora_maquina_default', valorHoraMaquina.toString())
      toast('Configuración guardada localmente', 'success')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl text-white shadow-md">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Configuración del Sistema</h1>
            <p className="text-xs font-medium text-slate-500">
              Parámetros generales de costos y cotización por defecto
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Valores por Defecto del Cotizador
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Estos valores se aplicarán automáticamente para calcular el precio de costo de los artículos cuando ingreses gramos o cargues desde MakerWorld.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Valor Filamento Promedio */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <label className="font-extrabold text-sm text-slate-800 block">
                    Precio de Filamento Promedio ($/kg)
                  </label>
                  <p className="text-[11px] text-slate-500">Costo de compra promedio por rollo de 1kg</p>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 font-black text-slate-400">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={precioFilamentoKg}
                  onChange={(e) => setPrecioFilamentoKg(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                1 gramo = <span className="font-bold text-slate-700">${(precioFilamentoKg / 1000).toFixed(2)}</span>
              </p>
            </div>

            {/* Valor Hora Máquina */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <label className="font-extrabold text-sm text-slate-800 block">
                    Costo Hora de Máquina / Energía ($/h)
                  </label>
                  <p className="text-[11px] text-slate-500">Costo de luz, desgaste y amortización por hora</p>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 font-black text-slate-400">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={valorHoraMaquina}
                  onChange={(e) => setValorHoraMaquina(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                1 hora de impresión = <span className="font-bold text-slate-700">${valorHoraMaquina.toFixed(2)}</span>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-amber-400" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Mercado Pago Checkout Pro Configuration */}
        <form onSubmit={handleSaveMp} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-100 text-sky-700 rounded-2xl">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span>Pasarela de Cobro Mercado Pago (Checkout Pro)</span>
                  {mpActivo ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                      Activo
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Inactivo
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permite a tus clientes pagar de inmediato con tarjeta, dinero en cuenta o cuotas en la tienda pública.
                </p>
              </div>
            </div>

            {/* Activar / Desactivar Switch */}
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mpActivo}
                onChange={(e) => setMpActivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
              <span className="ml-2 text-xs font-bold text-slate-700">
                {mpActivo ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            {/* Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Access Token de Producción *</span>
                  {mpHasToken && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" /> Configurado
                    </span>
                  )}
                </label>
                <a
                  href="https://www.mercadopago.com.ar/developers/panel/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <span>Obtener en Mercado Pago Developers</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showMpToken ? 'text' : 'password'}
                  placeholder={mpHasToken ? `Guardado: ${mpMaskedToken}` : 'Ej: APP_USR-1234567890...'}
                  value={mpAccessToken}
                  onChange={(e) => setMpAccessToken(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowMpToken(!showMpToken)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showMpToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Se almacena en el servidor de forma segura para crear las preferencias de cobro.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Public Key (Opcional) */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5">
                  Public Key (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: APP_USR-xxxx-xxxx..."
                  value={mpPublicKey}
                  onChange={(e) => setMpPublicKey(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              {/* Modo Sandbox */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Modo de Pruebas (Sandbox)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Usa credenciales de test para simular cobros</p>
                </div>
                <input
                  type="checkbox"
                  checked={mpSandbox}
                  onChange={(e) => setMpSandbox(e.target.checked)}
                  className="h-4 w-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
              </div>
            </div>

            {mpAccountName && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cuenta vinculada exitosamente: <strong>{mpAccountName}</strong></span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestMp}
              disabled={testingMp || (!mpAccessToken && !mpHasToken)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              {testingMp ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                  <span>Probar Conexión con Mercado Pago</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={savingMp}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {savingMp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardar Credenciales de Mercado Pago</span>
                </>
              )}
            </button>
          </div>
        </form>
        </>
      )}
    </div>
  )
}
