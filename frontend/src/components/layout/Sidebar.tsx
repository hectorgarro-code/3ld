import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  Package,
  Users,
  Calculator,
  ShoppingBag,
  LogOut,
  Spool,
  ShoppingCart,
  Building2,
  Printer,
  Store,
  CreditCard,
  Settings,
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
      { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, end: true },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { to: '/pos', label: 'Venta POS', icon: <CreditCard className="h-5 w-5" /> },
      { to: '/pedidos', label: 'Pedidos', icon: <Package className="h-5 w-5" /> },
      { to: '/clientes', label: 'Clientes', icon: <Users className="h-5 w-5" /> },
      { to: '/productos', label: 'Productos', icon: <ShoppingBag className="h-5 w-5" /> },
      { to: '/tienda-admin', label: 'Gestión Tienda', icon: <Store className="h-5 w-5" /> },
    ],
  },

  {
    label: 'Inventario',
    items: [
      { to: '/produccion/impresoras', label: 'Impresoras', icon: <Printer className="h-5 w-5" /> },
      { to: '/produccion/filamentos', label: 'Filamentos', icon: <Spool className="h-5 w-5" /> },
      { to: '/compras', label: 'Compras', icon: <ShoppingCart className="h-5 w-5" /> },
      { to: '/proveedores', label: 'Proveedores', icon: <Building2 className="h-5 w-5" /> },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/configuracion', label: 'Configuración', icon: <Settings className="h-5 w-5" /> },
    ],
  },
]

export function Sidebar() {
  const { logout, user } = useAuth()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
          <span className="text-base font-black text-white">3D</span>
        </div>
        <div>
          <p className="text-xl font-black leading-none">
            <span className="text-primary">3</span>
            <span className="text-secondary">L</span>
            <span className="text-accent">D</span>
          </p>
          <p className="text-xs font-medium text-slate-500">Sistema ERP</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-primary'
                      )
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info & Logout */}
      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-purple to-secondary text-sm font-bold text-white shadow-sm shadow-brand-purple/20">
            {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-800">{user?.nombre ?? 'Usuario'}</p>
            <p className="truncate text-xs font-medium text-slate-500">{user?.rol ?? ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
