/** Due dates are calendar days (YYYY-MM-DD) in the user's local time – no time zones involved. */

export function toIsoDay (date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

export function parseIsoDay (iso: string): Date {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)

  return new Date(year, month - 1, day)
}

export function today (now = new Date()): string {
  return toIsoDay(now)
}

export function addDays (iso: string, days: number): string {
  const date = parseIsoDay(iso)
  date.setDate(date.getDate() + days)

  return toIsoDay(date)
}

const weekday = new Intl.DateTimeFormat('pl-PL', { weekday: 'long' })
const dayMonth = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })

/** "Dziś", "Jutro", "Wczoraj", "piątek" (within a week), "12 lis", "12 lis 2027". */
export function formatDue (iso: string, now = new Date()): string {
  const base = today(now)

  if (iso === base) {
    return 'Dziś'
  }

  if (iso === addDays(base, 1)) {
    return 'Jutro'
  }

  if (iso === addDays(base, -1)) {
    return 'Wczoraj'
  }

  const date = parseIsoDay(iso)

  if (iso > base && iso < addDays(base, 7)) {
    return weekday.format(date)
  }

  return date.getFullYear() === now.getFullYear() ? dayMonth.format(date) : dayMonthYear.format(date)
}

const longDay = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
const longDayYear = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** "piątek, 16 października" (with the year outside the current one). */
export function formatLongDay (iso: string, now = new Date()): string {
  const date = parseIsoDay(iso)

  return (date.getFullYear() === now.getFullYear() ? longDay : longDayYear).format(date)
}

export function isIsoDay (value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toIsoDay(parseIsoDay(value)) === value
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days from today to `iso` – negative in the past. */
export function daysFrom (iso: string, now = new Date()): number {
  return Math.round((parseIsoDay(iso).getTime() - parseIsoDay(today(now)).getTime()) / DAY_MS)
}

/**
 * Due date for the list's right-hand column, two short lines:
 * "Dziś" / "Jutro" / "Wczoraj" / "Poniedziałek" / "3 dni temu" / "12 lis", and below it the time,
 * or the date when the first line is relative and further than a day away.
 */
export function formatDueParts (iso: string, now = new Date()): { day: string, date: string | null } {
  const diff = daysFrom(iso, now)
  const date = parseIsoDay(iso)
  const short = date.getFullYear() === now.getFullYear() ? dayMonth.format(date) : dayMonthYear.format(date)

  if (diff === 0) {
    return { day: 'Dziś', date: null }
  }

  if (diff === 1) {
    return { day: 'Jutro', date: null }
  }

  if (diff === -1) {
    return { day: 'Wczoraj', date: null }
  }

  if (diff < -1 && diff > -7) {
    return { day: `${-diff} dni temu`, date: short }
  }

  if (diff > 1 && diff < 7) {
    const name = weekday.format(date)

    return { day: name.charAt(0).toUpperCase() + name.slice(1), date: short }
  }

  return { day: short, date: null }
}

/** Monday of the week `iso` is in – Polish weeks start on Monday. */
export function startOfWeek (iso: string): string {
  const weekday = (parseIsoDay(iso).getDay() + 6) % 7 // Monday 0 … Sunday 6

  return addDays(iso, -weekday)
}

/** The seven days, Monday to Sunday, of the week `iso` is in. */
export function weekDays (iso: string): string[] {
  const monday = startOfWeek(iso)

  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

const shortWeekday = new Intl.DateTimeFormat('pl-PL', { weekday: 'short' })
const monthYear = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' })

/** "pon." – the weekday above a column of the week view. */
export function formatShortWeekday (iso: string): string {
  return shortWeekday.format(parseIsoDay(iso))
}

/** "13–19 października 2026", or "27 października – 2 listopada 2026" across months. */
export function formatWeekRange (iso: string): string {
  const days = weekDays(iso)
  const first = parseIsoDay(days[0]!)
  const last = parseIsoDay(days[6]!)

  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} ${monthYear.format(last).replace(/^(\S+)/, match => genitive(match))}`
  }

  const left = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', ...(first.getFullYear() === last.getFullYear() ? {} : { year: 'numeric' }) }).format(first)
  const right = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(last)

  return `${left} – ${right}`
}

/** "październik" → "października" – Intl gives the nominative when the day isn't in the same format. */
function genitive (month: string): string {
  const forms: Record<string, string> = {
    styczeń: 'stycznia', luty: 'lutego', marzec: 'marca', kwiecień: 'kwietnia', maj: 'maja', czerwiec: 'czerwca',
    lipiec: 'lipca', sierpień: 'sierpnia', wrzesień: 'września', październik: 'października', listopad: 'listopada', grudzień: 'grudnia',
  }

  return forms[month] ?? month
}
