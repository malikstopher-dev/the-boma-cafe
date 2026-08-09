// Mon–Sun week helpers used by Daily Stock Input, the Weekly view
// and the Gas tracker (Week 1 = the week containing the 1st Monday
// of the year; days before it fold into Week 1).

export const MS_PER_DAY = 86_400_000
export const MS_PER_WEEK = 7 * MS_PER_DAY

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Monday (00:00) of the week containing the given date. */
export function mondayOf(d: Date): Date {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7 // 0 = Monday
  x.setDate(x.getDate() - dow)
  return x
}

/** First Monday on or before Jan 1 of the year. */
export function firstMondayOfYear(year: number): Date {
  const jan1 = new Date(year, 0, 1)
  return mondayOf(jan1)
}

/** Week number (1-based, Mon–Sun) for a date. */
export function weekNumber(d: Date): number {
  const x = mondayOf(d)
  const year = x.getFullYear()
  const firstMonday = firstMondayOfYear(year)
  const diff = x.getTime() - firstMonday.getTime()
  const num = Math.floor(diff / MS_PER_WEEK) + 1
  return Math.max(1, num)
}

/** Last valid week number for a year. */
export function lastWeekOfYear(year: number): number {
  return Math.max(1, weekNumber(new Date(year, 11, 31)))
}

/** ISO date strings (YYYY-MM-DD) for the Mon–Sun window of a week. */
export function weekRange(year: number, week: number): { start: string; end: string } {
  const firstMonday = firstMondayOfYear(year)
  const start = new Date(firstMonday.getTime() + (week - 1) * MS_PER_WEEK)
  const end = new Date(start.getTime() + 6 * MS_PER_DAY)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Week 3 · 13–19 Jan" */
export function weekLabel(year: number, week: number): string {
  const { start, end } = weekRange(year, week)
  const s = new Date(start + 'T00:00:00Z')
  const e = new Date(end + 'T00:00:00Z')
  return `Week ${week} · ${s.getUTCDate()} ${MONTHS_SHORT[s.getUTCMonth()]} – ${e.getUTCDate()} ${MONTHS_SHORT[e.getUTCMonth()]}`
}

/** Current week number for "today". */
export function currentWeekNumber(): number {
  return weekNumber(new Date())
}