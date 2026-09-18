import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sistema 3LD',
        short_name: '3LD',
        description: 'ERP para 3LD - Impresión 3D y Retail',
        theme_color: '#FF6B35',
        background_color: '#1A1B2E',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://sistema.3ld.com.ar',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://sistema.3ld.com.ar',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
