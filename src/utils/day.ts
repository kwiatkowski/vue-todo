import type { Task } from '@/types'

/** Times are "HH:MM" on the task's due day, local time. */

export const DEFAULT_DURATION = 30

export const DURATIONS: { value: number, title: string }[] = [
  { value: 15, title: '15 min' },
  { value: 30, title: '30 min' },
  { value: 45, title: '45 min' },
  { value: 60, title: '1 h' },
  { value: 90, title: '1,5 h' },
  { value: 120, title: '2 h' },
  { value: 180, title: '3 h' },
  { value: 240, title: '4 h' },
]

export function toMinutes (time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)

  return hours * 60 + minutes
}

/** Clamped to the day: 0 → "00:00", 1439 → "23:59". */
export function fromMinutes (total: number): string {
  const clamped = Math.min(Math.max(Math.round(total), 0), 24 * 60 - 1)

  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

export function snap (minutes: number, step = 15): number {
  return Math.round(minutes / step) * step
}

/** "9:30–10:15" */
export function formatRange (time: string, duration: number | null): string {
  const start = toMinutes(time)
  const end = start + (duration ?? DEFAULT_DURATION)
  const short = (value: string) => value.replace(/^0(\d)/, '$1')

  return `${short(fromMinutes(start))}–${short(fromMinutes(Math.min(end, 24 * 60 - 1)))}`
}

export function formatDuration (minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export interface PlacedTask {
  task: Task
  start: number
  end: number
  /** column within its group of overlapping tasks */
  column: number
  /** number of columns in that group */
  columns: number
}

/**
 * Calendar layout: tasks that overlap in time sit side by side. Each cluster of overlapping tasks
 * gets as many columns as it needs at its busiest moment; a task takes the first free column.
 */
export function layoutDay (tasks: Task[]): PlacedTask[] {
  const items = tasks
    .filter(task => task.time !== null)
    .map(task => {
      const start = toMinutes(task.time!)

      return { task, start, end: Math.min(start + (task.duration ?? DEFAULT_DURATION), 24 * 60), column: 0, columns: 1 }
    })
    .toSorted((a, b) => a.start - b.start || b.end - a.end)

  let cluster: PlacedTask[] = []
  let clusterEnd = -1
  let columnEnds: number[] = []

  const close = () => {
    for (const item of cluster) {
      item.columns = columnEnds.length
    }

    cluster = []
    columnEnds = []
  }

  for (const item of items) {
    if (item.start >= clusterEnd) {
      close()
    }

    let column = columnEnds.findIndex(end => end <= item.start)

    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(item.end)
    } else {
      columnEnds[column] = item.end
    }

    item.column = column
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }

  close()

  return items
}
