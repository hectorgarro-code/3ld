import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { obtenerPrecioPorCantidad } from '@/lib/pricing'

export interface CartItem {
  id: string | number
  title: string
  price: number
  basePrice?: number
  image: string
  color: string
  weightGrams: number
  qty: number
  precios_cantidad?: { cantidad: number; precio: number }[]
}

interface CartState {
  cart: CartItem[]
  addToCart: (
    product: {
      id: string | number
      title: string
      price: number
      basePrice?: number
      image: string
      weightGrams?: number
      precios_cantidad?: { cantidad: number; precio: number }[] | any
    },
    qty?: number,
    color?: string
  ) => void
  updateCartQty: (id: string | number, color: string, delta: number) => void
  removeCartItem: (id: string | number, color: string) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: [],

      addToCart: (product, qty = 1, color = 'Negro Mate') => {
        set((state) => {
          const rawEscalas = (product as any).precios_cantidad
          const escalas = Array.isArray(rawEscalas)
            ? rawEscalas
            : (typeof rawEscalas === 'string' ? JSON.parse(rawEscalas || '[]') : [])

          const basePrice = product.basePrice !== undefined ? product.basePrice : product.price
          const existing = state.cart.find((item) => item.id === product.id && item.color === color)

          if (existing) {
            const newQty = existing.qty + qty
            const tierPrice = obtenerPrecioPorCantidad(existing.precios_cantidad || escalas, newQty) ?? (existing.basePrice ?? basePrice)
            return {
              cart: state.cart.map((item) =>
                item.id === product.id && item.color === color
                  ? { ...item, qty: newQty, price: tierPrice }
                  : item
              ),
            }
          }

          const tierPrice = obtenerPrecioPorCantidad(escalas, qty) ?? basePrice
          return {
            cart: [
              ...state.cart,
              {
                id: product.id,
                title: product.title,
                price: tierPrice,
                basePrice: basePrice,
                image: product.image,
                color: color,
                precios_cantidad: escalas,
                weightGrams:
                  product.weightGrams && Number(product.weightGrams) > 0
                    ? Number(product.weightGrams)
                    : 120,
                qty: qty,
              },
            ],
          }
        })
      },

      updateCartQty: (id, color, delta) => {
        set((state) => ({
          cart: state.cart
            .map((item) => {
              if (item.id === id && item.color === color) {
                const newQty = item.qty + delta
                if (newQty <= 0) return null
                const base = item.basePrice ?? item.price
                const tierPrice = obtenerPrecioPorCantidad(item.precios_cantidad, newQty) ?? base
                return { ...item, qty: newQty, price: tierPrice }
              }
              return item
            })
            .filter(Boolean) as CartItem[],
        }))
      },

      removeCartItem: (id, color) => {
        set((state) => ({
          cart: state.cart.filter((item) => !(item.id === id && item.color === color)),
        }))
      },

      clearCart: () => {
        set({ cart: [] })
      },
    }),
    {
      name: '3ld_react_cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
