import { useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

interface LoginResponse {
  data: {
    token: string
    user: User
  }
  success: boolean
}

export function useAuth() {
  const { user, token, isAuthenticated, login, logout: storeLogout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginFn = async (email: string, password: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      })
      const { user: userData, token: userToken } = data.data
      login(userData, userToken)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Credenciales incorrectas'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const logoutFn = async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } catch {
      // silent fail
    } finally {
      storeLogout()
      window.location.href = '/login'
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login: loginFn,
    logout: logoutFn,
  }
}
