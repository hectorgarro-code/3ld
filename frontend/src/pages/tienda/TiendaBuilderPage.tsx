import React, { useState, useEffect } from 'react'
import {
  Palette,
  Layout,
  Image as ImageIcon,
  Type,
  Eye,
  Save,
  Check,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  Layers,
  ArrowLeft,
  Smartphone,
  Monitor,
  Store,
  Grid,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'

export interface StoreVisualConfig {
  announcement: {
    enabled: boolean
    text: string
    bgGradient: string
    textColor: string
  }
  hero: {
    enabled: boolean
    title: string
    subtitle: string
    ctaText: string
    bgImage: string
    bgColor: string
    textColor: string
  }
  gallery: {
    enabled: boolean
    title: string
    images: string[]
  }
  promoText: {
    enabled: boolean
    title: string
    content: string
    bgColor: string
    textColor: string
    fontSize: string
  }
  catalog: {
    columns: number
    imageAspect: 'square' | 'portrait' | 'landscape'
    accentColor: string
  }
}

const DEFAULT_CONFIG: StoreVisualConfig = {
  announcement: {
    enabled: true,
    text: '🚚 Envío Gratis en La Costa desde $30.000 | Envíos a todo el país',
    bgGradient: 'from-slate-950 via-cyan-950 to-slate-950',
    textColor: '#ffffff',
  },
  hero: {
    enabled: true,
    title: 'Taller de Impresión 3D & Cortantes',
    subtitle: 'Fabricamos tus ideas con la más alta precisión y terminación profesional.',
    ctaText: 'Ver Catálogo',
    bgImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
    bgColor: '#0f172a',
    textColor: '#ffffff',
  },
  gallery: {
    enabled: true,
    title: 'Galería de Trabajos Realizados',
    images: [
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=60',
    ],
  },
  promoText: {
    enabled: true,
    title: '¿Necesitás una pieza a medida?',
    content: 'Enviános tu archivo STL o idea por WhatsApp y te enviamos la cotización en minutos.',
    bgColor: '#06b6d4',
    textColor: '#ffffff',
    fontSize: 'text-base',
  },
  catalog: {
    columns: 4,
    imageAspect: 'square',
    accentColor: '#06b6d4',
  },
}

export default function TiendaBuilderPage() {
  const [config, setConfig] = useState<StoreVisualConfig>(DEFAULT_CONFIG)
  const [activeTab, setActiveTab] = useState<'announcement' | 'hero' | 'gallery' | 'promo' | 'catalog'>('announcement')
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [newGalleryUrl, setNewGalleryUrl] = useState('')

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await api.get('/tienda/config')
        if (res.data?.data) {
          setConfig((prev) => ({ ...prev, ...res.data.data }))
        }
      } catch (err) {
        const saved = localStorage.getItem('3ld_tienda_visual_config')
        if (saved) setConfig(JSON.parse(saved))
      }
    }
    loadConfig()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/tienda/config', config)
      localStorage.setItem('3ld_tienda_visual_config', JSON.stringify(config))
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err) {
      localStorage.setItem('3ld_tienda_visual_config', JSON.stringify(config))
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const addGalleryImage = () => {
    if (!newGalleryUrl.trim()) return
    setConfig((prev) => ({
      ...prev,
      gallery: {
        ...prev.gallery,
        images: [...prev.gallery.images, newGalleryUrl.trim()],
      },
    }))
    setNewGalleryUrl('')
  }

  const removeGalleryImage = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      gallery: {
        ...prev.gallery,
        images: prev.gallery.images.filter((_, i) => i !== index),
      },
    }))
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Top Bar Editor Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/tienda-admin"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            title="Volver al Admin"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h1 className="font-black text-sm tracking-tight text-white">Editor Visual de Tienda 3LD</h1>
            <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
              Modo Elementor Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('desktop')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition ${
                viewMode === 'desktop' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition ${
                viewMode === 'mobile' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" /> Celular
            </button>
          </div>

          <a
            href="/tienda"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            <Eye className="h-3.5 w-3.5" /> Vista Previa
          </a>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold rounded-xl shadow-md transition disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="h-4 w-4 text-emerald-300" /> Guardado
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Publicar Diseño'}
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Builder Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side Controls (Elementor Toolbox) */}
        <aside className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 z-20">
          {/* Tool Tabs */}
          <div className="flex border-b border-slate-800 text-xs font-bold bg-slate-900 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('announcement')}
              className={`flex-1 p-3 text-center transition border-b-2 whitespace-nowrap ${
                activeTab === 'announcement'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Banner Top
            </button>
            <button
              onClick={() => setActiveTab('hero')}
              className={`flex-1 p-3 text-center transition border-b-2 whitespace-nowrap ${
                activeTab === 'hero'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Hero Principal
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 p-3 text-center transition border-b-2 whitespace-nowrap ${
                activeTab === 'gallery'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Galería
            </button>
            <button
              onClick={() => setActiveTab('promo')}
              className={`flex-1 p-3 text-center transition border-b-2 whitespace-nowrap ${
                activeTab === 'promo'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Texto Promo
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 p-3 text-center transition border-b-2 whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Catálogo
            </button>
          </div>

          {/* Tab Content Controls */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Announcement Tab */}
            {activeTab === 'announcement' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="font-bold text-slate-200">Mostrar Banner Superior</span>
                  <input
                    type="checkbox"
                    checked={config.announcement.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        announcement: { ...prev.announcement, enabled: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Texto del Anuncio</label>
                  <input
                    type="text"
                    value={config.announcement.text}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        announcement: { ...prev.announcement, text: e.target.value },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-medium"
                  />
                </div>
              </div>
            )}

            {/* Hero Tab */}
            {activeTab === 'hero' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="font-bold text-slate-200">Mostrar Banner Hero</span>
                  <input
                    type="checkbox"
                    checked={config.hero.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, enabled: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Título Principal</label>
                  <input
                    type="text"
                    value={config.hero.title}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, title: e.target.value },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Subtítulo Explicativo</label>
                  <textarea
                    rows={3}
                    value={config.hero.subtitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, subtitle: e.target.value },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-medium resize-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">URL Imagen de Fondo (Banner)</label>
                  <input
                    type="text"
                    value={config.hero.bgImage}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, bgImage: e.target.value },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Texto del Botón CTA</label>
                  <input
                    type="text"
                    value={config.hero.ctaText}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, ctaText: e.target.value },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-bold"
                  />
                </div>
              </div>
            )}

            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="font-bold text-slate-200">Mostrar Galería</span>
                  <input
                    type="checkbox"
                    checked={config.gallery.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        gallery: { ...prev.gallery, enabled: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Título de la Galería</label>
                  <input
                    type="text"
                    value={config.gallery.title}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        gallery: { ...prev.gallery, title: e.target.value },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Agregar Foto (URL Imagen)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGalleryUrl}
                      onChange={(e) => setNewGalleryUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-[11px]"
                    />
                    <button
                      onClick={addGalleryImage}
                      className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="font-bold text-slate-400 block">Fotos en Galería ({config.gallery.images.length})</label>
                  {config.gallery.images.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800">
                      <img src={img} alt="Thumb" className="h-10 w-10 object-cover rounded-lg shrink-0" />
                      <span className="flex-1 truncate font-mono text-[10px] text-slate-400">{img}</span>
                      <button
                        onClick={() => removeGalleryImage(idx)}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Text Tab */}
            {activeTab === 'promo' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="font-bold text-slate-200">Mostrar Bloque de Texto Promo</span>
                  <input
                    type="checkbox"
                    checked={config.promoText.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        promoText: { ...prev.promoText, enabled: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Título de Promoción</label>
                  <input
                    type="text"
                    value={config.promoText.title}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        promoText: { ...prev.promoText, title: e.target.value },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Contenido / Texto Explicativo</label>
                  <textarea
                    rows={4}
                    value={config.promoText.content}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        promoText: { ...prev.promoText, content: e.target.value },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-medium resize-none"
                  />
                </div>
              </div>
            )}

            {/* Catalog Layout Tab */}
            {activeTab === 'catalog' && (
              <div className="space-y-4">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Columnas de Productos en Desktop</label>
                  <select
                    value={config.catalog.columns}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        catalog: { ...prev.catalog, columns: parseInt(e.target.value) },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-bold"
                  >
                    <option value={2}>2 Columnas Grandes</option>
                    <option value={3}>3 Columnas Estándar</option>
                    <option value={4}>4 Columnas Compactas</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Proporción de Imagen de Producto</label>
                  <select
                    value={config.catalog.imageAspect}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        catalog: { ...prev.catalog, imageAspect: e.target.value as any },
                      }))
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-bold"
                  >
                    <option value="square">Cuadrada (1:1)</option>
                    <option value="portrait">Vertical (3:4)</option>
                    <option value="landscape">Panorámica (16:9)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Live Preview Workspace */}
        <main className="flex-1 bg-slate-950 p-6 overflow-y-auto flex items-center justify-center">
          <div
            className={`bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
              viewMode === 'mobile' ? 'w-[375px] min-h-[667px] border-8 border-slate-800 rounded-[36px]' : 'w-full max-w-5xl min-h-[700px]'
            }`}
          >
            {/* Live Render Preview Container */}
            <div className="min-h-full flex flex-col font-sans">
              {/* Top Banner */}
              {config.announcement.enabled && (
                <div className={`bg-gradient-to-r ${config.announcement.bgGradient} text-white text-[11px] py-2 px-4 text-center font-bold tracking-wide flex items-center justify-center gap-2`}>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{config.announcement.text}</span>
                </div>
              )}

              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2 font-black text-lg text-slate-900">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-cyan-400 flex items-center justify-center font-black text-base">
                    3D
                  </div>
                  <span>3LD TIENDA</span>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Catálogo
                </span>
              </div>

              {/* Hero Banner */}
              {config.hero.enabled && (
                <div className="relative bg-slate-900 text-white p-8 md:p-12 overflow-hidden flex flex-col items-center justify-center text-center">
                  <img
                    src={config.hero.bgImage}
                    alt="Hero Bg"
                    className="absolute inset-0 w-full h-full object-cover opacity-25"
                  />
                  <div className="relative z-10 max-w-xl">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                      {config.hero.title}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-300 mt-2 font-medium leading-relaxed">
                      {config.hero.subtitle}
                    </p>
                    <button className="mt-4 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-extrabold text-xs rounded-xl shadow-lg transition">
                      {config.hero.ctaText}
                    </button>
                  </div>
                </div>
              )}

              {/* Gallery Section */}
              {config.gallery.enabled && config.gallery.images.length > 0 && (
                <div className="p-6 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-900 mb-3">{config.gallery.title}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {config.gallery.images.map((img, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-200 shadow-2xs">
                        <img src={img} alt="Gallery" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Promo Text Section */}
              {config.promoText.enabled && (
                <div className="p-6 bg-cyan-600 text-white text-center">
                  <h3 className="text-base font-black">{config.promoText.title}</h3>
                  <p className="text-xs mt-1 opacity-90">{config.promoText.content}</p>
                </div>
              )}

              {/* Product Catalog Grid Preview */}
              <div className="p-6 flex-1 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-slate-900">Productos Destacados</h3>
                  <span className="text-xs text-slate-400 font-bold">Modo Vista Previa</span>
                </div>

                <div className={`grid gap-4 ${viewMode === 'mobile' ? 'grid-cols-2' : config.catalog.columns === 2 ? 'grid-cols-2' : config.catalog.columns === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-col">
                      <div className={`w-full bg-slate-100 rounded-xl overflow-hidden mb-2 ${config.catalog.imageAspect === 'portrait' ? 'aspect-[3/4]' : config.catalog.imageAspect === 'landscape' ? 'aspect-video' : 'aspect-square'}`}>
                        <img
                          src={`https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&auto=format&fit=crop&q=60`}
                          alt="Demo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-cyan-600 uppercase">Cortantes</span>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">Producto Demo {item}</p>
                      <span className="text-xs font-black text-slate-900 mt-2">$8.500</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
