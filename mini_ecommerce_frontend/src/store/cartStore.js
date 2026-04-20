import { create } from 'zustand'
import api from '@/api/axios'

const STORAGE_KEY = 'guest_cart'

function loadGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveGuestCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const useCartStore = create((set, get) => ({
  items: loadGuestCart(),
  isSyncing: false,

  // Add item or increment quantity (guest mode — LocalStorage only)
  addItem: (product, quantity = 1) => {
    const items = get().items
    const existing = items.find((i) => i.product_id === product.id)

    let updated
    if (existing) {
      updated = items.map((i) =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + quantity }
          : i,
      )
    } else {
      updated = [
        ...items,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          discount_percentage: product.discount_percentage || '0.00',
          stock: product.stock,
          category_id: product.category || null,
          image: product.images?.find((img) => img.is_primary)?.image || null,
          quantity,
        },
      ]
    }

    saveGuestCart(updated)
    set({ items: updated })
  },

  removeItem: (productId) => {
    const updated = get().items.filter((i) => i.product_id !== productId)
    saveGuestCart(updated)
    set({ items: updated })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity < 1) return get().removeItem(productId)
    const updated = get().items.map((i) =>
      i.product_id === productId ? { ...i, quantity } : i,
    )
    saveGuestCart(updated)
    set({ items: updated })
  },

  clearCart: () => {
    saveGuestCart([])
    set({ items: [] })
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => {
      const price = parseFloat(item.price)
      const discount = parseFloat(item.discount_percentage || 0)
      const effectivePrice = price * (1 - discount / 100)
      return sum + effectivePrice * item.quantity
    }, 0)
  },

  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  // Called on login: merge LocalStorage cart with backend cart
  syncOnLogin: async () => {
    set({ isSyncing: true })
    try {
      const { data: backendCart } = await api.get('/cart/')
      const localItems = get().items

      if (backendCart.items.length === 0 && localItems.length > 0) {
        // Backend cart is empty — push all local items
        await Promise.allSettled(
          localItems.map((item) =>
            api.post('/cart/', { product: item.product_id, quantity: item.quantity }),
          ),
        )
      } else if (backendCart.items.length > 0 && localItems.length > 0) {
        // Both have items — push local-only items (backend items take precedence for duplicates)
        const backendProductIds = new Set(backendCart.items.map((i) => i.product))
        const localOnlyItems = localItems.filter(
          (i) => !backendProductIds.has(i.product_id),
        )
        await Promise.allSettled(
          localOnlyItems.map((item) =>
            api.post('/cart/', { product: item.product_id, quantity: item.quantity }),
          ),
        )
      }

      // Re-fetch final backend cart state and use it as source of truth
      const { data: finalCart } = await api.get('/cart/')
      const syncedItems = finalCart.items.map((item) => ({
        product_id: item.product,
        name: item.product_name,
        price: item.product_price,
        discount_percentage: item.product_discount_percentage,
        stock: item.product_stock,
        image: null,
        quantity: item.quantity,
        cartItemId: item.id,
      }))

      saveGuestCart([])
      set({ items: syncedItems })
    } catch {
      // Sync failed silently — guest cart remains usable
    } finally {
      set({ isSyncing: false })
    }
  },

  // Called on logout — reload guest cart from localStorage (likely empty after sync)
  resetToGuestCart: () => {
    set({ items: loadGuestCart() })
  },
}))

export default useCartStore
