import axios from 'axios'
import { getAuthRole, getAuthToken } from '@/store/auth.store'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  const role = getAuthRole()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (role) {
    config.headers['x-user-role'] = role
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message || 'Something went wrong. Try again.'

    return Promise.reject(new Error(message))
  }
)
