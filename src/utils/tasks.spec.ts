import type { Task } from '@/types'
import { describe, expect, it } from 'vitest'
import { formatDue, formatDueParts, formatSpan, formatWeekRange, spanLength, startOfWeek, weekDays } from './date'
import { compareOpen, inView, isOverdue } from './tasks'

function task (overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Zadanie',
    notes: '',
    done: false,
    status: 'todo',
    completedAt: null,
    start: null,
    due: null,
    time: null,
    duration: null,
    priority: 'none',
    projectId: null,
    position: null,
    createdAt: '2026-10-01T10:00:00+00:00',
    updatedAt: '2026-10-01T10:00:00+00:00',
    ...overrides,
  }
}

const DAY = '2026-10-16'

describe('inView', () => {
  it('puts tasks without a project in the inbox', () => {
    expect(inView(task(), { kind: 'inbox' }, DAY)).toBe(true)
    expect(inView(task({ projectId: 3 }), { kind: 'inbox' }, DAY)).toBe(false)
  })

  it('shows only future tasks in "upcoming"', () => {
    expect(inView(task({ due: '2026-10-17' }), { kind: 'upcoming' }, DAY)).toBe(true)
    expect(inView(task({ due: DAY }), { kind: 'upcoming' }, DAY)).toBe(false)
    expect(inView(task(), { kind: 'upcoming' }, DAY)).toBe(false)
  })

  it('shows today with the overdue, but only today\'s done ones', () => {
    expect(inView(task({ due: DAY }), { kind: 'today' }, DAY)).toBe(true)
    expect(inView(task({ due: '2026-10-10' }), { kind: 'today' }, DAY)).toBe(true)
    expect(inView(task({ due: '2026-10-10', done: true }), { kind: 'today' }, DAY)).toBe(false)
    expect(inView(task({ due: DAY, done: true }), { kind: 'today' }, DAY)).toBe(true)
    expect(inView(task({ due: '2026-10-17' }), { kind: 'today' }, DAY)).toBe(false)
    expect(inView(task(), { kind: 'today' }, DAY)).toBe(false)
  })

  it('shows this week with the overdue, and the next week on its own', () => {
    // DAY is Friday 2026-10-16: the week is 12–18, the next one 19–25
    expect(inView(task({ due: '2026-10-18' }), { kind: 'week' }, DAY)).toBe(true)
    expect(inView(task({ due: '2026-10-01' }), { kind: 'week' }, DAY)).toBe(true)
    expect(inView(task({ due: '2026-10-01', done: true }), { kind: 'week' }, DAY)).toBe(false)
    expect(inView(task({ due: '2026-10-12', done: true }), { kind: 'week' }, DAY)).toBe(true)
    expect(inView(task({ due: '2026-10-19' }), { kind: 'week' }, DAY)).toBe(false)
    expect(inView(task({ due: '2026-10-19' }), { kind: 'next-week' }, DAY)).toBe(true)
    expect(inView(task({ due: '2026-10-25' }), { kind: 'next-week' }, DAY)).toBe(true)
    expect(inView(task({ due: '2026-10-26' }), { kind: 'next-week' }, DAY)).toBe(false)
    expect(inView(task({ due: '2026-10-18' }), { kind: 'next-week' }, DAY)).toBe(false)
  })

  it('shows only finished tasks in "done"', () => {
    expect(inView(task({ done: true, status: 'done' }), { kind: 'done' }, DAY)).toBe(true)
    expect(inView(task(), { kind: 'done' }, DAY)).toBe(false)
  })

  it('shows a task spanning days on each of them', () => {
    // DAY is Friday 2026-10-16
    const span = task({ start: '2026-10-16', due: '2026-10-19' }) // Fri – Mon
    expect(inView(span, { kind: 'today' }, DAY)).toBe(true)
    expect(inView(span, { kind: 'tomorrow' }, DAY)).toBe(true)
    expect(inView(span, { kind: 'week' }, DAY)).toBe(true)
    expect(inView(span, { kind: 'next-week' }, DAY)).toBe(true) // ends on Monday the 19th

    const later = task({ start: '2026-10-18', due: '2026-10-20' }) // Sun – Tue
    expect(inView(later, { kind: 'today' }, DAY)).toBe(false)
    expect(inView(later, { kind: 'tomorrow' }, DAY)).toBe(false)
    expect(inView(later, { kind: 'week' }, DAY)).toBe(true)

    const running = task({ start: '2026-10-14', due: '2026-10-17' }) // started on Wednesday
    expect(inView(running, { kind: 'today' }, DAY)).toBe(true)
    expect(isOverdue(running, DAY)).toBe(false)
    expect(inView(task({ start: '2026-10-14', due: '2026-10-16', done: true, status: 'done' }), { kind: 'today' }, DAY)).toBe(true)
  })

  it('shows only the next day in "tomorrow"', () => {
    expect(inView(task({ due: '2026-10-17' }), { kind: 'tomorrow' }, DAY)).toBe(true)
    expect(inView(task({ due: DAY }), { kind: 'tomorrow' }, DAY)).toBe(false)
    expect(inView(task({ due: '2026-10-18' }), { kind: 'tomorrow' }, DAY)).toBe(false)
  })

  it('matches an area through its projects', () => {
    const projects = new Set([3, 4])

    expect(inView(task({ projectId: 4 }), { kind: 'area', id: 1 }, DAY, projects)).toBe(true)
    expect(inView(task({ projectId: 5 }), { kind: 'area', id: 1 }, DAY, projects)).toBe(false)
    expect(inView(task(), { kind: 'area', id: 1 }, DAY, projects)).toBe(false)
  })

  it('matches the project by id', () => {
    expect(inView(task({ projectId: 3 }), { kind: 'project', id: 3 }, DAY)).toBe(true)
    expect(inView(task({ projectId: 4 }), { kind: 'project', id: 3 }, DAY)).toBe(false)
  })
})

