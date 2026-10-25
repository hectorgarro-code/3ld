import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  ShoppingCart,
  Share2,
  ExternalLink,
  Pencil,
  Eye,
  Minus,
  Plus
} from 'lucide-react'
import { resolveImageUrl } from '@/lib/utils'
import { obtenerPrecioPorCantidad } from '@/lib/pricing'
import { projectFreeShipping, type ShippingCartLine } from '@/lib/freeShipping'
import { FreeShippingProgress } from './FreeShippingProgress'
import { SocialShareModal } from '@/components/productos/SocialShareModal'
import { CustomerShareModal } from '@/components/tienda/CustomerShareModal'
import { DeliveryEstimate } from '@/components/tienda/DeliveryEstimate'

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
  precios_cantidad?: { cantidad: number; precio: number }[]
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
  if (typeof piezas === 'string' && piezas.trim()) {
    try {
      piezas = JSON.parse(piezas)
      if (typeof piezas === 'string') {
        piezas = JSON.parse(piezas)
      }
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
    precios_cantidad: Array.isArray(raw.precios_cantidad)
      ? raw.precios_cantidad
      : (typeof raw.precios_cantidad === 'string' ? JSON.parse(raw.precios_cantidad || '[]') : []),
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
  cartItems?: ShippingCartLine[]
}

export function ProductStoreDetailModal({
  product: rawProduct,
  isOpen,
  onClose,
  onAddToCart,
  onShare,
  isAdminView = false,
  onEdit,
  cartItems = [],
}: ProductStoreDetailModalProps) {
  const product = useMemo(() => normalizeToStoreProduct(rawProduct), [rawProduct])

  const dialogRef = useRef<HTMLDivElement>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [selectedPiezas, setSelectedPiezas] = useState<Record<string, boolean>>({})
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // Inicializar estado cuando se abre con un producto nuevo
  useEffect(() => {
    if (product && isOpen) {
      setActiveImage(product.images[0] || product.image || '')
      setSelectedColor('')
      setQuantity(1)

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
  }, [product, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key !== 'Tab') return
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), summary, [tabindex="0"]') || [])
        .filter(element => element.getClientRects().length > 0)
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault(); last?.focus()
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        e.preventDefault(); first?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [isOpen, onClose])

  // Calcular precio total si hay piezas seleccionadas
  const calculatedPrice = useMemo(() => {
    if (!product) return 0
    if (product.piezas && product.piezas.length > 0) {
      const selectedList = product.piezas.filter((p) => selectedPiezas[p.id || p.nombre])
      if (selectedList.length > 0) {
        const sum = selectedList.reduce((sum, p) => sum + (Number(p.precio) || 0), 0)
        return selectedList.length === product.piezas.length && product.raw?.oldPrice ? product.price : sum
      }
      return 0
    }
    return product.price
  }, [product, selectedPiezas])

  const allPiecesSelected = !product?.piezas?.length || product.piezas.every(p => selectedPiezas[p.id || p.nombre])
  const quantityTiers = useMemo(() => (product?.precios_cantidad || [])
    .filter(t => Number.isInteger(Number(t.cantidad)) && Number(t.cantidad) > 0 && Number.isFinite(Number(t.precio)) && Number(t.precio) >= 0)
    .map(t => ({ cantidad: Number(t.cantidad), precio: Number(t.precio) }))
    .sort((a, b) => a.cantidad - b.cantidad), [product])
  const selectionPrice = (allPiecesSelected ? obtenerPrecioPorCantidad(quantityTiers, quantity) : null) ?? calculatedPrice
  const money = (value: number) => '$' + value.toLocaleString('es-AR', { maximumFractionDigits: 2 })

  const cartSelection = useMemo(() => {
    if (!product) return null
    const pieces = product.piezas?.filter(p => selectedPiezas[p.id || p.nombre]) || []
    if (product.piezas?.length && !pieces.length) return null
    return {
      ...(product.raw || product),
      id: product.id,
      title: pieces.length ? `${product.title} (${pieces.length} pieza${pieces.length > 1 ? 's' : ''}: ${pieces.map(p => p.nombre).join(', ')})` : product.title,
      price: selectionPrice,
      basePrice: calculatedPrice,
      selectedPieceIds: pieces.length ? pieces.map(p => String(p.id || p.nombre)) : undefined,
      precios_cantidad: allPiecesSelected ? quantityTiers : [],
    }
  }, [product, selectedPiezas, selectionPrice, calculatedPrice, allPiecesSelected, quantityTiers])
  const shippingGoal = cartSelection ? projectFreeShipping(cartItems, cartSelection, quantity, selectedColor || 'Estándar') : null
  const unitPrice = shippingGoal?.unitPrice ?? selectionPrice
  const totalPrice = Math.round(unitPrice * quantity * 100) / 100
  const unitSaving = Math.max(0, calculatedPrice - unitPrice)
  const volumeQuantity = shippingGoal?.combinedQuantity ?? quantity

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
    if (!cartSelection) return
    onAddToCart({ ...cartSelection, price: unitPrice }, quantity, finalColor)
    onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-title"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-200 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 sm:px-6 shrink-0">
            <span className="text-sm font-bold text-slate-500">Detalle del artículo</span>
            <button type="button" onClick={onClose} aria-label="Cerrar detalle del artículo" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Banner de previsualización administrativa si se abre desde el panel */}
          {isAdminView && (
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs font-bold border-b border-indigo-800/50 shrink-0">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Eye className="w-3.5 h-3.5" /> Vista Previa: Como lo ve el cliente en la Tienda
              </span>
              <a
                href={`https://3ld.com.ar/?producto=${encodeURIComponent(product.id)}`}
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

          <div className="min-h-0 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-testid="product-detail-content">
          <div className="min-w-0 lg:self-start lg:sticky lg:top-0 bg-slate-50">
          {/* Imagen Principal y Navegación */}
          <div className="relative h-[220px] sm:h-[320px] lg:h-[420px] bg-slate-50 shrink-0 overflow-hidden">
            {displayImage ? (
              <img
                src={displayImage}
                alt={product.title}
                className="w-full h-full object-contain p-3 transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                📦
              </div>
            )}

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
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-3 bg-slate-900/40 hover:bg-slate-900/80 text-white rounded-full backdrop-blur-xs transition shadow-md cursor-pointer"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-3 bg-slate-900/40 hover:bg-slate-900/80 text-white rounded-full backdrop-blur-xs transition shadow-md cursor-pointer"
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
                  aria-label={`Ver foto ${idx + 1}`}
                  aria-pressed={displayImage === imgUrl}
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

          </div>
          {/* Cuerpo del Detalle */}
          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-cyan-600 uppercase tracking-wide">
                {product.subcategory || product.category}
              </span>
              {inStock ? (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                  <Zap className="w-3 h-3 text-emerald-600" /> En Stock
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                  🛠️ Impresión 3D: fabricación en 4 días hábiles
                </span>
              )}
            </div>

            <h2 id="product-detail-title" className="text-xl sm:text-2xl font-black text-slate-900 mt-3 leading-snug break-words">{product.title}</h2>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
              <strong className="text-3xl font-black tracking-tight text-slate-900">{money(unitPrice)}</strong>
              <span className="text-sm text-slate-500">{product.piezas?.length ? 'por selección' : 'por unidad'}</span>
            </div>
            {unitSaving > 0 && <p className="mt-1 text-sm font-bold text-emerald-700">Ahorrás {money(unitSaving)} {product.piezas?.length ? 'por selección' : 'por unidad'} con esta cantidad</p>}

            {!!shippingGoal?.existingQuantity && <p className="mt-1 text-xs leading-relaxed text-slate-500">Se suman a las {shippingGoal.existingQuantity} unidades de esta misma opción que ya tenés en el carrito.</p>}
            {onAddToCart && shippingGoal && <div className="mt-4">
              <FreeShippingProgress subtotal={shippingGoal.projectedSubtotal} preview>
                {shippingGoal.targetQuantity !== null && <button type="button" onClick={() => setQuantity(shippingGoal.targetQuantity!)} className="mt-3 min-h-11 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2 text-sm font-bold text-cyan-900 hover:bg-cyan-100 cursor-pointer">
                  Elegir {shippingGoal.targetQuantity} unidades · Pedido {money(shippingGoal.targetSubtotal!)}
                </button>}
                {shippingGoal.targetQuantity !== null && <p className="mt-1.5 text-xs leading-relaxed text-cyan-900">Sumá {shippingGoal.targetQuantity - quantity} más de esta selección. Ya calculamos los descuentos por cantidad{cartItems.length ? ' y lo que tenés en el carrito' : ''}.</p>}
              </FreeShippingProgress>
            </div>}

            {quantityTiers.length > 0 && allPiecesSelected && (
              <section className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-3 sm:p-4" aria-label="Descuentos por cantidad">
                <h3 className="text-sm font-extrabold text-teal-950">Llevá más, pagá menos</h3>
                <p className="mt-1 text-xs text-teal-800">Elegí una cantidad. El descuento se aplica automáticamente.</p>
                <div className="mt-3 grid gap-2">
                  {quantityTiers.map((tier, index) => {
                    const active = volumeQuantity >= tier.cantidad && !(quantityTiers[index + 1] && volumeQuantity >= quantityTiers[index + 1].cantidad)
                    const saving = Math.max(0, calculatedPrice - tier.precio)
                    return <button key={`${tier.cantidad}-${index}`} type="button" onClick={() => setQuantity(Math.max(1, tier.cantidad - (shippingGoal?.existingQuantity || 0)))} aria-label={`${shippingGoal?.existingQuantity ? 'Alcanzar' : 'Elegir'} ${tier.cantidad} unidades`} aria-pressed={active}
                      className={`min-h-14 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border p-3 text-left cursor-pointer transition ${active ? 'border-teal-600 bg-white ring-1 ring-teal-600' : 'border-teal-200 bg-white/70 hover:bg-white'}`}>
                      <span className="text-sm font-bold text-teal-950">Desde {tier.cantidad} unidades <span className="font-normal">· {money(tier.precio)} {product.piezas?.length ? 'por selección' : 'c/u'}</span></span>
                      {saving > 0 && <span className="text-xs font-bold text-emerald-700">Ahorrás {money(saving)} {product.piezas?.length ? 'por selección' : 'por unidad'}</span>}
                    </button>
                  })}
                </div>
              </section>
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
                        className={`flex items-center gap-1.5 min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition cursor-pointer ${
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5 tracking-wide">
                    🧩 Seleccione piezas
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
                      className="min-h-11 text-xs font-extrabold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                    >
                      Marcar todas
                    </button>
                    <span className="text-indigo-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPiezas({})}
                      className="min-h-11 text-xs font-extrabold text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600">
                  Elegí las piezas que querés incluir en tu pedido:
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {product.piezas.map((pieza) => {
                    const key = pieza.id || pieza.nombre
                    const isChecked = !!selectedPiezas[key]
                    return (
                      <label
                        key={key}
                        className={`min-h-12 flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
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
                            <span className="text-sm break-words">{pieza.nombre}</span>
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

            <div className="mt-4 rounded-xl bg-slate-50 p-3"><DeliveryEstimate requiresManufacturing={!inStock} compact /></div>
            {product.description && <details className="mt-4 border-t border-slate-100 pt-4">
              <summary className="min-h-11 cursor-pointer text-sm font-bold text-slate-800">Descripción del artículo</summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line break-words">{product.description}</p>
            </details>}
          </div>
          </div>
          {/* Compra siempre visible, fuera del contenido desplazable */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 shadow-[0_-4px_20px_#0f172a08]" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 sm:flex sm:items-center sm:justify-between">
              <div>
                <label htmlFor="product-detail-quantity" className="mb-1 block text-xs font-bold text-slate-600">Cantidad</label>
                <div className="flex h-11 items-center rounded-xl border border-slate-300 bg-white">
                  <button type="button" aria-label="Restar una unidad" disabled={quantity <= 1} onClick={() => setQuantity(q => Math.max(1, q - 1))} className="h-11 w-11 flex items-center justify-center disabled:opacity-30 cursor-pointer"><Minus className="h-4 w-4" /></button>
                  <input id="product-detail-quantity" type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={e => setQuantity(Number.isFinite(e.target.valueAsNumber) ? Math.max(1, Math.trunc(e.target.valueAsNumber)) : 1)} className="h-10 w-14 min-w-0 appearance-none bg-transparent text-center text-base font-bold text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  <button type="button" aria-label="Sumar una unidad" onClick={() => setQuantity(q => q + 1)} className="h-11 w-11 flex items-center justify-center cursor-pointer"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="min-w-0 text-right sm:text-left" aria-live="polite" data-testid="product-detail-total">
                <span className="text-xs text-slate-500 block">Total · {quantity} {quantity === 1 ? 'unidad' : 'unidades'}</span>
                <strong className="text-xl sm:text-2xl font-black text-slate-900 break-words">{money(totalPrice)}</strong>
              </div>

              <div className="col-span-2 flex items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={handleShareClick}
                  aria-label="Compartir artículo"
                  className="min-h-11 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Compartir enlace de este producto"
                >
                  <Share2 className="w-4 h-4 text-cyan-600" />
                  <span className="hidden sm:inline">Compartir</span>
                </button>

                {onAddToCart ? (
                  <button
                    type="button"
                    onClick={handleAddCartClick}
                    disabled={!!product.piezas?.length && !Object.values(selectedPiezas).some(Boolean)}
                    className="min-h-12 flex-1 sm:flex-none justify-center disabled:opacity-40 disabled:cursor-not-allowed px-5 py-3 bg-slate-900 hover:bg-cyan-600 text-white font-bold text-xs rounded-2xl shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
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
                        className="min-h-11 px-3.5 py-2.5 bg-slate-100 hover:bg-primary/20 text-slate-700 hover:text-primary font-bold text-xs rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
                        title="Editar en el panel"
                      >
                        <Pencil className="w-3.5 h-3.5 text-primary" />
                        <span>Editar</span>
                      </button>
                    )}
                    <a
                      href={`https://3ld.com.ar/?producto=${encodeURIComponent(product.id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-11 px-4 py-2.5 bg-[#6B66C8] hover:bg-[#5752B3] text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center gap-1.5"
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

      {/* Modal integrado de compartir: Redes/Marketplace para admin, o Enlace directo para clientes */}
      {isAdminView ? (
        <SocialShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          product={product ? (product.raw || product) : null}
        />
      ) : (
        <CustomerShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          product={product ? (product.raw || product) : null}
        />
      )}
    </>
  )
}
