import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Home, Package, Calculator, Plus, Menu } from 'lucide-react'

interface BottomNavProps {
  onOpenMenu: () => void
  onOpenQuickCreate: () => void
}

export function BottomNav({ onOpenMenu, onOpenQuickCreate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden">
      {/* Inicio */}
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
            isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          )
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                isActive ? 'bg-primary/10 scale-105' : ''
              )}
            >
              <Home className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold leading-none">Inicio</span>
          </>
        )}
      </NavLink>

      {/* Pedidos */}
      <NavLink
        to="/pedidos"
        className={({ isActive }) =>
          cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
            isActive ? 'text-secondary' : 'text-slate-400 hover:text-slate-600'
          )
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                isActive ? 'bg-secondary/10 scale-105' : ''
              )}
            >
              <Package className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold leading-none">Pedidos</span>
          </>
        )}
      </NavLink>

      {/* Botón Central "+" Crear Nuevo (Pedido o Producto) */}
      <div className="flex flex-1 items-center justify-center">
        <button
          onClick={onOpenQuickCreate}
          className="flex flex-col items-center justify-center -mt-5 group"
          title="Crear Nuevo (Pedido o Producto)"
          aria-label="Crear Nuevo"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/40 transition-transform active:scale-95 group-hover:scale-105">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-bold text-primary mt-0.5 leading-none">Nuevo</span>
        </button>
      </div>

      {/* Cotizar */}
      <NavLink
        to="/cotizador"
        className={({ isActive }) =>
          cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
            isActive ? 'text-brand-green' : 'text-slate-400 hover:text-slate-600'
          )
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                isActive ? 'bg-brand-green/10 scale-105' : ''
              )}
            >
              <Calculator className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold leading-none">Cotizar</span>
          </>
        )}
      </NavLink>

      {/* Menú Drawer */}
      <button
        onClick={onOpenMenu}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-slate-400 transition-colors hover:text-slate-600"
        aria-label="Abrir menú completo"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl">
          <Menu className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-semibold leading-none">Menú</span>
      </button>
    </nav>
  )
}
