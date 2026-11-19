import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Plus,
  Trash2,
  Package,
  Sparkles,
  Search,
  DollarSign,
  Layers,
  ArrowRight,
  TrendingDown,
  Percent,
  CheckCircle2,
  Info,
  Boxes
} from 'lucide-react'
import api from '@/lib/api'
import { toast as showToast } from '@/store/toastStore'
import { resolveImageUrl, getThumbnailUrl } from '@/lib/utils'

export interface ComponentProductItem {
  id: number
  nombre: string
  precio_venta: number
  precio_costo?: number
  stock_actual: number
  imagen_url?: string
  categoria_nombre?: string
  cantidad: number
}

interface CrearKitModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
  preselectedProductIds?: number[]
}

export function CrearKitModal({
  isOpen,
  onClose,
  onCreated,
  preselectedProductIds = []
}: CrearKitModalProps) {
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Estado del Kit en creación
  const [kitName, setKitName] = useState('')
  const [kitDescription, setKitDescription] = useState('')
  const [kitPrice, setKitPrice] = useState<number | ''>('')
  const [selectedComponents, setSelectedComponents] = useState<ComponentProductItem[]>([])
  const [selectedCoverImage, setSelectedCoverImage] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Cargar productos vendibles
  useEffect(() => {
    if (!isOpen) return

    const loadProducts = async () => {
      setIsLoadingProducts(true)
      try {
        const res = await api.get('/tienda/admin/productos')
        const list = res.data?.data && Array.isArray(res.data.data) ? res.data.data : []
        setAvailableProducts(list.filter((p: any) => p.es_vendible !== 0 && p.categoria_nombre !== 'Kits y Combos'))
      } catch (err) {
        console.error('Error al cargar productos:', err)
        showToast('Error al cargar productos de la tienda', 'error')
      } finally {
        setIsLoadingProducts(false)
      }
    }

    loadProducts()
  }, [isOpen])

  // Pre-cargar productos seleccionados desde la tabla si existen
  useEffect(() => {
    if (isOpen && availableProducts.length > 0 && preselectedProductIds.length > 0) {
      const items: ComponentProductItem[] = []
      preselectedProductIds.forEach((id) => {
        const found = availableProducts.find((p) => p.id === id)
        if (found) {
          items.push({
            id: found.id,
            nombre: found.nombre,
            precio_venta: Number(found.precio_venta) || 0,
            precio_costo: Number(found.precio_costo) || 0,
            stock_actual: Number(found.stock_actual) || 0,
            imagen_url: found.imagen_url || '',
            categoria_nombre: found.categoria_nombre || '',
            cantidad: 1
          })
        }
      })
      if (items.length > 0) {
        setSelectedComponents(items)
      }
    }
  }, [isOpen, availableProducts, preselectedProductIds])

  // Totales calculados de los componentes
  const totalIndividualPrice = useMemo(() => {
    return selectedComponents.reduce((acc, item) => acc + item.precio_venta * item.cantidad, 0)
  }, [selectedComponents])

  const totalCost = useMemo(() => {
    return selectedComponents.reduce((acc, item) => acc + (item.precio_costo || 0) * item.cantidad, 0)
  }, [selectedComponents])

  const calculatedStock = useMemo(() => {
    if (selectedComponents.length === 0) return 0
    // El stock del combo está limitado por el componente con menor stock relativo
    const limits = selectedComponents.map((item) =>
      item.cantidad > 0 ? Math.floor(Math.max(0, item.stock_actual) / item.cantidad) : 0
    )
    return Math.min(...limits)
  }, [selectedComponents])

  // Descuento y ahorro
  const discountAmount = useMemo(() => {
    if (typeof kitPrice !== 'number' || kitPrice <= 0) return 0
    return Math.max(0, totalIndividualPrice - kitPrice)
  }, [totalIndividualPrice, kitPrice])

  const discountPercent = useMemo(() => {
    if (totalIndividualPrice <= 0 || discountAmount <= 0) return 0
    return Math.round((discountAmount / totalIndividualPrice) * 100)
  }, [totalIndividualPrice, discountAmount])

  const profitMarginPercent = useMemo(() => {
    if (typeof kitPrice !== 'number' || kitPrice <= 0 || totalCost <= 0) return 0
    return Math.round(((kitPrice - totalCost) / totalCost) * 100)
  }, [kitPrice, totalCost])

  // Auto-sugerir precio con 15% OFF cuando se agregan componentes y kitPrice está vacío
  useEffect(() => {
    if (totalIndividualPrice > 0 && (kitPrice === '' || kitPrice === 0)) {
      const suggested = Math.round((totalIndividualPrice * 0.85) / 100) * 100
      setKitPrice(suggested)
    }
  }, [totalIndividualPrice])

  // Auto-sugerir imagen de portada si no está elegida
  useEffect(() => {
    if (!selectedCoverImage && selectedComponents.length > 0) {
      const firstWithImg = selectedComponents.find((c) => Boolean(c.imagen_url))
      if (firstWithImg?.imagen_url) {
        setSelectedCoverImage(firstWithImg.imagen_url)
      }
    }
  }, [selectedComponents, selectedCoverImage])

  // Auto-sugerir nombre si está vacío
  useEffect(() => {
    if (!kitName && selectedComponents.length >= 2) {
      const names = selectedComponents.map((c) => c.nombre.split(' ')[0]).join(' + ')
      setKitName(`Combo: ${names}`)
    }
  }, [selectedComponents, kitName])

  // Agregar componente
  const handleAddComponent = (prod: any) => {
    if (selectedComponents.some((c) => c.id === prod.id)) return
    setSelectedComponents((prev) => [
      ...prev,
      {
        id: prod.id,
        nombre: prod.nombre,
        precio_venta: Number(prod.precio_venta) || 0,
        precio_costo: Number(prod.precio_costo) || 0,
        stock_actual: Number(prod.stock_actual) || 0,
        imagen_url: prod.imagen_url || '',
        categoria_nombre: prod.categoria_nombre || '',
        cantidad: 1
      }
    ])
  }

  // Quitar componente
  const handleRemoveComponent = (id: number) => {
    setSelectedComponents((prev) => prev.filter((c) => c.id !== id))
  }

  // Cambiar cantidad de un componente
  const handleUpdateQty = (id: number, delta: number) => {
    setSelectedComponents((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const newQty = Math.max(1, c.cantidad + delta)
          return { ...c, cantidad: newQty }
        }
        return c
      })
    )
  }

  // Filtrado de productos disponibles
  const filteredAvailable = useMemo(() => {
    return availableProducts.filter((p) => {
      if (selectedComponents.some((c) => c.id === p.id)) return false
      if (selectedCategory !== 'all' && String(p.categoria_id) !== selectedCategory) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = p.nombre?.toLowerCase().includes(q)
        const matchSku = p.sku?.toLowerCase().includes(q)
        if (!matchName && !matchSku) return false
      }
      return true
    })
  }, [availableProducts, selectedComponents, selectedCategory, searchQuery])

  // Guardar Kit / Combo
  const handleSaveKit = async () => {
    if (!kitName.trim()) {
      showToast('Ingresá un nombre para el Kit o Combo', 'info')
      return
    }
    if (selectedComponents.length < 2) {
      showToast('Seleccioná al menos 2 productos para armar el combo', 'info')
      return
    }
    if (typeof kitPrice !== 'number' || kitPrice <= 0) {
      showToast('Ingresá un precio de combo válido mayor a 0', 'info')
      return
    }

    setIsSaving(true)
    try {
      const piezasData = selectedComponents.map((comp) => ({
        id: comp.id,
        producto_id: comp.id,
        nombre: comp.nombre,
        cantidad: comp.cantidad,
        precio: comp.precio_venta,
        precio_costo: comp.precio_costo || 0,
        imagen_url: comp.imagen_url || ''
      }))

      const autoDescription =
        kitDescription.trim() ||
        `🔥 ¡Combo Especial con descuento! Incluye: ${selectedComponents
          .map((c) => `${c.cantidad}x ${c.nombre}`)
          .join(', ')}.`

      // Crear el nuevo producto en la categoría "Kits y Combos" (id: 5)
      const payload = {
        nombre: kitName.trim(),
        tipo: 'combo',
        categoria_id: 5, // Categoría oficial Kits y Combos
        precio_venta: totalIndividualPrice, // Precio normal tachado
        precio_oferta: kitPrice, // Precio promocional del combo
        precio_costo: totalCost,
        stock_actual: calculatedStock,
        estado_stock: calculatedStock > 0 ? 'ready' : 'custom',
        imagen_url: selectedCoverImage || selectedComponents[0]?.imagen_url || '',
        imagenes: selectedComponents.map((c) => c.imagen_url).filter(Boolean),
        descripcion: autoDescription,
        piezas: piezasData,
        es_tienda: 1,
        es_vendible: 1,
        es_destacado: 1,
        activo: 1,
        unidad_medida: 'combo'
      }

      const res = await api.post('/productos', payload)

      if (res.data?.success) {
        showToast(`¡Kit "${kitName}" creado y publicado en la tienda!`, 'success')
        if (onCreated) onCreated()
        onClose()
      } else {
        showToast(res.data?.message || 'No se pudo crear el kit', 'error')
      }
    } catch (err: any) {
      console.error('Error al crear kit:', err)
      showToast(err.response?.data?.message || 'Error al guardar el combo en el servidor', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[94vh] max-h-[850px]">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-xs">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Crear Kit o Combo Promocional</h3>
              <p className="text-xs text-amber-100 font-medium">
                Seleccioná productos de tu catálogo, fijá el precio diferencial y publicalo en la categoría Kits y Combos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal con 2 Columnas */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-50">
          {/* Columna Izquierda: Buscador & Selección de Productos (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col h-full border-b lg:border-b-0 lg:border-r border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-4 h-4 text-amber-600" />
                1. Elegir Artículos para el Combo
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {availableProducts.length} productos en tienda
              </span>
            </div>

            {/* Buscador */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            {/* Lista scrolleable de productos disponibles */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoadingProducts ? (
                <div className="py-12 text-center text-xs text-slate-400 font-bold">
                  Cargando catálogo...
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-bold bg-white rounded-2xl border border-dashed border-slate-200 p-6">
                  No hay más productos disponibles para agregar
                </div>
              ) : (
                filteredAvailable.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddComponent(prod)}
                    className="flex items-center justify-between p-2.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 hover:border-amber-300 transition cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        {prod.imagen_url ? (
                          <img
                            src={getThumbnailUrl(prod.imagen_url, 80)}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                            📷
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={prod.nombre}>
                          {prod.nombre}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          <span className="text-slate-500">{prod.categoria_nombre || 'General'}</span>
                          <span className="text-slate-300">•</span>
                          <span className={`font-semibold ${prod.stock_actual > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            Stock: {prod.stock_actual}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900">
                        ${Number(prod.precio_venta).toLocaleString('es-AR')}
                      </span>
                      <button
                        type="button"
                        className="px-2.5 py-1.5 bg-amber-500 group-hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sumar</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Columna Derecha: Configuración y Precio del Combo (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col h-full overflow-y-auto bg-white space-y-4">
            <div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                2. Componentes del Kit ({selectedComponents.length})
              </span>
            </div>

            {/* Lista de Componentes Seleccionados */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedComponents.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-bold">
                  Hacé clic en los productos de la izquierda para agregarlos al combo.
                </div>
              ) : (
                selectedComponents.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={getThumbnailUrl(comp.imagen_url, 60)}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <span className="font-bold text-slate-800 truncate max-w-[120px]" title={comp.nombre}>
                        {comp.nombre}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Control de Cantidad */}
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(comp.id, -1)}
                          className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 font-black text-xs"
                        >
                          -
                        </button>
                        <span className="px-1.5 text-xs font-black text-slate-800">{comp.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(comp.id, 1)}
                          className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 font-black text-xs"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-extrabold text-slate-800 min-w-[50px] text-right">
                        ${(comp.precio_venta * comp.cantidad).toLocaleString('es-AR')}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(comp.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Formulario de Parámetros del Combo */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-1">
                  Nombre Comercial del Combo:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Kit Graduación 2026: Birrete + Flork"
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {/* Selector de Foto de Portada entre los seleccionados */}
              {selectedComponents.length > 0 && (
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wide mb-1">
                    Foto Principal de Portada:
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {selectedComponents.map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => setSelectedCoverImage(comp.imagen_url || '')}
                        className={`w-12 h-12 rounded-xl overflow-hidden border-2 cursor-pointer transition shrink-0 ${
                          selectedCoverImage === comp.imagen_url
                            ? 'border-amber-500 ring-2 ring-amber-500/30'
                            : 'border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={getThumbnailUrl(comp.imagen_url, 80)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fijar Precio Especial del Combo */}
              <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600">Suma Precios Individuales:</span>
                  <span className="font-extrabold text-slate-800 text-sm line-through">
                    ${totalIndividualPrice.toLocaleString('es-AR')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black text-amber-950 uppercase tracking-wide mb-1">
                    Precio Especial del Combo ($):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-black text-amber-700 text-sm">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={kitPrice}
                      onChange={(e) => setKitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Resumen del Ahorro para el cliente */}
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs font-black text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Ahorro del Cliente:
                    </span>
                    <span>
                      ${discountAmount.toLocaleString('es-AR')} ({discountPercent}% OFF)
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 pt-1 border-t border-amber-200/60">
                  <span>Stock listo para armar:</span>
                  <span className="text-slate-800 font-extrabold">{calculatedStock} combos</span>
                </div>
              </div>
            </div>

            {/* Botón Final de Guardado */}
            <div className="pt-2 mt-auto">
              <button
                type="button"
                onClick={handleSaveKit}
                disabled={isSaving || selectedComponents.length < 2 || !kitName.trim() || !kitPrice}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Creando Combo...' : 'Crear y Publicar en Tienda'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
