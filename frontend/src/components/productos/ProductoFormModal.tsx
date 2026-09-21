import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, ImagePlus, Trash2, Plus, Sparkles, ExternalLink, Star } from 'lucide-react'
import api from '@/lib/api'
import type { Producto } from '@/types'
import { compressImage } from '@/lib/imageUtils'
import { useCreateProducto, useUpdateProducto, useCategorias, useProductos } from '@/hooks/useProductos'
import { toast } from '@/store/toastStore'
import { cn } from '@/lib/utils'
import { StockHistory } from './StockHistory'

import { CostoImpresionModal } from './CostoImpresionModal'

const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  variante: z.string().optional(),
  sku: z.string().optional(),
  tipo: z.enum(['impresion_3d', 'ceramica', 'juguete_educativo', 'accesorio', 'comprado', 'fabricado', 'compuesto']),
  categoria_id: z.number().optional().nullable(),
  precio_venta: z.number().min(0, 'El precio no puede ser negativo'),
  precio_costo: z.number().min(0).optional(),
  precio_oferta: z.number().min(0).optional().nullable(),
  subcategoria: z.string().optional().nullable(),
  estado_stock: z.string().optional(),
  horas_impresion: z.number().min(0).optional(),
  peso_gramos: z.number().min(0).optional(),
  alto_mm: z.number().min(0).optional(),
  ancho_mm: z.number().min(0).optional(),
  profundidad_mm: z.number().min(0).optional(),
  stock_actual: z.number().min(0),
  stock_minimo: z.number().min(0),
  descripcion: z.string().optional(),
  archivo_url: z.string().optional().nullable(),
  es_vendible: z.boolean().default(true),
  es_insumo: z.boolean().default(false),
  es_tienda: z.boolean().default(false),
})

type ProductoForm = z.infer<typeof productoSchema>

interface Props {
  isOpen: boolean
  onClose: () => void
  producto?: Producto | null
  isDuplicate?: boolean
  initialImages?: string[]
}

