import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  MessageCircle,
  ShoppingCart,
  Sparkles,
  Heart,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  Layers,
  Activity
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import api from '@/lib/api'

interface AnalyticsStats {
  period: string
  total_sesiones: number
  visitantes_unicos: number
  eventos: {
    pageviews: number
    vistas_producto: number
    vistas_historias: number
    likes: number
    carritos: number
    whatsapp: number
    cotizaciones: number
  }
  devices: { device_type: string; count: number }[]
  browsers: { browser: string; count: number }[]
  os: { os: string; count: number }[]
  top_products: { producto_id: string; producto_nombre: string; vistas: number }[]
  timeline: { fecha: string; sesiones: number; total_eventos: number }[]
  recent_visits: {
    session_id: string
    device_type: string
    browser: string
    os: string
    referer: string | null
    landing_page: string | null
    created_at: string
    updated_at: string
    total_acciones: number
    ultima_accion: string | null
    ultimo_producto: string | null
  }[]
}

export default function VisitasPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d'>('7d')

  const { data: stats, isLoading, refetch, isFetching } = useQuery<AnalyticsStats>({
    queryKey: ['admin-visitas-stats', period],
    queryFn: async () => {
      const res = await api.get(`/analytics/stats?period=${period}`)
      return res.data?.data || null
    },
    refetchInterval: 30000, // Refrescar automáticamente cada 30 segundos
  })

  // Formato relativo de tiempo para las visitas recientes
  const getRelativeTime = (dateStr: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
      if (diffSec < 60) return 'Hace instantes'
      const diffMin = Math.floor(diffSec / 60)
      if (diffMin < 60) return `Hace ${diffMin} min`
      const diffHours = Math.floor(diffMin / 60)
      if (diffHours < 24) return `Hace ${diffHours} h`
      const diffDays = Math.floor(diffHours / 24)
      return `Hace ${diffDays} d`
    } catch {
      return dateStr
    }
  }

  // Traducción y badge para tipos de acciones
  const renderActionBadge = (action: string | null, product: string | null) => {
    if (!action) return <span className="text-slate-400 text-xs">Navegando el catálogo</span>

    switch (action) {
      case 'ver_producto':
        return (
          <span className="inline-flex items-center gap-1 text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md text-xs font-semibold">
            <Eye className="w-3 h-3 text-cyan-600" /> Vio: {product || 'Producto'}
          </span>
        )
      case 'ver_historia':
        return (
          <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-xs font-semibold">
            <Sparkles className="w-3 h-3 text-purple-600" /> Vio historia: {product || 'Producto'}
          </span>
        )
      case 'agregar_carrito':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-bold">
            <ShoppingCart className="w-3 h-3 text-emerald-600" /> Añadió al carrito {product ? `(${product})` : ''}
          </span>
        )
      case 'whatsapp_click':
        return (
          <span className="inline-flex items-center gap-1 text-green-800 bg-green-100 px-2 py-0.5 rounded-md text-xs font-bold">
            <MessageCircle className="w-3 h-3 text-green-600" /> Clic en WhatsApp {product ? `(${product})` : ''}
          </span>
        )
      case 'like_producto':
        return (
          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-md text-xs font-semibold">
            <Heart className="w-3 h-3 text-red-500 fill-red-500" /> Le gustó {product || 'Producto'}
          </span>
        )
      case 'cotizar_click':
        return (
          <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-xs font-semibold">
            <Layers className="w-3 h-3 text-indigo-600" /> Abrió Cotizador STL
          </span>
        )
      default:
        return <span className="text-slate-600 text-xs font-medium">Explorando tienda ({action})</span>
    }
  }

  // Cálculos de porcentajes de dispositivos
  const totalDeviceVisits = stats?.devices.reduce((acc, d) => acc + Number(d.count), 0) || 1
  const mobileCount = stats?.devices.find((d) => d.device_type === 'mobile')?.count || 0
  const desktopCount = stats?.devices.find((d) => d.device_type === 'desktop')?.count || 0
  const tabletCount = stats?.devices.find((d) => d.device_type === 'tablet')?.count || 0

  const mobilePct = Math.round((Number(mobileCount) / totalDeviceVisits) * 100)
  const desktopPct = Math.round((Number(desktopCount) / totalDeviceVisits) * 100)
  const tabletPct = Math.round((Number(tabletCount) / totalDeviceVisits) * 100)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Encabezado y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-[#6B66C8] to-[#06b6d4] text-white rounded-xl shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Estadísticas & Visitas Reales</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Métricas nativas y privadas con 0% impacto en la velocidad del sitio.
          </p>
        </div>

        {/* Selector de Rango y Botón Refrescar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200 text-xs font-bold">
            {(
              [
                { id: 'today', label: 'Hoy' },
                { id: '7d', label: '7 días' },
                { id: '30d', label: '30 días' },
                { id: '90d', label: '90 días' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                onClick={() => setPeriod(btn.id)}
                className={`px-3 py-1.5 rounded-xl transition ${
                  period === btn.id
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-[#6B66C8]' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-20 bg-white rounded-3xl border border-slate-200">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#6B66C8] animate-spin" />
            <p className="text-xs font-bold text-slate-500">Cargando métricas de la tienda...</p>
          </div>
        </div>
      ) : stats ? (
        <>
          {/* Tarjetas Principales de KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Visitas */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Visitas (Sesiones)</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {stats.total_sesiones.toLocaleString('es-AR')}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  {stats.visitantes_unicos.toLocaleString('es-AR')} personas únicas
                </span>
              </div>
            </div>

            {/* Vistas de Productos */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Productos Mirados</span>
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {stats.eventos.vistas_producto.toLocaleString('es-AR')}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Fichas de detalle abiertas
                </span>
              </div>
            </div>

            {/* Añadidos al Carrito */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Intenciones de Compra</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {stats.eventos.carritos.toLocaleString('es-AR')}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Veces agregado al carrito
                </span>
              </div>
            </div>

            {/* Clics en WhatsApp / Cotizaciones */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Contactos a WhatsApp</span>
                <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                  <MessageCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {stats.eventos.whatsapp.toLocaleString('es-AR')}
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Consultas directas por chat
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico de Evolución y Dispositivos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Tendencia Diaria */}
            <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Evolución de Tráfico Diario</h2>
                  <p className="text-[11px] text-slate-400">Sesiones e interacciones por día</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-[#6B66C8]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6B66C8]"></span> Visitas
                  </span>
                  <span className="flex items-center gap-1 text-cyan-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Acciones
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                {stats.timeline.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No hay datos registrados en este rango de tiempo.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.timeline}>
                      <defs>
                        <linearGradient id="visitasGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6B66C8" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6B66C8" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="eventosGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="fecha"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickFormatter={(val) => {
                          const parts = val.split('-')
                          return `${parts[2]}/${parts[1]}`
                        }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '16px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sesiones"
                        name="Visitas"
                        stroke="#6B66C8"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#visitasGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="total_eventos"
                        name="Acciones totales"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#eventosGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Dispositivos y Orígenes */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">Dispositivos de Acceso</h2>
                <p className="text-[11px] text-slate-400 mb-4">¿Desde dónde navegan tus clientes?</p>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-purple-600" /> Celulares
                      </span>
                      <span>{mobilePct}% ({mobileCount})</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${mobilePct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 text-blue-600" /> Computadoras
                      </span>
                      <span>{desktopPct}% ({desktopCount})</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${desktopPct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Tablet className="w-4 h-4 text-cyan-600" /> Tablets
                      </span>
                      <span>{tabletPct}% ({tabletCount})</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${tabletPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Navegadores Principales (In-App detection) */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Navegadores & Redes
                </span>
                <div className="space-y-1.5">
                  {stats.browsers.slice(0, 4).map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium truncate max-w-[150px]">{b.browser}</span>
                      <span className="text-slate-900 font-bold">{b.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top 10 Productos Más Vistos */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">Productos Más Populares</h2>
                <p className="text-[11px] text-slate-400">Los artículos que capturan más la atención de los visitantes</p>
              </div>
              <span className="text-xs bg-cyan-50 text-cyan-700 font-bold px-2.5 py-1 rounded-xl">
                Ranking Top 10
              </span>
            </div>

            {stats.top_products.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Aún no hay visualizaciones de productos registradas en este período.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.top_products.map((p, idx) => {
                  const maxVistas = stats.top_products[0]?.vistas || 1
                  const pct = Math.round((p.vistas / maxVistas) * 100)
                  return (
                    <div key={p.producto_id || idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{p.producto_nombre || 'Artículo sin nombre'}</p>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-[#6B66C8] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#6B66C8] shrink-0">
                        {p.vistas} vistas
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* En Vivo: Últimas Visitas y Qué Hicieron */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h2 className="text-sm font-black text-slate-900">Actividad en Vivo de Visitantes</h2>
                </div>
                <p className="text-[11px] text-slate-400">¿Qué están haciendo las personas que entran a la tienda ahora mismo?</p>
              </div>
              <span className="text-xs text-slate-400 font-medium">Últimas 40 sesiones</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-2 pl-2">Tiempo</th>
                    <th className="pb-2">Dispositivo / Entorno</th>
                    <th className="pb-2">Última Acción Realizada</th>
                    <th className="pb-2 text-center">Acciones</th>
                    <th className="pb-2 text-right pr-2">Origen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recent_visits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No hay sesiones recientes registradas.
                      </td>
                    </tr>
                  ) : (
                    stats.recent_visits.map((v, i) => (
                      <tr key={v.session_id || i} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 pl-2 font-medium text-slate-500 whitespace-nowrap">
                          {getRelativeTime(v.updated_at || v.created_at)}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            {v.device_type === 'mobile' ? (
                              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                            ) : v.device_type === 'tablet' ? (
                              <Tablet className="w-3.5 h-3.5 text-cyan-600" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span>{v.browser}</span>
                            <span className="text-slate-400 text-[10px]">({v.os})</span>
                          </div>
                        </td>
                        <td className="py-3">
                          {renderActionBadge(v.ultima_accion, v.ultimo_producto)}
                        </td>
                        <td className="py-3 text-center">
                          <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
                            {v.total_acciones}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2 text-slate-400 text-[11px] truncate max-w-[140px]">
                          {v.referer ? (
                            <span title={v.referer} className="hover:underline">
                              {v.referer.replace(/^https?:\/\//, '').split('/')[0]}
                            </span>
                          ) : (
                            <span className="text-slate-300">Directo / QR</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
