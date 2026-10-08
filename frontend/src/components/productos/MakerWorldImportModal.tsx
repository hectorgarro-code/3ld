import React, { useState, useEffect } from 'react'
import {
  X,
  Sparkles,
  Loader2,
  ExternalLink,
  Check,
  Package,
  Store,
  Bot,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
  Plus,
  Upload,
} from 'lucide-react'
import api from '@/lib/api'
import type { ProductoPieza } from '@/types'
import { compressImage } from '@/lib/imageUtils'
import { useCreateProducto, useCategorias } from '@/hooks/useProductos'
import { toast } from '@/store/toastStore'
import { CostoImpresionModal } from './CostoImpresionModal'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function MakerWorldImportModal({ isOpen, onClose, onSuccess }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Scraped & AI Generated Product State
  const [importedData, setImportedData] = useState<{
    title: string
    description: string
    category: string
    subcategoria?: string
    suggested_price: number
    images: string[]
    source_url: string
  } | null>(null)

  // Form Editing State for Confirmation
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('last_categoria_id')
    return saved ? parseInt(saved, 10) : undefined
  })
  const [subcategoria, setSubcategoria] = useState<string>(() => {
    return localStorage.getItem('last_subcategoria') || ''
  })
  const [precioVenta, setPrecioVenta] = useState<number>(0)
  const [precioCosto, setPrecioCosto] = useState<number>(0)
  const [horasImpresion, setHorasImpresion] = useState<number>(0)
  const [pesoGramos, setPesoGramos] = useState<number>(0)
  const [altoMm, setAltoMm] = useState<number>(0)
  const [anchoMm, setAnchoMm] = useState<number>(0)
  const [profundidadMm, setProfundidadMm] = useState<number>(0)
  const [stockActual, setStockActual] = useState<number>(0)
  const [stockMinimo, setStockMinimo] = useState<number>(1)
  const [esTienda, setEsTienda] = useState<boolean>(true)
  const [archivoUrl, setArchivoUrl] = useState<string>('')
  const [piezas, setPiezas] = useState<ProductoPieza[]>([])
  const [saving, setSaving] = useState(false)
  const [isCostoModalOpen, setIsCostoModalOpen] = useState(false)

  const { data: categorias } = useCategorias()
  const createMutation = useCreateProducto()

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('last_categoria_id')
      if (saved) {
        setCategoriaId(parseInt(saved, 10))
      }
      const savedSubcat = localStorage.getItem('last_subcategoria')
      if (savedSubcat) {
        setSubcategoria(savedSubcat)
      }
    } else {
      setPiezas([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAnalyzeUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setErrorMsg(null)
    setImportedData(null)
    setPiezas([])

    try {
      const res = await api.post('/ai/import-makerworld', { url: url.trim() })
      if (res.data?.success && res.data?.data) {
        const d = res.data.data
        setImportedData(d)
        setTitle(d.title || '')
        setDescription(d.description || '')
        setSeoTitle(d.seo_title || (d.title ? `${d.title} | 3LD` : ''))
        setSeoDescription(d.seo_description || (d.description ? d.description.slice(0, 155) : ''))
        
        const h = parseFloat(d.horas_impresion || 0)
        const g = parseInt(d.peso_gramos || 0)
        setHorasImpresion(h)
        setPesoGramos(g)

        const savedFilamento = parseFloat(localStorage.getItem('costo_filamento_kg_default') || '15000')
        const savedHora = parseFloat(localStorage.getItem('costo_hora_maquina_default') || '500')
        let calcCost = 0
        if (g > 0 || h > 0) {
          calcCost = Math.round((g / 1000) * savedFilamento + h * savedHora)
        } else if (d.suggested_price) {
          calcCost = Math.round(d.suggested_price * 0.5)
        }

        const calculatedVenta = calcCost > 0 ? Math.round(calcCost * 2) : (d.suggested_price ? Math.round(d.suggested_price) : 0)

        setPrecioCosto(calcCost)
        setPrecioVenta(calculatedVenta)
        setStockActual(0)

        setArchivoUrl(d.source_url || url.trim())
        if (d.images && d.images.length > 0) {
          setSelectedImages(d.images.slice(0, 5))
        }

        // Matchear categoría si es posible
        if (categorias && categorias.length > 0) {
          const match = categorias.find((c) =>
            c.nombre.toLowerCase().includes((d.category || '').toLowerCase())
          )
          if (match) setCategoriaId(match.id)
        }

        if (d.subcategoria) {
          setSubcategoria(d.subcategoria)
        }
      } else {
        setErrorMsg(res.data?.message || 'No se pudieron extraer datos del enlace.')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al procesar con la IA de OpenAI.'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateText = async () => {
    if (!title && !description) return
    setLoading(true)
    try {
      const res = await api.post('/ai/generate-text', { title, details: description })
      if (res.data?.success && res.data?.data) {
        setTitle(res.data.data.title || title)
        setDescription(res.data.data.description || description)
        if (res.data.data.seo_title) setSeoTitle(res.data.data.seo_title)
        if (res.data.data.seo_description) setSeoDescription(res.data.data.seo_description)
        toast('Texto comercial y SEO regenerados con OpenAI', 'success')
      }
    } catch (err: any) {
      toast('Error al regenerar texto', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProduct = async () => {
    if (!title.trim()) {
      toast('El título del producto es requerido', 'error')
      return
    }

    setSaving(true)
    try {
      if (categoriaId) {
        localStorage.setItem('last_categoria_id', String(categoriaId))
      }
      if (subcategoria.trim()) {
        localStorage.setItem('last_subcategoria', subcategoria.trim())
      }

      await createMutation.mutateAsync({
        nombre: title.trim(),
        descripcion: description.trim(),
        precio_venta: precioVenta,
        precio_costo: precioCosto,
        horas_impresion: horasImpresion,
        peso_gramos: pesoGramos,
        alto_mm: altoMm,
        ancho_mm: anchoMm,
        profundidad_mm: profundidadMm,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        categoria_id: categoriaId,
        subcategoria: subcategoria.trim() || undefined,
        piezas: piezas.filter((p) => p.nombre.trim() !== ''),
        imagen_url: selectedImages[0] || undefined,
        imagenes: selectedImages,
        tipo: 'impresion_3d',
        es_vendible: 1,
        es_insumo: 0,
        es_tienda: esTienda ? 1 : 0,
        archivo_url: archivoUrl.trim() || undefined,
        seo_title: seoTitle.trim() || undefined,
        seo_description: seoDescription.trim() || undefined,
      } as any)

      toast(`¡Producto "${title}" guardado con éxito!`, 'success')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast('Error al guardar el producto', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight leading-none">
                Importar desde MakerWorld con IA (OpenAI)
              </h2>
              <p className="text-[11px] text-cyan-400 font-medium mt-1">
                Lee enlaces de modelos 3D, extrae fotos y redacta texto comercial
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* URL Input Form */}
          <form onSubmit={handleAnalyzeUrl} className="space-y-3">
            <label className="font-bold text-slate-700 block">
              Enlace de MakerWorld (ej: https://makerworld.com/es/models/851050...)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Pegar URL de MakerWorld aquí..."
                required
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:bg-white text-slate-800"
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Analizar con IA</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error en la importación con IA</p>
                <p className="text-[11px] mt-0.5 text-red-700">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 text-center space-y-3">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-200 animate-ping"></div>
                <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-cyan-600 text-white">
                  <Bot className="h-6 w-6 animate-bounce" />
                </div>
              </div>
              <p className="font-bold text-slate-800 text-sm">OpenAI Luna está procesando el modelo...</p>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Extrayendo imágenes de MakerWorld y redactando propuesta comercial de venta.
              </p>
            </div>
          )}

          {/* Preview & Confirmation Form */}
          {importedData && !loading && (
            <div className="space-y-5 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
              <div className="flex items-center justify-between bg-cyan-50 p-3 rounded-2xl border border-cyan-200 text-cyan-950">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-600" />
                  <span className="font-extrabold">Propuesta generada por OpenAI Luna</span>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateText}
                  className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-900 bg-white px-2.5 py-1 rounded-lg border border-cyan-200 shadow-2xs"
                >
                  <RefreshCw className="h-3 w-3" /> Re-generar Texto
                </button>
              </div>

              {/* Photo Selection Gallery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700 block">
                    Fotos del Producto ({selectedImages.length}/5 seleccionadas):
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Elegí hasta 5 fotos (la Nº 1 es la portada principal)
                  </span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {importedData.images.map((imgUrl, idx) => {
                    const selIndex = selectedImages.indexOf(imgUrl)
                    const isSelected = selIndex !== -1
                    const isPrincipal = selIndex === 0
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isSelected) {
                            if (selectedImages.length === 1) {
                              toast('El producto debe tener al menos una foto', 'error')
                              return
                            }
                            setSelectedImages(selectedImages.filter(u => u !== imgUrl))
                          } else {
                            if (selectedImages.length >= 5) {
                              toast('Podés seleccionar hasta 5 fotos por artículo', 'error')
                              return
                            }
                            setSelectedImages([...selectedImages, imgUrl])
                          }
                        }}
                        className={`relative h-20 w-20 rounded-xl overflow-hidden border-2 cursor-pointer shrink-0 transition ${
                          isSelected
                            ? 'border-cyan-500 ring-2 ring-cyan-500/30 shadow-md'
                            : 'border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-cyan-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-black shadow">
                            {selIndex + 1}
                          </div>
                        )}
                        {isPrincipal && (
                          <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[8px] font-extrabold px-1 py-0.5 rounded shadow uppercase">
                            Principal
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Editable Product Fields */}
              <div className="space-y-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Título Comercial</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Descripción de Venta (IA)</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500 resize-none"
                  />
                </div>

                {/* Optimización SEO para Google */}
                <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50 rounded-2xl border border-blue-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Optimización SEO para Google & Buscadores
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded-full">
                      Indexación Automática
                    </span>
                  </div>

                  {/* Previsualización estilo snippet Google */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[11px] text-slate-500 block truncate">https://3ld.com.ar › tienda › {title ? encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-')) : 'producto'}</span>
                    <h4 className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer truncate">
                      {seoTitle || (title ? `${title} | 3LD` : 'Título del producto en Google')}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {seoDescription || (description ? description.slice(0, 155) : 'Meta descripción atractiva para los resultados de búsqueda de Google...')}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Título SEO (Google)</label>
                        <span className={`text-[10px] font-bold ${seoTitle.length > 60 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {seoTitle.length}/60 car.
                        </span>
                      </div>
                      <input
                        type="text"
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder="Ej: Cortante Galletita Nerf en 3D | 3LD"
                        className="w-full p-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Meta Descripción SEO</label>
                        <span className={`text-[10px] font-bold ${seoDescription.length > 155 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {seoDescription.length}/155 car.
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        placeholder="Descripción persuasiva que aparecerá en los resultados de búsqueda de Google..."
                        className="w-full p-2 bg-white border border-blue-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Precio Venta ($)</label>
                    <input
                      type="number"
                      value={precioVenta}
                      onChange={(e) => setPrecioVenta(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Costo ($)</label>
                    <input
                      type="number"
                      value={precioCosto}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setPrecioCosto(val)
                        setPrecioVenta(Math.round(val * 2))
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Stock Actual</label>
                    <input
                      type="number"
                      value={stockActual}
                      onChange={(e) => setStockActual(parseInt(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      value={stockMinimo}
                      onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Sección de Especificaciones Técnicas 3D */}
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      📐 Especificaciones Técnicas (3D)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCostoModalOpen(true)}
                      className="text-[11px] font-extrabold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition"
                    >
                      Calculadora de Costo 3D ⚡
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Alto (mm)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={altoMm}
                        onChange={(e) => setAltoMm(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Ancho (mm)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={anchoMm}
                        onChange={(e) => setAnchoMm(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Profundidad (mm)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={profundidadMm}
                        onChange={(e) => setProfundidadMm(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Peso (gramos)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={pesoGramos}
                        onChange={(e) => setPesoGramos(parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Horas (h)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={horasImpresion}
                        onChange={(e) => setHorasImpresion(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Categoría Principal</label>
                    <select
                      value={categoriaId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined
                        setCategoriaId(val)
                        if (val) {
                          localStorage.setItem('last_categoria_id', String(val))
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Ninguna</option>
                      {categorias?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Categorías Secundarias / Etiquetas</label>
                    <input
                      type="text"
                      value={subcategoria}
                      onChange={(e) => {
                        setSubcategoria(e.target.value)
                        if (e.target.value) {
                          localStorage.setItem('last_subcategoria', e.target.value)
                        }
                      }}
                      placeholder="Ej. Día de la Madre, San Valentín, Llaveros"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-cyan-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Ingresá varias categorías o etiquetas separadas por coma.
                    </p>
                  </div>
                </div>

                {/* Sección de Piezas / Kit Configurable */}
                <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                      🧩 Piezas / Kit Configurable (Opcional)
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600">
                      {piezas.length > 0 ? `${piezas.length} pieza(s) configurada(s)` : 'Sin piezas (Producto individual)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Si este producto se compone de varias piezas que el cliente puede seleccionar individualmente (ej. Sets de decoración, juegos con piezas opcionales), agregalas acá con su precio.
                  </p>

                  {piezas.length > 0 && (
                    <div className="space-y-2.5">
                      {piezas.map((pieza, idx) => (
                        <div key={pieza.id || idx} className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                          <div className="flex items-center gap-2">
                            {pieza.imagen_url && (
                              <img src={pieza.imagen_url} alt={pieza.nombre} className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0" />
                            )}
                            <input
                              type="text"
                              placeholder="Nombre de la pieza / componente"
                              value={pieza.nombre}
                              onChange={(e) => {
                                const copy = [...piezas]
                                copy[idx].nombre = e.target.value
                                setPiezas(copy)
                              }}
                              className="flex-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => setPiezas(piezas.filter((_, i) => i !== idx))}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Eliminar pieza"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Precio Venta ($)</label>
                              <input
                                type="number"
                                placeholder="Venta ($)"
                                value={pieza.precio}
                                onChange={(e) => {
                                  const copy = [...piezas]
                                  copy[idx].precio = parseFloat(e.target.value) || 0
                                  setPiezas(copy)
                                }}
                                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Costo ($)</label>
                              <input
                                type="number"
                                placeholder="Costo ($)"
                                value={pieza.precio_costo ?? 0}
                                onChange={(e) => {
                                  const copy = [...piezas]
                                  copy[idx].precio_costo = parseFloat(e.target.value) || 0
                                  setPiezas(copy)
                                }}
                                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Medidas / Dimensiones</label>
                              <input
                                type="text"
                                placeholder="Ej: 12 x 8 cm"
                                value={pieza.medidas || ''}
                                onChange={(e) => {
                                  const copy = [...piezas]
                                  copy[idx].medidas = e.target.value
                                  setPiezas(copy)
                                }}
                                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="block text-[10px] font-bold text-slate-500">Foto (Subir o Enlace)</label>
                                {pieza.imagen_url && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const copy = [...piezas]
                                      copy[idx].imagen_url = ''
                                      setPiezas(copy)
                                    }}
                                    className="text-[9px] text-red-500 hover:underline font-semibold"
                                  >
                                    Quitar
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {pieza.imagen_url && (
                                  <div className="relative h-7 w-7 rounded-lg overflow-hidden border border-indigo-200 shrink-0 bg-white shadow-2xs">
                                    <img src={pieza.imagen_url} alt="" className="h-full w-full object-cover" />
                                  </div>
                                )}
                                <input
                                  type="text"
                                  placeholder="https://... o subí foto"
                                  value={pieza.imagen_url?.startsWith('data:') ? '(Foto subida)' : (pieza.imagen_url || '')}
                                  onChange={(e) => {
                                    const copy = [...piezas]
                                    copy[idx].imagen_url = e.target.value
                                    setPiezas(copy)
                                  }}
                                  className="w-full min-w-0 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500"
                                />
                                <label
                                  title="Subir foto para esta pieza"
                                  className="h-7 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition text-[10px] font-bold gap-1 active:scale-95"
                                >
                                  <Upload className="h-3 w-3" />
                                  <span>Subir</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0]
                                      if (!file) return
                                      try {
                                        const compressed = await compressImage(file, 600, 600, 0.7)
                                        const copy = [...piezas]
                                        copy[idx].imagen_url = compressed
                                        setPiezas(copy)
                                        toast('Foto de pieza cargada', 'success')
                                      } catch (err) {
                                        toast('Error al procesar la imagen', 'error')
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const newPieza: ProductoPieza = {
                        id: 'pieza_' + Math.random().toString(36).substring(2, 7),
                        nombre: '',
                        precio: 0,
                        precio_costo: 0,
                        medidas: '',
                        imagen_url: ''
                      }
                      setPiezas([...piezas, newPieza])
                    }}
                    className="w-full py-2 bg-indigo-100/70 hover:bg-indigo-200/80 text-indigo-900 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar Pieza / Componente al Set</span>
                  </button>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Enlace Archivo / STL (Uso Interno - Oculto al Cliente)
                  </label>
                  <input
                    type="url"
                    value={archivoUrl}
                    onChange={(e) => setArchivoUrl(e.target.value)}
                    placeholder="https://makerworld.com/..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-blue-600 focus:bg-white focus:ring-2 focus:ring-cyan-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enlace al modelo para descargar e imprimir cuando ingrese un pedido de este producto.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={esTienda}
                      onChange={(e) => setEsTienda(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>🌐 Publicar inmediatamente en la Tienda Web</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {importedData && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveProduct}
              disabled={saving}
              className="px-6 py-2.5 bg-slate-900 hover:bg-cyan-600 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  <span>Guardar Producto en el Sistema</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <CostoImpresionModal
        isOpen={isCostoModalOpen}
        onClose={() => setIsCostoModalOpen(false)}
        initialHoras={horasImpresion}
        initialGramos={pesoGramos}
        initialPrecioVenta={precioVenta}
        onApply={(costo, h, g, venta) => {
          setPrecioCosto(costo)
          setHorasImpresion(h)
          setPesoGramos(g)
          if (venta && venta > 0) {
            setPrecioVenta(venta)
            toast(`Costo ($${costo}) y Venta ($${venta}) aplicados`, 'success')
          } else {
            toast(`Precio de costo ($${costo}) aplicado`, 'success')
          }
        }}
      />
    </div>
  )
}
