import type { PedidoEstado } from './pedidos'

export interface TopProducto {
  id: number
  nombre: string
  cantidad_vendida: number
  total_generado: number
}

export interface DashboardKpis {
  ventas_hoy: number
  ventas_mes: number
  ventas_mes_anterior: number
  saldo_por_cobrar: number
  pedidos_pendientes: number
  pedidos_listos: number
  ordenes_activas: number
  rentabilidad_mes: number
  impresoras_libres: number
  impresoras_ocupadas: number
  ventas_semana: { fecha: string; total: number }[]
  top_productos: TopProducto[]
  stock_valorizado: {
    total: number
    filamentos: number
    insumos: number
    mercaderia: number
    mes_anterior: number
  }
}

export interface AlertaItem {
  id: number
  nombre: string
  sku?: string
  color?: string
  marca?: string
  stock_actual?: number
  peso_restante_g?: number
  stock_minimo?: number
  stock_minimo_g?: number
  material_nombre?: string
}

export interface EntregaPendiente {
  id: number
  numero_pedido: string
  estado: PedidoEstado
  fecha_entrega_estimada: string
  total: number
}

export interface DashboardAlertasResult {
  filamentos_bajos: AlertaItem[]
  insumos_bajos: AlertaItem[]
  productos_bajos: AlertaItem[]
  entregas_pendientes: EntregaPendiente[]
}
