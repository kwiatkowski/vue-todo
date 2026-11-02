import { describe, expect, it } from 'vitest'
import { describeChanges, formatMoment, formatWhen } from './activity'

describe('describeChanges', () => {
  it('names the status and priority as the app does', () => {
    expect(describeChanges([{ field: 'status', from: 'todo', to: 'doing' }, { field: 'priority', from: 'none', to: 'high' }])).toEqual([
      { label: 'Status', from: 'Do zrobienia', to: 'W toku' },
      { label: 'Priorytet', from: 'Brak', to: 'Wysoki' },
    ])
  })

  it('shows no project as the inbox, the notes only as changed', () => {
    expect(describeChanges([{ field: 'projectId', from: 'Dom', to: null }, { field: 'notes', from: null, to: null }])).toEqual([
      { label: 'Projekt', from: 'Dom', to: 'Do posortowania' },
      { label: 'Notatki', from: null, to: 'zmienione' },
    ])
  })

  it('gives the day, its span and time as one line', () => {
    const when = { start: null, due: '2026-11-02', time: null, duration: null }
    const [line] = describeChanges([{ field: 'when', from: when, to: { ...when, start: '2026-11-02', due: '2026-11-03' } }])

    expect(line?.label).toBe('Termin')
    expect(line?.from).toMatch(/^2 lis 2026$/)
    expect(line?.to).toMatch(/^2 lis – 3 lis 2026$/)
  })

  it('joins the day fields of older saves into that one line', () => {
    const lines = describeChanges([
      { field: 'start', from: null, to: '2026-11-02' },
      { field: 'due', from: '2026-11-02', to: '2026-11-03' },
      { field: 'status', from: 'todo', to: 'doing' },
    ])

    expect(lines.map(line => line.label)).toEqual(['Termin', 'Status'])
    expect(lines[0]?.to).toMatch(/^2 lis – 3 lis 2026$/)
  })
})

describe('formatWhen', () => {
  it('adds the time to a one-day task, says when there is no day', () => {
    expect(formatWhen({ start: null, due: '2026-11-02', time: '09:00', duration: null })).toMatch(/^2 lis 2026, 9:00–9:30$/)
    expect(formatWhen({ start: null, due: null, time: null, duration: null })).toBe('bez terminu')
  })
})

describe('formatMoment', () => {
  const now = new Date(2026, 10, 2, 12, 0)

  it('says today and yesterday, else the date', () => {
    expect(formatMoment(new Date(2026, 10, 2, 10, 22).toISOString(), now)).toBe('dziś, 10:22')
    expect(formatMoment(new Date(2026, 10, 1, 9, 31).toISOString(), now)).toBe('wczoraj, 09:31')
    expect(formatMoment(new Date(2026, 9, 23, 9, 1).toISOString(), now)).toMatch(/^23 paź 2026, 09:01$/)
  })
})
