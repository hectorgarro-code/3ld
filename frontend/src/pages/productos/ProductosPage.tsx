import React, { useState, useEffect } from 'react'
import { useProductos, useCategorias, useDeleteProducto, useUpdateProducto } from '@/hooks/useProductos'
import { formatARS } from '@/lib/cost-calculator'
import { cn } from '@/lib/utils'
import { Search, AlertTriangle, Package, Plus, Minus, Pencil, Copy, Trash2, Loader2, Bot, Sparkles, Tags, Download, ExternalLink, ChevronLeft, ChevronRight, Images, Printer } from 'lucide-react'
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

  const images = (producto.imagenes && producto.imagenes.length > 0)
    ? producto.imagenes
    : (producto.imagen_url ? [producto.imagen_url] : [])
  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const currentImg = images.length > 0 ? images[activeImgIdx % images.length] : null

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
      <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {producto.archivo_url && (
          <a
            href={producto.archivo_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-blue-50/80 p-1.5 text-blue-600 hover:bg-blue-100 transition-colors shadow-xs"
            title="Abrir Archivo / STL Original"
          >
            <Download className="h-4 w-4" />
          </a>
        )}
        <button
          onClick={() => onEdit(producto)}
          className="rounded-lg bg-white/90 p-1.5 text-slate-600 hover:bg-primary/20 hover:text-primary transition-colors shadow-xs"
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDuplicate(producto)}
          className="rounded-lg bg-white/90 p-1.5 text-slate-600 hover:bg-secondary/20 hover:text-secondary transition-colors shadow-xs"
          title="Duplicar"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(producto)}
          className="rounded-lg bg-white/90 p-1.5 text-slate-600 hover:bg-red-500/20 hover:text-red-400 transition-colors shadow-xs"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Image / Gallery */}
      {currentImg ? (
        <div className="relative mb-3 flex h-28 items-center justify-center rounded-xl bg-slate-50 overflow-hidden group/img">
          <img src={currentImg} alt={producto.nombre} className="h-full w-full object-cover transition duration-300" />
          
          {/* Controls if multiple images */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveImgIdx((prev) => (prev - 1 + images.length) % images.length)
                }}
                className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
                title="Foto anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveImgIdx((prev) => (prev + 1) % images.length)
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
                title="Siguiente foto"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <span className="absolute bottom-1 right-1 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                <Images className="h-2.5 w-2.5" /> {((activeImgIdx % images.length) + 1)}/{images.length}
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-slate-50 text-4xl">
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('importMakerWorld') === 'true' || params.get('ia') === 'true') {
      setIsMakerWorldModalOpen(true)
    }
  }, [])

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
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-black text-white shadow-md transition-all"
            title="Imprimir / Exportar Informe de Productos y Precios"
          >
            <Printer className="h-4 w-4 text-cyan-400" />
            <span>Imprimir Informe</span>
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
      <div className="flex items-center justify-end gap-2">
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

      {/* Estilos para impresión del Informe de Productos */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden, header, nav, aside, footer {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>

      {/* Contenedor Imprimible del Informe de Productos y Precios */}
      <div className="hidden print:block p-4 bg-white text-slate-900 font-sans">
        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase">3LD IMPRESIÓN 3D - INFORME DE PRODUCTOS, PRECIOS Y COSTOS</h1>
            <p className="text-xs text-slate-600 font-bold">Listado General con Especificaciones de Variantes / Piezas</p>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <p>Fecha: {new Date().toLocaleDateString('es-AR')}</p>
            <p>Total artículos: {productosData?.data?.length || 0}</p>
          </div>
        </div>

        <table className="w-full text-[11px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-left">
              <th className="p-2 border border-slate-300">Producto / Pieza</th>
              <th className="p-2 border border-slate-300">Categoría</th>
              <th className="p-2 border border-slate-300">Medidas</th>
              <th className="p-2 border border-slate-300 text-right">Costo ($)</th>
              <th className="p-2 border border-slate-300 text-right">Venta ($)</th>
              <th className="p-2 border border-slate-300 text-center">Stock</th>
            </tr>
          </thead>
          <tbody>
            {productosData?.data?.map((p) => {
              let parsedPiezas: any[] = []
              if (Array.isArray(p.piezas)) {
                parsedPiezas = p.piezas
              } else if (typeof p.piezas === 'string' && (p.piezas as string).trim()) {
                try { parsedPiezas = JSON.parse(p.piezas as string) } catch (e) {}
              }
              const dimStr = (p.alto_mm || p.ancho_mm || p.profundidad_mm)
                ? `${p.alto_mm || 0}x${p.ancho_mm || 0}x${p.profundidad_mm || 0} mm`
                : (p.dimensiones || 'Sin medidas')

              return (
                <React.Fragment key={p.id}>
                  <tr className="border-b border-slate-300 bg-white font-semibold">
                    <td className="p-2 border border-slate-300 font-bold text-slate-900">
                      {p.nombre} {p.variante ? `(${p.variante})` : ''}
                      {p.sku && <span className="text-[9px] text-slate-500 block">SKU: {p.sku}</span>}
                    </td>
                    <td className="p-2 border border-slate-300">{p.categoria_nombre || p.categoria?.nombre || '-'}</td>
                    <td className="p-2 border border-slate-300">{dimStr}</td>
                    <td className="p-2 border border-slate-300 text-right">${Number(p.precio_costo || 0).toLocaleString('es-AR')}</td>
                    <td className="p-2 border border-slate-300 text-right font-black">${Number(p.precio_venta || 0).toLocaleString('es-AR')}</td>
                    <td className="p-2 border border-slate-300 text-center">{p.stock_actual}</td>
                  </tr>
                  {parsedPiezas.length > 0 && (
                    <tr className="bg-slate-50/90 border-b border-slate-300">
                      <td colSpan={6} className="p-2 pl-6 border border-slate-300 text-[10px]">
                        <p className="font-extrabold text-indigo-900 uppercase mb-1">Desglose de Componentes / Piezas:</p>
                        <div className="space-y-1">
                          {parsedPiezas.map((pieza: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between border-b border-slate-200/60 pb-0.5 last:border-0">
                              <span>• <strong>{pieza.nombre}</strong> {pieza.medidas ? `[Medidas: ${pieza.medidas}]` : ''}</span>
                              <div className="space-x-3 text-right">
                                <span className="text-slate-500">Costo: ${Number(pieza.precio_costo || 0).toLocaleString('es-AR')}</span>
                                <span className="font-bold text-indigo-950">Venta: ${Number(pieza.precio || 0).toLocaleString('es-AR')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
