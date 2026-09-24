import type { Employee, LeaveRequest } from "../types"
import { holidaysBetween } from "../fixtures/ghanaHolidays"
import {
  expectedFor,
  expectedHours,
  type ScheduleInput,
} from "../schedules/derive"
import { toMinutes } from "../time"
import type {
  ClockEvent,
  DayCode,
  DayRecord,
  ExceptionKind,
  ExceptionResolution,
  TimeAdjustment,
} from "./types"

/* ── Time helpers ────────────────────────────────────────────────────── */

// Re-exported so attendance code has one import for reading a day, and the
// helpers themselves stay below both modules in lib/time.
export {
  datesBetween,
  formatHours,
  isoWeekday,
  toHhmm,
  toMinutes,
} from "../time"

/* ── Inputs ──────────────────────────────────────────────────────────── */

/**
 * Attendance reads schedules; it does not hold its own idea of expected
 * hours. Everything in ScheduleInput comes straight from that module.
 */
export interface AttendanceInput extends ScheduleInput {
  employees: Employee[]
  events: ClockEvent[]
  adjustments: TimeAdjustment[]
  leave: LeaveRequest[]
}

/**
 * The reading after any approved correction. The original is kept on the
 * record so both can be shown; this is only what the hours count from.
 */
function effectiveTimes(event: ClockEvent | null, applied: TimeAdjustment[]) {
  let clockIn = event?.clockIn ?? null
  let clockOut = event?.clockOut ?? null
  for (const a of applied) {
    if (a.status !== "approved") continue
    if (a.field === "clockIn" || a.field === "both") clockIn = a.correctedIn
    if (a.field === "clockOut" || a.field === "both") clockOut = a.correctedOut
  }
  return { clockIn, clockOut }
}

/**
 * One employee's day, read from the raw captures rather than stored.
 *
 * The order matters: a public holiday beats a non-working day, leave beats
 * a missing capture, and nothing is called "no record" until leave and the
 * calendar have both been ruled out.
 */
export function dayRecordFor(
  employeeId: string,
  date: string,
  input: AttendanceInput
): DayRecord {
  const employee = input.employees.find((e) => e.id === employeeId)
  const expected = employee ? expectedFor(employee, date, input) : null
  const event = input.events.find(
    (e) => e.employeeId === employeeId && e.date === date
  )
  const adjustments = input.adjustments.filter(
    (a) => a.employeeId === employeeId && a.date === date
  )
  const leaveRequest = input.leave.find(
    (l) =>
      l.employeeId === employeeId &&
      l.status === "approved" &&
      l.startDate <= date &&
      l.endDate >= date
  )
  const holiday = holidaysBetween(date, date)[0]

  const base: DayRecord = {
    employeeId,
    date,
    code: "-",
    scheduled: expected,
    clockIn: null,
    clockOut: null,
    source: null,
    branch: null,
    breakMinutes: 0,
    hours: 0,
    lateByMinutes: 0,
    overtimeHours: 0,
    varianceHours: 0,
    autoClosed: false,
    adjustments,
    leaveRequestId: leaveRequest?.id ?? null,
    leaveType: leaveRequest?.type ?? null,
    holidayName: holiday?.name ?? null,
  }

  if (holiday) return { ...base, code: "H" }
  if (!expected) return base
  if (leaveRequest) return { ...base, code: "V" }
  if (!event || (!event.clockIn && !event.clockOut))
    return { ...base, code: "N" }

  const { clockIn, clockOut } = effectiveTimes(event, adjustments)
  const scheduledStart = toMinutes(expected.start)
  const scheduledMinutes = expectedHours(expected) * 60

  const workedMinutes =
    clockIn && clockOut
      ? Math.max(
          0,
          toMinutes(clockOut) - toMinutes(clockIn) - event.breakMinutes
        )
      : 0
  const hours = Math.round((workedMinutes / 60) * 100) / 100

  // Against this person's own start, plus whatever grace their schedule
  // allows — never a single time for the whole company.
  const lateBy = clockIn
    ? Math.max(0, toMinutes(clockIn) - scheduledStart - expected.graceMinutes)
    : 0

  // Remote is a property of where the capture came from, not of the clock.
  const remote = event.source === "web" && event.branch === "Remote"

  return {
    ...base,
    code: lateBy > 0 ? "L" : remote ? "R" : "P",
    clockIn,
    clockOut,
    source: event.source,
    branch: event.branch,
    breakMinutes: event.breakMinutes,
    hours,
    lateByMinutes: lateBy,
    overtimeHours:
      Math.round(Math.max(0, (workedMinutes - scheduledMinutes) / 60) * 100) /
      100,
    varianceHours:
      Math.round(((workedMinutes - scheduledMinutes) / 60) * 100) / 100,
    autoClosed: Boolean(event.autoClosed),
  }
}

