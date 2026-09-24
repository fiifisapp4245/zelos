/**
 * Clock and calendar arithmetic, with no opinion about attendance or
 * schedules. It sits below both so either can use it without importing
 * the other.
 *
 * Times are "HH:mm" in local time and dates are "yyyy-mm-dd". Nothing here
 * touches the wall clock, so every result is the same on every run.
 */

export function toMinutes(hhmm: string) {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
}

export function toHhmm(minutes: number) {
  const m = Math.max(0, Math.round(minutes))
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

/** "−0h 42m", the form the variance columns use. */
export function formatHours(hours: number, { signed = false } = {}) {
  const neg = hours < 0
  const total = Math.round(Math.abs(hours) * 60)
  const text = `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`
  if (!signed) return text
  if (total === 0) return "0h 00m"
  return `${neg ? "−" : "+"}${text}`
}

/** 1 = Monday … 7 = Sunday, so week arithmetic reads the way people speak. */
export function isoWeekday(iso: string) {
  const d = new Date(`${iso}T00:00:00`).getDay()
  return d === 0 ? 7 : d
}

export function datesBetween(start: string, end: string) {
  const out: string[] = []
  const d = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The Monday of the week a date falls in. */
export function startOfWeek(iso: string) {
  return addDays(iso, -(isoWeekday(iso) - 1))
}

/**
 * Minutes between the end of one day's work and the start of the next,
 * where the shift may run past midnight.
 */
export function restMinutesBetween(
  first: { date: string; end: string },
  second: { date: string; start: string }
) {
  const dayGap =
    (new Date(`${second.date}T00:00:00`).getTime() -
      new Date(`${first.date}T00:00:00`).getTime()) /
    86_400_000
  return dayGap * 24 * 60 + toMinutes(second.start) - toMinutes(first.end)
}
