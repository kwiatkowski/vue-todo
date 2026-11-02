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
  /** first day of a task spanning several days, YYYY-MM-DD; null = only on `due` */
  start: string | null
  /** day, YYYY-MM-DD – the last one when the task spans several */
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
  /** how many comments it has */
  comments: number
}

/** A comment under a task – plain text, line breaks kept. */
export interface TaskComment {
  id: number
  text: string
  /** ISO 8601 (UTC) */
  createdAt: string
  author: string | null
  /** ISO 8601 (UTC) – the last edit; null = never edited */
  editedAt: string | null
}

/** When a task is – its day (and span), time and duration, as one change in the history. */
export interface TaskWhen {
  start: string | null
  due: string | null
  time: string | null
  duration: number | null
}

/**
 * One change of a field in a task's history; `notes` only says it changed (both null), `projectId` holds names,
 * `when` the day, span, time and duration together (start, due, time and duration – saves from before it).
 */
export interface TaskChange {
  field: 'title' | 'status' | 'projectId' | 'priority' | 'when' | 'start' | 'due' | 'time' | 'duration' | 'notes'
  from: string | number | TaskWhen | null
  to: string | number | TaskWhen | null
}

/** One save of a task: its creation, what one edit changed, or a comment added or edited (`text` – its start). */
export interface TaskEvent {
  id: number
  type: 'created' | 'changed' | 'commented' | 'commentEdited'
  /** ISO 8601 (UTC) */
  createdAt: string
  author: string | null
  changes: TaskChange[]
  text: string | null
}

/** oldest first */
export interface TaskActivity {
  comments: TaskComment[]
  history: TaskEvent[]
}

export type TaskInput = Partial<Pick<Task, 'title' | 'notes' | 'done' | 'status' | 'start' | 'due' | 'time' | 'duration' | 'priority' | 'projectId' | 'position'>>

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
