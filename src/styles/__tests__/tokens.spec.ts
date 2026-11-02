import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The design system's contrast rule (DESIGN.md): every text colour at least 4.5:1 on the background and on the cards,
 * in both themes – read from app.css itself, so a changed colour that breaks it fails here.
 */
const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8')

/** the hex colours of one block: the light :root, or the dark theme's */
function tokens (selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  const block = css.slice(start, css.indexOf('}', start))

  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})\b/gi)].map(match => [match[1], match[2]]))
}

function luminance (hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16) / 255).map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast (a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].toSorted((x, y) => y - x)

  return (light! + 0.05) / (dark! + 0.05)
}

const TEXTS = ['text', 'text-2', 'text-3', 'accent-text', 'danger', 'warn', 'info']

describe.each([
  ['jasny', tokens(':root {')],
  ['ciemny', tokens(':root[data-theme=\'dark\'] {')],
])('kontrast – motyw %s', (_, colors) => {
  it.each(TEXTS.flatMap(text => ['bg', 'surface'].map(background => [text, background])))('%s na %s ≥ 4.5:1', (text, background) => {
    expect(colors[text], `--${text}`).toBeDefined()
    expect(contrast(colors[text]!, colors[background]!)).toBeGreaterThanOrEqual(4.5)
  })

  it('tekst na przycisku głównym ≥ 4.5:1', () => {
    expect(contrast(colors['accent-ink']!, colors.accent!)).toBeGreaterThanOrEqual(4.5)
  })
})