describe('compareOpen', () => {
  it('sorts by priority, then due date (none last), then age', () => {
    const list = [
      task({ id: 1, priority: 'low' }),
      task({ id: 2, priority: 'high', due: '2026-10-20' }),
      task({ id: 3, priority: 'high', due: '2026-10-18' }),
      task({ id: 4, priority: 'high' }),
      task({ id: 5, priority: 'low', createdAt: '2026-09-01T10:00:00+00:00' }),
    ]

    expect(list.toSorted(compareOpen).map(item => item.id)).toEqual([3, 2, 4, 5, 1])
  })
})

describe('isOverdue', () => {
  it('only counts open tasks with a past due date', () => {
    expect(isOverdue(task({ due: '2026-10-15' }), DAY)).toBe(true)
    expect(isOverdue(task({ due: '2026-10-15', done: true }), DAY)).toBe(false)
    expect(isOverdue(task({ due: DAY }), DAY)).toBe(false)
  })
})

describe('formatDue', () => {
  const now = new Date(2026, 9, 16, 12)

  it('uses relative names around today', () => {
    expect(formatDue('2026-10-16', now)).toBe('Dziś')
    expect(formatDue('2026-10-17', now)).toBe('Jutro')
    expect(formatDue('2026-10-15', now)).toBe('Wczoraj')
    expect(formatDue('2026-10-20', now)).toBe('wtorek')
  })

  it('adds the year only outside the current one', () => {
    expect(formatDue('2026-12-24', now)).toBe('24 gru')
    expect(formatDue('2027-01-05', now)).toBe('5 sty 2027')
  })
})

describe('formatDueParts', () => {
  const now = new Date(2026, 9, 16, 12)

  it('names near days and adds the date when the name alone is vague', () => {
    expect(formatDueParts('2026-10-16', now)).toEqual({ day: 'Dziś', date: null })
    expect(formatDueParts('2026-10-17', now)).toEqual({ day: 'Jutro', date: null })
    expect(formatDueParts('2026-10-15', now)).toEqual({ day: 'Wczoraj', date: null })
    expect(formatDueParts('2026-10-14', now)).toEqual({ day: '2 dni temu', date: '14 paź' })
    expect(formatDueParts('2026-10-19', now)).toEqual({ day: 'Poniedziałek', date: '19 paź' })
  })

  it('shows just the date further away', () => {
    expect(formatDueParts('2026-11-12', now)).toEqual({ day: '12 lis', date: null })
    expect(formatDueParts('2026-10-01', now)).toEqual({ day: '1 paź', date: null })
    expect(formatDueParts('2027-01-05', now)).toEqual({ day: '5 sty 2027', date: null })
  })
})

describe('weeks', () => {
  it('starts on Monday', () => {
    expect(startOfWeek('2026-10-16')).toBe('2026-10-12') // Friday → Monday
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12') // Sunday stays in the same week
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19')
    expect(weekDays('2026-10-16')).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'])
  })

  it('names the range, across months too', () => {
    expect(formatWeekRange('2026-10-16')).toBe('12–18 października 2026')
    expect(formatWeekRange('2026-10-28')).toBe('26 października – 1 listopada 2026')
  })
})

describe('spans', () => {
  const now = new Date(2026, 9, 16, 12)

  it('formats a span of days', () => {
    expect(formatSpan('2026-10-20', '2026-10-24', now)).toBe('20–24 paź')
    expect(formatSpan('2026-10-30', '2026-11-02', now)).toBe('30 paź – 2 lis')
    expect(formatSpan('2026-12-30', '2027-01-02', now)).toBe('30 gru 2026 – 2 sty 2027')
  })

  it('counts the days of a span', () => {
    expect(spanLength('2026-10-20', '2026-10-24')).toBe(5)
    expect(spanLength('2026-10-25', '2026-10-26')).toBe(2) // across the DST change
  })
})
