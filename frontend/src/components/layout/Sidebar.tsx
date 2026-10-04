import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  LogOut,
  Spool,
  ShoppingCart,
  Building2,
  Printer,
  Store,
  CreditCard,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Image as ImageIcon,
  Activity
} from 'lucide-react'

export interface NavGroup {
  label: string
  items: {
    to: string
    label: string
    icon: React.ReactNode
    end?: boolean
  }[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { to: '/pos', label: 'Venta POS', icon: <CreditCard className="h-5 w-5 shrink-0" /> },
      { to: '/pedidos', label: 'Pedidos', icon: <Package className="h-5 w-5 shrink-0" /> },
      { to: '/clientes', label: 'Clientes', icon: <Users className="h-5 w-5 shrink-0" /> },
      { to: '/productos', label: 'Productos', icon: <ShoppingBag className="h-5 w-5 shrink-0" /> },
      { to: '/tienda-admin', label: 'Gestión Tienda', icon: <Store className="h-5 w-5 shrink-0" /> },
      { to: '/visitas', label: 'Visitas & Métricas', icon: <Activity className="h-5 w-5 shrink-0" /> },
      { to: '/multimedia', label: 'Biblioteca Fotos', icon: <ImageIcon className="h-5 w-5 shrink-0" /> },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { to: '/produccion/impresoras', label: 'Impresoras', icon: <Printer className="h-5 w-5 shrink-0" /> },
      { to: '/produccion/filamentos', label: 'Filamentos', icon: <Spool className="h-5 w-5 shrink-0" /> },
      { to: '/compras', label: 'Compras', icon: <ShoppingCart className="h-5 w-5 shrink-0" /> },
      { to: '/proveedores', label: 'Proveedores', icon: <Building2 className="h-5 w-5 shrink-0" /> },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/configuracion', label: 'Configuración', icon: <Settings className="h-5 w-5 shrink-0" /> },
    ],
  },
]

export function Sidebar() {
  const { logout, user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('3ld_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('3ld_sidebar_collapsed', String(isCollapsed))
    } catch {}
  }, [isCollapsed])

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300 relative',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo & Toggle Header */}
      <div className={cn(
        'flex h-16 items-center border-b border-slate-100 px-4 justify-between',
        isCollapsed && 'justify-center px-2'
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-md shadow-primary/20">
            <span className="text-base font-black text-white">3D</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-xl font-black leading-none truncate">
                <span className="text-primary">3</span>
                <span className="text-secondary">L</span>
                <span className="text-accent">D</span>
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sistema ERP</p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shadow-2xs border border-slate-200/60',
            isCollapsed && 'mt-1'
          )}
          title={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
        >
          {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed ? (
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
            ) : (
              <div className="my-2 border-t border-slate-100" />
            )}
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all',
                        isCollapsed && 'justify-center px-0 py-3',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-primary'
                      )
                    }
                  >
                    {item.icon}
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info & Logout */}
      <div className="border-t border-slate-100 p-3">
        {!isCollapsed ? (
          <>
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-purple to-secondary text-sm font-bold text-white shadow-sm shadow-brand-purple/20">
                {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-slate-800">{user?.nombre ?? 'Usuario'}</p>
                <p className="truncate text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.rol ?? ''}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              title={`${user?.nombre ?? 'Usuario'} (${user?.rol ?? ''})`}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-secondary text-sm font-bold text-white shadow-sm"
            >
              {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
