import { datesBetween } from "../time"

/**
 * Paying for part of a period.
 *
 * Somebody who joins on the 15th is owed half a month, and there are
 * three defensible ways to say what half a month is. They give
 * different answers on the same facts, which is why the method is a
 * property of the pay group and shown on the payslip rather than being
 * a decision buried in a formula.
 *
 * Calendar days counts every day, so a February joiner is paid a larger
 * daily slice than a March one. Working days counts only the days the
 * company expects work, so a week of public holidays costs nothing.
 * The fixed thirtieth treats every month as thirty days, which is what
 * many Ghanaian contracts say in as many words.
 */

export type ProrationMethod = "calendar_days" | "working_days" | "thirtieths"

export const PRORATION_LABEL: Record<ProrationMethod, string> = {
  calendar_days: "Calendar days",
  working_days: "Working days",
  thirtieths: "Thirtieths",
}

export const PRORATION_BLURB: Record<ProrationMethod, string> = {
  calendar_days:
    "Every day in the month counts, so the daily slice changes with the length of the month.",
  working_days:
    "Only days the company expects work. A week of public holidays costs nothing.",
  thirtieths:
    "Every month is treated as thirty days, whatever its length. Common in written contracts.",
}

export interface Period {
  start: string
  end: string
}

export interface WorkingCalendar {
  /** 0 is Sunday, 6 is Saturday. */
  workingWeekdays: number[]
  /** ISO dates the company does not expect work. */
  publicHolidays: string[]
}

/** Days this person was employed within the period, and the period's own. */
export interface ProrationBasis {
  worked: number
  inPeriod: number
  /** The fraction to multiply a full period's pay by. */
  fraction: number
  /** "16 of 31 days", for the payslip. */
  summary: string
}

function countsAsWorking(iso: string, calendar: WorkingCalendar) {
  if (calendar.publicHolidays.includes(iso)) return false
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return calendar.workingWeekdays.includes(weekday)
}

/** The days of a period somebody was actually employed for. */
export function employedDates(
  period: Period,
  employment: { startDate: string; endDate?: string | null }
): string[] {
  return datesBetween(period.start, period.end).filter((iso) => {
    if (iso < employment.startDate) return false
    if (employment.endDate && iso > employment.endDate) return false
    return true
  })
}

/**
 * How much of a period somebody is owed.
 *
 * A full period always returns a fraction of exactly one, whatever the
 * method, so a normal month never picks up a rounding error on its way
 * through the proration code.
 */
export function prorationFor(
  method: ProrationMethod,
  period: Period,
  employment: { startDate: string; endDate?: string | null },
  calendar: WorkingCalendar
): ProrationBasis {
  const all = datesBetween(period.start, period.end)
  const employed = employedDates(period, employment)
  const whole = employed.length === all.length

  if (method === "thirtieths") {
    // Thirtieths count the employed calendar days but always divide by
    // thirty, so a 31-day month pays 31/30 to somebody employed
    // throughout — which is why a whole period short-circuits.
    const worked = whole ? 30 : Math.min(30, employed.length)
    return basis(worked, 30)
  }

  if (method === "working_days") {
    const inPeriod = all.filter((iso) => countsAsWorking(iso, calendar)).length
    const worked = employed.filter((iso) =>
      countsAsWorking(iso, calendar)
    ).length
    // A period with no working days at all cannot be divided.
    if (inPeriod === 0) return basis(0, 0)
    return basis(worked, inPeriod)
  }

  return basis(employed.length, all.length)
}

function basis(worked: number, inPeriod: number): ProrationBasis {
  const fraction = inPeriod === 0 ? 0 : worked / inPeriod
  return {
    worked,
    inPeriod,
    fraction,
    summary: `${worked} of ${inPeriod} day${inPeriod === 1 ? "" : "s"}`,
  }
}

/** A full period's amount reduced to the part that was worked. */
export function prorate(amount: number, basis: ProrationBasis): number {
  return Math.round(amount * basis.fraction * 100) / 100
}

/** Whether this period is a partial one, and therefore worth saying so. */
export function isPartial(basis: ProrationBasis): boolean {
  return basis.worked < basis.inPeriod
}
