import type { Directive } from 'vue'
import { shallowReactive } from 'vue'

/**
 * `v-tip="text"` – the app's tooltip (a bubble with a triangle, as in the projects list) instead of the browser's `title`, for a plain
 * text on any element; no text – no tooltip. TipLayer (once, in App) shows it.
 */
export const shownTip = shallowReactive<{ anchor: HTMLElement | null, text: string }>({ anchor: null, text: '' })

const texts = new WeakMap<HTMLElement, string>()

function show (event: Event): void {
  const anchor = event.currentTarget as HTMLElement
  const text = texts.get(anchor)

  // keyboard focus only – a clicked button keeps its focus, the tooltip shouldn't stay with it
  if (!text || (event.type === 'focusin' && !(event.target as Element).matches(':focus-visible'))) {
    return
  }

  shownTip.anchor = anchor
  shownTip.text = text
}

/** the pointer or the focus left it, or a click – out of the way */
function hide (event: Event): void {
  if (shownTip.anchor === event.currentTarget) {
    shownTip.anchor = null
  }
}

function set (anchor: HTMLElement, text: string | null | undefined): void {
  if (text) {
    texts.set(anchor, text)
  } else {
    texts.delete(anchor)
  }

  if (shownTip.anchor === anchor) {
    if (text) {
      shownTip.text = text
    } else {
      shownTip.anchor = null
    }
  }
}

const EVENTS = { mouseenter: show, focusin: show, mouseleave: hide, focusout: hide, pointerdown: hide }

export const vTip: Directive<HTMLElement, string | null | undefined> = {
  mounted (anchor, { value }) {
    set(anchor, value)

    for (const [name, handler] of Object.entries(EVENTS)) {
      anchor.addEventListener(name, handler)
    }
  },

  updated (anchor, { value }) {
    set(anchor, value)
  },

  beforeUnmount (anchor) {
    set(anchor, null)

    for (const [name, handler] of Object.entries(EVENTS)) {
      anchor.removeEventListener(name, handler)
    }
  },
}
