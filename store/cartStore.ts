// store/cartStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  category: string
  price: number
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clear: () => void
  total: () => number
  itemCount: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => set((state) => {
        const existing = state.items.find(i => i.id === product.id)
        if (existing) {
          return {
            items: state.items.map(i =>
              i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
            )
          }
        }
        return { items: [...state.items, { ...product, quantity: 1 }] }
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),

      updateQty: (id, qty) => set((state) => ({
        items: qty <= 0
          ? state.items.filter(i => i.id !== id)
          : state.items.map(i => i.id === id ? { ...i, quantity: qty } : i)
      })),

      clear: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'mezkla-cart' } // nombre en localStorage
  )
)