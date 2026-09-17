import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Proveedor, PaginatedResponse, ApiResponse } from '@/types'

export function useProveedores(params?: { q?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['proveedores', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Proveedor>>('/proveedores', { params })
      return data
    },
  })
}

export function useProveedor(id: number) {
  return useQuery({
    queryKey: ['proveedores', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Proveedor>>(`/proveedores/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export interface ProveedorArticulo {
  producto_id: number
  nombre: string
  sku: string
  es_insumo: number
  es_vendible: number
  ultima_fecha_compra: string
  total_comprado: string | number
  ultimo_precio: string | number
}

export function useProveedorArticulos(id: number) {
  return useQuery({
    queryKey: ['proveedores', id, 'articulos'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProveedorArticulo[]>>(`/proveedores/${id}/articulos`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateProveedor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Proveedor>) => {
      const { data } = await api.post<ApiResponse<Proveedor>>('/proveedores', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
    },
  })
}

export function useUpdateProveedor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<Proveedor> }) => {
      const { data } = await api.put<ApiResponse<Proveedor>>(`/proveedores/${id}`, payload)
      return data.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
      queryClient.invalidateQueries({ queryKey: ['proveedores', id] })
    },
  })
}

export function useDeleteProveedor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<{ message: string }>>(`/proveedores/${id}`)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
    },
  })
}
