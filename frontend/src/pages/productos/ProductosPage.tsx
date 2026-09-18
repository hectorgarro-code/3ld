import { useState } from 'react'
import { useProductos, useCategorias, useDeleteProducto, useUpdateProducto } from '@/hooks/useProductos'
import { formatARS } from '@/lib/cost-calculator'
import { cn } from '@/lib/utils'
import { Search, AlertTriangle, Package, Plus, Minus, Pencil, Copy, Trash2, Loader2, Bot, Sparkles, Tags } from 'lucide-react'
import type { Producto, ProductoTipo } from '@/types'
import { ProductoFormModal } from '@/components/productos/ProductoFormModal'
import { MakerWorldImportModal } from '@/components/productos/MakerWorldImportModal'
import { CategoriasModal } from '@/components/productos/CategoriasModal'
import { toast } from '@/store/toastStore'

const tipoConfig: Record<string, { label: string; color: string; emoji: string }> = {
  impresion_3d: { label: '3D', color: 'bg-primary/20 text-primary', emoji: '🖨️' },
  ceramica: { label: 'Cerámica', color: 'bg-secondary/20 text-secondary', emoji: '🏺' },
  juguete_educativo: { label: 'Juguete', color: 'bg-accent/20 text-accent', emoji: '🧩' },
  accesorio: { label: 'Accesorio', color: 'bg-brand-purple/20 text-brand-purple', emoji: '⚙️' },
  comprado: { label: 'Comprado', color: 'bg-blue-500/20 text-blue-400', emoji: '🛍️' },
  fabricado: { label: 'Fabricado', color: 'bg-orange-500/20 text-orange-400', emoji: '🔨' },
  compuesto: { label: 'Compuesto', color: 'bg-pink-500/20 text-pink-400', emoji: '📦' },
}

const TIPO_OPTIONS: { value: ProductoTipo | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'impresion_3d', label: '3D' },
  { value: 'ceramica', label: 'Cerámica' },
  { value: 'juguete_educativo', label: 'Juguetes' },
  { value: 'accesorio', label: 'Accesorios' },
]

