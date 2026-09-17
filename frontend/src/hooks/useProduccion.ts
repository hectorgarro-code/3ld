import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type {
  OrdenProduccion,
  OrdenEstado,
  FallaProduccion,
  PaginatedResponse,
  ApiResponse,
} from '@/types'

interface OrdenesParams {
  estado?: OrdenEstado
  impresora_id?: number
  page?: number
  per_page?: number
}

export function useOrdenes(params?: OrdenesParams) {
  return useQuery<PaginatedResponse<OrdenProduccion>>({
    queryKey: ['ordenes', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<OrdenProduccion>>(
        '/ordenes',
        { params }
      )
      return data
    },
  })
}

export function useOrden(id: number | string | undefined) {
  return useQuery<OrdenProduccion>({
    queryKey: ['ordenes', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<OrdenProduccion>>(
        `/ordenes/${id}`
      )
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateOrden() {
  const queryClient = useQueryClient()
  return useMutation<OrdenProduccion, Error, Partial<OrdenProduccion>>({
    mutationFn: async (payload) => {
      const { data } = await api.post<ApiResponse<OrdenProduccion>>(
        '/ordenes',
        payload
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCambiarEstadoOrden() {
  const queryClient = useQueryClient()
  return useMutation<
    OrdenProduccion,
    Error,
    { id: number; estado: OrdenEstado; notas?: string }
  >({
    mutationFn: async ({ id, estado, notas }) => {
      // Backend uses PUT /{id}/estado
      const { data } = await api.put<ApiResponse<OrdenProduccion>>(
        `/ordenes/${id}/estado`,
        { estado, notas }
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] })
      queryClient.invalidateQueries({ queryKey: ['impresoras'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRegistrarFalla() {
  const queryClient = useQueryClient()
  return useMutation<
    FallaProduccion,
    Error,
    Partial<FallaProduccion> & { orden_id: number }
  >({
    mutationFn: async ({ orden_id, ...payload }) => {
      // Backend uses POST /{id}/falla (singular)
      const { data } = await api.post<ApiResponse<FallaProduccion>>(
        `/ordenes/${orden_id}/falla`,
        payload
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes'] })
    },
  })
}
