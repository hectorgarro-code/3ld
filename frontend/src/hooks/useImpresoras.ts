import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Impresora, ImpresoraEstado, ApiResponse } from '@/types'

export function useImpresoras() {
  return useQuery<Impresora[]>({
    queryKey: ['impresoras'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Impresora[] }>('/impresoras')
      return data.data
    },
  })
}

export function useCreateImpresora() {
  const queryClient = useQueryClient()
  return useMutation<Impresora, Error, Partial<Impresora>>({
    mutationFn: async (payload) => {
      const { data } = await api.post<ApiResponse<Impresora>>('/impresoras', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impresoras'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateImpresora() {
  const queryClient = useQueryClient()
  return useMutation<Impresora, Error, { id: number; payload: Partial<Impresora> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put<ApiResponse<Impresora>>(
        `/impresoras/${id}`,
        payload
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impresoras'] })
    },
  })
}

export function useCambiarEstadoImpresora() {
  const queryClient = useQueryClient()
  return useMutation<Impresora, Error, { id: number; estado: ImpresoraEstado }>({
    mutationFn: async ({ id, estado }) => {
      // Backend uses PUT /{id}/estado
      const { data } = await api.put<ApiResponse<Impresora>>(
        `/impresoras/${id}/estado`,
        { estado }
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impresoras'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteImpresora() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/impresoras/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impresoras'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
