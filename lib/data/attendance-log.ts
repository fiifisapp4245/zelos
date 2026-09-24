import { EMPLOYEES } from "./employees"
import { LEAVE_REQUESTS } from "./records"
import { PATTERN_ASSIGNMENTS, SHIFTS, WORK_PATTERNS } from "./schedules"
import { expectedFor } from "../schedules/derive"
import { holidaysBetween } from "../fixtures/ghanaHolidays"
import { datesBetween, toHhmm, toMinutes } from "../time"
import type {
  ClockEvent,
  ExceptionResolution,
  PayPeriod,
  TimeAdjustment,
  Timesheet,
} from "../attendance/types"

/**
 * Captured attendance for the prototype, against TODAY = 2026-09-18.
 *
 * Every figure the UI shows is derived from these raw captures — nothing
 * here is a total. A reading is never rewritten: where a time was wrong, a
 * TimeAdjustment points back at the event and both are kept.
 */

/**
 * The grace period lives with the company's attendance rules, not in the
 * code. Settings → Time → Attendance rules edits this; lateness is measured
 * against each person's own scheduled start plus this many minutes.
 */
export const ATTENDANCE_POLICY = {
  graceMinutes: 10,
  /** A day with a clock-in but no clock-out is closed at this time. */
  autoCloseAt: "23:59",
}

const ON_STRENGTH = EMPLOYEES.filter(
  (e) =>
    !["pre_hire", "resigned", "terminated", "retired"].includes(
      e.lifecycleState
    )
)

/** Deterministic pseudo-randomness, so the fixture is the same every load. */
function hash(...parts: (string | number)[]) {
  const s = parts.join("|")
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h
}

const PERIOD_DATES = datesBetween("2026-08-01", "2026-09-18")

const SCHEDULE_SOURCE = {
  patterns: WORK_PATTERNS,
  assignments: PATTERN_ASSIGNMENTS,
  shifts: SHIFTS,
  defaultGraceMinutes: ATTENDANCE_POLICY.graceMinutes,
}

function onApprovedLeave(employeeId: string, date: string) {
  return LEAVE_REQUESTS.some(
    (l) =>
      l.employeeId === employeeId &&
      l.status === "approved" &&
      l.startDate <= date &&
      l.endDate >= date
  )
}

/**
 * Two working months of captures, generated against whatever Schedules
 * expected of each person that day — a pattern for office staff, a
 * published shift for the branches.
 *
 * The shape is deliberately imperfect: a handful of days close
 * themselves, a few people drift past their own grace period, some work
 * from home, and some days simply have nothing on them. Nothing is
 * captured on a holiday or a day covered by leave, because the reader
 * was not there to capture it.
 */
export const CLOCK_EVENTS: ClockEvent[] = (() => {
  const out: ClockEvent[] = []

  for (const e of ON_STRENGTH) {
    for (const date of PERIOD_DATES) {
      const expected = expectedFor(e, date, SCHEDULE_SOURCE)
      if (!expected) continue
      if (holidaysBetween(date, date).length) continue
      if (onApprovedLeave(e.id, date)) continue

      const n = hash(e.id, date)

      // Roughly one working day in twenty-five has nothing captured at all.
      if (n % 25 === 0) continue

      const remote = expected.from === "pattern" && n % 11 === 0
      const drift = n % 17 === 0 ? 12 + (n % 25) : n % 7 === 0 ? 4 : 0
      const clockIn = toHhmm(toMinutes(expected.start) + drift - (n % 3))
      const autoClosed = n % 29 === 0
      const overtime = n % 13 === 0 ? 45 + (n % 40) : 0

      out.push({
        id: `ce-${e.id}-${date}`,
        employeeId: e.id,
        date,
        clockIn,
        clockOut: autoClosed
          ? null
          : toHhmm(toMinutes(expected.end) + overtime - (n % 5)),
        source: remote ? "web" : n % 8 === 0 ? "web" : "fingerprint",
        branch: remote ? "Remote" : e.branch,
        breakMinutes: expected.breakMinutes,
        ...(autoClosed ? { autoClosed: true } : {}),
      })
    }
  }

  /**
   * One badge read on a day the person was signed off. It is the
   * reconciliation case that matters most: the clock says one thing and
   * the leave record says another, and only a person can say which is
   * right.
   */
  out.push({
    id: "ce-afia-2026-09-09",
    employeeId: "afia",
    date: "2026-09-09",
    clockIn: "11:02",
    clockOut: "12:40",
    source: "fingerprint",
    branch: "Accra HQ",
    breakMinutes: 0,
  })

  return out
})()

/**
 * Corrections. Each one references the reading it supersedes; neither the
 * event nor an earlier adjustment is ever rewritten.
 */
