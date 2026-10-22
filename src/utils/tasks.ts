import type { Priority, Status, Task, TaskView } from '@/types'
import { addDays, startOfWeek, today } from './date'

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 }

/** First day of the task – its start when it spans several days, else its due day. */
export function firstDay (task: Task): string | null {
  return task.due === null ? null : (task.start ?? task.due)
}

/** Is the task on `day` – within its span start…due? */
export function occursOn (task: Task, day: string): boolean {
  return task.due !== null && firstDay(task)! <= day && day <= task.due
}

/** Does the task's span touch the days from…to? */
export function overlaps (task: Task, from: string, to: string): boolean {
  return task.due !== null && firstDay(task)! <= to && task.due >= from
}

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
      // open ones from earlier days too (overdue, or started and still running); done ones only from today
      return task.done ? occursOn(task, day) : firstDay(task) !== null && firstDay(task)! <= day
    }
    case 'tomorrow': {
      return occursOn(task, addDays(day, 1))
    }
    case 'week': {
      // like "today": the overdue too, done ones only from this week
      const sunday = addDays(startOfWeek(day), 6)

      return task.done ? overlaps(task, startOfWeek(day), sunday) : firstDay(task) !== null && firstDay(task)! <= sunday
    }
    case 'next-week': {
      const monday = addDays(startOfWeek(day), 7)

      return overlaps(task, monday, addDays(monday, 6))
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
