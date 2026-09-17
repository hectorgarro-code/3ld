export type UserRol = 'admin' | 'operario' | 'vendedor'

export interface User {
  id: number
  nombre: string
  email: string
  rol: UserRol
  avatar_url?: string
  created_at: string
  updated_at: string
}
