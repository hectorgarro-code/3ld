import React, { useState } from 'react'
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal'
import { Image as ImageIcon, Upload, Sliders, Zap } from 'lucide-react'

export default function MediaPage() {
  const [isModalOpen, setIsModalOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload' | 'editor'>('gallery')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-black">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Biblioteca Multimedia & Optimizador WebP
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Herramientas de retocado, recortes de aspecto (1:1, 4:3, 16:9, 9:16) y compresión automática WebP para la tienda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('gallery')
              setIsModalOpen(true)
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>Abrir Biblioteca</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('upload')
              setIsModalOpen(true)
            }}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Upload className="w-4 h-4" />
            <span>Subir & Convertir WebP</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => {
            setActiveTab('gallery')
            setIsModalOpen(true)
          }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition group"
        >
          <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <ImageIcon className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">Galería de Imágenes</h3>
          <p className="text-xs text-slate-500">
            Explorá todas las fotos subidas, copiá URLs públicas y organizá las imágenes de tus productos.
          </p>
        </div>

        <div
          onClick={() => {
            setActiveTab('upload')
            setIsModalOpen(true)
          }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">Conversión WebP Automática</h3>
          <p className="text-xs text-slate-500">
            Comprimí fotos pesadas reduciendo su peso hasta un 90% sin perder calidad visible.
          </p>
        </div>

        <div
          onClick={() => {
            setActiveTab('editor')
            setIsModalOpen(true)
          }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition group"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Sliders className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">Retoque y Recortes</h3>
          <p className="text-xs text-slate-500">
            Ajustá brillo, contraste, saturación, rotación y aplicá recortes 1:1 Cuadrado Tienda o 9:16 Historias.
          </p>
        </div>
      </div>

      <MediaLibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTab={activeTab}
      />
    </div>
  )
}
