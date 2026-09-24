import type { Employee } from "../types"
import { isoWeekday, toMinutes } from "../time"
import type {
  Expectation,
  PatternAssignment,
  PatternDay,
  Shift,
  WorkPattern,
} from "./types"

export interface ScheduleInput {
  patterns: WorkPattern[]
  assignments: PatternAssignment[]
  shifts: Shift[]
  /** Settings → Time & attendance, used where a pattern sets no grace. */
  defaultGraceMinutes: number
}

/* ── Reading a pattern ───────────────────────────────────────────────── */

const DAY_NAME = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function workingWeekdays(pattern: WorkPattern) {
  return pattern.days.map((d) => d.weekday).sort((a, b) => a - b)
}

export function dayOfPattern(
  pattern: WorkPattern,
  weekday: number
): PatternDay | undefined {
  return pattern.days.find((d) => d.weekday === weekday)
}

/** Paid hours in one day of a pattern: the span, less an unpaid break. */
export function hoursOfDay(pattern: WorkPattern, weekday: number) {
  const day = dayOfPattern(pattern, weekday)
  if (!day) return 0
  const span = toMinutes(day.end) - toMinutes(day.start)
  return (span - (pattern.breakPaid ? 0 : pattern.breakMinutes)) / 60
}

export function weeklyHours(pattern: WorkPattern) {
  const total = pattern.days.reduce(
    (n, d) => n + hoursOfDay(pattern, d.weekday),
    0
  )
  return Math.round(total * 100) / 100
}

/** "Mon–Fri" for a run, "Mon–Fri, Sat" where the run breaks. */
export function daysSummary(pattern: WorkPattern) {
  const days = workingWeekdays(pattern)
  if (days.length === 0) return "No working days"
  const runs: number[][] = []
  for (const d of days) {
    const last = runs[runs.length - 1]
    if (last && d === last[last.length - 1] + 1) last.push(d)
    else runs.push([d])
  }
  return runs
    .map((r) =>
      r.length > 2
        ? `${DAY_NAME[r[0]]}–${DAY_NAME[r[r.length - 1]]}`
        : r.map((d) => DAY_NAME[d]).join(", ")
    )
    .join(", ")
}

/** "Mon–Fri 08:00–17:00", or the days listed where the hours differ. */
export function hoursSummary(pattern: WorkPattern) {
  const spans = new Map<string, number[]>()
  for (const d of pattern.days) {
    const key = `${d.start}–${d.end}`
    const list = spans.get(key)
    if (list) list.push(d.weekday)
    else spans.set(key, [d.weekday])
  }
  return [...spans.entries()]
    .map(([span, days]) => {
      const sub: WorkPattern = {
        ...pattern,
        days: pattern.days.filter((d) => days.includes(d.weekday)),
      }
      return `${daysSummary(sub)} ${span}`
    })
    .join(" · ")
}

