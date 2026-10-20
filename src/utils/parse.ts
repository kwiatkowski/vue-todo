import type { Priority, TaskInput } from '@/types'
import { addDays, today } from './date'

const DAYS: Record<string, number> = { dziś: 0, dzis: 0, jutro: 1, pojutro: 2 }
const BANGS: Record<string, Priority> = { '!': 'low', '!!': 'medium', '!!!': 'high' }

/**
 * Quick add shorthand, whole words anywhere in the text:
 * "dziś" / "jutro" / "pojutro", a time "18:30" or "o 18", and "!" / "!!" / "!!!" for priority.
 * Day words count from `day` (today). A time without a day leaves `due` out – the caller decides.
 */
export function parseQuickAdd (text: string, day = today()): TaskInput & { title: string } {
  const result: TaskInput = {}
  const words: string[] = []
  const tokens = text.trim().split(/\s+/)

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!
    const lower = token.toLowerCase()
    const time = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/.exec(token)
    const next = tokens[index + 1]

    if (lower in DAYS && result.due === undefined) {
      result.due = addDays(day, DAYS[lower]!)
    } else if (time && result.time === undefined) {
      result.time = `${time[1]!.padStart(2, '0')}:${time[2]}`
    } else if (lower === 'o' && next && /^(?:[01]?\d|2[0-3])$/.test(next) && result.time === undefined) {
      result.time = `${next.padStart(2, '0')}:00`
      index++
    } else if (token in BANGS && result.priority === undefined) {
      result.priority = BANGS[token]
    } else {
      words.push(token)
    }
  }

  return { ...result, title: words.join(' ') }
}
