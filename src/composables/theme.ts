import { computed, ref } from 'vue'

const KEY = 'todo:theme'
const media = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')

/** 'light' | 'dark' when pinned by the user, null = follow the system (index.html applies the saved one early) */
const pinned = ref<string | null>(typeof document === 'undefined' ? null : document.documentElement.dataset.theme ?? null)
const systemDark = ref(media?.matches ?? false)

media?.addEventListener('change', event => {
  systemDark.value = event.matches
})

const dark = computed(() => pinned.value ? pinned.value === 'dark' : systemDark.value)

function toggleTheme (): void {
  const next = dark.value ? 'light' : 'dark'
  pinned.value = next
  document.documentElement.dataset.theme = next
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#151513' : '#f6f5f1')

  try {
    localStorage.setItem(KEY, next)
  } catch {
    // private mode – the choice just isn't remembered
  }
}

export function useTheme () {
  return { dark, toggleTheme }
}
