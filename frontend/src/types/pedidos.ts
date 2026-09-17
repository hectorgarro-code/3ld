import type { Producto } from './productos'
import type { Cliente } from './clientes'
import type { User } from './auth'

export type PedidoEstado =
  | 'presupuesto'
  | 'aprobado'
  | 'en_produccion'
  | 'terminado'
  | 'entregado'
  | 'cobrado'
  | 'anulado'

export interface PedidoItem {
  id: number
  pedido_id: number
  producto_id?: number
  producto?: Producto
  producto_nombre?: string
  descripcion?: string
  descripcion_custom?: string
  cantidad: number
  precio_unit: number
  precio_unitario?: number
  descuento_pct?: number
  costo_unitario?: number
  subtotal: number
  estado: PedidoEstado
  notas?: string
}

export interface PedidoItemFlattened extends PedidoItem {
  producto_variante?: string
  numero_pedido: string
  fecha_entrega_estimada?: string | null
  pedido_fecha?: string
  cliente_id?: number
  cliente_nombre?: string
  pedido_descuento_pct?: number
}

export interface PedidoHistorial {
  id: number
  pedido_id: number
  estado_anterior?: PedidoEstado
  estado_nuevo: PedidoEstado
  usuario?: User
  usuario_nombre?: string
  nota?: string
  notas?: string
  created_at: string
}

export interface Pedido {
  id: number
  numero_pedido: string
  cliente_id: number
  cliente?: Cliente
  cliente_nombre?: string
  cliente_email?: string
  cliente_telefono?: string
  estado: PedidoEstado
  fecha_pedido?: string
  created_at: string
  fecha_entrega_estimada?: string
  fecha_entrega_real?: string
  items?: PedidoItem[]
  historial?: PedidoHistorial[]
  subtotal: number
  descuento_pct?: number
  descuento?: number
  impuesto_pct?: number
  total: number
  costo_total?: number
  margen_bruto?: number
  margen?: number
  notas?: string
  updated_at: string
}
