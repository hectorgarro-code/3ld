export type ProductoTipo = 'impresion_3d' | 'ceramica' | 'juguete_educativo' | 'accesorio'

export interface Categoria {
  id: number
  nombre: string
  descripcion?: string
  productos_count?: number
  created_at: string
}

export interface Producto {
  id: number
  nombre: string
  variante?: string
  sku?: string
  descripcion?: string
  tipo: ProductoTipo
  categoria_id?: number
  categoria_nombre?: string
  categoria?: Categoria
  precio_venta: number
  precio_costo?: number
  stock_actual: number
  stock_minimo: number
  imagen_url?: string
  activo: number // 1 o 0
  es_vendible: number
  es_insumo: number
  es_tienda?: number | boolean
  subcategoria?: string
  precio_oferta?: number | null
  created_at: string
  updated_at: string
}

export interface MovimientoStock {
  id: number
  producto_id: number
  cantidad: number
  tipo_movimiento: 'ajuste_manual' | 'venta' | 'compra' | 'produccion' | 'devolucion' | 'anulacion_venta'
  referencia_id?: number
  notas?: string
  created_at: string
}
