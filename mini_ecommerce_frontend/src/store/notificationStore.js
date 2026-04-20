import { create } from 'zustand'
import api from '@/api/axios'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchUnreadCount: async () => {
    try {
      const { data } = await api.get('/notifications/unread-count/')
      set({ unreadCount: data.unread_count })
    } catch {
      // Fail silently — badge just won't update
    }
  },

  fetchNotifications: async (unreadOnly = false) => {
    set({ isLoading: true })
    try {
      const params = unreadOnly ? { unread_only: true } : {}
      const { data } = await api.get('/notifications/', { params })
      set({ notifications: data.results ?? data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  markRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read/`)
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch {
      // Fail silently
    }
  },

  markAllRead: async () => {
    try {
      await api.post('/notifications/mark-all-read/')
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }))
    } catch {
      // Fail silently
    }
  },

  reset: () => set({ notifications: [], unreadCount: 0 }),
}))

export default useNotificationStore
