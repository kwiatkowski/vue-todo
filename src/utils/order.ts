import type { Task, TaskInput } from '@/types'

/**
 * Manual order of tasks. A task that was never moved sorts by its creation time (seconds), so new tasks
 * land at the end; a moved one gets a position between its new neighbours – one PATCH per drop.
 */
export function sortKey (task: Task): number {
  return task.position ?? Date.parse(task.createdAt) / 1000
}

export function compareManual (a: Task, b: Task): number {
  return sortKey(a) - sortKey(b) || a.id - b.id
}

/**
 * Position for `id` dropped at `index` of `list` (as shown, `id` itself left out of the count):
 * halfway between the neighbours, or one step past the end it went to.
 */
export function positionAt (list: Task[], id: number, index: number): number {
  const rest = list.filter(task => task.id !== id)
  const before = rest[index - 1]
  const after = rest[index]

  if (before && after) {
    return (sortKey(before) + sortKey(after)) / 2
  }

  if (after) {
    return sortKey(after) - 1
  }

  return before ? sortKey(before) + 1 : 0
}

/** Insertion index among `list` (without `id`) for a drop on `targetId`, before or after it. */
export function dropIndex (list: Task[], id: number, targetId: number, after: boolean): number {
  const index = list.filter(task => task.id !== id).findIndex(task => task.id === targetId)

  return index === -1 ? list.length : index + (after ? 1 : 0)
}

const PRIORITY_RANK: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2, none: 3 }

/** A task with a date or a priority has its place – only the rest is ordered by hand. */
export function isAutoSorted (task: Task): boolean {
  return task.due !== null || task.priority !== 'none'
}

/**
 * Lists: dated tasks first – by day, then time (timed before untimed on the same day), then priority;
 * then undated ones with a priority, highest first. Ties keep the manual order.
 */
export function compareAuto (a: Task, b: Task): number {
  return (a.due ?? '9999').localeCompare(b.due ?? '9999')
    || (a.time ?? '99').localeCompare(b.time ?? '99')
    || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    || compareManual(a, b)
}

/**
 * Splits a list into the self-ordering part (sorted) and the hand-ordered rest (in manual order).
 * Tasks in progress lead the list – whatever their date or priority, they are what's being worked on.
 */
export function splitByOrder (tasks: Task[]): { auto: Task[], manual: Task[] } {
  const doing = tasks.filter(task => task.status === 'doing').toSorted(compareAuto)
  const rest = tasks.filter(task => task.status !== 'doing')

  return {
    auto: [...doing, ...rest.filter(task => isAutoSorted(task)).toSorted(compareAuto)],
    manual: rest.filter(task => !isAutoSorted(task)).toSorted(compareManual),
  }
}

/**
 * What a duplicate of `task` starts with: everything but its identity and history – a done task comes back
 * as "to do" – placed right after the original in the manual order of `all`.
 */
export function duplicateOf (task: Task, all: Task[]): Omit<TaskInput, 'title'> & { title: string } {
  const sorted = all.toSorted(compareManual)
  const next = sorted[sorted.findIndex(item => item.id === task.id) + 1]
  const key = sortKey(task)

  return {
    title: task.title,
    notes: task.notes,
    status: task.status === 'done' ? 'todo' : task.status,
    due: task.due,
    time: task.time,
    duration: task.duration,
    priority: task.priority,
    projectId: task.projectId,
    position: next ? (key + sortKey(next)) / 2 : key + 1,
  }
}
