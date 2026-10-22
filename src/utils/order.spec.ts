import type { Task } from '@/types'
import { describe, expect, it } from 'vitest'
import { compareManual, dropIndex, duplicateOf, positionAt, sortKey, splitByOrder } from './order'

function task (id: number, position: number | null, createdAt = '2026-10-01T10:00:00+00:00', extra: Partial<Task> = {}): Task {
  return {
    id,
    title: `Zadanie ${id}`,
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
    position,
    createdAt,
    updatedAt: createdAt,
    ...extra,
  }
}

describe('manual order', () => {
  it('uses the position, else the creation time', () => {
    const old = task(1, null, '2026-10-01T10:00:00+00:00')
    const fresh = task(2, null, '2026-10-02T10:00:00+00:00')
    const moved = task(3, sortKey(old) + 10)

    expect([fresh, moved, old].toSorted(compareManual).map(item => item.id)).toEqual([1, 3, 2])
  })

  it('places a dropped task between its new neighbours', () => {
    const list = [task(1, 10), task(2, 20), task(3, 30)]

    expect(positionAt(list, 3, 0)).toBe(9) // to the top
    expect(positionAt(list, 3, 1)).toBe(15) // between 1 and 2
    expect(positionAt(list, 1, 2)).toBe(31) // to the bottom
    expect(positionAt([], 1, 0)).toBe(0)
  })

  it('counts the drop index without the dragged task', () => {
    const list = [task(1, 10), task(2, 20), task(3, 30)]

    expect(dropIndex(list, 1, 3, false)).toBe(1) // 1 before 3 → [2, 1, 3]
    expect(dropIndex(list, 1, 3, true)).toBe(2) // 1 after 3 → [2, 3, 1]
    expect(dropIndex(list, 3, 1, false)).toBe(0)
  })

  it('round-trips: the new position sorts the task where it was dropped', () => {
    const list = [task(1, 10), task(2, 20), task(3, 30), task(4, 40)]
    const index = dropIndex(list, 4, 2, false)
    const moved = list.map(item => item.id === 4 ? { ...item, position: positionAt(list, 4, index) } : item)

    expect(moved.toSorted(compareManual).map(item => item.id)).toEqual([1, 4, 2, 3])
  })
})

describe('splitByOrder', () => {
  it('sorts by date, time and priority, then undated by priority, the rest by hand', () => {
    const list = [
      task(1, 10), // nothing – manual
      task(2, 50, undefined, { priority: 'low' }),
      task(3, 20, undefined, { due: '2026-10-20', priority: 'low' }),
      task(4, 30, undefined, { due: '2026-10-18' }),
      task(5, 5), // nothing – manual, above 1
      task(6, 40, undefined, { due: '2026-10-20', priority: 'high' }),
      task(7, 60, undefined, { due: '2026-10-20', time: '09:00' }),
      task(8, 70, undefined, { priority: 'high' }),
    ]

    const { auto, manual } = splitByOrder(list)

    expect(auto.map(item => item.id)).toEqual([4, 7, 6, 3, 8, 2])
    expect(manual.map(item => item.id)).toEqual([5, 1])
  })

  it('puts tasks in progress first, even without a date or priority', () => {
    const list = [
      task(1, 10, undefined, { due: '2026-10-18', priority: 'high' }),
      task(2, 20, undefined, { status: 'doing' }), // nothing else – would be hand-ordered
      task(3, 30, undefined, { status: 'doing', due: '2026-10-25' }),
      task(4, 40),
    ]

    const { auto, manual } = splitByOrder(list)

    expect(auto.map(item => item.id)).toEqual([3, 2, 1])
    expect(manual.map(item => item.id)).toEqual([4])
  })
})

describe('duplicateOf', () => {
  it('copies the content, reopens a done task and sits right after the original', () => {
    const original = task(2, 20, undefined, { title: 'Raport', notes: 'Q3', due: '2026-10-20', time: '09:00', duration: 60, priority: 'high', projectId: 5, status: 'done', done: true })
    const list = [task(1, 10), original, task(3, 30)]

    expect(duplicateOf(original, list)).toEqual({
      title: 'Raport',
      notes: 'Q3',
      status: 'todo',
      start: null,
      due: '2026-10-20',
      time: '09:00',
      duration: 60,
      priority: 'high',
      projectId: 5,
      position: 25,
    })
    expect(duplicateOf(list[2]!, list).position).toBe(31) // the last one: one step past it
    expect(duplicateOf(task(4, 40, undefined, { status: 'doing' }), [task(4, 40)]).status).toBe('doing')
  })
})
