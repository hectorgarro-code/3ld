import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  Search,
  X,
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  Package,
  Sparkles,
  RefreshCw,
  FolderPlus,
  DollarSign,
  Tag,
  Boxes,
  CheckSquare,
  Square,
  Sliders,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
} from 'lucide-react'
import api from '@/lib/api'
import { ProductoFormModal } from '@/components/productos/ProductoFormModal'

export interface AdminProduct {
  id: number
  nombre: string
  variante?: string
  sku?: string
  descripcion?: string
  precio_costo?: number
  precio_venta: number
  precio_oferta?: number | null
  stock_actual: number
  estado_stock?: 'ready' | 'custom' | string
  subcategoria?: string
  imagen_url?: string
  es_tienda: boolean | number
  es_destacado?: boolean | number
  peso_gramos?: number
  dimensiones?: string
  alto_mm?: number
  ancho_mm?: number
  profundidad_mm?: number
  horas_impresion?: number
  categoria_id?: number
  categoria_nombre?: string
}

export interface Categoria {
  id: number
  nombre: string
}

export default function TiendaAdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTienda, setFilterTienda] = useState<'all' | 'published' | 'hidden'>('all')

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Single Edit Modal State
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Bulk Action Modals
  const [bulkModal, setBulkModal] = useState<'category' | 'prices' | 'offers' | 'stock' | null>(null)
  
  // Bulk Form States
  const [bulkCatId, setBulkCatId] = useState<string>('')
  const [bulkSubcat, setBulkSubcat] = useState<string>('')

  const [bulkPriceMode, setBulkPriceMode] = useState<'percentage' | 'fixed'>('percentage')
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(0)

  const [bulkOfferMode, setBulkOfferMode] = useState<'percentage' | 'fixed' | 'clear'>('percentage')
  const [bulkOfferValue, setBulkOfferValue] = useState<number>(0)

  const [bulkStockMode, setBulkStockMode] = useState<'add' | 'fixed'>('fixed')
  const [bulkStockValue, setBulkStockValue] = useState<number>(0)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/productos', { params: { per_page: 500 } })
      if (res.data?.data) {
        setProducts(res.data.data)
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categorias')
      if (Array.isArray(res.data?.data)) {
        setCategories(res.data.data)
      } else if (Array.isArray(res.data)) {
        setCategories(res.data)
      }
    } catch (e) {
      // Fail gracefully
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Sorting State
  const [sortField, setSortField] = useState<keyof AdminProduct | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Inline Price Editing State
  const [editingCell, setEditingCell] = useState<{
    id: number
    field: 'precio_costo' | 'precio_venta' | 'precio_oferta'
    value: string
  } | null>(null)

  const handleSort = (field: keyof AdminProduct) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleCellSave = async () => {
    if (!editingCell) return
    const { id, field, value } = editingCell
    setEditingCell(null)

    const rawVal = value.trim()
    const numValue = rawVal === '' ? (field === 'precio_oferta' ? null : 0) : parseFloat(rawVal) || 0

    try {
      await api.put(`/productos/${id}`, {
        [field]: numValue,
      })
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: numValue } : p))
      )
      const fieldLabel =
        field === 'precio_costo'
          ? 'Costo'
          : field === 'precio_venta'
          ? 'Precio de venta'
          : 'Precio de oferta'
      showToast(`${fieldLabel} actualizado correctamente`)
    } catch (e) {
      showToast('Error al actualizar el precio', 'error')
    }
  }

  const filteredProducts = products.filter((p) => {
    if (filterTienda === 'published' && !p.es_tienda) return false
    if (filterTienda === 'hidden' && p.es_tienda) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.subcategoria || '').toLowerCase().includes(q) ||
        (p.categoria_nombre || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const sortedProducts = useMemo(() => {
    if (!sortField) return filteredProducts
    return [...filteredProducts].sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]

      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA === undefined || valA === null) valA = ''
      if (valB === undefined || valB === null) valB = ''

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredProducts, sortField, sortOrder])

  const printProducts = useMemo(() => {
    if (selectedIds.length > 0) {
      return sortedProducts.filter((p) => selectedIds.includes(p.id))
    }
    return sortedProducts
  }, [sortedProducts, selectedIds])

  const formatDimensions = (p: AdminProduct) => {
    if (p.dimensiones && p.dimensiones.trim() && p.dimensiones !== '0' && p.dimensiones !== '0x0') {
      return p.dimensiones
    }
    const alto = p.alto_mm || 0
    const ancho = p.ancho_mm || 0
    const prof = p.profundidad_mm || 0
    if (alto > 0 || ancho > 0 || prof > 0) {
      const parts = []
      if (alto > 0) parts.push(alto >= 10 ? `${(alto / 10).toFixed(1)} cm` : `${alto} mm`)
      if (ancho > 0) parts.push(ancho >= 10 ? `${(ancho / 10).toFixed(1)} cm` : `${ancho} mm`)
      if (prof > 0) parts.push(prof >= 10 ? `${(prof / 10).toFixed(1)} cm` : `${prof} mm`)
      return parts.join(' x ')
    }
    return '-'
  }

  const formatPrintTime = (p: AdminProduct) => {
    const hrs = p.horas_impresion || 0
    if (!hrs || hrs <= 0) return '-'
    const totalMin = Math.round(hrs * 60)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  // Selection Logic
  const allFilteredSelected =
    sortedProducts.length > 0 && sortedProducts.every((p) => selectedIds.includes(p.id))

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(sortedProducts.map((p) => p.id))
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)))
    } else {
      const filteredSet = new Set(sortedProducts.map((p) => p.id))
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredSet])))
    }
  }

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Single Toggle Visibilidad
  const handleToggleTienda = async (prod: AdminProduct) => {
    const newStatus = !prod.es_tienda
    try {
      await api.post(`/tienda/productos/${prod.id}/toggle`, { es_tienda: newStatus })
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, es_tienda: newStatus } : p))
      )
      showToast(newStatus ? 'Producto publicado en la Tienda' : 'Producto ocultado de la Tienda')
    } catch (err) {
      showToast('No se pudo actualizar el estado', 'error')
    }
  }

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingProduct) return
    setSaving(true)
    try {
      await api.put(`/tienda/productos/${editingProduct.id}`, {
        subcategoria: editingProduct.subcategoria,
        price: editingProduct.precio_venta,
        oldPrice: editingProduct.precio_oferta || null,
        stock_actual: editingProduct.stock_actual,
        stockStatus: editingProduct.estado_stock || 'ready',
        weightGrams: editingProduct.peso_gramos || 50,
        size: editingProduct.dimensiones || '',
        es_tienda: editingProduct.es_tienda,
        es_destacado: editingProduct.es_destacado,
      })
      showToast('Producto actualizado correctamente')
      setEditingProduct(null)
      fetchProducts()
    } catch (err) {
      showToast('Error al guardar cambios', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Execute Bulk Operation
  const executeBulkAction = async (action: string, params: Record<string, any>) => {
    if (selectedIds.length === 0) {
      showToast('Selecciona al menos un producto', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/tienda/productos/bulk-update', {
        ids: selectedIds,
        action,
        params,
      })
      if (res.data?.success) {
        showToast(`Acción masiva ejecutada en ${selectedIds.length} productos`)
        setBulkModal(null)
        fetchProducts()
      } else {
        showToast(res.data?.message || 'Error en la acción masiva', 'error')
      }
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Error en la acción masiva', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Screen Web UI (Hidden during window.print()) */}
      <div className="print:hidden space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black text-slate-900">Gestión de Tienda Pública</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Administra los productos del catálogo web, realiza acciones masivas de precios, stock y categorías.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#6B66C8] hover:bg-[#5752B3] text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            title="Imprimir informe evaluativo de costos, dimensiones y tiempos de impresión"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Informe Costos/Precios</span>
          </button>
          <Link
            to="/tienda-builder"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-extrabold rounded-xl shadow-md transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Editor Visual (Elementor)</span>
          </Link>
          <a
            href="/tienda"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Ver Tienda en Vivo</span>
          </a>
          <button
            onClick={fetchProducts}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition"
            title="Recargar catálogo"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sticky Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-30 bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white font-extrabold text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold">Productos seleccionados</span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-slate-400 hover:text-white underline font-semibold ml-2"
            >
              Deseleccionar todos
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => executeBulkAction('visibility', { es_tienda: 1 })}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Publicar</span>
            </button>
            <button
              onClick={() => executeBulkAction('visibility', { es_tienda: 0 })}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold border border-slate-700 transition"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Ocultar</span>
            </button>

            <button
              onClick={() => {
                setBulkCatId('')
                setBulkSubcat('')
                setBulkModal('category')
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Categoría</span>
            </button>

            <button
              onClick={() => {
                setBulkPriceMode('percentage')
                setBulkPriceValue(0)
                setBulkModal('prices')
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition"
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Cambiar Precios</span>
            </button>

            <button
              onClick={() => {
                setBulkOfferMode('percentage')
                setBulkOfferValue(10)
                setBulkModal('offers')
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Precio Oferta</span>
            </button>

            <button
              onClick={() => {
                setBulkStockMode('fixed')
                setBulkStockValue(10)
                setBulkModal('stock')
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition"
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Stock</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, subcategoría..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Filtrar:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterTienda('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTienda === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setFilterTienda('published')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTienda === 'published' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-slate-500'
              }`}
            >
              Publicados ({products.filter((p) => p.es_tienda).length})
            </button>
            <button
              onClick={() => setFilterTienda('hidden')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterTienda === 'hidden' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-500'
              }`}
            >
              Ocultos ({products.filter((p) => !p.es_tienda).length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider select-none">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th onClick={() => handleSort('nombre')} className="p-4 cursor-pointer hover:bg-slate-100 transition">
                  <div className="flex items-center gap-1.5">
                    <span>Producto</span>
                    {sortField === 'nombre' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('categoria_nombre')} className="p-4 cursor-pointer hover:bg-slate-100 transition">
                  <div className="flex items-center gap-1.5">
                    <span>Categoría / Subcat</span>
                    {sortField === 'categoria_nombre' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('precio_costo')} className="p-4 cursor-pointer hover:bg-slate-100 transition">
                  <div className="flex items-center gap-1.5">
                    <span>Costo</span>
                    {sortField === 'precio_costo' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('precio_venta')} className="p-4 cursor-pointer hover:bg-slate-100 transition">
                  <div className="flex items-center gap-1.5">
                    <span>Precio Venta</span>
                    {sortField === 'precio_venta' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('precio_oferta')} className="p-4 cursor-pointer hover:bg-slate-100 transition">
                  <div className="flex items-center gap-1.5">
                    <span>Precio Oferta</span>
                    {sortField === 'precio_oferta' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('stock_actual')} className="p-4 cursor-pointer hover:bg-slate-100 transition">
                  <div className="flex items-center gap-1.5">
                    <span>Stock</span>
                    {sortField === 'stock_actual' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th onClick={() => handleSort('es_tienda')} className="p-4 cursor-pointer hover:bg-slate-100 transition">
                  <div className="flex items-center gap-1.5">
                    <span>Estado Tienda</span>
                    {sortField === 'es_tienda' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                sortedProducts.map((p) => {
                  const isSelected = selectedIds.includes(p.id)
                  return (
                    <tr
                      key={p.id}
                      className={`transition ${
                        isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(p.id)}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {p.imagen_url ? (
                            <img
                              src={p.imagen_url}
                              alt={p.nombre}
                              className="h-16 w-16 object-cover rounded-2xl border border-slate-200 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="h-7 w-7" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{p.nombre}</p>
                            {p.sku && <p className="text-[10px] text-slate-400">SKU: {p.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-700">
                          {p.categoria_nombre || 'General'}
                        </p>
                        <p className="text-[10px] text-cyan-700 font-bold">
                          {p.subcategoria || 'Sin subcat'}
                        </p>
                      </td>

                      {/* Costo (Doble Clic para Editar) */}
                      <td
                        className="p-4 font-bold text-slate-700 cursor-pointer hover:bg-amber-50/80 transition group relative"
                        onDoubleClick={() => setEditingCell({ id: p.id, field: 'precio_costo', value: p.precio_costo ? String(p.precio_costo) : '' })}
                        title="Doble clic para editar costo"
                      >
                        {editingCell?.id === p.id && editingCell?.field === 'precio_costo' ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              step="any"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave()
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              onBlur={handleCellSave}
                              autoFocus
                              className="w-24 px-2 py-1 bg-white border-2 border-amber-500 rounded-lg text-xs font-bold text-slate-900 shadow-sm focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>${(p.precio_costo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </td>

                      {/* Precio Venta (Doble Clic para Editar) */}
                      <td
                        className="p-4 font-bold text-slate-900 cursor-pointer hover:bg-cyan-50/80 transition group relative"
                        onDoubleClick={() => setEditingCell({ id: p.id, field: 'precio_venta', value: p.precio_venta ? String(p.precio_venta) : '' })}
                        title="Doble clic para editar precio de venta"
                      >
                        {editingCell?.id === p.id && editingCell?.field === 'precio_venta' ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              step="any"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave()
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              onBlur={handleCellSave}
                              autoFocus
                              className="w-24 px-2 py-1 bg-white border-2 border-cyan-500 rounded-lg text-xs font-bold text-slate-900 shadow-sm focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>${(p.precio_venta || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </td>

                      {/* Precio Oferta (Doble Clic para Editar) */}
                      <td
                        className="p-4 cursor-pointer hover:bg-emerald-50/80 transition group relative"
                        onDoubleClick={() => setEditingCell({ id: p.id, field: 'precio_oferta', value: p.precio_oferta ? String(p.precio_oferta) : '' })}
                        title="Doble clic para editar precio de oferta"
                      >
                        {editingCell?.id === p.id && editingCell?.field === 'precio_oferta' ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              step="any"
                              value={editingCell.value}
                              placeholder="Sin oferta"
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave()
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              onBlur={handleCellSave}
                              autoFocus
                              className="w-24 px-2 py-1 bg-white border-2 border-emerald-500 rounded-lg text-xs font-bold text-slate-900 shadow-sm focus:outline-none"
                            />
                          </div>
                        ) : p.precio_oferta ? (
                          <div className="flex items-center gap-1 font-bold text-emerald-600">
                            <span>${p.precio_oferta.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-300">
                            <span>-</span>
                            <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="font-extrabold text-slate-800">{p.stock_actual} un</span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleTienda(p)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold transition ${
                            p.es_tienda
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {p.es_tienda ? (
                            <>
                              <Eye className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Publicado</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                              <span>Oculto</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="p-2 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-xl transition"
                          title="Editar publicación"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Category Modal */}
      {bulkModal === 'category' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900">Asignar Categoría Masiva</h3>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-500">
                Asigna categoría o subcategoría a los <strong>{selectedIds.length}</strong> productos seleccionados.
              </p>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Categoría Principal</label>
                <select
                  value={bulkCatId}
                  onChange={(e) => setBulkCatId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                >
                  <option value="">-- No modificar categoría principal --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subcategoría</label>
                <input
                  type="text"
                  value={bulkSubcat}
                  onChange={(e) => setBulkSubcat(e.target.value)}
                  placeholder="Ej: Navidad, Regalos, Llaveros"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setBulkModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    executeBulkAction('category', {
                      categoria_id: bulkCatId !== '' ? bulkCatId : null,
                      subcategoria: bulkSubcat.trim() !== '' ? bulkSubcat.trim() : null,
                    })
                  }
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-md disabled:opacity-50"
                >
                  Aplicar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Prices Modal */}
      {bulkModal === 'prices' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-cyan-600" />
                <h3 className="font-extrabold text-base text-slate-900">Cambiar Precios de Venta</h3>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-500">
                Aplica variaciones de precio a los <strong>{selectedIds.length}</strong> productos seleccionados.
              </p>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tipo de Modificación</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl font-bold">
                  <button
                    onClick={() => setBulkPriceMode('percentage')}
                    className={`py-2 rounded-lg transition ${
                      bulkPriceMode === 'percentage'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Porcentaje (%+ / %-)
                  </button>
                  <button
                    onClick={() => setBulkPriceMode('fixed')}
                    className={`py-2 rounded-lg transition ${
                      bulkPriceMode === 'fixed'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Precio Fijo ($)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {bulkPriceMode === 'percentage'
                    ? 'Porcentaje (Ej: 15 para +15%, -10 para -10%)'
                    : 'Nuevo Precio ($)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setBulkModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    executeBulkAction('prices', {
                      mode: bulkPriceMode,
                      value: bulkPriceValue,
                    })
                  }
                  disabled={saving}
                  className="px-5 py-2 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition shadow-md disabled:opacity-50"
                >
                  Aplicar a {selectedIds.length} productos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Offer Modal */}
      {bulkModal === 'offers' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-600" />
                <h3 className="font-extrabold text-base text-slate-900">Configurar Precio de Oferta</h3>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-500">
                Establece ofertas en los <strong>{selectedIds.length}</strong> productos seleccionados.
              </p>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Modo de Oferta</label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl font-bold">
                  <button
                    onClick={() => setBulkOfferMode('percentage')}
                    className={`py-2 rounded-lg transition text-[11px] ${
                      bulkOfferMode === 'percentage'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    % Descuento
                  </button>
                  <button
                    onClick={() => setBulkOfferMode('fixed')}
                    className={`py-2 rounded-lg transition text-[11px] ${
                      bulkOfferMode === 'fixed'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Precio Fijo
                  </button>
                  <button
                    onClick={() => setBulkOfferMode('clear')}
                    className={`py-2 rounded-lg transition text-[11px] ${
                      bulkOfferMode === 'clear'
                        ? 'bg-red-500 text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Quitar Oferta
                  </button>
                </div>
              </div>

              {bulkOfferMode !== 'clear' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {bulkOfferMode === 'percentage'
                      ? 'Descuento % sobre precio regular (Ej: 20 para 20% OFF)'
                      : 'Precio de Oferta Fijo ($)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={bulkOfferValue}
                    onChange={(e) => setBulkOfferValue(parseFloat(e.target.value) || 0)}
                    placeholder="Ej: 15"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setBulkModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    executeBulkAction('offers', {
                      mode: bulkOfferMode,
                      value: bulkOfferValue,
                    })
                  }
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition shadow-md disabled:opacity-50"
                >
                  Aplicar Oferta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Stock Modal */}
      {bulkModal === 'stock' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-purple-600" />
                <h3 className="font-extrabold text-base text-slate-900">Modificar Stock Masivo</h3>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-500">
                Ajusta las cantidades de stock de los <strong>{selectedIds.length}</strong> productos seleccionados.
              </p>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Acción de Stock</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl font-bold">
                  <button
                    onClick={() => setBulkStockMode('fixed')}
                    className={`py-2 rounded-lg transition ${
                      bulkStockMode === 'fixed'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Establecer Cantidad Fija
                  </button>
                  <button
                    onClick={() => setBulkStockMode('add')}
                    className={`py-2 rounded-lg transition ${
                      bulkStockMode === 'add'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Sumar / Restar Delta
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {bulkStockMode === 'fixed'
                    ? 'Nueva cantidad de stock (Ej: 10)'
                    : 'Cantidad a añadir o restar (Ej: +5 o -3)'}
                </label>
                <input
                  type="number"
                  value={bulkStockValue}
                  onChange={(e) => setBulkStockValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setBulkModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    executeBulkAction('stock', {
                      mode: bulkStockMode,
                      value: bulkStockValue,
                    })
                  }
                  disabled={saving}
                  className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition shadow-md disabled:opacity-50"
                >
                  Actualizar Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal Unificado */}
      {editingProduct && (
        <ProductoFormModal
          isOpen={!!editingProduct}
          onClose={() => {
            setEditingProduct(null)
            fetchProducts()
          }}
          producto={editingProduct as any}
        />
      )}
      </div>

      {/* Styles for Window Print */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 4mm;
              }
              html, body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              header, footer, nav, aside, .no-print {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* Printable Evaluation & Costing Report Container (Visible ONLY during window.print()) */}
      <div className="hidden print:block p-2 bg-white text-slate-900 font-sans">
        {/* Report Header */}
        <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">3LD IMPRESIÓN 3D — INFORME DE COSTOS Y DIMENSIONES</h1>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Planilla de evaluación: Foto, Dimensiones, Peso, Tiempo de Impresión 3D y Precio de Costo.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-800 block">
              Fecha: {new Date().toLocaleDateString('es-AR')}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {printProducts.length} artículo(s) en lista
            </span>
          </div>
        </div>

        {/* Evaluation Table */}
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-900 font-black uppercase text-xs">
              <th className="p-2 w-40 text-center">Foto</th>
              <th className="p-2">Producto / Referencia</th>
              <th className="p-2 w-44">Dimensiones / Peso</th>
              <th className="p-2 text-center w-24">Tiempo 3D</th>
              <th className="p-2 text-right w-28">Precio Costo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {printProducts.map((p) => {
              const costo = p.precio_costo || 0
              const dimensionsStr = formatDimensions(p)
              const printTimeStr = formatPrintTime(p)

              return (
                <tr key={p.id} className="break-inside-avoid border-b border-slate-200 text-slate-800">
                  <td className="p-2 text-center align-middle">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} className="h-36 w-36 object-cover rounded-2xl border border-slate-300 mx-auto shadow-xs" />
                    ) : (
                      <div className="h-36 w-36 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs mx-auto">
                        Sin foto
                      </div>
                    )}
                  </td>
                  <td className="p-2 align-middle">
                    <p className="font-black text-slate-900 text-base leading-snug">{p.nombre}</p>
                    {p.variante && <p className="text-xs text-slate-600 font-bold mt-0.5">Variante: {p.variante}</p>}
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      SKU: {p.sku || '-'} · {p.categoria_nombre || 'Sin cat.'} {p.subcategoria ? '(' + p.subcategoria + ')' : ''}
                    </p>
                  </td>
                  <td className="p-2 align-middle text-xs">
                    <p className="font-bold text-slate-800 text-sm">{dimensionsStr}</p>
                    {p.peso_gramos ? <p className="text-xs text-slate-500 font-semibold mt-0.5">Peso: {p.peso_gramos} g</p> : null}
                  </td>
                  <td className="p-2 text-center align-middle font-bold text-slate-900 text-sm">
                    {printTimeStr}
                  </td>
                  <td className="p-2 text-right align-middle font-black text-slate-900 text-base">
                    {'$' + costo.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
