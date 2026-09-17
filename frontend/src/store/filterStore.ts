import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PedidoEstado } from '@/types'

interface FilterState {
  ventasEstados: PedidoEstado[]
  ventasClientes: number[]
  setVentasEstados: (estados: PedidoEstado[]) => void
  setVentasClientes: (clientes: number[]) => void
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      ventasEstados: [],
      ventasClientes: [],
      setVentasEstados: (estados) => set({ ventasEstados: estados }),
      setVentasClientes: (clientes) => set({ ventasClientes: clientes }),
    }),
    {
      name: '3ld-filters-storage',
    }
  )
)
