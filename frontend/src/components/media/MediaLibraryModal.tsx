import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Upload,
  Image as ImageIcon,
  Crop,
  Sliders,
  Sparkles,
  Download,
  Trash2,
  Copy,
  Check,
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Zap,
  Filter,
  FileCheck
} from 'lucide-react'
import api from '@/lib/api'
import { toast } from '@/store/toastStore'
import { resolveImageUrl } from '@/lib/utils'

export interface MediaItem {
  filename: string
  url: string
  size_bytes: number
  size_formatted: string
  format: string
  is_webp: boolean
  dimensions?: { width: number; height: number } | null
  modified_at?: string | null
}

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectImage?: (url: string) => void
  initialTab?: 'gallery' | 'upload' | 'editor'
}

type TabType = 'gallery' | 'upload' | 'editor' | 'batch'
type AspectRatioType = 'free' | '1:1' | '4:3' | '16:9' | '9:16'

export function MediaLibraryModal({
  isOpen,
  onClose,
  onSelectImage,
  initialTab = 'gallery'
}: MediaLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  // Gallery state
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [isLoadingMedia, setIsLoadingMedia] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFormat, setFilterFormat] = useState<string>('all')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)

  // Uploader & WebP state
  const [dragActive, setDragActive] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null)
  const [webpQuality, setWebpQuality] = useState<number>(80)
  const [targetWidth, setTargetWidth] = useState<number>(1000)
  const [optimizedWebpDataUrl, setOptimizedWebpDataUrl] = useState<string | null>(null)
  const [optimizedSizeBytes, setOptimizedSizeBytes] = useState<number>(0)
  const [isProcessingWebp, setIsProcessingWebp] = useState(false)

  // Retouch & Crop Editor state
  const [editingImageSrc, setEditingImageSrc] = useState<string | null>(null)
  const [editingFilename, setEditingFilename] = useState<string>('imagen_editada')
  const [cropAspect, setCropAspect] = useState<AspectRatioType>('1:1')
  const [brightness, setBrightness] = useState<number>(100) // 50 to 150
  const [contrast, setContrast] = useState<number>(100) // 50 to 150
  const [saturation, setSaturation] = useState<number>(100) // 0 to 200
  const [rotation, setRotation] = useState<number>(0) // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [colorPreset, setColorPreset] = useState<string>('none') // none, grayscale, sepia, vivid
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [editedWebpDataUrl, setEditedWebpDataUrl] = useState<string | null>(null)
  const [editedSizeBytes, setEditedSizeBytes] = useState<number>(0)

  // Batch Optimization state
  const [batchSelected, setBatchSelected] = useState<Record<string, boolean>>({})
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState<string>('')
  const [isConvertingSingle, setIsConvertingSingle] = useState(false)

  // Cargar lista de imágenes al abrir
  useEffect(() => {
    if (isOpen) {
      fetchMediaList()
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  const fetchMediaList = async () => {
    setIsLoadingMedia(true)
    try {
      const res = await api.get('/media')
      if (res.data?.success && Array.isArray(res.data.data)) {
        setMediaList(res.data.data)
      }
    } catch {
      toast('Error al cargar la biblioteca de medios', 'error')
    } finally {
      setIsLoadingMedia(false)
    }
  }

  // Filtrado de Galería
  const filteredMedia = useMemo(() => {
    return mediaList.filter((item) => {
      if (filterFormat === 'webp' && !item.is_webp) return false
      if (filterFormat === 'legacy' && item.is_webp) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        if (!item.filename.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [mediaList, filterFormat, searchQuery])

  // Copiar URL
  const handleCopyUrl = (url: string) => {
    const fullUrl = resolveImageUrl(url)
    navigator.clipboard.writeText(fullUrl)
    setCopiedUrl(url)
    toast('¡URL copiada al portapapeles!', 'success')
    setTimeout(() => setCopiedUrl(null), 2500)
  }

  // Borrar Imagen
  const handleDeleteMedia = async (filename: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${filename}" de la biblioteca multimedia?`)) return
    try {
      const res = await api.delete('/media/delete', { data: { filename } })
      if (res.data?.success) {
        toast(`Imagen "${filename}" eliminada`, 'success')
        if (selectedItem?.filename === filename) setSelectedItem(null)
        fetchMediaList()
      }
    } catch {
      toast('Error al eliminar la imagen', 'error')
    }
  }

  // --- COMPRESIÓN CLIENT-SIDE A WEBP ---
  const processImageToWebp = (
    imageSource: string | File,
    qualityPercent: number,
    maxWidth: number,
    filters = { brightness: 100, contrast: 100, saturation: 100, rotation: 0, flipH: false, flipV: false, colorPreset: 'none' },
    cropRatio: AspectRatioType = 'free'
  ): Promise<{ dataUrl: string; sizeBytes: number; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      const onLoad = () => {
        try {
          let origW = img.naturalWidth || img.width
          let origH = img.naturalHeight || img.height

          // 1. Aplicar Recorte de Aspecto si corresponde
          let srcX = 0
          let srcY = 0
          let srcW = origW
          let srcH = origH

          if (cropRatio !== 'free') {
            let targetRatio = 1
            if (cropRatio === '1:1') targetRatio = 1
            else if (cropRatio === '4:3') targetRatio = 4 / 3
            else if (cropRatio === '16:9') targetRatio = 16 / 9
            else if (cropRatio === '9:16') targetRatio = 9 / 16

            const currentRatio = origW / origH
            if (currentRatio > targetRatio) {
              srcW = origH * targetRatio
              srcX = (origW - srcW) / 2
            } else {
              srcH = origW / targetRatio
              srcY = (origH - srcH) / 2
            }
          }

          // 2. Redimensionar si supera maxWidth
          let finalW = srcW
          let finalH = srcH
          if (maxWidth > 0 && finalW > maxWidth) {
            finalH = Math.round((maxWidth / finalW) * finalH)
            finalW = maxWidth
          }

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('No se pudo inicializar Canvas Context'))
            return
          }

          // Manejar rotación 90/270
          const isRotated90 = filters.rotation === 90 || filters.rotation === 270
          canvas.width = isRotated90 ? finalH : finalW
          canvas.height = isRotated90 ? finalW : finalH

          ctx.save()

          // Centro para transformaciones
          ctx.translate(canvas.width / 2, canvas.height / 2)

          if (filters.rotation !== 0) {
            ctx.rotate((filters.rotation * Math.PI) / 180)
          }

          const scaleH = filters.flipH ? -1 : 1
          const scaleV = filters.flipV ? -1 : 1
          ctx.scale(scaleH, scaleV)

          // Filtros CSS en Canvas
          let filterStr = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`
          if (filters.colorPreset === 'grayscale') filterStr += ' grayscale(100%)'
          if (filters.colorPreset === 'sepia') filterStr += ' sepia(90%)'
          if (filters.colorPreset === 'vivid') filterStr += ' saturate(160%) contrast(110%)'
          ctx.filter = filterStr

          const drawW = isRotated90 ? finalH : finalW
          const drawH = isRotated90 ? finalW : finalH

          ctx.drawImage(img, srcX, srcY, srcW, srcH, -drawW / 2, -drawH / 2, drawW, drawH)
          ctx.restore()

          // Exportar a Data URL WebP
          const qualityFraction = Math.max(0.1, Math.min(1.0, qualityPercent / 100))
          const dataUrl = canvas.toDataURL('image/webp', qualityFraction)

          // Calcular tamaño aproximado en bytes del base64
          const base64Head = 'data:image/webp;base64,'
          const cleanBase64 = dataUrl.startsWith(base64Head) ? dataUrl.slice(base64Head.length) : dataUrl
          const approxBytes = Math.round((cleanBase64.length * 3) / 4)

          resolve({
            dataUrl,
            sizeBytes: approxBytes,
            width: canvas.width,
            height: canvas.height
          })
        } catch (err) {
          reject(err)
        }
      }

      img.onload = onLoad
      img.onerror = (e) => reject(e)

      if (typeof imageSource === 'string') {
        if (imageSource.startsWith('data:') || imageSource.startsWith('blob:')) {
          img.src = imageSource
        } else {
          // Obtener como Blob primero para evitar problemas de CORS en canvas
          fetch(imageSource)
            .then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`)
              return r.blob()
            })
            .then((blob) => {
              const blobUrl = URL.createObjectURL(blob)
              img.onload = () => {
                URL.revokeObjectURL(blobUrl)
                onLoad()
              }
              img.src = blobUrl
            })
            .catch(() => {
              // Fallback directo si fetch falla
              img.onload = onLoad
              img.src = imageSource
            })
        }
      } else {
        const blobUrl = URL.createObjectURL(imageSource)
        img.onload = () => {
          URL.revokeObjectURL(blobUrl)
          onLoad()
        }
        img.src = blobUrl
      }
    })
  }

  // Manejar selección de archivo para compresión WebP
  const handleFileSelect = async (file: File) => {
    setUploadFile(file)
    setIsProcessingWebp(true)
    const objectUrl = URL.createObjectURL(file)
    setRawPreviewUrl(objectUrl)

    try {
      const res = await processImageToWebp(file, webpQuality, targetWidth)
      setOptimizedWebpDataUrl(res.dataUrl)
      setOptimizedSizeBytes(res.sizeBytes)
    } catch {
      toast('Error al procesar la imagen a formato WebP', 'error')
    } finally {
      setIsProcessingWebp(false)
    }
  }

  // Re-procesar cuando cambie calidad o ancho objetivo
  useEffect(() => {
    if (uploadFile) {
      setIsProcessingWebp(true)
      const timer = setTimeout(async () => {
        try {
          const res = await processImageToWebp(uploadFile, webpQuality, targetWidth)
          setOptimizedWebpDataUrl(res.dataUrl)
          setOptimizedSizeBytes(res.sizeBytes)
        } catch {} finally {
          setIsProcessingWebp(false)
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [webpQuality, targetWidth, uploadFile])

  // Subir imagen optimizada en WebP a la biblioteca del servidor
  const handleSaveUploadedWebp = async () => {
    if (!optimizedWebpDataUrl || !uploadFile) return
    try {
      const baseName = uploadFile.name.replace(/\.[^/.]+$/, '')
      const cleanFilename = `${baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_opt.webp`

      const res = await api.post('/media/upload', {
        image_base64: optimizedWebpDataUrl,
        filename: cleanFilename
      })

      if (res.data?.success && res.data?.data?.url) {
        toast('¡Imagen WebP optimizada guardada en la biblioteca!', 'success')
        fetchMediaList()
        if (onSelectImage) {
          onSelectImage(res.data.data.url)
          onClose()
        } else {
          setActiveTab('gallery')
        }
      }
    } catch {
      toast('Error al guardar la imagen optimizada', 'error')
    }
  }

  // Convertir individualmente una foto seleccionada a WebP
  const handleConvertSingleToWebp = async (item: MediaItem) => {
    setIsConvertingSingle(true)
    try {
      const fullUrl = resolveImageUrl(item.url)
      const res = await processImageToWebp(fullUrl, 82, 1200)
      const baseName = item.filename.replace(/\.[^/.]+$/, '')
      const newFilename = `${baseName}.webp`

      const uploadRes = await api.post('/media/upload', {
        image_base64: res.dataUrl,
        filename: newFilename,
        original_filename: item.filename
      })

      if (uploadRes.data?.success) {
        toast(`¡"${item.filename}" convertida a WebP con éxito!`, 'success')
        await fetchMediaList()
        setSelectedItem(null)
      }
    } catch {
      toast('Error al convertir la imagen a WebP', 'error')
    } finally {
      setIsConvertingSingle(false)
    }
  }

  // Abrir editor de retoque con una imagen existente o cargada
  const handleOpenEditor = (item: MediaItem) => {
    const fullUrl = resolveImageUrl(item.url)
    setEditingImageSrc(fullUrl)
    setEditingFilename(item.filename.replace(/\.[^/.]+$/, ''))
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setColorPreset('none')
    setCropAspect('free')
    setEditedWebpDataUrl(null)
    setActiveTab('editor')

    // Renderizar lienzo de inmediato
    processImageToWebp(fullUrl, webpQuality, targetWidth, {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      rotation: 0,
      flipH: false,
      flipV: false,
      colorPreset: 'none'
    }, 'free')
      .then((res) => {
        setEditedWebpDataUrl(res.dataUrl)
        setEditedSizeBytes(res.sizeBytes)
      })
      .catch((err) => {
        console.error('Error cargando lienzo en editor:', err)
      })
  }

  // Re-renderizar lienzo de edición cuando cambian los controles
  useEffect(() => {
    if (editingImageSrc && activeTab === 'editor') {
      const timer = setTimeout(async () => {
        try {
          const res = await processImageToWebp(
            editingImageSrc,
            webpQuality,
            targetWidth,
            { brightness, contrast, saturation, rotation, flipH, flipV, colorPreset },
            cropAspect
          )
          setEditedWebpDataUrl(res.dataUrl)
          setEditedSizeBytes(res.sizeBytes)
        } catch (err) {
          console.error('Error al actualizar editor:', err)
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [editingImageSrc, activeTab, brightness, contrast, saturation, rotation, flipH, flipV, colorPreset, cropAspect, webpQuality, targetWidth])

  // Guardar imagen editada desde el Retocador
  const handleSaveEditedImage = async () => {
    if (!editedWebpDataUrl) return
    try {
      const cleanFilename = `${editingFilename}_retocada.webp`
      const res = await api.post('/media/upload', {
        image_base64: editedWebpDataUrl,
        filename: cleanFilename
      })

      if (res.data?.success && res.data?.data?.url) {
        toast('¡Imagen retocada guardada en la biblioteca!', 'success')
        fetchMediaList()
        if (onSelectImage) {
          onSelectImage(res.data.data.url)
          onClose()
        } else {
          setActiveTab('gallery')
        }
      }
    } catch {
      toast('Error al guardar la imagen retocada', 'error')
    }
  }

  // Optimización masiva (Batch Convert to WebP)
  const handleBatchConvert = async () => {
    const selectedFilenames = Object.keys(batchSelected).filter((k) => batchSelected[k])
    if (selectedFilenames.length === 0) {
      toast('Seleccioná al menos una imagen para optimizar en lote', 'info')
      return
    }

    setIsBatchProcessing(true)
    let processed = 0

    for (const filename of selectedFilenames) {
      const item = mediaList.find((m) => m.filename === filename)
      if (!item) continue

      setBatchProgress(`Optimizando ${processed + 1} de ${selectedFilenames.length}: ${filename}...`)
      try {
        const fullUrl = resolveImageUrl(item.url)
        const res = await processImageToWebp(fullUrl, 82, 1200)

        const baseName = filename.replace(/\.[^/.]+$/, '')
        await api.post('/media/upload', {
          image_base64: res.dataUrl,
          filename: `${baseName}.webp`,
          original_filename: filename
        })
        processed++
      } catch (err) {
        console.error(`Error procesando lote ${filename}`, err)
      }
    }

    setIsBatchProcessing(false)
    setBatchProgress('')
    setBatchSelected({})
    toast(`¡Proceso completado! ${processed} imágenes optimizadas a WebP`, 'success')
    fetchMediaList()
  }

  const toggleSelectBatch = (filename: string) => {
    setBatchSelected((prev) => ({ ...prev, [filename]: !prev[filename] }))
  }

  const selectAllNonWebp = () => {
    const newMap: Record<string, boolean> = {}
    mediaList.forEach((item) => {
      if (!item.is_webp) newMap[item.filename] = true
    })
    setBatchSelected(newMap)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[92vh] max-h-[850px]">
        {/* Header Superior */}
        <div className="p-4 md:px-6 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight leading-tight">
                Biblioteca Multimedia & Optimizador WebP
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Gestioná, retocá, recortá y comprimí las fotos de tu tienda al formato ultrarrápido WebP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pestañas / Navegación interna */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'gallery'
                ? 'border-cyan-500 text-cyan-600 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Biblioteca de Medios ({mediaList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-cyan-500 text-cyan-600 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Subir & Convertir WebP</span>
          </button>

          <button
            onClick={() => {
              if (!editingImageSrc && mediaList.length > 0) {
                handleOpenEditor(mediaList[0])
              } else {
                setActiveTab('editor')
              }
            }}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'editor'
                ? 'border-cyan-500 text-cyan-600 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Retocar & Recortar Fotos</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition ${
              activeTab === 'batch'
                ? 'border-cyan-500 text-cyan-600 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Optimización Masiva</span>
          </button>
        </div>

        {/* TAB 1: GALERÍA DE MEDIOS */}
        {activeTab === 'gallery' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50/50">
            {/* Main Grid area */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
              {/* Barra de búsqueda y filtros */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">Filtrar:</span>
                  <select
                    value={filterFormat}
                    onChange={(e) => setFilterFormat(e.target.value)}
                    className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="all">Todas las imágenes</option>
                    <option value="webp">Solo formato WebP (Optimizado)</option>
                    <option value="legacy">Imágenes pesadas (JPG/PNG)</option>
                  </select>
                </div>
              </div>

              {/* Grid de imágenes */}
              {isLoadingMedia ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mb-2" />
                  <p className="text-xs font-bold text-slate-500">Cargando biblioteca multimedia...</p>
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">No se encontraron imágenes</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Subí imágenes en formato WebP optimizado para acelerar la carga de tu tienda.
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    Subir primera foto
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredMedia.map((item) => {
                    const isSelected = selectedItem?.filename === item.filename
                    const fullUrl = resolveImageUrl(item.url)

                    return (
                      <div
                        key={item.filename}
                        onClick={() => setSelectedItem(item)}
                        className={`group relative bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all duration-150 shadow-xs hover:shadow-md ${
                          isSelected
                            ? 'border-cyan-500 ring-2 ring-cyan-500/30 scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Indicador WebP badge */}
                        <div className="absolute top-2 left-2 z-10">
                          {item.is_webp ? (
                            <span className="bg-emerald-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <Sparkles className="w-2.5 h-2.5" /> WebP
                            </span>
                          ) : (
                            <span className="bg-slate-800/80 text-slate-200 text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                              {item.format.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {!item.is_webp && (
                          <button
                            title="Optimizar a WebP"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleConvertSingleToWebp(item)
                            }}
                            className="absolute top-2 right-2 z-10 bg-amber-500/90 hover:bg-amber-600 text-white p-1 rounded-lg backdrop-blur-xs shadow-xs transition opacity-0 group-hover:opacity-100"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Foto Preview */}
                        <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                          <img
                            src={fullUrl}
                            alt={item.filename}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>

                        {/* Footer Card */}
                        <div className="p-2.5 bg-white border-t border-slate-100">
                          <p className="text-[11px] font-bold text-slate-800 truncate" title={item.filename}>
                            {item.filename}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1">
                            <span>{item.size_formatted}</span>
                            {item.dimensions && (
                              <span>
                                {item.dimensions.width}x{item.dimensions.height}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sidebar Detalle / Acciones de Imagen Seleccionada */}
            {selectedItem ? (
              <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-5 overflow-y-auto flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Detalles de Archivo
                  </h4>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Previsualización grande */}
                <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                  <img
                    src={resolveImageUrl(selectedItem.url)}
                    alt={selectedItem.filename}
                    className="w-full h-full object-contain p-1"
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-semibold">Nombre:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[160px]" title={selectedItem.filename}>
                      {selectedItem.filename}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-semibold">Tamaño:</span>
                    <span className="font-extrabold text-slate-900">{selectedItem.size_formatted}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-semibold">Formato:</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedItem.format}</span>
                  </div>
                  {selectedItem.dimensions && (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 font-semibold">Dimensiones:</span>
                      <span className="font-bold text-slate-800">
                        {selectedItem.dimensions.width} x {selectedItem.dimensions.height} px
                      </span>
                    </div>
                  )}
                </div>

                {/* Botones de acción principales */}
                <div className="space-y-2 pt-2">
                  {onSelectImage && (
                    <button
                      onClick={() => {
                        onSelectImage(selectedItem.url)
                        onClose()
                      }}
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Usar esta imagen en Producto</span>
                    </button>
                  )}

                  {!selectedItem.is_webp && (
                    <button
                      onClick={() => handleConvertSingleToWebp(selectedItem)}
                      disabled={isConvertingSingle}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50"
                    >
                      <Zap className={`w-4 h-4 ${isConvertingSingle ? 'animate-spin' : ''}`} />
                      <span>{isConvertingSingle ? 'Convirtiendo a WebP...' : 'Optimizar a WebP'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditor(selectedItem)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                  >
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Retocar & Recortar en Editor</span>
                  </button>

                  <button
                    onClick={() => handleCopyUrl(selectedItem.url)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    {copiedUrl === selectedItem.url ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{copiedUrl === selectedItem.url ? '¡URL Copiada!' : 'Copiar URL pública'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteMedia(selectedItem.filename)}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Eliminar imagen del servidor</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: SUBIR & CONVERTIR WEBP */}
        {activeTab === 'upload' && (
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Drop Zone / Subida */}
              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragActive(true)
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragActive(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(e.dataTransfer.files[0])
                    }
                  }}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition ${
                    dragActive
                      ? 'border-cyan-500 bg-cyan-50/50'
                      : 'border-slate-300 bg-white hover:border-cyan-400'
                  }`}
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (ev: any) => {
                      if (ev.target?.files?.[0]) handleFileSelect(ev.target.files[0])
                    }
                    input.click()
                  }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm">
                    Arrastrá una foto aquí o haz clic para seleccionar
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Soporta formatos JPG, PNG, HEIC o WebP. Se optimizará automáticamente al instante.
                  </p>
                </div>

                {/* Ajustes de Compresión */}
                {uploadFile && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-500" />
                      Controles de Compresión WebP
                    </h5>

                    {/* Quality Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Calidad WebP:</span>
                        <span className="text-cyan-600">{webpQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="98"
                        value={webpQuality}
                        onChange={(e) => setWebpQuality(Number(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    {/* Width Preset */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Ancho Máximo (px):</label>
                      <select
                        value={targetWidth}
                        onChange={(e) => setTargetWidth(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                      >
                        <option value="500">500px - Cuadrado Tienda (Recomendado Productos)</option>
                        <option value="800">800px - Estándar HD</option>
                        <option value="1200">1200px - Máxima resolución HD</option>
                        <option value="0">Original (Sin alterar dimensiones)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Vista Previa & Comparativa de Pesos */}
              <div className="space-y-4">
                {uploadFile && rawPreviewUrl ? (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
                    <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                      Comparativa de Rendimiento
                    </h5>

                    {/* Widget comparativo de KB/MB */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-red-50/70 border border-red-100 rounded-2xl">
                        <span className="text-[10px] font-bold text-red-700 uppercase">Original</span>
                        <p className="font-black text-slate-900 text-sm">
                          {(uploadFile.size / 1024).toFixed(1)} KB
                        </p>
                        <span className="text-[10px] text-slate-500 font-semibold">{uploadFile.type}</span>
                      </div>

                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" /> WebP Optimizado
                        </span>
                        <p className="font-black text-emerald-950 text-sm">
                          {(optimizedSizeBytes / 1024).toFixed(1)} KB
                        </p>
                        {uploadFile.size > 0 && (
                          <span className="text-[10px] font-black text-emerald-600">
                            -
                            {(
                              ((uploadFile.size - optimizedSizeBytes) / uploadFile.size) *
                              100
                            ).toFixed(1)}
                            % reducido
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Previsualizador */}
                    <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative flex items-center justify-center">
                      {optimizedWebpDataUrl ? (
                        <img
                          src={optimizedWebpDataUrl}
                          alt="Preview WebP"
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">Procesando...</span>
                      )}
                    </div>

                    <button
                      onClick={handleSaveUploadedWebp}
                      disabled={isProcessingWebp || !optimizedWebpDataUrl}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Guardar Imagen WebP en la Biblioteca</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-100/70 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-medium text-xs">
                    Seleccioná una imagen a la izquierda para ver la previsualización y el cálculo de ahorro de peso.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RETOCAR & RECORTAR FOTOS */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-900 text-white">
            {/* Lienzo Principal de Previsualización */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-auto relative bg-slate-950">
              {editedWebpDataUrl ? (
                <div className="relative max-h-[70vh] max-w-full flex items-center justify-center">
                  <img
                    src={editedWebpDataUrl}
                    alt="Lienzo Editor"
                    className="max-h-[65vh] object-contain rounded-xl shadow-2xl border border-slate-800"
                  />
                </div>
              ) : editingImageSrc ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-xs font-bold text-slate-400">Procesando lienzo de edición...</p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-slate-400 text-xs font-bold">
                    No hay ninguna imagen seleccionada para retocar.
                  </p>
                  <button
                    onClick={() => setActiveTab('gallery')}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition shadow-md"
                  >
                    Elegir foto de la biblioteca
                  </button>
                </div>
              )}

              {/* Informante de Peso final */}
              {editedSizeBytes > 0 && (
                <div className="mt-4 px-4 py-1.5 bg-slate-900/90 border border-slate-800 rounded-full text-xs font-bold text-cyan-400 backdrop-blur-xs">
                  Peso WebP Final: {(editedSizeBytes / 1024).toFixed(1)} KB
                </div>
              )}
            </div>

            {/* Panel de Herramientas de Retoque y Recorte */}
            <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 overflow-y-auto space-y-5">
              <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Herramientas de Imagen
              </h4>

              {/* 1. Recorte por Aspecto */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-cyan-400" /> Aspecto de Recorte:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['free', '1:1', '4:3', '16:9', '9:16'] as AspectRatioType[]).map((aspect) => (
                    <button
                      key={aspect}
                      onClick={() => setCropAspect(aspect)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                        cropAspect === aspect
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {aspect === 'free' ? 'Libre' : aspect}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Ajustes de Retoque (Brillo, Contraste, Saturación) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300">Ajustes de Luz y Color:</label>

                {/* Brillo */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Brillo:</span>
                    <span className="text-white font-bold">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Contraste */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Contraste:</span>
                    <span className="text-white font-bold">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Saturación */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Saturación:</span>
                    <span className="text-white font-bold">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* 3. Rotación & Orientación */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300">Girar & Voltear:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-slate-200"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Girar 90°</span>
                  </button>
                  <button
                    onClick={() => setFlipH((prev) => !prev)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      flipH ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    Voltear H
                  </button>
                </div>
              </div>

              {/* Guardar Imagen Editada */}
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleSaveEditedImage}
                  disabled={!editedWebpDataUrl}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar como WebP Optimizado</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OPTIMIZACIÓN MASIVA */}
        {activeTab === 'batch' && (
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Compresión Masiva a Formato WebP
                  </h4>
                  <p className="text-xs text-slate-500">
                    Seleccioná imágenes pesadas (JPG/PNG) y convertilas en lote a formato WebP ultra rápido.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllNonWebp}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                  >
                    Seleccionar todas las JPG/PNG
                  </button>
                  <button
                    onClick={handleBatchConvert}
                    disabled={isBatchProcessing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Optimizar Seleccionadas</span>
                  </button>
                </div>
              </div>

              {batchProgress && (
                <div className="p-3 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-600 shrink-0" />
                  <span>{batchProgress}</span>
                </div>
              )}

              {/* Grilla de selección batch */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {mediaList.map((item) => {
                  const isChecked = Boolean(batchSelected[item.filename])
                  const fullUrl = resolveImageUrl(item.url)

                  return (
                    <div
                      key={item.filename}
                      onClick={() => toggleSelectBatch(item.filename)}
                      className={`relative bg-slate-50 rounded-2xl border p-2 cursor-pointer transition ${
                        isChecked ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30' : 'border-slate-200'
                      }`}
                    >
                      <div className="absolute top-3 left-3 z-10">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-amber-600 bg-white rounded-md" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 bg-white rounded-md" />
                        )}
                      </div>

                      <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden mb-2">
                        <img src={fullUrl} alt={item.filename} className="w-full h-full object-cover" />
                      </div>

                      <p className="text-[10px] font-bold text-slate-700 truncate">{item.filename}</p>
                      <span className="text-[9px] text-slate-500">{item.size_formatted}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
