import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Cliente, PaginatedResponse, ApiResponse } from '@/types'

interface ClientesParams {
  // Backend uses 'q' for search
  q?: string
  page?: number
  per_page?: number
}

export function useClientes(params?: ClientesParams & { search?: string }) {
  // Normalize: remap 'search' -> 'q' for backward compat
  const { search, ...rest } = params ?? {}
  const apiParams: ClientesParams = { ...rest }
  if (search) apiParams.q = search

  return useQuery<PaginatedResponse<Cliente>>({
    queryKey: ['clientes', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Cliente>>('/clientes', {
        params: apiParams,
      })
      return data
    },
  })
}

export function useCliente(id: number | string | undefined) {
  return useQuery<Cliente>({
    queryKey: ['clientes', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Cliente>>(`/clientes/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateCliente() {
  const queryClient = useQueryClient()
  return useMutation<Cliente, Error, Partial<Cliente>>({
    mutationFn: async (payload) => {
      const { data } = await api.post<ApiResponse<Cliente>>('/clientes', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useUpdateCliente() {
  const queryClient = useQueryClient()
  return useMutation<
    Cliente,
    Error,
    { id: number; payload: Partial<Cliente> }
  >({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put<ApiResponse<Cliente>>(
        `/clientes/${id}`,
        payload
      )
      return data.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['clientes', id] })
    },
  })
}

export function useDeleteCliente() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/clientes/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}
