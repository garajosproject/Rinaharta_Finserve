'use client'

import { useEffect, useState } from 'react'

export type ToastItem = {
  id: number
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

let listeners = new Set<(items: ToastItem[]) => void>()
let toasts: ToastItem[] = []

function emit() {
  listeners.forEach((listener) => listener([...toasts]))
}

export function toast(input: Omit<ToastItem, 'id'>) {
  const item: ToastItem = {
    id: Date.now(),
    variant: 'default',
    ...input,
  }

  toasts = [item, ...toasts].slice(0, 3)
  emit()

  window.setTimeout(() => {
    toasts = toasts.filter((toastItem) => toastItem.id !== item.id)
    emit()
  }, 3200)
}

export function useToastStore() {
  const [items, setItems] = useState<ToastItem[]>(toasts)

  useEffect(() => {
    listeners.add(setItems)
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  return { toasts: items }
}
