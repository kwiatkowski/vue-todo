import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notice {
  id: number
  text: string
  tone?: 'error'
  action?: { label: string, run: () => void }
}

/** Toast messages – one at a time, a new one replaces the current. */
export const useNotifyStore = defineStore('notify', () => {
  const current = ref<Notice | null>(null)
  let counter = 0

  function show (text: string, options: Omit<Notice, 'id' | 'text'> = {}): void {
    current.value = { id: ++counter, text, ...options }
  }

  function error (error: unknown): void {
    show(error instanceof Error ? error.message : 'Coś poszło nie tak.', { tone: 'error' })
  }

  function dismiss (): void {
    current.value = null
  }

  return { current, show, error, dismiss }
})
