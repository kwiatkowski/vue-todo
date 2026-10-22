import type { Task } from '@/types'
import { describe, expect, it } from 'vitest'
import { formatRange, fromMinutes, layoutDay, snap, toMinutes } from './day'

function task (id: number, time: string | null, duration: number | null = null): Task {
  return {
    id,
    title: `Zadanie ${id}`,
    notes: '',
    done: false,
    status: 'todo',
    completedAt: null,
    start: null,
    due: '2026-10-16',
    time,
    duration,
    priority: 'none',
    projectId: null,
    position: null,
    createdAt: '2026-10-01T10:00:00+00:00',
    updatedAt: '2026-10-01T10:00:00+00:00',
  }
}

describe('time helpers', () => {
  it('converts between "HH:MM" and minutes, clamped to the day', () => {
    expect(toMinutes('09:30')).toBe(570)
    expect(fromMinutes(570)).toBe('09:30')
    expect(fromMinutes(-20)).toBe('00:00')
    expect(fromMinutes(2000)).toBe('23:59')
    expect(snap(37)).toBe(30)
    expect(snap(38)).toBe(45)
  })

  it('formats a range with the default duration', () => {
    expect(formatRange('09:30', null)).toBe('9:30–10:00')
    expect(formatRange('13:00', 90)).toBe('13:00–14:30')
  })
})

describe('layoutDay', () => {
  it('puts overlapping tasks side by side and lone ones full width', () => {
    const placed = layoutDay([
      task(1, '09:00', 60),
      task(2, '09:30', 60),
      task(3, '10:00', 30), // 1 has ended – reuses its column
      task(4, '12:00'),
      task(5, null),
    ])

    const byId = new Map(placed.map(item => [item.task.id, item]))

    expect(placed).toHaveLength(4)
    expect(byId.get(1)).toMatchObject({ column: 0, columns: 2 })
    expect(byId.get(2)).toMatchObject({ column: 1, columns: 2 })
    expect(byId.get(3)).toMatchObject({ column: 0, columns: 2 })
    expect(byId.get(4)).toMatchObject({ column: 0, columns: 1, start: 720, end: 750 })
  })
})