export const TIME_ADJUSTMENTS: TimeAdjustment[] = [
  {
    id: "adj-001",
    eventId: "ce-kofi-2026-09-09",
    employeeId: "kofi",
    date: "2026-09-09",
    field: "clockIn",
    originalIn: "09:42",
    originalOut: "17:06",
    correctedIn: "09:05",
    correctedOut: "17:06",
    reason: "Fingerprint reader offline at the north entrance.",
    requestedBy: "kofi",
    requestedAt: "2026-09-09T18:00:00",
    status: "approved",
    decidedBy: "ama",
    decidedAt: "2026-09-10T08:30:00",
  },
  {
    id: "adj-002",
    eventId: "ce-mensa-2026-09-11",
    employeeId: "mensa",
    date: "2026-09-11",
    field: "clockOut",
    originalIn: "07:02",
    originalOut: null,
    correctedIn: "07:02",
    correctedOut: "15:10",
    reason: "Left through the yard gate; the reader there was down.",
    requestedBy: "mensa",
    requestedAt: "2026-09-12T07:10:00",
    status: "approved",
    decidedBy: "akwasi",
    decidedAt: "2026-09-12T09:00:00",
  },
  {
    id: "adj-003",
    eventId: "ce-afia-2026-09-15",
    employeeId: "afia",
    date: "2026-09-15",
    field: "clockOut",
    originalIn: "08:04",
    originalOut: null,
    correctedIn: "08:04",
    correctedOut: "17:00",
    reason: "Went straight to the client site after lunch.",
    requestedBy: "afia",
    requestedAt: "2026-09-16T08:00:00",
    // Still with the manager, so the original reading is what counts today.
    status: "pending",
  },
  {
    id: "adj-004",
    eventId: "ce-selorm-2026-09-17",
    employeeId: "selorm",
    date: "2026-09-17",
    field: "clockOut",
    originalIn: "08:01",
    originalOut: "17:28",
    correctedIn: "08:01",
    correctedOut: "21:15",
    reason: "Stayed for the failover test; overtime agreed beforehand.",
    requestedBy: "selorm",
    requestedAt: "2026-09-17T21:30:00",
    status: "pending",
  },
]

/* ── Pay periods ─────────────────────────────────────────────────────── */

export const PAY_PERIODS: PayPeriod[] = [
  {
    id: "pp-2026-09",
    label: "September 2026",
    start: "2026-09-01",
    end: "2026-09-30",
    status: "inReview",
  },
  {
    id: "pp-2026-08",
    label: "August 2026",
    start: "2026-08-01",
    end: "2026-08-31",
    status: "closed",
  },
]

/**
 * Where each person's timesheet has got to. August is settled; September is
 * mid-review, which is what gives the manager view something to work.
 */
export const TIMESHEETS: Timesheet[] = (() => {
  const out: Timesheet[] = []

  for (const e of ON_STRENGTH) {
    out.push({
      id: `ts-pp-2026-08-${e.id}`,
      periodId: "pp-2026-08",
      employeeId: e.id,
      status: "approved",
      submittedAt: "2026-08-31T17:00:00",
      decidedBy: "fiifi",
      decidedAt: "2026-09-02T10:00:00",
    })

    const n = hash(e.id, "sept")
    const status =
      n % 7 === 0
        ? "notSubmitted"
        : n % 5 === 0
          ? "changesRequested"
          : n % 3 === 0
            ? "approved"
            : "pendingReview"

    out.push({
      id: `ts-pp-2026-09-${e.id}`,
      periodId: "pp-2026-09",
      employeeId: e.id,
      status,
      ...(status === "notSubmitted"
        ? {}
        : { submittedAt: "2026-09-18T08:00:00" }),
      ...(status === "approved"
        ? { decidedBy: "fiifi", decidedAt: "2026-09-18T11:00:00" }
        : {}),
      ...(status === "changesRequested"
        ? {
            decidedBy: "fiifi",
            decidedAt: "2026-09-18T11:30:00",
            comment:
              "Two days have no clock-out. Raise a correction for each before I approve.",
          }
        : {}),
    })
  }

  return out
})()

/** Exceptions someone has already dealt with. */
export const EXCEPTION_RESOLUTIONS: ExceptionResolution[] = [
  {
    key: "late:kwabena:2026-09-08",
    action: "noted",
    note: "Traffic on the Takoradi road; spoke to him.",
    resolvedBy: "yaw",
    resolvedAt: "2026-09-09T09:00:00",
  },
  {
    key: "noRecord:adjoa:2026-09-04",
    action: "linkedToLeave",
    note: "Compassionate leave, filed late.",
    resolvedBy: "akwasi",
    resolvedAt: "2026-09-07T10:15:00",
  },
]
