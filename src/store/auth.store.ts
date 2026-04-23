import { create } from 'zustand'
import type { AuthUser, UserRole } from '@/types/lead'

type AuthState = {
  token: string | null
  role: UserRole | null
  user: AuthUser | null
  setToken: (token: string | null) => void
  setSession: (token: string | null, role: UserRole | null, user?: AuthUser | null) => void
  clearSession: () => void
}

const STORAGE_KEY = 'finserve-os-token'
const ROLE_STORAGE_KEY = 'finserve-os-role'
const USER_STORAGE_KEY = 'finserve-os-user'

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY),
  role:
    typeof window === 'undefined'
      ? null
      : (window.localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null),
  user:
    typeof window === 'undefined'
      ? null
      : (() => {
          const raw = window.localStorage.getItem(USER_STORAGE_KEY)
          return raw ? (JSON.parse(raw) as AuthUser) : null
        })(),
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(STORAGE_KEY, token)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
        window.localStorage.removeItem(ROLE_STORAGE_KEY)
        window.localStorage.removeItem(USER_STORAGE_KEY)
      }
    }

    set({ token, role: token ? 'agent' : null, user: token ? { name: 'User', mobile: '', role: 'agent' } : null })
  },
  setSession: (token, role, user = null) => {
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(STORAGE_KEY, token)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }

      if (role) {
        window.localStorage.setItem(ROLE_STORAGE_KEY, role)
      } else {
        window.localStorage.removeItem(ROLE_STORAGE_KEY)
      }

      if (user) {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      } else {
        window.localStorage.removeItem(USER_STORAGE_KEY)
      }
    }

    set({ token, role, user })
  },
  clearSession: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.removeItem(ROLE_STORAGE_KEY)
      window.localStorage.removeItem(USER_STORAGE_KEY)
    }

    set({ token: null, role: null, user: null })
  },
}))

export const getAuthToken = () => useAuthStore.getState().token
export const getAuthRole = () => useAuthStore.getState().role
export const getAuthUser = () => useAuthStore.getState().user
