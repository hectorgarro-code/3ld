export interface ClientePrecioEspecial {
  id?: number
  cliente_id?: number
  producto_id: number
  precio_especial: number
  producto_nombre?: string
  sku?: string
}

export interface Cliente {
  id: number
  nombre: string
  email?: string
  telefono?: string
  empresa?: string
  cuit?: string
  direccion?: string
  notas?: string
  tipo_cliente?: 'minorista' | 'mayorista'
  descuento_porcentaje?: number
  precios_especiales?: ClientePrecioEspecial[]
  total_compras?: number
  cantidad_pedidos?: number
  ultimo_pedido?: string
  created_at: string
  updated_at: string
}
