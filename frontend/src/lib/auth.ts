import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

export function getToken(): string | null {
  return useAuthStore.getState().token
}

export function setToken(token: string): void {
  const currentUser = useAuthStore.getState().user
  if (currentUser) {
    useAuthStore.getState().login(currentUser, token)
  }
}

export function removeToken(): void {
  useAuthStore.getState().logout()
}

export function getUser(): User | null {
  return useAuthStore.getState().user
}

export function setUser(user: User): void {
  const currentToken = useAuthStore.getState().token
  if (currentToken) {
    useAuthStore.getState().login(user, currentToken)
  } else {
    useAuthStore.getState().setUser(user)
  }
}

export function removeUser(): void {
  useAuthStore.getState().logout()
}

export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated
}
