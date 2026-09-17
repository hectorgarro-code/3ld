import type { Cliente } from './clientes'

export interface Cotizacion {
  id: number
  nombre: string
  cliente_id?: number
  cliente?: Cliente
  detalle: {
    gramos: number
    tiempo_min: number
    filamento_id?: number
    margen_pct: number
    multiplicador: number
  }
  resultado: {
    costo_material: number
    costo_energia: number
    costo_amortizacion: number
    costo_mano_obra: number
    costo_total: number
    precio_sugerido: number
  }
  convertido_pedido: boolean
  pedido_id?: number
  created_at: string
}

export interface ConfigCostos {
  id: number
  consumo_watts_default: number
  precio_kwh: number
  valor_hora_operario: number
  margen_default_pct: number
  multiplicador_default: number
  updated_at: string
}
