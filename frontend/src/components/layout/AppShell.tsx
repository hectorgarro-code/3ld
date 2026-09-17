import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { MobileDrawer } from './MobileDrawer'
import { QuickCreateModal } from './QuickCreateModal'
import { ProductoFormModal } from '@/components/productos/ProductoFormModal'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { Plus } from 'lucide-react'

export default function AppShell() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)

  // Product creation modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [productInitialImages, setProductInitialImages] = useState<string[]>([])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === '+') {
        e.preventDefault()
        setIsQuickCreateOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpenProductForm = (initialImages?: string[]) => {
    setProductInitialImages(initialImages || [])
    setIsProductModalOpen(true)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      {/* Mobile Drawer Navigation */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Quick Create Selector Modal (Pedido vs Producto) */}
      <QuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        onOpenProductForm={handleOpenProductForm}
      />

      {/* Producto Form Modal */}
      <ProductoFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        initialImages={productInitialImages}
      />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden relative min-w-0 min-h-0">
        <TopBar onOpenMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto min-h-0">
          {/* Content with bottom padding on mobile for BottomNav */}
          <div className="min-h-full p-4 pb-24 lg:p-6 lg:pb-6">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          onOpenQuickCreate={() => setIsQuickCreateOpen(true)}
        />

        {/* Desktop Floating Action Button */}
        {location.pathname !== '/pedidos/nuevo' && (
          <button
            onClick={() => setIsQuickCreateOpen(true)}
            title="Crear Nuevo (Tecla +)"
            className="hidden lg:flex fixed bottom-8 right-8 z-30 h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-dark text-white shadow-xl shadow-primary/30 transition-all hover:scale-105 hover:shadow-primary/50 print-hidden"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      <ToastContainer />
    </div>
  )
}
