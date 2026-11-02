import { describe, expect, it } from 'vitest'
import { changelog, formatChangelogDay, inlineParts, parseChangelog } from './changelog'

describe('parseChangelog', () => {
  it('takes the day sections, newest first, items joined across lines', () => {
    const days = parseChangelog('# Zmiany\n\nWstęp.\n\n## 2026.11.02\n\n- Pierwsza\n  ciąg dalszy\n- Druga\n\n## 2026.10.30\n\n- Starsza\n\n## 2026.10.29\n')

    expect(days).toEqual([
      { version: '2026.11.02', items: ['Pierwsza ciąg dalszy', 'Druga'] },
      { version: '2026.10.30', items: ['Starsza'] },
    ])
  })

  it('reads the real file – newest day first', () => {
    expect(changelog.length).toBeGreaterThan(0)
    expect(changelog[0]?.version).toMatch(/^\d{4}\.\d{2}\.\d{2}$/)
    expect([...changelog].map(day => day.version).toSorted().toReversed()).toEqual(changelog.map(day => day.version))
  })
})

describe('inlineParts', () => {
  it('splits bold and code out of the text', () => {
    expect(inlineParts('Zakładki **Aktywność** i `.1`')).toEqual([
      { text: 'Zakładki ', kind: 'text' },
      { text: 'Aktywność', kind: 'strong' },
      { text: ' i ', kind: 'text' },
      { text: '.1', kind: 'code' },
    ])
  })
})

describe('formatChangelogDay', () => {
  it('names the day in Polish', () => {
    expect(formatChangelogDay('2026.11.02')).toBe('2 listopada 2026')
  })
})
