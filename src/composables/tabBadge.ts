import { ref, watchEffect } from 'vue'

/**
 * The browser tab shows what's due today: "(3) Dziś · Plan · Todo", and the favicon turns into the number –
 * on red when some of it is overdue. While the tab is in the background it gently blinks back to the check mark.
 * Pages only name themselves with setPageTitle(); the count is added here.
 */

const pageTitle = ref('Todo')

export function setPageTitle (title: string): void {
  pageTitle.value = title
}

const BLINK_MS = 1500

/** the app's mark – same as public/favicon.svg */
const MARK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#4c662b"/><path d="M18 33.5 27.5 43 47 22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const markUrl = `data:image/svg+xml,${encodeURIComponent(MARK)}`

const icons = new Map<string, string>()

/**
 * The count instead of the check mark: a white number on the same rounded square, red when something
 * is overdue, "9+" from ten on. Drawn on a canvas so the digits' real ink box can be measured and put
 * dead centre – SVG text baselines differ between browsers and fonts.
 */
function countIcon (count: number, overdue: boolean): string {
  const text = count > 9 ? '9+' : String(count)
  const key = `${text}:${overdue}`
  const cached = icons.get(key)

  if (cached) {
    return cached
  }

  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (!context) {
    return markUrl
  }

  context.fillStyle = overdue ? '#c2412d' : '#4c662b'
  context.beginPath()
  context.roundRect(0, 0, size, size, 16)
  context.fill()

  context.fillStyle = '#fff'
  context.font = `400 ${text.length > 1 ? 38 : 46}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'

  // centre the ink, not the font's line box
  const box = context.measureText(text)
  const width = box.actualBoundingBoxLeft + box.actualBoundingBoxRight
  const height = box.actualBoundingBoxAscent + box.actualBoundingBoxDescent
  const x = (size - width) / 2 + box.actualBoundingBoxLeft
  const y = (size - height) / 2 + box.actualBoundingBoxAscent
  context.fillText(text, x, y)

  const url = canvas.toDataURL('image/png')
  icons.set(key, url)

  return url
}

function iconLink (): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.append(link)
  }

  return link
}

/** Keeps the tab's title and icon in step with `count` (due today, overdue included). */
export function useTabBadge (state: () => { count: number, overdue: boolean }): void {
  let timer: ReturnType<typeof setInterval> | undefined
  let showBadge = true

  function paint (): void {
    const { count, overdue } = state()
    const link = iconLink()
    const href = count > 0 && showBadge ? countIcon(count, overdue) : markUrl
    link.type = href.startsWith('data:image/png') ? 'image/png' : 'image/svg+xml'
    link.href = href
  }

  // blinking only while the tab is out of sight – in front it would just distract
  function syncBlink (): void {
    clearInterval(timer)
    showBadge = true

    if (document.hidden && state().count > 0) {
      timer = setInterval(() => {
        showBadge = !showBadge
        paint()
      }, BLINK_MS)
    }

    paint()
  }

  watchEffect(() => {
    const { count } = state()
    document.title = count > 0 ? `(${count}) ${pageTitle.value}` : pageTitle.value
    syncBlink()
  })

  document.addEventListener('visibilitychange', syncBlink)
}
