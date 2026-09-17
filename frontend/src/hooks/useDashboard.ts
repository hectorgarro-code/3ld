import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DashboardKpis, DashboardAlertasResult } from '@/types'

export function useKpis() {
  return useQuery<DashboardKpis>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => {
      const { data } = await api.get<{ data: DashboardKpis }>('/dashboard/kpis')
      return data.data
    },
    refetchInterval: 30_000,
  })
}

export function useAlertas() {
  return useQuery({
    queryKey: ['dashboard', 'alertas'],
    queryFn: async () => {
      const { data } = await api.get<{ data: DashboardAlertasResult }>('/dashboard/alertas')
      return data.data
    },
    refetchInterval: 120000,
  })
}
