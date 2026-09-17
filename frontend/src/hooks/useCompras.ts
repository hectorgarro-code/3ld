import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Compra, PaginatedResponse, ApiResponse } from '@/types'

export function useCompras(params?: { proveedor_id?: number; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['compras', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Compra>>('/compras', { params })
      return data
    },
  })
}

export function useCompra(id: number) {
  return useQuery({
    queryKey: ['compras', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Compra>>(`/compras/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateCompra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Compra>) => {
      const { data } = await api.post<ApiResponse<{ id: number; message: string }>>('/compras', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] })
      queryClient.invalidateQueries({ queryKey: ['productos'] }) // Stock changes!
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
