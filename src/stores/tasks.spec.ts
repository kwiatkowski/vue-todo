import type { Task } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { tasksApi } from '@/api/todo'
import { addDays, today } from '@/utils/date'
import { useNotifyStore } from './notify'
import { useTasksStore } from './tasks'

vi.mock('@/api/todo', () => ({
  tasksApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  projectsApi: {},
  areasApi: {},
}))

const api = vi.mocked(tasksApi)

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

describe('tasks store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('shows a new task at once and swaps in the saved one', async () => {
    let resolve!: (value: Task) => void
    api.create.mockReturnValue(new Promise(r => (resolve = r)))
    const store = useTasksStore()

    const adding = store.add({ title: 'Nowe' })

    expect(store.items).toHaveLength(1)
    expect(store.items[0]!.id).toBeLessThan(0)

    resolve(task({ id: 42, title: 'Nowe' }))
    await adding

    expect(store.items.map(item => item.id)).toEqual([42])
  })

  it('rolls an update back and reports the server message', async () => {
    const store = useTasksStore()
    store.items = [task({ id: 7, title: 'Stare' })]
    api.update.mockRejectedValue(new ApiError('Nie ma takiego zadania.', 404, 'todo_task_not_found'))

    const ok = await store.update(7, { title: 'Nowe' })

    expect(ok).toBe(false)
    expect(store.items[0]!.title).toBe('Stare')
    expect(useNotifyStore().current?.text).toBe('Nie ma takiego zadania.')
  })

  it('offers undo after completing a task', async () => {
    const store = useTasksStore()
    store.items = [task({ id: 7 })]
    api.update.mockImplementation(async (id, changes) => task({ id, ...changes }))

    await store.toggle(7)

    expect(store.items[0]!.done).toBe(true)
    expect(store.items[0]!.status).toBe('done')
    const notice = useNotifyStore().current
    expect(notice?.action?.label).toBe('Cofnij')

    notice?.action?.run()
    await vi.waitFor(() => expect(store.items[0]!.done).toBe(false))
  })

  it('undoes a finished board card back to its column', async () => {
    const store = useTasksStore()
    store.items = [task({ id: 7, status: 'doing' })]
    api.update.mockImplementation(async (id, changes) => task({ id, ...changes }))

    await store.setStatus(7, 'done')
    expect(api.update).toHaveBeenLastCalledWith(7, { status: 'done', done: true })

    useNotifyStore().current?.action?.run()
    await vi.waitFor(() => expect(store.items[0]!.status).toBe('doing'))
    expect(store.items[0]!.done).toBe(false)
  })

  it('keeps status and done in step and drops the time with the day', async () => {
    const store = useTasksStore()
    store.items = [task({ id: 7, due: '2026-10-16', time: '09:00', duration: 60 })]
    let resolve!: (value: Task) => void
    api.update.mockReturnValue(new Promise(r => (resolve = r)))

    const updating = store.update(7, { done: true, due: null })

    // applied at once, before the server answers
    expect(store.items[0]).toMatchObject({ done: true, status: 'done', due: null, time: null, duration: null })
    expect(store.items[0]!.completedAt).not.toBeNull()

    resolve(task({ id: 7, done: true, status: 'done' }))
    await updating
  })

  it('counts per project what is due today, and how much of it is overdue', () => {
    const store = useTasksStore()
    const day = today()
    store.items = [
      task({ id: 1, projectId: 5, due: day }),
      task({ id: 2, projectId: 5, due: '2000-01-01' }),
      task({ id: 3, projectId: 5, due: addDays(day, 1) }),
      task({ id: 4, projectId: 6, due: day, done: true, status: 'done' }),
      task({ id: 5, projectId: 7 }),
    ]

    expect(store.counts.todayByProject.get(5)).toEqual({ today: 2, overdue: 1 })
    expect(store.counts.todayByProject.has(6)).toBe(false) // done ones don't count
    expect(store.counts.todayByProject.has(7)).toBe(false)
    expect(store.counts.byProject.get(5)).toBe(3)
  })

  it('plans a day: overdue only today, timed apart from the rest', () => {
    const store = useTasksStore()
    const day = today()
    store.items = [
      task({ id: 1, due: '2000-01-01' }),
      task({ id: 2, due: day, time: '10:00' }),
      task({ id: 3, due: day }),
      task({ id: 4, due: day, done: true, status: 'done' }),
      task({ id: 5, due: day, time: '08:00', done: true, status: 'done' }),
    ]

    const plan = store.dayPlan(day)
    const ids = (list: Task[]) => list.map(item => item.id)

    expect(ids(plan.overdue)).toEqual([1])
    expect(ids(plan.timed)).toEqual([2, 5])
    expect(ids(plan.untimed)).toEqual([3])
    expect(ids(plan.done)).toEqual([4])
    expect(store.dayPlan(addDays(day, 1)).overdue).toHaveLength(0)
  })

  it('puts a task spanning days on each of its days and tabs', () => {
    const store = useTasksStore()
    const day = today()
    store.items = [
      task({ id: 1, start: addDays(day, -1), due: addDays(day, 1) }), // yesterday – tomorrow
      task({ id: 2, start: addDays(day, 1), due: addDays(day, 2) }), // tomorrow – the day after
    ]

    expect(store.counts.today).toBe(1)
    expect(store.counts.overdue).toBe(0)
    expect(store.counts.tomorrow).toBe(2)
    expect(store.dayPlan(day).untimed.map(item => item.id)).toEqual([1])
    expect(store.dayPlan(addDays(day, 1)).untimed.map(item => item.id).toSorted()).toEqual([1, 2])
    expect(store.dayPlan(addDays(day, 2)).untimed.map(item => item.id)).toEqual([2])
  })

  it('keeps a span valid on update: no time, no start on or after the due day', async () => {
    api.update.mockReturnValue(new Promise(() => {}))
    const store = useTasksStore()
    store.items = [task({ id: 1, due: '2026-10-20', time: '09:00', duration: 30 })]

    void store.update(1, { start: '2026-10-18' })
    expect(store.items[0]).toMatchObject({ start: '2026-10-18', time: null, duration: null })

    void store.update(1, { due: '2026-10-18' })
    expect(store.items[0]!.start).toBeNull()

    void store.update(1, { start: '2026-10-16' })
    void store.update(1, { due: null })
    expect(store.items[0]).toMatchObject({ start: null, due: null })
  })

  it('puts a deleted task back when the server refuses', async () => {
    const store = useTasksStore()
    store.items = [task({ id: 1 }), task({ id: 2 }), task({ id: 3 })]
    api.remove.mockRejectedValue(new ApiError('Brak połączenia z serwerem.', 0, 'network'))

    await store.remove(2)

    expect(store.items.map(item => item.id)).toEqual([1, 2, 3])
  })

  it('counts open tasks per view and project', () => {
    const store = useTasksStore()
    store.items = [
      task({ id: 1 }),
      task({ id: 2, projectId: 5 }),
      task({ id: 3, projectId: 5, done: true }),
      task({ id: 4, due: '2000-01-01' }),
    ]

    expect(store.counts.inbox).toBe(2)
    expect(store.counts.done).toBe(1)
    expect(store.counts.today).toBe(1)
    expect(store.counts.byProject.get(5)).toBe(1)
    expect(store.listFor({ kind: 'project', id: 5 }).done).toHaveLength(1)
  })
})
