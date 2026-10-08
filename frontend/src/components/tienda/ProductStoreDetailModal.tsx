import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  ShoppingCart,
  Share2,
  ExternalLink,
  Pencil,
  Download,
  Eye,
  Check
} from 'lucide-react'
import { resolveImageUrl } from '@/lib/utils'
import { SocialShareModal } from '@/components/productos/SocialShareModal'

export interface UnifiedStoreProduct {
  id: string | number
  title: string
  price: number
  image: string
  images: string[]
  category: string
  subcategory?: string
  description: string
  colors?: (string | { name: string; hex?: string })[]
  size?: string
  stock?: number
  stock_actual?: number
  estado_stock?: string
  stockStatus?: string
  archivo_url?: string
  piezas?: {
    id: string
    nombre: string
    precio: number
    imagen_url?: string
    medidas?: string
    filamento_g?: number
  }[]
  raw?: any
}

const DEFAULT_COLORS = [
  { name: 'Negro Mate', hex: '#1e293b' },
  { name: 'Blanco Puro', hex: '#f8fafc' },
  { name: 'Rojo Carmesí', hex: '#ef4444' },
  { name: 'Azul Cyan 3LD', hex: '#06b6d4' },
  { name: 'Dorado Seda', hex: '#eab308' },
  { name: 'Verde Pastel', hex: '#10b981' },
]

export const hasValidSize = (size?: string | null): boolean => {
  if (!size) return false
  const s = String(size).trim().toLowerCase()
  if (!s || s === '0' || s === '0x0' || s === '0x0x0' || s === '0 x 0 x 0' || s === '0 x 0' || s === '0.0 x 0.0 x 0.0') return false
  return true
}

export const isProductInStock = (p?: { stockStatus?: string; stock_actual?: number | string; estado_stock?: string } | null): boolean => {
  if (!p) return false
  if (p.stockStatus === 'ready' || p.estado_stock === 'ready') return true
  if (p.stockStatus === 'custom' || p.estado_stock === 'custom') return false
  return Number(p.stock_actual || 0) > 0
}

export function normalizeToStoreProduct(raw: any): UnifiedStoreProduct | null {
  if (!raw) return null

  const title = raw.title || raw.nombre || 'Producto'
  const price = Number(raw.price ?? raw.precio_venta ?? 0)

  // Recopilar lista de imágenes
  let imgList: string[] = []
  if (Array.isArray(raw.images) && raw.images.length > 0) {
    imgList = raw.images
  } else if (Array.isArray(raw.imagenes) && raw.imagenes.length > 0) {
    imgList = raw.imagenes
  } else if (Array.isArray(raw.fotos) && raw.fotos.length > 0) {
    imgList = raw.fotos
  } else if (raw.image) {
    imgList = [raw.image]
  } else if (raw.imagen_url) {
    imgList = [raw.imagen_url]
  } else if (typeof raw.imagenes === 'string' && raw.imagenes.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw.imagenes)
      if (Array.isArray(parsed) && parsed.length > 0) imgList = parsed
    } catch {}
  }

  const resolvedList = imgList.map((url) => resolveImageUrl(url))
  const mainImage = resolvedList[0] || (raw.imagen_url ? resolveImageUrl(raw.imagen_url) : '')

  // Colores
  let colors = raw.colors || raw.colores
  if (typeof colors === 'string' && (colors.startsWith('[') || colors.startsWith('{'))) {
    try {
      colors = JSON.parse(colors)
    } catch {}
  }

  // Piezas
  let piezas = raw.piezas
  if (typeof piezas === 'string' && piezas.startsWith('[')) {
    try {
      piezas = JSON.parse(piezas)
    } catch {}
  }

  // Medidas
  let size = raw.size || raw.dimensiones
  if (!size && (raw.alto_mm || raw.ancho_mm || raw.profundidad_mm)) {
    size = `${raw.alto_mm || 0} x ${raw.ancho_mm || 0} x ${raw.profundidad_mm || 0} mm`
  }

  return {
    id: raw.id,
    title,
    price,
    image: mainImage,
    images: resolvedList.length > 0 ? resolvedList : (mainImage ? [mainImage] : []),
    category: raw.category || raw.categoria_nombre || 'General',
    subcategory: raw.subcategory || raw.subcategoria || '',
    description: raw.description || raw.descripcion || '',
    colors: Array.isArray(colors) ? colors : undefined,
    size: size || '',
    stock: raw.stock ?? raw.stock_actual ?? 0,
    stock_actual: raw.stock_actual ?? raw.stock ?? 0,
    estado_stock: raw.estado_stock || raw.stockStatus,
    piezas: Array.isArray(piezas) ? piezas : undefined,
    archivo_url: raw.archivo_url,
    raw,
  }
}

