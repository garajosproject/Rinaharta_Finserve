import { create } from 'zustand'

type AuthState = {
  token: string | null
  setToken: (token: string | null) => void
}

const STORAGE_KEY = 'finserve-os-token'

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY),
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(STORAGE_KEY, token)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }

    set({ token })
  },
}))

export const getAuthToken = () => useAuthStore.getState().token
