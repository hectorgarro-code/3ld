import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import './index.css'

// Auto-recarga limpia ante nuevos despliegues si un chunk de código o estilo cambia de hash (con salvaguarda contra bucles)
window.addEventListener('vite:preloadError', () => {
  const lastReload = sessionStorage.getItem('3ld_last_preload_reload')
  const now = Date.now()
  if (!lastReload || now - Number(lastReload) > 15000) {
    sessionStorage.setItem('3ld_last_preload_reload', String(now))
    window.location.reload()
  }
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)
