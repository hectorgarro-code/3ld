import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProductos } from '@/hooks/useProductos'
import { useClientes, useCreateCliente } from '@/hooks/useClientes'
import { useCreatePedido } from '@/hooks/usePedidos'
import { toast } from '@/store/toastStore'
import { formatARS } from '@/lib/cost-calculator'
import { ProductoFormModal } from '@/components/productos/ProductoFormModal'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  Package,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Sparkles,
} from 'lucide-react'

export interface PosCartItem {
  producto_id: number
  nombre: string
  imagen_url?: string
  cantidad: number
  precio_unit: number
  notas: string
}

export default function PosPage() {
  const navigate = useNavigate()
  const { data: productosData, isLoading: loadingProductos, refetch: refetchProds } = useProductos({ per_page: 500 })
  const { data: clientesData, refetch: refetchClientes } = useClientes({ per_page: 500 })
  const createPedido = useCreatePedido()
  const createCliente = useCreateCliente()

  // UI state
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [cart, setCart] = useState<PosCartItem[]>([])

  // Order Details State
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [descuentoPct, setDescuentoPct] = useState<number>(0)
  const [estadoPedido, setEstadoPedido] = useState<'presupuesto' | 'aprobado' | 'cobrado'>('cobrado')
  const [notasGenerales, setNotasGenerales] = useState<string>('')

  // Modals
  const [isProductoModalOpen, setIsProductoModalOpen] = useState(false)
  const [isNewClienteModalOpen, setIsNewClienteModalOpen] = useState(false)
  const [newClienteNombre, setNewClienteNombre] = useState('')
  const [newClienteTelefono, setNewClienteTelefono] = useState('')

  // Item Edit Note Modal
  const [itemNoteModalIndex, setItemNoteModalIndex] = useState<number | null>(null)
  const [tempNoteValue, setTempNoteValue] = useState<string>('')

  // Quick Add Item Modal/State
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<any | null>(null)
  const [quickQty, setQuickQty] = useState<number>(1)
  const [quickPrice, setQuickPrice] = useState<number>(0)
  const [quickNota, setQuickNota] = useState<string>('')

  // Auto select default client
  const defaultClienteId = useMemo(() => {
    if (!clientesData?.data || clientesData.data.length === 0) return ''
    const consumidor = clientesData.data.find(
      (c) => c.nombre.toLowerCase().includes('consumidor final') || c.nombre.toLowerCase().includes('mostrador')
    )
    return consumidor ? consumidor.id : clientesData.data[0].id
  }, [clientesData])

  const activeClienteId = clienteId !== '' ? clienteId : defaultClienteId

  // Categories extraction
  const categories = useMemo(() => {
    if (!productosData?.data) return []
    const catMap = new Map<string, number>()
    productosData.data.forEach((p) => {
      const cat = p.categoria_nombre || 'General'
      catMap.set(cat, (catMap.get(cat) || 0) + 1)
    })
    return Array.from(catMap.entries()).map(([name, count]) => ({ name, count }))
  }, [productosData])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!productosData?.data) return []
    return productosData.data.filter((p) => {
      if (p.es_vendible === 0) return false
      if (selectedCategory !== 'all' && (p.categoria_nombre || 'General') !== selectedCategory) {
        return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          p.nombre.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.subcategoria || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [productosData, selectedCategory, search])

  // Open Quick Add Modal
  const handleOpenQuickAdd = (p: any) => {
    setSelectedProductForAdd(p)
    setQuickQty(1)
    setQuickPrice(p.precio_venta || 0)
    setQuickNota('')
  }

  // Confirm Quick Add to Cart
  const handleConfirmAddToCart = () => {
    if (!selectedProductForAdd) return
    const existingIndex = cart.findIndex(
      (item) => item.producto_id === selectedProductForAdd.id && item.notas === quickNota
    )

    if (existingIndex >= 0) {
      const updated = [...cart]
      updated[existingIndex].cantidad += quickQty
      updated[existingIndex].precio_unit = quickPrice
      setCart(updated)
    } else {
      setCart((prev) => [
        ...prev,
        {
          producto_id: selectedProductForAdd.id,
          nombre: selectedProductForAdd.nombre,
          imagen_url: selectedProductForAdd.imagen_url,
          cantidad: quickQty,
          precio_unit: quickPrice,
          notas: quickNota,
        },
      ])
    }

    setSelectedProductForAdd(null)
    toast(`"${selectedProductForAdd.nombre}" agregado a la venta`, 'success')
  }

  // Cart operations
  const updateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index))
      return
    }
    setCart((prev) => prev.map((item, i) => (i === index ? { ...item, cantidad: newQty } : item)))
  }

  const removeCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  const openNoteEdit = (index: number) => {
    setItemNoteModalIndex(index)
    setTempNoteValue(cart[index]?.notas || '')
  }

  const saveNoteEdit = () => {
    if (itemNoteModalIndex !== null) {
      setCart((prev) =>
        prev.map((item, i) => (i === itemNoteModalIndex ? { ...item, notas: tempNoteValue } : item))
      )
      setItemNoteModalIndex(null)
    }
  }

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.cantidad * item.precio_unit, 0)
  }, [cart])

  const total = useMemo(() => {
    return subtotal * (1 - descuentoPct / 100)
  }, [subtotal, descuentoPct])

  // Submit POS Sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast('El carrito está vacío', 'error')
      return
    }
    if (!activeClienteId) {
      toast('Seleccioná un cliente para continuar', 'error')
      return
    }

    try {
      const payload = {
        cliente_id: Number(activeClienteId),
        descuento_pct: descuentoPct,
        impuesto_pct: 0,
        notas: notasGenerales.trim() || 'Venta efectuada en Terminal POS',
        items: cart.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unit: item.precio_unit,
          subtotal: item.cantidad * item.precio_unit,
          notas: item.notas,
        })),
      }

      await createPedido.mutateAsync(payload as any)
      toast('¡Venta realizada con éxito! Reflejada en Pedidos', 'success')

      setCart([])
      setNotasGenerales('')
      setDescuentoPct(0)
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Error al procesar la venta', 'error')
    }
  }

  // Quick Client Creation
  const handleCreateQuickCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClienteNombre.trim()) return
    try {
      const res = await createCliente.mutateAsync({
        nombre: newClienteNombre.trim(),
        telefono: newClienteTelefono.trim() || undefined,
      } as any)
      toast('Cliente creado exitosamente', 'success')
      setIsNewClienteModalOpen(false)
      setNewClienteNombre('')
      setNewClienteTelefono('')
      await refetchClientes()
      if (res?.id) setClienteId(res.id)
    } catch (err) {
      toast('Error al crear cliente', 'error')
    }
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col md:flex-row gap-4 overflow-hidden p-2 sm:p-4 bg-slate-50/50">
      {/* LEFT COLUMN: Catalog & Products */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Header / Controls */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-black">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-black text-slate-900">Venta POS / Facturar</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsProductoModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold transition"
              >
                <Plus className="h-4 w-4" />
                <span>Nuevo Producto</span>
              </button>

              <button
                onClick={() => refetchProds()}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50"
                title="Actualizar catálogo"
              >
                <RefreshCw className={`h-4 w-4 ${loadingProductos ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search & Categories */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none text-xs font-bold">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-2 rounded-xl whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({productosData?.data?.length || 0})
              </button>
              {categories.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setSelectedCategory(c.name)}
                  className={`px-3 py-2 rounded-xl whitespace-nowrap transition ${
                    selectedCategory === c.name
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name} ({c.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProductos ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Package className="h-12 w-12 mb-2 stroke-1" />
              <p className="font-bold text-sm">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleOpenQuickAdd(p)}
                  className="group bg-white border border-slate-200 hover:border-teal-500 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition shadow-2xs hover:shadow-md"
                >
                  <div>
                    <div className="relative aspect-square w-full rounded-xl bg-slate-50 overflow-hidden mb-2 border border-slate-100 flex items-center justify-center">
                      {p.imagen_url ? (
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-slate-300" />
                      )}
                      {p.sku && (
                        <span className="absolute top-1.5 left-1.5 bg-slate-900/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                          {p.sku}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight">
                      {p.nombre}
                    </p>
                    <p className="text-[10px] text-teal-700 font-semibold mt-0.5">
                      {p.subcategoria || p.categoria_nombre || 'General'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-sm font-black text-slate-900">
                      ${p.precio_venta?.toLocaleString('es-AR')}
                    </span>
                    <button className="h-7 w-7 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Ticket / Venta */}
      <div className="w-full md:w-96 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Ticket Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-900 text-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black tracking-wide uppercase flex items-center gap-2 text-teal-400">
              <FileText className="h-4 w-4" /> Ticket de Venta
            </h2>
            <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
              N° Nuevo
            </span>
          </div>

          {/* Client Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Cliente</label>
            <div className="flex items-center gap-2">
              <select
                value={activeClienteId}
                onChange={(e) => setClienteId(Number(e.target.value))}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
              >
                {clientesData?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsNewClienteModalOpen(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-xl border border-slate-700 transition"
                title="Nuevo cliente"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Items Ticket List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <ShoppingBag className="h-10 w-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-bold">Carrito vacío</p>
              <p className="text-[11px] text-slate-400 text-center mt-1">
                Haz clic en un producto para agregarlo
              </p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="pt-2 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-900 leading-tight">
                      {item.nombre}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      ${item.precio_unit.toLocaleString('es-AR')} x {item.cantidad} ={' '}
                      <strong className="text-slate-900">
                        ${(item.cantidad * item.precio_unit).toLocaleString('es-AR')}
                      </strong>
                    </p>

                    {/* Nota Breve Badge / Field */}
                    <button
                      onClick={() => openNoteEdit(index)}
                      className={`mt-1.5 flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border transition ${
                        item.notas
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-50 text-slate-400 hover:text-slate-600 border-dashed border-slate-200'
                      }`}
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>{item.notas ? `Nota: ${item.notas}` : '+ Agregar Nota Breve'}</span>
                    </button>
                  </div>

                  {/* Quantity buttons */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => updateCartQty(index, item.cantidad - 1)}
                      className="h-5 w-5 bg-white rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-black text-slate-800 w-5 text-center">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => updateCartQty(index, item.cantidad + 1)}
                      className="h-5 w-5 bg-white rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold"
                    >
                      <Plus className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => removeCartItem(index)}
                      className="h-5 w-5 text-red-400 hover:text-red-600 ml-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary & Payment */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3">
          {/* Options: Discount & Status */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="font-bold text-slate-600 block mb-1">Descuento (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={descuentoPct}
                onChange={(e) => setDescuentoPct(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Estado Venta</label>
              <select
                value={estadoPedido}
                onChange={(e) => setEstadoPedido(e.target.value as any)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
              >
                <option value="cobrado">✅ Cobrado</option>
                <option value="aprobado">📦 Aprobado / Producción</option>
                <option value="presupuesto">📄 Presupuesto</option>
              </select>
            </div>
          </div>

          {/* Totals display */}
          <div className="space-y-1 pt-1">
            {descuentoPct > 0 && (
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>Subtotal</span>
                <span>{formatARS(subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-900">
              <span className="text-xs font-black uppercase text-slate-500">Total a Pagar</span>
              <span className="text-2xl font-black text-teal-600">{formatARS(total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || createPedido.isPending}
            className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition disabled:opacity-50"
          >
            {createPedido.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                <span>Confirmar Venta ({cart.length} ítems)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* QUICK ADD ITEM MODAL */}
      {selectedProductForAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900 mb-1">
              Agregar {selectedProductForAdd.nombre}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Definí la nota breve con características (club de fútbol, frase, personalización, etc.)
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">NOTA BREVE (Especificaciones)</label>
                <input
                  type="text"
                  maxLength={50}
                  autoFocus
                  value={quickNota}
                  onChange={(e) => setQuickNota(e.target.value)}
                  placeholder="Ej: Boca Juniors, Frase 'Feliz Día Papa'"
                  className="w-full p-3 bg-slate-50 border border-teal-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={quickQty}
                    onChange={(e) => setQuickQty(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Precio Unitario ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-5 mt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedProductForAdd(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAddToCart}
                className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-500 shadow-md"
              >
                Agregar a Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM NOTE EDIT MODAL */}
      {itemNoteModalIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900 mb-1">Editar Nota Breve</h3>
            <p className="text-xs text-slate-500 mb-4">
              Modifica la especificación del ítem seleccionado.
            </p>

            <div>
              <input
                type="text"
                maxLength={50}
                autoFocus
                value={tempNoteValue}
                onChange={(e) => setTempNoteValue(e.target.value)}
                placeholder="Ej: Marca, Club, Frase personalizada..."
                className="w-full p-3 bg-slate-50 border border-teal-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100 text-xs">
              <button
                onClick={() => setItemNoteModalIndex(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={saveNoteEdit}
                className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-500 shadow-md"
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CLIENT CREATION MODAL */}
      {isNewClienteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900 mb-3">Nuevo Cliente Rápido</h3>
            <form onSubmit={handleCreateQuickCliente} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newClienteNombre}
                  onChange={(e) => setNewClienteNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={newClienteTelefono}
                  onChange={(e) => setNewClienteTelefono(e.target.value)}
                  placeholder="Ej: 2257..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewClienteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createCliente.isPending}
                  className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-500 shadow-md"
                >
                  {createCliente.isPending ? 'Guardando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ALTA PRODUCTO */}
      <ProductoFormModal
        isOpen={isProductoModalOpen}
        onClose={() => {
          setIsProductoModalOpen(false)
          refetchProds()
        }}
      />
    </div>
  )
}
