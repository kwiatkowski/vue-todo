import type { Status, Task, TaskInput, TaskView } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { tasksApi } from '@/api/todo'
import { addDays, startOfWeek, today } from '@/utils/date'
import { compareManual } from '@/utils/order'
import { compareByDue, compareDone, compareOpen, inView, statusChange } from '@/utils/tasks'
import { useNotifyStore } from './notify'
import { useProjectsStore } from './projects'

/** What the day view shows for one day. */
export interface DayPlan {
  /** open, from earlier days – only when the day is today */
  overdue: Task[]
  /** open, on the day, no time */
  untimed: Task[]
  /** on the day with a time, done ones included (they stay on the timeline, dimmed) */
  timed: Task[]
  /** done, on the day, no time */
  done: Task[]
}

/**
 * All tasks of the user, loaded once. Every change is applied to the UI immediately (optimistic)
 * and rolled back with a message when the server says no.
 */
export const useTasksStore = defineStore('tasks', () => {
  const notify = useNotifyStore()

  const items = ref<Task[]>([])
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const loadError = ref<string | null>(null)
  let tempId = 0

  const open = computed(() => items.value.filter(task => !task.done))

  /** Open task counts for the navigation. */
  const counts = computed(() => {
    const day = today()
    const byProject = new Map<number, number>()
    /** per project: due today or earlier, and of those the overdue – the sidebar's dot */
    const todayByProject = new Map<number, { today: number, overdue: number }>()
    let inbox = 0
    let dueToday = 0
    let overdue = 0
    let dueTomorrow = 0
    let dueWeek = 0
    let dueNextWeek = 0
    const tomorrow = addDays(day, 1)
    const sunday = addDays(startOfWeek(day), 6)
    const nextSunday = addDays(sunday, 7)

    for (const task of open.value) {
      if (task.projectId === null) {
        inbox++
      } else {
        byProject.set(task.projectId, (byProject.get(task.projectId) ?? 0) + 1)
      }

      if (task.due !== null && task.due <= day) {
        dueToday++

        if (task.due < day) {
          overdue++
        }

        if (task.projectId !== null) {
          const entry = todayByProject.get(task.projectId) ?? { today: 0, overdue: 0 }
          entry.today++
          entry.overdue += task.due < day ? 1 : 0
          todayByProject.set(task.projectId, entry)
        }
      } else if (task.due === tomorrow) {
        dueTomorrow++
      }

      if (task.due !== null && task.due <= sunday) {
        dueWeek++
      } else if (task.due !== null && task.due <= nextSunday) {
        dueNextWeek++
      }
    }

    return { inbox, overdue, today: dueToday, tomorrow: dueTomorrow, week: dueWeek, nextWeek: dueNextWeek, all: open.value.length, done: items.value.length - open.value.length, byProject, todayByProject }
  })

  function listFor (view: TaskView): { open: Task[], done: Task[] } {
    const day = today()
    const areaProjects = view.kind === 'area' ? useProjectsStore().idsInArea(view.id) : undefined
    const matching = items.value.filter(task => inView(task, view, day, areaProjects))

    return {
      // upcoming is a timeline; everywhere else the order is the user's (drag & drop)
      open: matching.filter(task => !task.done).toSorted(view.kind === 'upcoming' ? compareByDue : compareManual),
      done: matching.filter(task => task.done).toSorted(compareDone),
    }
  }

  function dayPlan (day: string): DayPlan {
    const plan: DayPlan = { overdue: [], untimed: [], timed: [], done: [] }
    const isToday = day === today()

    for (const task of items.value) {
      if (task.due === day) {
        if (task.time === null) {
          (task.done ? plan.done : plan.untimed).push(task)
        } else {
          plan.timed.push(task)
        }
      } else if (isToday && !task.done && task.due !== null && task.due < day) {
        plan.overdue.push(task)
      }
    }

    plan.overdue.sort(compareByDue)
    plan.untimed.sort(compareOpen)
    plan.done.sort(compareDone)

    return plan
  }

  async function load (): Promise<void> {
    status.value = 'loading'
    loadError.value = null

    try {
      items.value = await tasksApi.list()
      status.value = 'ready'
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
      status.value = 'error'
    }
  }

  async function add (input: TaskInput & { title: string }): Promise<void> {
    const now = new Date().toISOString()
    const done = input.status === 'done'
    const draft: Task = {
      id: --tempId, // negative until the server assigns the real id
      title: input.title,
      notes: input.notes ?? '',
      done,
      status: input.status ?? 'todo',
      completedAt: done ? now : null,
      due: input.due ?? null,
      time: input.time ?? null,
      duration: input.duration ?? null,
      priority: input.priority ?? 'none',
      projectId: input.projectId ?? null,
      position: input.position ?? null,
      createdAt: now,
      updatedAt: now,
    }

    items.value.push(draft)

    try {
      replace(draft.id, await tasksApi.create(input))
    } catch (error) {
      items.value = items.value.filter(task => task.id !== draft.id)
      notify.error(error)
    }
  }

  async function update (id: number, changes: TaskInput): Promise<boolean> {
    const task = items.value.find(item => item.id === id)

    if (!task) {
      return false
    }

    const before = { ...task }

    Object.assign(task, normalize(changes))

    if (task.done !== before.done) {
      task.completedAt = task.done ? new Date().toISOString() : null
    }

    try {
      replace(id, await tasksApi.update(id, changes))

      return true
    } catch (error) {
      replace(id, before)
      notify.error(error)

      return false
    }
  }

  /** Moves the task to a board column; finishing it offers undo back to where it was. */
  async function setStatus (id: number, next: Status): Promise<void> {
    const task = items.value.find(item => item.id === id)

    if (!task || task.status === next) {
      return
    }

    const previous = task.status

    if (await update(id, statusChange(next)) && next === 'done') {
      notify.show(`Ukończono: ${task.title}`, {
        action: { label: 'Cofnij', run: () => void update(id, statusChange(previous)) },
      })
    }
  }

  async function toggle (id: number): Promise<void> {
    const task = items.value.find(item => item.id === id)

    if (task) {
      await setStatus(id, task.done ? 'todo' : 'done')
    }
  }

  async function remove (id: number): Promise<void> {
    const index = items.value.findIndex(item => item.id === id)
    const task = items.value[index]

    if (!task) {
      return
    }

    items.value.splice(index, 1)

    try {
      await tasksApi.remove(id)
      notify.show('Zadanie przeniesione do kosza.')
    } catch (error) {
      items.value.splice(index, 0, task)
      notify.error(error)
    }
  }

  /** After a project is deleted its tasks land in the inbox – same as on the server. */
  function detachProject (projectId: number): void {
    for (const task of items.value) {
      if (task.projectId === projectId) {
        task.projectId = null
      }
    }
  }

  function replace (id: number, task: Task): void {
    const index = items.value.findIndex(item => item.id === id)

    if (index !== -1) {
      items.value[index] = task
    }
  }

  return { items, status, loadError, open, counts, listFor, dayPlan, load, add, update, setStatus, toggle, remove, detachProject }
})

/** The same coupling the server applies: status ⇄ done, no time without a day. */
function normalize (changes: TaskInput): TaskInput {
  const result = { ...changes }

  if (result.status !== undefined) {
    result.done = result.status === 'done'
  } else if (result.done !== undefined) {
    result.status = result.done ? 'done' : 'todo'
  }

  if ('due' in result && !result.due) {
    result.time = null
    result.duration = null
  }

  return result
}
