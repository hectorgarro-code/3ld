import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Filamento, PaginatedResponse, ApiResponse } from '@/types'

interface FilamentosParams {
  q?: string
  page?: number
  per_page?: number
}

export function useFilamentos(params?: FilamentosParams & { search?: string }) {
  const { search, ...rest } = params ?? {}
  const apiParams: FilamentosParams = { ...rest }
  if (search) apiParams.q = search

  // Backend queries v_filamentos view which computes costo_por_gramo
  return useQuery<Filamento[]>({
    queryKey: ['filamentos', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Filamento>>('/filamentos', {
        params: apiParams,
      })
      return data.data
    },
  })
}

export function useCreateFilamento() {
  const queryClient = useQueryClient()
  return useMutation<Filamento, Error, Partial<Filamento>>({
    mutationFn: async (payload) => {
      // Map frontend fields to backend column names
      const p = payload as any
      const backendPayload = {
        nombre:         p.nombre,
        marca:          p.marca,
        tipo:           p.tipo,
        color:          p.color ?? p.color_nombre,
        color_hex:      p.color_hex,
        peso_total_g:   p.peso_total_g ?? p.peso_inicial,
        peso_restante_g:p.peso_restante_g ?? p.peso_restante,
        stock_minimo_g: p.stock_minimo_g,
        precio_compra:  p.precio_compra,
        proveedor:      p.proveedor,
      }
      const { data } = await api.post<ApiResponse<Filamento>>('/filamentos', backendPayload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filamentos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateFilamento() {
  const queryClient = useQueryClient()
  return useMutation<Filamento, Error, { id: number; payload: Partial<Filamento> }>({
    mutationFn: async ({ id, payload }) => {
      const p = payload as any
      const backendPayload = {
        nombre:         p.nombre,
        marca:          p.marca,
        tipo:           p.tipo,
        color:          p.color ?? p.color_nombre,
        color_hex:      p.color_hex,
        peso_total_g:   p.peso_total_g ?? p.peso_inicial,
        peso_restante_g:p.peso_restante_g ?? p.peso_restante,
        stock_minimo_g: p.stock_minimo_g,
        precio_compra:  p.precio_compra,
        proveedor:      p.proveedor,
      }
      const { data } = await api.put<ApiResponse<Filamento>>(
        `/filamentos/${id}`,
        backendPayload
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filamentos'] })
    },
  })
}

export function useDeleteFilamento() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/filamentos/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filamentos'] })
    },
  })
}

export function useUpdateStockFilamento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, delta }: { id: number; delta: number }) => {
      const res = await api.put<ApiResponse<{ filamento: Filamento; delta: number; stock_nuevo: number }>>(
        `/filamentos/${id}/stock`,
        { delta }
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filamentos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
