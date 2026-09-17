export interface Proveedor {
  id: number
  nombre: string
  contacto?: string
  telefono?: string
  email?: string
  direccion?: string
  notas?: string
  activo: number
  created_at: string
}

export interface CompraItem {
  id: number
  compra_id: number
  producto_id: number
  producto_nombre?: string
  producto_sku?: string
  descripcion?: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Compra {
  id: number
  proveedor_id: number
  proveedor_nombre?: string
  numero_comprobante?: string
  total: number
  estado: 'completada' | 'cancelada'
  notas?: string
  fecha: string
  created_by?: number
  usuario_nombre?: string
  created_at: string
  items?: CompraItem[]
}