export function breakSummary(pattern: WorkPattern) {
  if (pattern.breakMinutes === 0) return "No break"
  const h = Math.floor(pattern.breakMinutes / 60)
  const m = pattern.breakMinutes % 60
  const length = h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`
  return `${length} ${pattern.breakPaid ? "paid" : "unpaid"} break`
}

/* ── Assignments ─────────────────────────────────────────────────────── */

const PRECEDENCE = { employee: 3, department: 2, branch: 1, company: 0 }

function applies(a: PatternAssignment, employee: Employee) {
  if (a.scope === "company") return true
  if (a.scope === "branch") return a.target === employee.branch
  if (a.scope === "department") return a.target === employee.department
  return a.target === employee.id
}

/**
 * Every assignment that has ever applied to someone, newest first.
 *
 * This is the versioning: an assignment is never edited, so a pattern
 * change on 7 Sept leaves August reading against the old one.
 */
export function assignmentHistoryFor(
  employee: Employee,
  assignments: PatternAssignment[]
) {
  return assignments
    .filter((a) => applies(a, employee))
    .sort(
      (a, b) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom) ||
        PRECEDENCE[b.scope] - PRECEDENCE[a.scope]
    )
}

/**
 * The assignment in force on a date.
 *
 * Individual beats department, department beats branch, branch beats the
 * company default. Within one level the latest effective date wins.
 */
export function assignmentFor(
  employee: Employee,
  date: string,
  assignments: PatternAssignment[]
): PatternAssignment | null {
  const live = assignments
    .filter((a) => applies(a, employee) && a.effectiveFrom <= date)
    .sort(
      (a, b) =>
        PRECEDENCE[b.scope] - PRECEDENCE[a.scope] ||
        b.effectiveFrom.localeCompare(a.effectiveFrom)
    )
  return live[0] ?? null
}

export function patternForDate(
  employee: Employee,
  date: string,
  input: Pick<ScheduleInput, "patterns" | "assignments">
): WorkPattern | null {
  const assignment = assignmentFor(employee, date, input.assignments)
  if (!assignment?.patternId) return null
  return input.patterns.find((p) => p.id === assignment.patternId) ?? null
}

/** True where the person is rostered rather than on fixed hours. */
export function isRostered(
  employee: Employee,
  date: string,
  assignments: PatternAssignment[]
) {
  const assignment = assignmentFor(employee, date, assignments)
  return assignment !== null && assignment.patternId === null
}

/** How many people a pattern covers on a date, at any level. */
export function assignedCount(
  patternId: string,
  employees: Employee[],
  date: string,
  assignments: PatternAssignment[]
) {
  return employees.filter(
    (e) => assignmentFor(e, date, assignments)?.patternId === patternId
  ).length
}

/* ── Shifts ──────────────────────────────────────────────────────────── */

/** A cancelled shift stays on the record but expects nothing of anyone. */
export function liveShifts(shifts: Shift[]) {
  return shifts.filter((s) => !s.cancelled)
}

export function shiftsOn(
  shifts: Shift[],
  date: string,
  employeeId?: string | null
) {
  return liveShifts(shifts).filter(
    (s) =>
      s.date === date &&
      (employeeId === undefined || s.employeeId === employeeId)
  )
}

export function shiftHours(shift: Shift) {
  const span = toMinutes(shift.end) - toMinutes(shift.start)
  return Math.round(((span - shift.breakMinutes) / 60) * 100) / 100
}

/* ── The expectation ─────────────────────────────────────────────────── */

/**
 * What was expected of one person on one day, or null where nothing was.
 *
 * A published shift wins: it is the specific commitment made to that
 * person for that day. A draft is not a commitment, so it expects
 * nothing — publishing is what makes a roster real.
 */
export function expectedFor(
  employee: Employee,
  date: string,
  input: ScheduleInput
): Expectation | null {
  const shift = shiftsOn(input.shifts, date, employee.id).find(
    (s) => s.state === "published"
  )
  if (shift) {
    return {
      start: shift.start,
      end: shift.end,
      breakMinutes: shift.breakMinutes,
      // Roster breaks come off the hours the same way an unpaid one does.
      breakPaid: false,
      graceMinutes: input.defaultGraceMinutes,
      from: "shift",
      patternId: null,
      shiftId: shift.id,
      position: shift.position,
    }
  }

  const pattern = patternForDate(employee, date, input)
  const day = pattern ? dayOfPattern(pattern, isoWeekday(date)) : undefined
  if (!pattern || !day) return null

  return {
    start: day.start,
    end: day.end,
    breakMinutes: pattern.breakMinutes,
    breakPaid: pattern.breakPaid,
    graceMinutes: pattern.graceMinutes ?? input.defaultGraceMinutes,
    from: "pattern",
    patternId: pattern.id,
    shiftId: null,
    position: null,
  }
}

/** Paid hours an expectation covers. */
export function expectedHours(e: Expectation) {
  const span = toMinutes(e.end) - toMinutes(e.start)
  return (
    Math.round(((span - (e.breakPaid ? 0 : e.breakMinutes)) / 60) * 100) / 100
  )
}

/**
 * People whose lateness and variance cannot be worked out, because
 * nothing expects them anywhere in the range: no pattern, no shifts.
 */
export function unscheduled(
  employees: Employee[],
  dates: string[],
  input: ScheduleInput
) {
  return employees.filter((e) =>
    dates.every((d) => expectedFor(e, d, input) === null)
  )
}
