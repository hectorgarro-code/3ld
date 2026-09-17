import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Pedido, PedidoEstado, PaginatedResponse, ApiResponse, PedidoItemFlattened } from '@/types'

interface PedidosParams {
  q?: string
  estados?: PedidoEstado[]
  cliente_ids?: number[]
  page?: number
  per_page?: number
}

export function usePedidos(params?: PedidosParams & { search?: string }) {
  const { search, estados, cliente_ids, ...rest } = params ?? {}
  const apiParams: Record<string, any> = { ...rest }
  if (search) apiParams.q = search
  if (estados && estados.length > 0) apiParams.estados = estados.join(',')
  if (cliente_ids && cliente_ids.length > 0) apiParams.cliente_ids = cliente_ids.join(',')

  return useQuery<PaginatedResponse<Pedido>>({
    queryKey: ['pedidos', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Pedido>>('/pedidos', {
        params: apiParams,
      })
      return data
    },
  })
}

export function usePedido(id: number | string | undefined) {
  return useQuery<Pedido>({
    queryKey: ['pedidos', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Pedido>>(`/pedidos/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreatePedido() {
  const queryClient = useQueryClient()
  return useMutation<Pedido, Error, Partial<Pedido>>({
    mutationFn: async (payload) => {
      const { data } = await api.post<ApiResponse<Pedido>>('/pedidos', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedido_items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdatePedido() {
  const queryClient = useQueryClient()
  return useMutation<Pedido, Error, { id: number; payload: Partial<Pedido> }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.put<ApiResponse<Pedido>>(
        `/pedidos/${id}`,
        payload
      )
      return data.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos', id] })
    },
  })
}

export function useCambiarEstadoPedido() {
  const queryClient = useQueryClient()
  return useMutation<
    Pedido,
    Error,
    { id: number; estado: PedidoEstado; notas?: string }
  >({
    mutationFn: async ({ id, estado, notas }) => {
      // Backend uses PUT /{id}/estado and field 'nota' (singular)
      const { data } = await api.put<ApiResponse<Pedido>>(
        `/pedidos/${id}/estado`,
        { estado, nota: notas }
      )
      return data.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos', id] })
      queryClient.invalidateQueries({ queryKey: ['pedido_items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function usePedidoItems(params?: PedidosParams & { search?: string }) {
  const { search, estados, cliente_ids, ...rest } = params ?? {}
  const apiParams: Record<string, any> = { ...rest }
  if (search) apiParams.q = search
  if (estados && estados.length > 0) apiParams.estados = estados.join(',')
  if (cliente_ids && cliente_ids.length > 0) apiParams.cliente_ids = cliente_ids.join(',')

  return useQuery<PaginatedResponse<PedidoItemFlattened>>({
    queryKey: ['pedido_items', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PedidoItemFlattened>>('/pedidos/items', {
        params: apiParams,
      })
      return data
    },
  })
}

export function useCambiarEstadoItem() {
  const queryClient = useQueryClient()
  return useMutation<
    void,
    Error,
    { id: number; estado: PedidoEstado }
  >({
    mutationFn: async ({ id, estado }) => {
      await api.put(`/pedidos/items/${id}/estado`, { estado })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido_items'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}
