import type { Priority, Status, TaskChange } from '@/types'
import { parseIsoDay } from './date'
import { formatDuration } from './day'
import { priorityTitle, STATUSES } from './tasks'

const FIELD_LABELS: Record<TaskChange['field'], string> = {
  title: 'Tytuł',
  status: 'Status',
  projectId: 'Projekt',
  priority: 'Priorytet',
  start: 'Od',
  due: 'Termin',
  time: 'Godzina',
  duration: 'Czas trwania',
  notes: 'Notatki',
}

const day = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
const moment = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** a value of the field in words; null – it had none */
function valueOf (field: TaskChange['field'], value: TaskChange['from']): string | null {
  if (value === null || value === '') {
    return null
  }

  switch (field) {
    case 'status': {
      return STATUSES.find(item => item.value === value as Status)?.title ?? String(value)
    }
    case 'priority': {
      return priorityTitle(value as Priority) || String(value)
    }
    case 'start':
    case 'due': {
      return day.format(parseIsoDay(String(value)))
    }
    case 'duration': {
      return formatDuration(Number(value))
    }
    default: {
      return String(value)
    }
  }
}

/** One change in words: the field and "before → after" – a missing value as a dash, the notes only as changed. */
export function describeChange (change: TaskChange): { label: string, from: string | null, to: string | null } {
  const label = FIELD_LABELS[change.field] ?? change.field

  if (change.field === 'notes') {
    return { label, from: null, to: 'zmienione' }
  }

  // an empty project is the inbox
  const empty = change.field === 'projectId' ? 'Do posortowania' : '—'

  return { label, from: valueOf(change.field, change.from) ?? empty, to: valueOf(change.field, change.to) ?? empty }
}

/** "2 lis 2026, 14:05" in local time */
export function formatMoment (iso: string): string {
  return moment.format(new Date(iso))
}