export interface ProductStoreDetailModalProps {
  product: any | null
  isOpen: boolean
  onClose: () => void
  onAddToCart?: (product: any, qty: number, color?: string) => void
  onShare?: (product: any) => void
  isAdminView?: boolean
  onEdit?: (product: any) => void
}

export function ProductStoreDetailModal({
  product: rawProduct,
  isOpen,
  onClose,
  onAddToCart,
  onShare,
  isAdminView = false,
  onEdit,
}: ProductStoreDetailModalProps) {
  const product = useMemo(() => normalizeToStoreProduct(rawProduct), [rawProduct])

  const [activeImage, setActiveImage] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [selectedPiezas, setSelectedPiezas] = useState<Record<string, boolean>>({})
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // Inicializar estado cuando se abre con un producto nuevo
  useEffect(() => {
    if (product) {
      setActiveImage(product.images[0] || product.image || '')
      setSelectedColor('')

      if (product.piezas && product.piezas.length > 0) {
        const initialMap: Record<string, boolean> = {}
        const first = product.piezas[0]
        if (first) {
          initialMap[first.id || first.nombre] = true
        }
        setSelectedPiezas(initialMap)
      } else {
        setSelectedPiezas({})
      }
    }
  }, [product])

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Calcular precio total si hay piezas seleccionadas
  const calculatedPrice = useMemo(() => {
    if (!product) return 0
    if (product.piezas && product.piezas.length > 0) {
      const selectedList = product.piezas.filter((p) => selectedPiezas[p.id || p.nombre])
      if (selectedList.length > 0) {
        return selectedList.reduce((sum, p) => sum + (Number(p.precio) || 0), 0)
      }
      return 0
    }
    return product.price
  }, [product, selectedPiezas])

  if (!isOpen || !product) return null

  const displayImage = activeImage || product.images[0] || product.image || ''
  const inStock = isProductInStock(product)

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onShare) {
      onShare(product.raw || product)
    } else {
      setIsShareModalOpen(true)
    }
  }

  const handleAddCartClick = () => {
    if (!onAddToCart) return
    const finalColor = selectedColor || 'Estándar'
    if (product.piezas && product.piezas.length > 0) {
      const selectedList = product.piezas.filter((p) => selectedPiezas[p.id || p.nombre])
      if (selectedList.length === 0) return
      const piezaNames = selectedList.map((p) => p.nombre).join(', ')
      const customProduct = {
        ...(product.raw || product),
        title: `${product.title} (${selectedList.length} pieza${selectedList.length > 1 ? 's' : ''}: ${piezaNames})`,
        price: calculatedPrice,
      }
      onAddToCart(customProduct, 1, finalColor)
    } else {
      onAddToCart(product.raw || product, 1, finalColor)
    }
    onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200 max-h-[90vh] flex flex-col overflow-y-auto"
        >
          {/* Banner de previsualización administrativa si se abre desde el panel */}
          {isAdminView && (
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs font-bold border-b border-indigo-800/50 shrink-0">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Eye className="w-3.5 h-3.5" /> Vista Previa: Como lo ve el cliente en la Tienda
              </span>
              <a
                href={`/tienda?producto=${product.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-300 hover:text-white flex items-center gap-1 underline font-semibold"
                title="Abrir en Tienda Pública"
              >
                <span>Ver Tienda</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Imagen Principal y Navegación */}
          <div className="relative aspect-square max-h-[380px] bg-slate-100 shrink-0 overflow-hidden">
            {displayImage ? (
              <img
                src={displayImage}
                alt={product.title}
                className="w-full h-full object-cover transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                📦
              </div>
            )}

            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 transition shadow-md cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Flechas si hay más de 1 imagen */}
            {product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const currentIndex = product.images.indexOf(displayImage)
                    const prevIndex = (currentIndex - 1 + product.images.length) % product.images.length
                    setActiveImage(product.images[prevIndex])
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/40 hover:bg-slate-900/80 text-white rounded-full backdrop-blur-xs transition shadow-md cursor-pointer"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const currentIndex = product.images.indexOf(displayImage)
                    const nextIndex = (currentIndex + 1) % product.images.length
                    setActiveImage(product.images[nextIndex])
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/40 hover:bg-slate-900/80 text-white rounded-full backdrop-blur-xs transition shadow-md cursor-pointer"
                  aria-label="Foto siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Carrusel de Miniaturas */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-100 overflow-x-auto shrink-0">
              {product.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(imgUrl)}
                  className={`h-12 w-12 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                    displayImage === imgUrl
                      ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                      : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Cuerpo del Detalle */}
          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-cyan-600 uppercase tracking-wide">
                {product.subcategory || product.category}
              </span>
              {inStock ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                  <Zap className="w-3 h-3 text-emerald-600" /> En Stock
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                  ⚡ Impresión 3D: Listo en 24-48 hs
                </span>
              )}
            </div>

            <h2 className="text-lg font-black text-slate-900 mt-1 leading-snug">{product.title}</h2>

            {product.description && (
              <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* Opciones de Colores */}
            {product.colors && product.colors.length > 0 && (
              <div className="mt-4">
                <label className="text-xs font-bold text-slate-800 block mb-1.5">
                  Color de Impresión (PLA):{' '}
                  {selectedColor ? (
                    <span className="text-cyan-600 font-extrabold">{selectedColor}</span>
                  ) : (
                    <span className="text-slate-400 font-normal">(Opcional)</span>
                  )}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {product.colors.map((colorItem, idx) => {
                    const colorName = typeof colorItem === 'string' ? colorItem : colorItem.name
                    const hexColor =
                      typeof colorItem === 'object' && colorItem.hex
                        ? colorItem.hex
                        : DEFAULT_COLORS.find((c) => c.name === colorName)?.hex || '#06b6d4'
                    const isSelected = selectedColor === colorName
                    return (
                      <button
                        key={colorName || idx}
                        type="button"
                        onClick={() => setSelectedColor(isSelected ? '' : colorName)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                          isSelected
                            ? 'border-cyan-600 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/30 font-bold'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                          style={{ backgroundColor: hexColor }}
                        />
                        <span>{colorName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Selección de Piezas */}
            {product.piezas && product.piezas.length > 0 && (
              <div className="mt-4 bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                    🧩 Seleccionar Piezas del Set
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allOn: Record<string, boolean> = {}
                        product.piezas?.forEach((p) => {
                          allOn[p.id || p.nombre] = true
                        })
                        setSelectedPiezas(allOn)
                      }}
                      className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                    >
                      Marcar todas
                    </button>
                    <span className="text-indigo-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPiezas({})}
                      className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600">
                  Elegí las piezas que querés incluir en tu pedido:
                </p>
                <div className="space-y-1.5 max-h-72 sm:max-h-80 overflow-y-auto pr-1">
                  {product.piezas.map((pieza) => {
                    const key = pieza.id || pieza.nombre
                    const isChecked = !!selectedPiezas[key]
                    return (
                      <label
                        key={key}
                        className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? 'border-indigo-500 bg-white shadow-2xs text-indigo-950 font-bold'
                            : 'border-slate-200/80 bg-slate-50/70 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setSelectedPiezas((prev) => ({
                                ...prev,
                                [key]: e.target.checked,
                              }))
                            }}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                          />
                          {pieza.imagen_url && (
                            <img
                              src={resolveImageUrl(pieza.imagen_url)}
                              alt={pieza.nombre}
                              className="w-8 h-8 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs truncate">{pieza.nombre}</span>
                            {pieza.medidas && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                📏 Medidas: {pieza.medidas}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-black text-indigo-700 shrink-0 ml-2">
                          ${Number(pieza.precio).toLocaleString('es-AR')}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Medidas / Tamaño */}
            {hasValidSize(product.size) && (
              <div className="mt-3 text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-1.5">
                <span>📏</span>
                <span>
                  Medidas: <strong className="text-slate-900">{product.size}</strong>
                </span>
              </div>
            )}

            {/* Precio y Botones de Acción */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-400 block">Precio Total</span>
                <span className="text-xl font-black text-slate-900">
                  ${calculatedPrice.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={handleShareClick}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Compartir enlace de este producto"
                >
                  <Share2 className="w-4 h-4 text-cyan-600" />
                  <span className="hidden sm:inline">Compartir</span>
                </button>

                {onAddToCart ? (
                  <button
                    type="button"
                    onClick={handleAddCartClick}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-cyan-600 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Agregar al Carrito</span>
                  </button>
                ) : isAdminView ? (
                  <div className="flex items-center gap-1.5">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onEdit(product.raw || product)
                        }}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-primary/20 text-slate-700 hover:text-primary font-bold text-xs rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
                        title="Editar en el panel"
                      >
                        <Pencil className="w-3.5 h-3.5 text-primary" />
                        <span>Editar</span>
                      </button>
                    )}
                    <a
                      href={`/tienda?producto=${product.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-[#6B66C8] hover:bg-[#5752B3] text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ir a Tienda</span>
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal integrado de compartir en redes si se abre internamente */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        product={product.raw || product}
      />
    </>
  )
}
