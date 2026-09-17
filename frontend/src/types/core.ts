export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    last_page: number
    per_page: number
    total: number
    from: number
    to: number
  }
}

export interface ApiResponse<T> {
  data: T
  message?: string
}
