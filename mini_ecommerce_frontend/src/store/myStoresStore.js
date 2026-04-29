import { create } from 'zustand'
import api from '@/api/axios'

const useMyStoresStore = create((set) => ({
  stores: [],
  loaded: false,

  fetchMyStores: async () => {
    try {
      const { data } = await api.get('/admin/my-stores/')
      set({ stores: data, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },
}))

export default useMyStoresStore
