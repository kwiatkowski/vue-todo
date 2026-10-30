import { computed, ref } from 'vue'

const KEY = 'todo:theme'

/** 'light' or 'dark' – dark unless the user picked light (index.html applies it before the first paint) */
const pinned = ref<string>(typeof document === 'undefined' ? 'dark' : document.documentElement.dataset.theme ?? 'dark')

const dark = computed(() => pinned.value === 'dark')

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
