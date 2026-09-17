import { useAuthStore } from '@/store/authStore'
import { useKpis, useAlertas } from '@/hooks/useDashboard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { StockPanel } from '@/components/dashboard/StockPanel'
import { EntregasPanel } from '@/components/dashboard/EntregasPanel'
import { TopProductosPanel } from '@/components/dashboard/TopProductosPanel'
import { formatARS } from '@/lib/cost-calculator'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Package, ShoppingBag, Factory, Printer,
  TrendingUp, BarChart2, DollarSign, Wallet, Percent, ArrowUpRight, ArrowDownRight, Archive
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: kpis, isLoading: kpisLoading } = useKpis()
  const { data: alertas, isLoading: alertasLoading } = useAlertas()

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? '¡Buenos días' : hour < 18 ? '¡Buenas tardes' : '¡Buenas noches'

  const rentabilidad = kpis?.rentabilidad_mes ?? 0
  const ventasMes = kpis?.ventas_mes ?? 0
  const margen = ventasMes > 0 ? (rentabilidad / ventasMes) * 100 : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-black text-slate-800">
          {greeting}, {user?.nombre?.split(' ')[0] ?? ''}! 👋
        </h2>
        <p className="text-sm font-medium text-slate-500">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          title="Ventas Hoy"
          value={kpis ? formatARS(kpis.ventas_hoy) : '$0'}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
          isLoading={kpisLoading}
        />
        <KpiCard
          title="Ventas Mes"
          value={kpis ? formatARS(kpis.ventas_mes) : '$0'}
          icon={<ShoppingBag className="h-5 w-5" />}
          color="purple"
          isLoading={kpisLoading}
        />
        <KpiCard
          title="Ventas Mes Anterior"
          value={kpis ? formatARS(kpis.ventas_mes_anterior) : '$0'}
          icon={<BarChart2 className="h-5 w-5" />}
          color="secondary"
          isLoading={kpisLoading}
        />
        <KpiCard
          title="Saldo por Cobrar"
          value={kpis ? formatARS(kpis.saldo_por_cobrar) : '$0'}
          icon={<Wallet className="h-5 w-5" />}
          color="accent"
          isLoading={kpisLoading}
        />
        <KpiCard
          title="Rentabilidad Mes"
          value={kpis ? formatARS(rentabilidad) : '$0'}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
          isLoading={kpisLoading}
        />
        <KpiCard
          title="Margen de Ganancia"
          value={kpis ? `${margen.toFixed(1)}%` : '0%'}
          icon={<Percent className="h-5 w-5" />}
          color="primary"
          isLoading={kpisLoading}
        />
        <KpiCard
          title="Pedidos Pendientes"
          value={kpis?.pedidos_pendientes ?? 0}
          icon={<Package className="h-5 w-5" />}
          color="purple"
          isLoading={kpisLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Chart (2/3 width) */}
        <div className="rounded-2xl bg-white p-6 card-shadow lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">
            📈 Ventas de la semana
          </h3>
          {kpisLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : kpis?.ventas_semana && kpis.ventas_semana.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={kpis.ventas_semana}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={(v) => formatDate(v).slice(0, 5)}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    color: '#1e293b',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                  formatter={(v: any) => [formatARS(Number(v)), 'Ventas']}
                  labelFormatter={(l) => formatDate(l)}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-primary)"
                  strokeWidth={4}
                  dot={{ fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#fff', r: 5 }}
                  activeDot={{ r: 8, fill: 'var(--color-primary)', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center font-semibold text-slate-400 bg-slate-50 rounded-xl">
              Sin datos de ventas disponibles
            </div>
          )}
        </div>

        {/* Stock Valorizado (1/3 width) */}
        <div className="lg:col-span-1 rounded-2xl bg-white p-6 card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Archive className="h-5 w-5 text-slate-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              Stock Valorizado
            </h3>
          </div>
          {kpisLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Actual</span>
                <span className="text-3xl font-black text-slate-800 tracking-tight">
                  {formatARS(kpis?.stock_valorizado?.total ?? 0)}
                </span>
                
                {(() => {
                  const actual = kpis?.stock_valorizado?.total ?? 0
                  const anterior = kpis?.stock_valorizado?.mes_anterior ?? 0
                  if (anterior === 0) return <span className="text-xs text-slate-400 font-medium mt-1">Sin datos del mes anterior</span>
                  const pct = ((actual - anterior) / anterior) * 100
                  const isUp = pct >= 0
                  return (
                    <div className="flex items-center gap-1 mt-1">
                      {isUp ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                      <span className={`text-xs font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                        {Math.abs(pct).toFixed(1)}% vs mes anterior
                      </span>
                    </div>
                  )
                })()}
              </div>

              <div className="flex-1 space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-sm font-semibold text-slate-600">Mercadería</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{formatARS(kpis?.stock_valorizado?.mercaderia ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-sm font-semibold text-slate-600">Filamentos</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{formatARS(kpis?.stock_valorizado?.filamentos ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-sm font-semibold text-slate-600">Insumos</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{formatARS(kpis?.stock_valorizado?.insumos ?? 0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Productos (1/3 width) */}
        <div className="lg:col-span-1">
          {kpisLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <TopProductosPanel productos={kpis?.top_productos ?? []} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alerts / Stock */}
        <div className="space-y-3">
          {alertasLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : alertas ? (
            <StockPanel alertas={alertas} />
          ) : null}
        </div>

        {/* Entregas */}
        <div className="space-y-3">
          {alertasLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : alertas ? (
            <EntregasPanel alertas={alertas} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
