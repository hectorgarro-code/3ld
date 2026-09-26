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
} from 'lucide-react'
import api from '@/lib/api'
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
    suggested_price: number
    images: string[]
    source_url: string
  } | null>(null)

  // Form Editing State for Confirmation
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('last_categoria_id')
    return saved ? parseInt(saved, 10) : undefined
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
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAnalyzeUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setErrorMsg(null)
    setImportedData(null)

    try {
      const res = await api.post('/ai/import-makerworld', { url: url.trim() })
      if (res.data?.success && res.data?.data) {
        const d = res.data.data
        setImportedData(d)
        setTitle(d.title || '')
        setDescription(d.description || '')
        
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

        setPrecioCosto(calcCost)
        setPrecioVenta(calcCost > 0 ? calcCost : (d.suggested_price || 0))
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
        toast('Texto comercial regenerado con OpenAI', 'success')
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
        imagen_url: selectedImages[0] || undefined,
        imagenes: selectedImages,
        tipo: 'impresion_3d',
        es_vendible: 1,
        es_insumo: 0,
        es_tienda: esTienda ? 1 : 0,
        archivo_url: archivoUrl.trim() || undefined,
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
                        setPrecioVenta(val)
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

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Categoría</label>
                  <select
                    value={categoriaId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : undefined
                      setCategoriaId(val)
                      if (val) {
                        localStorage.setItem('last_categoria_id', String(val))
                      }
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800"
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
