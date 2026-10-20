import type { Priority, Status, Task, TaskView } from '@/types'
import { addDays, startOfWeek, today } from './date'

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 }

/**
 * Does the task belong to the view? Done tasks are matched too – lists show them in their own section.
 * `areaProjects` are the ids of the projects in the viewed area.
 */
export function inView (task: Task, view: TaskView, day = today(), areaProjects: ReadonlySet<number> = new Set()): boolean {
  switch (view.kind) {
    case 'inbox': {
      return task.projectId === null
    }
    case 'today': {
      // open ones from earlier days too; done ones only from today, not the whole history
      return task.due !== null && (task.done ? task.due === day : task.due <= day)
    }
    case 'tomorrow': {
      return task.due === addDays(day, 1)
    }
    case 'week': {
      // like "today": the overdue too, done ones only from this week
      const sunday = addDays(startOfWeek(day), 6)

      return task.due !== null && (task.done ? task.due >= startOfWeek(day) && task.due <= sunday : task.due <= sunday)
    }
    case 'next-week': {
      const monday = addDays(startOfWeek(day), 7)

      return task.due !== null && task.due >= monday && task.due <= addDays(monday, 6)
    }
    case 'upcoming': {
      return task.due !== null && task.due > day
    }
    case 'all': {
      return true
    }
    case 'done': {
      return task.done
    }
    case 'area': {
      return task.projectId !== null && areaProjects.has(task.projectId)
    }
    case 'project': {
      return task.projectId === view.id
    }
  }
}

/** Open tasks: priority, then due date (none last), then oldest first. */
export function compareOpen (a: Task, b: Task): number {
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    || (a.due ?? '9999').localeCompare(b.due ?? '9999')
    || a.createdAt.localeCompare(b.createdAt)
}

/** Upcoming is a timeline – date and time first. */
export function compareByDue (a: Task, b: Task): number {
  return (a.due ?? '9999').localeCompare(b.due ?? '9999')
    || (a.time ?? '99').localeCompare(b.time ?? '99')
    || compareOpen(a, b)
}

/** Done tasks: most recently completed first. */
export function compareDone (a: Task, b: Task): number {
  return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
}

export function isOverdue (task: Task, day = today()): boolean {
  return !task.done && task.due !== null && task.due < day
}

/** The fields that change together when a task moves between columns or gets (un)checked. */
export function statusChange (status: Status): { status: Status, done: boolean } {
  return { status, done: status === 'done' }
}

export const PRIORITIES: { value: Priority, title: string }[] = [
  { value: 'high', title: 'Wysoki' },
  { value: 'medium', title: 'Średni' },
  { value: 'low', title: 'Niski' },
  { value: 'none', title: 'Brak' },
]

export const STATUSES: { value: Status, title: string }[] = [
  { value: 'todo', title: 'Do zrobienia' },
  { value: 'doing', title: 'W toku' },
  { value: 'done', title: 'Zrobione' },
]

export function priorityTitle (priority: Priority): string {
  return PRIORITIES.find(item => item.value === priority)?.title ?? ''
}
