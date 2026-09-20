import { Bell, Menu, User2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/pedidos': 'Ventas',
  '/pedidos/nuevo': 'Nuevo Pedido',
  '/clientes': 'Clientes',
  '/productos': 'Productos',
  '/produccion': 'Producción',
  '/produccion/filamentos': 'Filamentos',
  '/produccion/impresoras': 'Impresoras',
  '/compras': 'Compras',
  '/proveedores': 'Proveedores',
}

interface TopBarProps {
  onOpenMenu?: () => void
}

export function TopBar({ onOpenMenu }: TopBarProps) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const getTitle = () => {
    const path = location.pathname
    if (PAGE_TITLES[path]) return PAGE_TITLES[path]
    if (path.startsWith('/pedidos/')) return 'Detalle de Pedido'
    if (path.startsWith('/clientes/')) return 'Detalle de Cliente'
    if (path.startsWith('/compras/')) return 'Detalle de Compra'
    if (path.startsWith('/proveedores/')) return 'Detalle de Proveedor'
    return '3LD'
  }

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between bg-transparent px-4">
      {/* Mobile Logo & Menu Button */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={onOpenMenu}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100 active:scale-95"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
          <span className="text-sm font-black text-white">3D</span>
        </div>
      </div>

      {/* Page title Desktop */}
      <h1 className="text-2xl font-black text-slate-800 tracking-tight lg:block hidden">
        {getTitle()}
      </h1>

      {/* Page title Mobile */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-black text-slate-800 lg:hidden">
        {getTitle()}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-3 ml-auto bg-white px-3 py-1.5 rounded-full card-shadow">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 transition-colors hover:bg-slate-100">
          <Bell className="h-4 w-4 text-slate-500" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-secondary text-sm font-bold text-white shadow-sm shadow-brand-purple/20">
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : <User2 className="h-4 w-4" />}
          </div>
          <span className="hidden text-sm font-bold text-slate-700 md:block pr-2">
            {user?.nombre?.split(' ')[0]}
          </span>
        </div>
      </div>
    </header>
  )
}
