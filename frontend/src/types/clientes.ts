export interface Cliente {
  id: number
  nombre: string
  email?: string
  telefono?: string
  direccion?: string
  notas?: string
  descuento_pct?: number
  total_compras?: number
  cantidad_pedidos?: number
  ultimo_pedido?: string
  created_at: string
  updated_at: string
}
