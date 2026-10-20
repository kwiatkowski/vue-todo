/** Shapes of the wp-plugin-todo REST API (todo/v1). */

export type Priority = 'none' | 'low' | 'medium' | 'high'

/** Board column; `done` on a task always equals `status === 'done'`. */
export type Status = 'todo' | 'doing' | 'done'

/** Category grouping projects, e.g. "Praca", "Dom". */
export interface Area {
  id: number
  name: string
  /** the user's order; null = never placed (after the placed ones, by name) */
  position: number | null
  /** key from AREA_ICONS; null = guessed from the name */
  icon: string | null
}

export interface Project {
  id: number
  name: string
  color: string
  areaId: number | null
  /** the user's order within the area; null = never placed (after the placed ones, by name) */
  position: number | null
}

export interface Task {
  id: number
  title: string
  notes: string
  done: boolean
  status: Status
  /** ISO 8601 (UTC) */
  completedAt: string | null
  /** day, YYYY-MM-DD */
  due: string | null
  /** start on the due day, HH:MM */
  time: string | null
  /** minutes */
  duration: number | null
  priority: Priority
  projectId: number | null
  /** the user's order; null = never moved (ordered by creation) */
  position: number | null
  /** ISO 8601 (UTC) */
  createdAt: string
  /** ISO 8601 (UTC) */
  updatedAt: string
}

export type TaskInput = Partial<Pick<Task, 'title' | 'notes' | 'done' | 'status' | 'due' | 'time' | 'duration' | 'priority' | 'projectId' | 'position'>>

export type ProjectInput = Partial<Pick<Project, 'name' | 'color' | 'areaId'>>

export type AreaInput = Partial<Pick<Area, 'name' | 'icon'>>

/** Which tasks a list or board shows – one page component handles all of them. */
export type TaskView
  = | { kind: 'inbox' }
    | { kind: 'today' }
    | { kind: 'tomorrow' }
    | { kind: 'week' }
    | { kind: 'next-week' }
    | { kind: 'upcoming' }
    | { kind: 'all' }
    | { kind: 'done' }
    | { kind: 'area', id: number }
    | { kind: 'project', id: number }

export type Layout = 'list' | 'board'