export function ProductoFormModal({ isOpen, onClose, producto, isDuplicate, initialImages }: Props) {
  const { data: categorias } = useCategorias()
  const createMutation = useCreateProducto()
  const updateMutation = useUpdateProducto()

  const [imagesBase64, setImagesBase64] = useState<string[]>([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [receta, setReceta] = useState<{insumo_id: number, cantidad: number, insumo_nombre?: string, precio_costo?: number, unidad_medida?: string}[]>([])
  const [activeTab, setActiveTab] = useState<'detalles' | 'historial'>('detalles')
  const [isCostoModalOpen, setIsCostoModalOpen] = useState(false)

  const { data: productosData } = useProductos({ per_page: 500 })
  const insumosDisponibles = productosData?.data?.filter(p => p.es_insumo === 1 && p.id !== producto?.id) || []

  const isEditing = !!producto && !isDuplicate

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      nombre: '',
      variante: '',
      sku: '',
      tipo: 'impresion_3d',
      categoria_id: null,
      precio_venta: 0,
      precio_costo: 0,
      precio_oferta: null,
      subcategoria: '',
      estado_stock: 'ready',
      horas_impresion: 0,
      peso_gramos: 0,
      alto_mm: 0,
      ancho_mm: 0,
      profundidad_mm: 0,
      stock_actual: 1,
      stock_minimo: 1,
      descripcion: '',
      archivo_url: '',
      es_vendible: true,
      es_insumo: false,
      es_tienda: false,
    },
  })

  const generateSKU = () => {
    return 'PRD-' + Math.random().toString(36).substring(2, 7).toUpperCase()
  }

  useEffect(() => {
    if (isOpen && producto) {
      const p = producto as any
      reset({
        nombre: isDuplicate ? `${producto.nombre} (Copia)` : producto.nombre,
        variante: producto.variante || '',
        sku: isDuplicate ? generateSKU() : (p.sku || ''),
        tipo: producto.tipo,
        categoria_id: producto.categoria_id,
        precio_venta: producto.precio_venta,
        precio_costo: p.precio_costo ?? 0,
        precio_oferta: p.precio_oferta ?? null,
        subcategoria: p.subcategoria || '',
        estado_stock: p.stock_actual > 0 ? 'ready' : 'custom',
        horas_impresion: p.horas_impresion ?? 0,
        peso_gramos: p.peso_gramos ?? 0,
        alto_mm: p.alto_mm ?? 0,
        ancho_mm: p.ancho_mm ?? 0,
        profundidad_mm: p.profundidad_mm ?? 0,
        stock_actual: isDuplicate ? 1 : producto.stock_actual,
        stock_minimo: producto.stock_minimo || 0,
        descripcion: producto.descripcion || '',
        archivo_url: p.archivo_url || '',
        es_vendible: producto.es_vendible !== 0,
        es_insumo: producto.es_insumo === 1,
        es_tienda: Boolean(p.es_tienda),
      })
      setReceta((producto as any).receta || [])
      let existing: string[] = []
      if (Array.isArray(p.imagenes) && p.imagenes.length > 0) {
        existing = p.imagenes
      } else if (typeof p.imagenes === 'string' && p.imagenes.trim()) {
        try {
          const parsed = JSON.parse(p.imagenes)
          if (Array.isArray(parsed)) existing = parsed
        } catch (e) {
          existing = [p.imagenes]
        }
      }
      if (existing.length === 0 && producto.imagen_url) {
        existing = [producto.imagen_url]
      }
      setImagesBase64(existing.slice(0, 5))
    } else if (isOpen && !producto) {
      const savedCatId = localStorage.getItem('last_categoria_id')
      const savedSubcat = localStorage.getItem('last_subcategoria')
      reset({
        nombre: '',
        variante: '',
        sku: generateSKU(),
        tipo: 'impresion_3d',
        categoria_id: savedCatId ? parseInt(savedCatId, 10) : null,
        precio_venta: 0,
        precio_costo: 0,
        precio_oferta: null,
        subcategoria: savedSubcat || '',
        estado_stock: 'custom',
        horas_impresion: 0,
        peso_gramos: 0,
        alto_mm: 0,
        ancho_mm: 0,
        profundidad_mm: 0,
        stock_actual: 1,
        stock_minimo: 1,
        descripcion: '',
        archivo_url: '',
        es_vendible: true,
        es_insumo: false,
        es_tienda: false,
      })
      setReceta([])
      if (initialImages && initialImages.length > 0) {
        setImagesBase64(initialImages.slice(0, 5))
      } else {
        setImagesBase64([])
      }
    }
    setActiveTab('detalles')
  }, [isOpen, producto, isDuplicate, initialImages, reset])

  // Recálculo automático de costo según gramos y horas ingresadas
  const watchedGramos = watch('peso_gramos')
  const watchedHoras = watch('horas_impresion')

  const handleRecalculateAutoCost = (g?: number, h?: number) => {
    const gramos = g ?? (getValues('peso_gramos') || 0)
    const horas = h ?? (getValues('horas_impresion') || 0)
    if (gramos > 0 || horas > 0) {
      const savedFil = parseFloat(localStorage.getItem('costo_filamento_kg_default') || '15000')
      const savedHora = parseFloat(localStorage.getItem('costo_hora_maquina_default') || '500')
      const autoCost = Math.round((gramos / 1000) * savedFil + horas * savedHora)
      setValue('precio_costo', autoCost)
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const remainingSlots = 5 - imagesBase64.length
    if (remainingSlots <= 0) {
      toast('Máximo 5 fotos por artículo', 'error')
      return
    }
    try {
      setIsCompressing(true)
      const compressedList: string[] = []
      const filesToProcess = Array.from(files).slice(0, remainingSlots)
      for (const file of filesToProcess) {
        const compressed = await compressImage(file)
        compressedList.push(compressed)
      }
      setImagesBase64((prev) => [...prev, ...compressedList].slice(0, 5))
    } catch (err) {
      toast('Error al procesar la imagen', 'error')
    } finally {
      setIsCompressing(false)
    }
  }

  const handleSetPrimary = (index: number) => {
    if (index === 0) return
    setImagesBase64((prev) => {
      const copy = [...prev]
      const [selected] = copy.splice(index, 1)
      return [selected, ...copy]
    })
  }

  const handleRemoveImage = (index: number) => {
    setImagesBase64((prev) => prev.filter((_, i) => i !== index))
  }

  const handleGenerateAiText = async () => {
    const currentName = getValues('nombre')
    const currentDesc = getValues('descripcion')
    if (!currentName && !currentDesc) {
      toast('Ingresá al menos el nombre del producto para generar con IA', 'error')
      return
    }
    try {
      setIsGeneratingAi(true)
      const res = await api.post('/ai/generate-text', { title: currentName, details: currentDesc })
      if (res.data?.success && res.data?.data) {
        if (res.data.data.title) setValue('nombre', res.data.data.title)
        if (res.data.data.description) setValue('descripcion', res.data.data.description)
        toast('Texto comercial generado con OpenAI Luna', 'success')
      }
    } catch (err: any) {
      toast('Error al generar texto con IA', 'error')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const onSubmit = async (data: ProductoForm) => {
    try {
      if (data.categoria_id) {
        localStorage.setItem('last_categoria_id', String(data.categoria_id))
      }
      if (data.subcategoria) {
        localStorage.setItem('last_subcategoria', data.subcategoria)
      }

      const payload = {
        ...data,
        categoria_id: data.categoria_id || undefined,
        variante: data.variante || undefined,
        archivo_url: data.archivo_url?.trim() || null,
        es_vendible: data.es_vendible ? 1 : 0,
        es_insumo: data.es_insumo ? 1 : 0,
        es_tienda: data.es_tienda ? 1 : 0,
        subcategoria: data.subcategoria?.trim() || null,
        precio_oferta: data.precio_oferta || null,
        estado_stock: (data.stock_actual > 0) ? 'ready' : 'custom',
      }

      if (receta.length > 0) {
        (payload as any).receta = receta
      } else {
        (payload as any).receta = []
      }

      const p: any = payload

      if (imagesBase64.length > 0) {
        p.imagenes = imagesBase64.slice(0, 5)
        p.imagen_base64 = imagesBase64[0]
      } else {
        p.imagenes = []
        p.imagen_base64 = null
      }

      if (producto && !isDuplicate) {
        await updateMutation.mutateAsync({ id: producto.id, payload: p })
        toast('Producto actualizado', 'success')
      } else {
        await createMutation.mutateAsync(p)
        toast('Producto creado', 'success')
      }
      onClose()
    } catch (error: any) {
      toast(error.message || 'Error al guardar el producto', 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
          <h2 className="text-xl font-black text-slate-800">
            {isEditing ? 'Editar Producto' : isDuplicate ? 'Duplicar Producto' : 'Nuevo Producto'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isEditing && (
          <div className="border-b border-slate-200 px-6">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('detalles')}
                className={cn(
                  "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors outline-none",
                  activeTab === 'detalles'
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                Detalles
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('historial')}
                className={cn(
                  "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors outline-none",
                  activeTab === 'historial'
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                Historial de Stock
              </button>
            </nav>
          </div>
        )}

        <div className="p-6">
          {activeTab === 'detalles' ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Fotos del producto */}
              <div className="flex flex-col items-center justify-center space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold text-slate-700">Fotos del Producto ({imagesBase64.length}/5)</span>
                  <span className="text-[11px] text-slate-400">Podés guardar hasta 5 fotos</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                  {imagesBase64.map((img, idx) => (
                    <div key={idx} className={cn(
                      "relative group h-24 w-24 rounded-2xl border overflow-hidden shadow-sm transition-all",
                      idx === 0 ? "border-amber-400 ring-2 ring-amber-400/30" : "border-slate-200"
                    )}>
                      <img src={img} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                      
                      {/* Acciones de la foto */}
                      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(idx)}
                            className="h-6 w-6 rounded-full bg-slate-900/80 hover:bg-amber-500 text-white flex items-center justify-center shadow-md transition-colors"
                            title="Hacer foto principal"
                          >
                            <Star className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                          title="Eliminar foto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Badge Principal / Orden */}
                      {idx === 0 ? (
                        <span className="absolute bottom-1 left-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-xs flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-white" /> Principal
                        </span>
                      ) : (
                        <span className="absolute bottom-1 left-1 bg-slate-900/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          Foto {idx + 1}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Botón para agregar más fotos (hasta 5) */}
                  {imagesBase64.length < 5 && (
                    <label className="relative group h-24 w-24 rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center transition-colors cursor-pointer shadow-2xs">
                      {isCompressing ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      ) : (
                        <>
                          <ImagePlus className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                          <span className="text-[10px] font-bold text-slate-500 group-hover:text-primary uppercase tracking-wider mt-1 text-center">
                            {imagesBase64.length > 0 ? '+ Foto' : 'Subir'}
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  {imagesBase64.length === 0
                    ? 'Toca para elegir fotos desde tu dispositivo (JPG, PNG)'
                    : `La foto con la estrella dorada es la portada que se ve en el catálogo.`}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Nombre del Producto *
                  </label>
                  <input
                    {...register('nombre')}
                    className={cn(
                      "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors",
                      errors.nombre ? "border-red-500/50" : "border-slate-200 focus:border-primary focus:bg-white"
                    )}
                    placeholder="Ej. Chop Primera Nacional"
                  />
                  {errors.nombre && <p className="mt-1 text-xs text-red-400">{errors.nombre.message}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    SKU / Código
                  </label>
                  <input
                    {...register('sku')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Categoría Principal
                  </label>
                  <select
                    {...register('categoria_id', {
                      setValueAs: v => v === "" ? null : parseInt(v, 10),
                      onChange: (e) => {
                        if (e.target.value) localStorage.setItem('last_categoria_id', e.target.value)
                      }
                    })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  >
                    <option value="">Ninguna</option>
                    {categorias?.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Subcategoría (Tienda Web)
                  </label>
                  <input
                    {...register('subcategoria', {
                      onChange: (e) => {
                        if (e.target.value) localStorage.setItem('last_subcategoria', e.target.value)
                      }
                    })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                    placeholder="Ej. Navidad, Pokémon"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Precio de Venta ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('precio_venta', { valueAsNumber: true })}
                    className={cn(
                      "w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors",
                      errors.precio_venta ? "border-red-500/50" : "border-slate-200 focus:border-primary focus:bg-white"
                    )}
                  />
                  {errors.precio_venta && <p className="mt-1 text-xs text-red-400">{errors.precio_venta.message}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Precio Oferta / Tachado ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('precio_oferta', { setValueAs: v => v === "" || isNaN(v) ? null : parseFloat(v) })}
                    placeholder="Opcional (Ej. 12000)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Costo ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('precio_costo', { valueAsNumber: true })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>

                {/* Sección de Dimensiones, Peso y Horas */}
                <div className="md:col-span-2 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-3">
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
                        step="0.1"
                        {...register('alto_mm', { valueAsNumber: true })}
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
                        step="0.1"
                        {...register('ancho_mm', { valueAsNumber: true })}
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
                        step="0.1"
                        {...register('profundidad_mm', { valueAsNumber: true })}
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
                        step="1"
                        {...register('peso_gramos', {
                          valueAsNumber: true,
                          onChange: (e) => handleRecalculateAutoCost(parseFloat(e.target.value) || 0, undefined)
                        })}
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
                        step="0.1"
                        {...register('horas_impresion', {
                          valueAsNumber: true,
                          onChange: (e) => handleRecalculateAutoCost(undefined, parseFloat(e.target.value) || 0)
                        })}
                        className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Stock Actual
                    </label>
                    {(watch('stock_actual') || 0) > 0 ? (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        ⚡ En Stock
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        🛠️ A Pedido
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    {...register('stock_actual', { valueAsNumber: true })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    {...register('stock_minimo', { valueAsNumber: true })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Descripción
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateAiText}
                      disabled={isGeneratingAi}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg border border-cyan-200 transition disabled:opacity-50"
                    >
                      {isGeneratingAi ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
                      )}
                      <span>Generar con IA (OpenAI)</span>
                    </button>
                  </div>
                  <textarea
                    {...register('descripcion')}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary focus:bg-white resize-none"
                  />
                </div>

                <div className="md:col-span-2 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-blue-900">
                        Enlace del Archivo / STL
                      </label>
                      <span className="text-[10px] font-bold bg-blue-200/70 text-blue-800 px-2 py-0.5 rounded-full">
                        🔒 Uso Interno (Oculto al cliente)
                      </span>
                    </div>
                    {watch('archivo_url') && (
                      <a
                        href={watch('archivo_url')!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir enlace
                      </a>
                    )}
                  </div>
                  <input
                    {...register('archivo_url')}
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-mono text-blue-700 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="https://makerworld.com/es/models/... o Google Drive / Dropbox"
                  />
                  <p className="mt-1 text-[11px] text-blue-600/80">
                    Al cargar desde MakerWorld se guarda automáticamente este link para que puedas descargar e imprimir el modelo cuando haya ventas.
                  </p>
                </div>
                
                <div className="md:col-span-2 flex gap-6 mt-2 border-t border-slate-100 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('es_vendible')}
                      className="w-5 h-5 rounded accent-primary bg-slate-50 border-slate-100"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Se puede vender</p>
                      <p className="text-xs text-slate-400">Aparecerá en la pantalla de Ventas</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('es_insumo')}
                      className="w-5 h-5 rounded accent-secondary bg-slate-50 border-slate-100"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Es Insumo Interno</p>
                      <p className="text-xs text-slate-400">Materia prima o insumos (ej. Cajas)</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('es_tienda')}
                      className="w-5 h-5 rounded accent-cyan-600 bg-slate-50 border-slate-100"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-800">🌐 Visible en Tienda Web</p>
                      <p className="text-xs text-slate-400">Publicar en catálogo (tienda.3ld.com.ar)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* RECETA / INSUMOS SECTION */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Receta de Producción (Insumos)</h3>
                    <p className="text-xs text-slate-400">Agrega los insumos que componen este producto para descontarlos automáticamente al vender.</p>
                  </div>
                </div>

                {receta.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {receta.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{item.insumo_nombre || 'Insumo'}</p>
                          <p className="text-xs text-slate-400">Costo Ref: ${Number(item.precio_costo || 0).toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Cant.</label>
                            <input 
                              type="number" 
                              step="0.01"
                              min="0.01"
                              value={item.cantidad}
                              onChange={(e) => {
                                const newReceta = [...receta]
                                newReceta[index].cantidad = parseFloat(e.target.value) || 0
                                setReceta(newReceta)
                              }}
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => setReceta(receta.filter((_, i) => i !== index))}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pr-12 pt-2">
                      <p className="text-xs font-bold text-slate-500 uppercase">Costo Total Receta: <span className="text-sm text-slate-800 ml-1">${receta.reduce((acc, item) => acc + (Number(item.cantidad) * Number(item.precio_costo || 0)), 0).toFixed(2)}</span></p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <select 
                    id="select-insumo"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-primary"
                    defaultValue=""
                  >
                    <option value="" disabled>Seleccionar insumo para agregar...</option>
                    {insumosDisponibles.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock_actual})</option>
                    ))}
                  </select>
                  <button 
                    type="button"
                    onClick={() => {
                      const select = document.getElementById('select-insumo') as HTMLSelectElement
                      if (!select.value) return
                      const insumoId = parseInt(select.value)
                      const insumo = insumosDisponibles.find(p => p.id === insumoId)
                      if (insumo && !receta.find(r => r.insumo_id === insumoId)) {
                        setReceta([...receta, { insumo_id: insumoId, cantidad: 1, insumo_nombre: insumo.nombre, precio_costo: insumo.precio_costo }])
                      }
                      select.value = ''
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {producto && <StockHistory productoId={producto.id} />}
            </div>
          )}
        </div>
      </div>

      <CostoImpresionModal
        isOpen={isCostoModalOpen}
        onClose={() => setIsCostoModalOpen(false)}
        initialHoras={watch('horas_impresion') || 0}
        initialGramos={watch('peso_gramos') || 0}
        initialPrecioVenta={watch('precio_venta') || 0}
        onApply={(costoCalculado, h, g, precioVentaCalculado) => {
          setValue('precio_costo', costoCalculado)
          setValue('horas_impresion', h)
          setValue('peso_gramos', g)
          if (precioVentaCalculado && precioVentaCalculado > 0) {
            setValue('precio_venta', precioVentaCalculado)
            toast(`Costo ($${costoCalculado}) y Venta ($${precioVentaCalculado}) aplicados`, 'success')
          } else {
            toast(`Precio de costo ($${costoCalculado}) aplicado`, 'success')
          }
        }}
      />
    </div>
  )
}