function ProductoCard({ 
  producto, 
  onEdit, 
  onDuplicate, 
  onDelete 
}: { 
  producto: Producto, 
  onEdit: (p: Producto) => void,
  onDuplicate: (p: Producto) => void,
  onDelete: (p: Producto) => void
}) {
  const cfg = tipoConfig[producto.tipo] || { label: producto.tipo, color: 'bg-gray-500/20 text-slate-500', emoji: '📦' }
  const isBajStock = Number(producto.stock_actual) <= Number(producto.stock_minimo)
  const updateMutation = useUpdateProducto()

  const handleStockChange = async (increment: number) => {
    const newStock = Number(producto.stock_actual) + increment
    if (newStock < 0) return

    const tieneReceta = (producto as any).receta && (producto as any).receta.length > 0

    try {
      await updateMutation.mutateAsync({ id: producto.id, payload: { stock_actual: newStock } })
      toast(`Stock actualizado a ${newStock}`, 'success')
      if (tieneReceta) {
        toast('Recuerda ajustar el stock de insumos manualmente', 'error')
      }
    } catch {
      toast('Error al actualizar stock', 'error')
    }
  }

  return (
    <div className="group relative rounded-2xl border border-slate-100 bg-white card-shadow p-4 transition-all hover:border-primary/30">
      {/* Action Buttons (visible on hover) */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(producto)}
          className="rounded-lg bg-slate-50/50 p-1.5 text-slate-500 hover:bg-primary/20 hover:text-primary transition-colors"
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDuplicate(producto)}
          className="rounded-lg bg-slate-50/50 p-1.5 text-slate-500 hover:bg-secondary/20 hover:text-secondary transition-colors"
          title="Duplicar"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(producto)}
          className="rounded-lg bg-slate-50/50 p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Image placeholder or uploaded image */}
      {producto.imagen_url ? (
        <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-slate-50 overflow-hidden">
          <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-slate-50 text-4xl">
          {cfg.emoji}
        </div>
      )}

      {/* Badge */}
      <div className="mb-2 flex items-start justify-between">
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', cfg.color)}>
          {cfg.label}
        </span>
        {isBajStock && (
          <div className="flex items-center gap-1 text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">Stock bajo</span>
          </div>
        )}
      </div>

      <p className="mb-0.5 text-sm font-black text-slate-800 line-clamp-2">{producto.nombre}</p>
      
      {producto.variante && (
        <p className="mb-1 text-xs font-bold text-slate-500">Var: <span className="text-slate-400">{producto.variante}</span></p>
      )}

      {producto.categoria && (
        <p className="mb-2 text-xs text-slate-400">{producto.categoria.nombre}</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <p className="text-base font-black text-primary">{formatARS(producto.precio_venta)}</p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleStockChange(-1)}
            disabled={updateMutation.isPending || Number(producto.stock_actual) <= 0}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
            title="Restar 1"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className={cn('min-w-[2rem] text-center text-xs font-bold', isBajStock ? 'text-red-400' : 'text-brand-green')}>
            {updateMutation.isPending ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : Number(producto.stock_actual)}
          </span>
          <button
            onClick={() => handleStockChange(1)}
            disabled={updateMutation.isPending}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50"
            title="Sumar 1"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductosPage() {
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState<ProductoTipo | 'todos'>('todos')
  const [categoriaId, setCategoriaId] = useState<number | undefined>()
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMakerWorldModalOpen, setIsMakerWorldModalOpen] = useState(false)
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)

  const { data: productosData, isLoading } = useProductos({
    search: search || undefined,
    tipo: tipo !== 'todos' ? tipo : undefined,
    categoria_id: categoriaId,
  })

  const { data: categorias } = useCategorias()
  const deleteMutation = useDeleteProducto()

  const handleNew = () => {
    setSelectedProducto(null)
    setIsDuplicate(false)
    setIsModalOpen(true)
  }

  const handleEdit = (p: Producto) => {
    setSelectedProducto(p)
    setIsDuplicate(false)
    setIsModalOpen(true)
  }

  const handleDuplicate = (p: Producto) => {
    setSelectedProducto(p)
    setIsDuplicate(true)
    setIsModalOpen(true)
  }

  const handleDelete = async (p: Producto) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el producto "${p.nombre}"?`)) {
      try {
        await deleteMutation.mutateAsync(p.id)
        toast('Producto eliminado exitosamente', 'success')
      } catch (error: any) {
        toast(error.message || 'Error al eliminar el producto', 'error')
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-white card-shadow py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-gray-500 outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsCategoriasModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-700 card-shadow transition-all hover:bg-slate-50 hover:border-[#6B66C8]/40"
          >
            <Tags className="h-4 w-4 text-[#6B66C8]" />
            <span>Categorías</span>
          </button>
          <button
            onClick={() => setIsMakerWorldModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-2.5 text-xs font-black text-white shadow-md transition-all hover:brightness-110"
          >
            <Bot className="h-4 w-4" />
            <span>Importar MakerWorld (IA)</span>
          </button>
          <button
            onClick={handleNew}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          {TIPO_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value as ProductoTipo | 'todos')}
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all',
                tipo === t.value
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/50'
                  : 'bg-white card-shadow text-slate-500 hover:text-slate-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Categoria filter */}
        <div className="flex items-center gap-2">
          {categorias && categorias.length > 0 && (
            <select
              value={categoriaId ?? ''}
              onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full sm:w-48 rounded-xl border border-slate-100 bg-white card-shadow px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setIsCategoriasModalOpen(true)}
            className="p-2.5 rounded-xl border border-slate-100 bg-white text-slate-500 hover:text-[#6B66C8] hover:border-[#6B66C8]/40 transition card-shadow shrink-0"
            title="Gestionar Categorías"
          >
            <Tags className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-white card-shadow" />
          ))}
        </div>
      ) : productosData?.data && productosData.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {productosData.data.map((p) => (
            <ProductoCard 
              key={p.id} 
              producto={p} 
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-100 py-16">
          <Package className="mb-3 h-16 w-16 text-gray-700" />
          <p className="text-base font-bold text-slate-500">Sin productos</p>
          <p className="text-sm text-gray-600">No se encontraron productos o intenta con otro filtro</p>
        </div>
      )}

      {/* Modales */}
      <ProductoFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        producto={selectedProducto}
        isDuplicate={isDuplicate}
      />

      <MakerWorldImportModal
        isOpen={isMakerWorldModalOpen}
        onClose={() => setIsMakerWorldModalOpen(false)}
      />

      <CategoriasModal
        isOpen={isCategoriasModalOpen}
        onClose={() => setIsCategoriasModalOpen(false)}
      />
    </div>
  )
}