export function dayRecordsFor(
  employeeIds: string[],
  dates: string[],
  input: AttendanceInput
): DayRecord[] {
  return employeeIds.flatMap((id) =>
    dates.map((date) => dayRecordFor(id, date, input))
  )
}

/* ── Metrics ─────────────────────────────────────────────────────────── */

const PRESENT: DayCode[] = ["P", "R", "L"]

/** Days the person was expected: working days that are not holidays or leave. */
export function scheduledDays(records: DayRecord[]) {
  return records.filter(
    (r) => r.code !== "-" && r.code !== "H" && r.code !== "V"
  )
}

export interface AttendanceMetrics {
  attendanceRate: number
  hoursLogged: number
  lateArrivals: number
  noRecordDays: number
  scheduledDayCount: number
}

export function metricsFor(records: DayRecord[]): AttendanceMetrics {
  const expected = scheduledDays(records)
  const present = expected.filter((r) => PRESENT.includes(r.code))
  return {
    attendanceRate: expected.length
      ? Math.round((present.length / expected.length) * 100)
      : 0,
    hoursLogged: Math.round(records.reduce((n, r) => n + r.hours, 0) * 10) / 10,
    lateArrivals: records.filter((r) => r.code === "L").length,
    noRecordDays: records.filter((r) => r.code === "N").length,
    scheduledDayCount: expected.length,
  }
}

export function totalHours(records: DayRecord[]) {
  return Math.round(records.reduce((n, r) => n + r.hours, 0) * 10) / 10
}

export function scheduledHours(records: DayRecord[]) {
  const total = records.reduce(
    // A holiday or a leave day is not hours anyone was expected to work.
    (n, r) =>
      r.scheduled && r.code !== "H" && r.code !== "V"
        ? n + expectedHours(r.scheduled)
        : n,
    0
  )
  return Math.round(total * 10) / 10
}

/* ── Exceptions ──────────────────────────────────────────────────────── */

export interface ExceptionItem {
  key: string
  kind: ExceptionKind
  employeeId: string
  date: string
  detail: string
}

export interface ExceptionGroup {
  kind: ExceptionKind
  employeeId: string
  items: ExceptionItem[]
}

export const EXCEPTION_LABEL: Record<ExceptionKind, string> = {
  noRecord: "No record",
  late: "Late",
  autoClosed: "Auto-closed",
  outsideSchedule: "Clock-in outside schedule",
}

/** Anything a person has to look at, one entry per day per kind. */
export function exceptionsFrom(records: DayRecord[]): ExceptionItem[] {
  const out: ExceptionItem[] = []
  const add = (kind: ExceptionKind, r: DayRecord, detail: string) =>
    out.push({
      key: `${kind}:${r.employeeId}:${r.date}`,
      kind,
      employeeId: r.employeeId,
      date: r.date,
      detail,
    })

  for (const r of records) {
    if (r.code === "N")
      add("noRecord", r, "Nothing captured and no leave on file")
    if (r.code === "L")
      add("late", r, `${r.lateByMinutes} minutes past the grace period`)
    if (r.autoClosed) add("autoClosed", r, "Closed by the system, no clock-out")
    if (
      r.scheduled &&
      r.clockIn &&
      toMinutes(r.clockIn) < toMinutes(r.scheduled.start) - 120
    ) {
      add(
        "outsideSchedule",
        r,
        `Clocked in at ${r.clockIn}, well before ${r.scheduled.start}`
      )
    }
  }
  return out
}

/**
 * Grouped by kind then person, so someone late four times is one line
 * rather than four — a queue of patterns, not a list of rows.
 */
export function groupExceptions(items: ExceptionItem[]): ExceptionGroup[] {
  const map = new Map<string, ExceptionGroup>()
  for (const item of items) {
    const id = `${item.kind}:${item.employeeId}`
    const existing = map.get(id)
    if (existing) existing.items.push(item)
    else
      map.set(id, {
        kind: item.kind,
        employeeId: item.employeeId,
        items: [item],
      })
  }
  return [...map.values()].sort((a, b) => b.items.length - a.items.length)
}

export function isResolved(
  item: ExceptionItem,
  resolutions: ExceptionResolution[]
) {
  return resolutions.some((r) => r.key === item.key)
}

/** A person's open exceptions summarised: "late 1× · no record 1×". */
export function summariseGroups(groups: ExceptionGroup[]) {
  return groups
    .map((g) => `${EXCEPTION_LABEL[g.kind].toLowerCase()} ${g.items.length}×`)
    .join(" · ")
}
