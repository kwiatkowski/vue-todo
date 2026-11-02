import type { Priority, Status, TaskChange, TaskWhen } from '@/types'
import { addDays, parseIsoDay, today } from './date'
import { formatRange } from './day'
import { priorityTitle, STATUSES } from './tasks'

type Field = Exclude<TaskChange['field'], 'when' | 'start' | 'due' | 'time' | 'duration'>

const FIELD_LABELS: Record<Field, string> = {
  title: 'Tytuł',
  status: 'Status',
  projectId: 'Projekt',
  priority: 'Priorytet',
  notes: 'Notatki',
}

/** the fields that make the task's "when" – the history shows them as one line, as the dialog sets them together */
const WHEN_FIELDS = new Set<TaskChange['field']>(['start', 'due', 'time', 'duration'])

const day = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })
const dayYear = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
const clock = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' })

/**
 * The task's day in words, as its row shows it: "2 lis 2026", "2 lis 2026, 9:00–9:30", "2 lis – 4 lis 2026";
 * none – "bez terminu".
 */
export function formatWhen (when: TaskWhen): string {
  if (!when.due) {
    return 'bez terminu'
  }

  const due = parseIsoDay(when.due)

  if (when.start) {
    const start = parseIsoDay(when.start)

    return `${(start.getFullYear() === due.getFullYear() ? day : dayYear).format(start)} – ${dayYear.format(due)}`
  }

  return when.time ? `${dayYear.format(due)}, ${formatRange(when.time, when.duration)}` : dayYear.format(due)
}

/** a value of the field in words; null – it had none */
function valueOf (field: Field, value: TaskChange['from']): string | null {
  if (value === null || value === '' || typeof value === 'object') {
    return null
  }

  switch (field) {
    case 'status': {
      return STATUSES.find(item => item.value === value as Status)?.title ?? String(value)
    }
    case 'priority': {
      return priorityTitle(value as Priority) || String(value)
    }
    default: {
      return String(value)
    }
  }
}

export interface ChangeLine {
  label: string
  /** null – nothing to strike out (the notes only say they changed) */
  from: string | null
  to: string
}

/**
 * One save's changes in words – the field and "before → after", a missing value as a dash, the notes only as
 * changed. The day, its span, time and duration make one "Termin" line; saves from before the history kept them
 * together come as separate fields and are joined here (what they didn't change counts as empty).
 */
export function describeChanges (changes: TaskChange[]): ChangeLine[] {
  const lines: ChangeLine[] = []
  let older: { from: TaskWhen, to: TaskWhen } | null = null

  for (const change of changes) {
    if (change.field === 'when') {
      const from = change.from as TaskWhen | null
      const to = change.to as TaskWhen | null
      lines.push({ label: 'Termin', from: formatWhen(from ?? emptyWhen()), to: formatWhen(to ?? emptyWhen()) })
      continue
    }

    if (WHEN_FIELDS.has(change.field)) {
      if (!older) {
        older = { from: emptyWhen(), to: emptyWhen() }
        lines.push({ label: 'Termin', from: '', to: '' })
      }

      const key = change.field as keyof TaskWhen
      Object.assign(older.from, { [key]: change.from })
      Object.assign(older.to, { [key]: change.to })
      continue
    }

    const field = change.field as Field
    const label = FIELD_LABELS[field] ?? field

    if (field === 'notes') {
      lines.push({ label, from: null, to: 'zmienione' })
      continue
    }

    // an empty project is the inbox
    const empty = field === 'projectId' ? 'Do posortowania' : '—'
    lines.push({ label, from: valueOf(field, change.from) ?? empty, to: valueOf(field, change.to) ?? empty })
  }

  if (older) {
    const line = lines.find(item => item.label === 'Termin' && item.from === '')

    if (line) {
      // a one-day task with a start of its own (older saves): the start alone, read as the day
      const fix = (when: TaskWhen): TaskWhen => when.start && !when.due ? { ...when, due: when.start, start: null } : when
      line.from = formatWhen(fix(older.from))
      line.to = formatWhen(fix(older.to))
    }
  }

  return lines
}

function emptyWhen (): TaskWhen {
  return { start: null, due: null, time: null, duration: null }
}

/** "dziś, 10:22", "wczoraj, 09:31", "2 lis 2026, 09:31" – in local time */
export function formatMoment (iso: string, now = new Date()): string {
  const date = new Date(iso)
  const time = clock.format(date)
  const which = today(date)

  if (which === today(now)) {
    return `dziś, ${time}`
  }

  if (which === addDays(today(now), -1)) {
    return `wczoraj, ${time}`
  }

  return `${dayYear.format(date)}, ${time}`
}

/** the full date for a tooltip: "2 lis 2026, 10:22" */
export function formatMomentFull (iso: string): string {
  const date = new Date(iso)

  return `${dayYear.format(date)}, ${clock.format(date)}`
}
