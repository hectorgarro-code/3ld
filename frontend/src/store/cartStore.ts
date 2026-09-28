import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  id: string | number
  title: string
  price: number
  image: string
  color: string
  weightGrams: number
  qty: number
}

interface CartState {
  cart: CartItem[]
  addToCart: (
    product: {
      id: string | number
      title: string
      price: number
      image: string
      weightGrams?: number
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
          const existing = state.cart.find((item) => item.id === product.id && item.color === color)
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id && item.color === color
                  ? { ...item, qty: item.qty + qty }
                  : item
              ),
            }
          }
          return {
            cart: [
              ...state.cart,
              {
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
                color: color,
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
                return newQty > 0 ? { ...item, qty: newQty } : null
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
