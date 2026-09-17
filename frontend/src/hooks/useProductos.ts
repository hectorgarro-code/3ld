import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Producto, Categoria, PaginatedResponse, ApiResponse } from '@/types'

interface ProductosParams {
  // Backend uses 'q' for search, not 'search'
  q?: string
  tipo?: string
  categoria_id?: number
  page?: number
  per_page?: number
}

export function useProductos(params?: ProductosParams & { search?: string }) {
  // Normalize: if consumer sends 'search', remap to 'q'
  const { search, ...rest } = params ?? {}
  const apiParams: ProductosParams = { ...rest }
  if (search) apiParams.q = search

  return useQuery<PaginatedResponse<Producto>>({
    queryKey: ['productos', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Producto>>('/productos', {
        params: apiParams,
      })
      return data
    },
  })
}

export function useCategorias() {
  return useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ data: Categoria[] }>('/categorias')
        return data.data
      } catch {
        // Fallback: extract unique categories from productos endpoint
        const { data } = await api.get<PaginatedResponse<Producto>>('/productos', {
          params: { per_page: 200 },
        })
        const seen = new Set<number>()
        const cats: Categoria[] = []
        for (const p of data.data) {
          if (p.categoria_id && !seen.has(p.categoria_id)) {
            seen.add(p.categoria_id)
            cats.push({
              id: p.categoria_id,
              nombre: (p as unknown as { categoria_nombre: string }).categoria_nombre ?? `Categoría ${p.categoria_id}`,
              created_at: '',
            })
          }
        }
        return cats
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useCreateProducto() {
  const queryClient = useQueryClient()
  return useMutation<Producto, Error, Partial<Producto>>({
    mutationFn: async (payload) => {
      const { data } = await api.post<ApiResponse<Producto>>('/productos', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateProducto() {
  const queryClient = useQueryClient()
  return useMutation<Producto, Error, { id: number; payload: Partial<Producto> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put<ApiResponse<Producto>>(
        `/productos/${id}`,
        payload
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

export function useDeleteProducto() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/productos/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useMovimientosStock(productoId: number | undefined) {
  return useQuery<import('@/types/productos').MovimientoStock[]>({
    queryKey: ['productos', productoId, 'movimientos'],
    queryFn: async () => {
      if (!productoId) return []
      const { data } = await api.get<ApiResponse<import('@/types/productos').MovimientoStock[]>>(`/productos/${productoId}/movimientos`)
      return data.data
    },
    enabled: !!productoId,
  })
}
