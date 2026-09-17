import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  Package,
  Zap,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import api from '@/lib/api'

export interface AdminProduct {
  id: number
  nombre: string
  variante?: string
  sku?: string
  descripcion?: string
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
  categoria_nombre?: string
}

export default function TiendaAdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTienda, setFilterTienda] = useState<'all' | 'published' | 'hidden'>('all')

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

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

  useEffect(() => {
    fetchProducts()
  }, [])

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black text-slate-900">Gestión de Tienda Pública</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Administra los productos del catálogo web, precios, ofertas y estado de stock para la tienda.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría / Subcat</th>
                <th className="p-4">Precio Venta</th>
                <th className="p-4">Precio Oferta</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Estado Tienda</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt={p.nombre}
                            className="h-10 w-10 object-cover rounded-xl border border-slate-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{p.nombre}</p>
                          {p.sku && <p className="text-[10px] text-slate-400">SKU: {p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-700">{p.categoria_nombre || 'General'}</p>
                      <p className="text-[10px] text-cyan-700 font-bold">{p.subcategoria || 'Sin subcat'}</p>
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      ${p.precio_venta?.toLocaleString('es-AR')}
                    </td>
                    <td className="p-4">
                      {p.precio_oferta ? (
                        <span className="font-bold text-emerald-600">
                          ${p.precio_oferta.toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Editar Publicación en Tienda</h3>
              <button onClick={() => setEditingProduct(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Producto</label>
                <p className="font-bold text-slate-900 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  {editingProduct.nombre}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    value={editingProduct.precio_venta}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, precio_venta: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Precio Oferta / Tachado ($)</label>
                  <input
                    type="number"
                    value={editingProduct.precio_oferta || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        precio_oferta: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="Opcional"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subcategoría</label>
                  <input
                    type="text"
                    value={editingProduct.subcategoria || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, subcategoria: e.target.value })}
                    placeholder="Ej: Navidad, Pokémon"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Medidas / Tamaño</label>
                  <input
                    type="text"
                    value={editingProduct.dimensiones || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, dimensiones: e.target.value })}
                    placeholder="Ej: 8 x 5 cm"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Peso (Gramos)</label>
                  <input
                    type="number"
                    value={editingProduct.peso_gramos || 50}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, peso_gramos: parseInt(e.target.value) || 50 })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Disponibilidad Stock</label>
                  <select
                    value={editingProduct.estado_stock || 'ready'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, estado_stock: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="ready">⚡ En Stock (Entrega Inmediata)</option>
                    <option value="custom">🛠️ A Pedido (Impresión 24-48hs)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={!!editingProduct.es_tienda}
                    onChange={(e) => setEditingProduct({ ...editingProduct, es_tienda: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span>Publicado en Tienda Web</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-md disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
