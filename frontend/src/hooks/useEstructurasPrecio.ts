import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface EstructuraPrecioCantidad {
  id: number
  nombre: string
  escalas: { cantidad: number; precio: number }[]
  productos_count?: number
  created_at?: string
  updated_at?: string
}

export function useEstructurasPrecio() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['estructuras-precio'],
    queryFn: async () => {
      const res = await api.get('/estructuras-precio')
      return (res.data?.data || []) as EstructuraPrecioCantidad[]
    },
    staleTime: 1000 * 60 * 5,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: number; nombre: string; escalas: { cantidad: number; precio: number }[] }) => {
      const res = await api.post('/estructuras-precio', payload)
      return res.data?.data as EstructuraPrecioCantidad
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estructuras-precio'] })
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/estructuras-precio/${id}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estructuras-precio'] })
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })

  const applyMutation = useMutation({
    mutationFn: async (payload: {
      estructura_id: number
      product_ids: number[]
      escalas?: { cantidad: number; precio: number }[]
    }) => {
      const res = await api.post(`/estructuras-precio/${payload.estructura_id}/aplicar`, {
        product_ids: payload.product_ids,
        escalas: payload.escalas,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estructuras-precio'] })
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })

  return {
    estructuras: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    saveMutation,
    deleteMutation,
    applyMutation,
  }
}
