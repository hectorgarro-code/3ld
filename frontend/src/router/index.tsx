import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'

// Loading fallback
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50/50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Lazy pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const VentasPage = lazy(() => import('@/pages/ventas/VentasPage'))
const PedidoDetailPage = lazy(() => import('@/pages/ventas/PedidoDetailPage'))
const NuevoPedidoPage = lazy(() => import('@/pages/ventas/NuevoPedidoPage'))
const ClientesPage = lazy(() => import('@/pages/clientes/ClientesPage'))
const ClienteDetailPage = lazy(() => import('@/pages/clientes/ClienteDetailPage'))
const ProductosPage = lazy(() => import('@/pages/productos/ProductosPage'))
const ProduccionPage = lazy(() => import('@/pages/produccion/ProduccionPage'))
const FilamentosPage = lazy(() => import('@/pages/produccion/FilamentosPage'))
const ImpresorasPage = lazy(() => import('@/pages/produccion/ImpresorasPage'))

// Compras
const ProveedoresPage = lazy(() => import('@/pages/compras/ProveedoresPage'))
const ProveedorDetailPage = lazy(() => import('@/pages/compras/ProveedorDetailPage'))
const ComprasPage = lazy(() => import('@/pages/compras/ComprasPage'))
const NuevaCompraPage = lazy(() => import('@/pages/compras/NuevaCompraPage'))

const CotizadorPage = lazy(() => import('@/pages/cotizador/CotizadorPage'))
const TiendaPage = lazy(() => import('@/pages/tienda/TiendaPage'))
const TiendaAdminPage = lazy(() => import('@/pages/tienda/TiendaAdminPage'))

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'pedidos',
        element: (
          <Suspense fallback={<PageLoader />}>
            <VentasPage />
          </Suspense>
        ),
      },
      {
        path: 'pedidos/nuevo',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NuevoPedidoPage />
          </Suspense>
        ),
      },
      {
        path: 'pedidos/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PedidoDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'clientes',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ClientesPage />
          </Suspense>
        ),
      },
      {
        path: 'clientes/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ClienteDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'productos',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProductosPage />
          </Suspense>
        ),
      },
      {
        path: 'produccion',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProduccionPage />
          </Suspense>
        ),
      },
      {
        path: 'produccion/filamentos',
        element: (
          <Suspense fallback={<PageLoader />}>
            <FilamentosPage />
          </Suspense>
        ),
      },
      {
        path: 'produccion/impresoras',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ImpresorasPage />
          </Suspense>
        ),
      },
      {
        path: 'proveedores',
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProveedoresPage />
              </Suspense>
            ),
          },
          {
            path: ':id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProveedorDetailPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'compras',
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <ComprasPage />
              </Suspense>
            ),
          },
          {
            path: 'nueva',
            element: (
              <Suspense fallback={<PageLoader />}>
                <NuevaCompraPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'cotizador',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CotizadorPage />
          </Suspense>
        ),
      },
      {
        path: 'tienda-admin',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TiendaAdminPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/tienda',
    element: (
      <Suspense fallback={<PageLoader />}>
        <TiendaPage />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
