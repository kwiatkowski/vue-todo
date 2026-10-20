import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from './parse'

const DAY = '2026-10-16'

describe('parseQuickAdd', () => {
  it('takes the day, time and priority out of the title', () => {
    expect(parseQuickAdd('Zadzwonić do Kasi jutro 18:30 !!', DAY)).toEqual({
      title: 'Zadzwonić do Kasi',
      due: '2026-10-17',
      time: '18:30',
      priority: 'medium',
    })
  })

  it('understands "o 9" and leaves a bare time without a day', () => {
    expect(parseQuickAdd('Spotkanie o 9', DAY)).toEqual({ title: 'Spotkanie', time: '09:00' })
  })

  it('keeps plain text as it is', () => {
    expect(parseQuickAdd('Kupić 2 kg jabłek', DAY)).toEqual({ title: 'Kupić 2 kg jabłek' })
    expect(parseQuickAdd('Raport dziś !!!', DAY)).toEqual({ title: 'Raport', due: DAY, priority: 'high' })
  })
})
