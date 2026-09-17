import type { Producto } from './productos'
import type { Pedido } from './pedidos'
import type { User } from './auth'

export type OrdenEstado =
  | 'pendiente'
  | 'imprimiendo'
  | 'post_proceso'
  | 'control_calidad'
  | 'listo'
  | 'cancelado'

export type ImpresoraEstado =
  | 'libre'
  | 'ocupada'
  | 'mantenimiento'
  | 'fuera_de_servicio'

export interface Filamento {
  id: number
  nombre: string
  tipo: string
  color: string
  color_nombre?: string
  color_hex: string
  stock_rollos: number
  stock_minimo_rollos: number
  precio_compra?: number
  costo_por_gramo: number
  proveedor?: string
  notas?: string
  activo?: number
  created_at: string
  updated_at: string
}

export interface Impresora {
  id: number
  nombre: string
  modelo: string
  marca?: string
  numero_serie?: string
  tipo_impresion?: string
  estado: ImpresoraEstado
  consumo_watts: number
  valor_compra: number
  valor_impresora?: number
  vida_util_horas: number
  horas_acumuladas: number
  notas?: string
  activo?: number
  created_at: string
  updated_at: string
}

export interface OrdenProduccion {
  id: number
  numero_orden: string
  pedido_id?: number
  pedido?: Pedido
  producto_id: number
  producto?: Producto
  impresora_id?: number
  impresora?: Impresora
  filamento_id?: number
  filamento?: Filamento
  estado: OrdenEstado
  cantidad: number
  gramos_estimados?: number
  gramos_reales?: number
  tiempo_estimado_min?: number
  tiempo_real_min?: number
  fecha_inicio?: string
  fecha_fin?: string
  operario?: User
  notas?: string
  created_at: string
  updated_at: string
}

export interface FallaProduccion {
  id: number
  orden_id: number
  orden?: OrdenProduccion
  tipo_falla: string
  descripcion: string
  gramos_perdidos: number
  tiempo_perdido_min: number
  solucion?: string
  usuario_id?: number
  created_at: string
}
