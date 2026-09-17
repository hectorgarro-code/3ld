import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { useOrdenes, useCambiarEstadoOrden } from '@/hooks/useProduccion'
import { useImpresoras } from '@/hooks/useImpresoras'
import { toast } from '@/store/toastStore'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { Factory, Printer, Clock, Layers } from 'lucide-react'
import type { OrdenProduccion, OrdenEstado } from '@/types'

const COLUMNS: { estado: OrdenEstado; label: string; color: string; bg: string }[] = [
  { estado: 'pendiente', label: 'Pendiente', color: 'text-slate-400', bg: 'bg-gray-500/10 border-gray-500/20' },
  { estado: 'imprimiendo', label: 'Imprimiendo', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  { estado: 'post_proceso', label: 'Post-proceso', color: 'text-brand-purple', bg: 'bg-brand-purple/10 border-brand-purple/20' },
  { estado: 'control_calidad', label: 'Control calidad', color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  { estado: 'listo', label: 'Listo', color: 'text-brand-green', bg: 'bg-brand-green/10 border-brand-green/20' },
]

function OrdenCard({
  orden,
  isDragging = false,
}: {
  orden: OrdenProduccion
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: orden.id.toString(),
    data: { orden },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab rounded-xl border border-slate-100 bg-slate-50/50-secondary p-3 shadow-sm active:cursor-grabbing',
        'select-none touch-none',
        isDragging && 'opacity-0'
      )}
    >
      <p className="mb-1 text-xs font-bold text-slate-400">{orden.numero_orden}</p>
      <p className="mb-2 text-sm font-black text-slate-800 line-clamp-2">
        {orden.producto?.nombre ?? `Producto #${orden.producto_id}`}
      </p>

      {orden.impresora && (
        <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
          <Printer className="h-3 w-3" />
          <span className="truncate">{orden.impresora.nombre}</span>
        </div>
      )}

      {orden.filamento && (
        <div className="mb-1 flex items-center gap-2">
          <div
            className="h-3 w-3 flex-shrink-0 rounded-full border border-white/20"
            style={{ backgroundColor: orden.filamento.color_hex }}
          />
          <span className="truncate text-xs text-slate-500">
            {orden.filamento.color_nombre}
          </span>
        </div>
      )}

      {orden.tiempo_estimado_min && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{Math.round(orden.tiempo_estimado_min / 60)}h {orden.tiempo_estimado_min % 60}min</span>
        </div>
      )}

      <div className="mt-2 text-right text-xs font-bold text-slate-400">
        ×{orden.cantidad}
      </div>
    </div>
  )
}

function KanbanColumn({
  estado,
  label,
  color,
  bg,
  ordenes,
}: {
  estado: OrdenEstado
  label: string
  color: string
  bg: string
  ordenes: OrdenProduccion[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado })

  return (
    <div className="flex min-w-[220px] flex-shrink-0 flex-col lg:min-w-0 lg:flex-1">
      <div className={cn('mb-3 rounded-xl border px-3 py-2', bg)}>
        <p className={cn('text-xs font-black uppercase tracking-wider', color)}>
          {label}
        </p>
        <p className="text-xs text-slate-400">{ordenes.length} orden(es)</p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[200px] flex-1 space-y-2 rounded-xl p-2 transition-colors',
          isOver ? 'bg-slate-50/50' : 'bg-transparent'
        )}
      >
        {ordenes.map((orden) => (
          <OrdenCard key={orden.id} orden={orden} />
        ))}
        {ordenes.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-100">
            <p className="text-xs text-gray-600">Sin órdenes</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProduccionPage() {
  const { data: ordenesData, isLoading } = useOrdenes({ per_page: 100 })
  const cambiarEstado = useCambiarEstadoOrden()
  const [activeOrden, setActiveOrden] = useState<OrdenProduccion | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const ordenes = ordenesData?.data ?? []

  const getOrdenesByEstado = (estado: OrdenEstado) =>
    ordenes.filter((o) => o.estado === estado)

  const handleDragStart = (event: DragStartEvent) => {
    const orden = ordenes.find((o) => o.id.toString() === event.active.id)
    setActiveOrden(orden ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveOrden(null)
    const { active, over } = event
    if (!over) return

    const orden = ordenes.find((o) => o.id.toString() === active.id)
    const newEstado = over.id as OrdenEstado

    if (!orden || orden.estado === newEstado) return

    try {
      await cambiarEstado.mutateAsync({ id: orden.id, estado: newEstado })
      toast(`Orden movida a: ${newEstado}`, 'success')
    } catch {
      toast('Error al mover la orden', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-white card-shadow" />
        <div className="flex gap-3 overflow-x-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="min-w-[220px] h-64 animate-pulse rounded-2xl bg-white card-shadow" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">Producción</h2>
          <p className="text-xs text-slate-500">{ordenes.length} órdenes activas</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/produccion/filamentos"
            className="flex items-center gap-1.5 rounded-xl bg-white card-shadow px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-800"
          >
            <Layers className="h-3.5 w-3.5" /> Filamentos
          </Link>
          <Link
            to="/produccion/impresoras"
            className="flex items-center gap-1.5 rounded-xl bg-white card-shadow px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-800"
          >
            <Printer className="h-3.5 w-3.5" /> Impresoras
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 lg:overflow-x-visible lg:grid lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.estado}
              estado={col.estado}
              label={col.label}
              color={col.color}
              bg={col.bg}
              ordenes={getOrdenesByEstado(col.estado)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOrden && (
            <div className="rotate-2 opacity-90">
              <OrdenCard orden={activeOrden} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {ordenes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Factory className="mb-3 h-16 w-16 text-gray-700" />
          <p className="font-bold text-slate-500">Sin órdenes de producción</p>
          <p className="text-sm text-gray-600">Las órdenes aparecerán cuando se aprueben pedidos</p>
        </div>
      )}
    </div>
  )
}
