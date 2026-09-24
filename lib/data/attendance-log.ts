import { EMPLOYEES } from "./employees"
import { isoWeekday, toHhmm, toMinutes } from "../attendance/derive"
import type {
  ClockEvent,
  EmployeeSchedule,
  ExceptionResolution,
  PayPeriod,
  TimeAdjustment,
  Timesheet,
  WorkPattern,
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

export const WORK_PATTERNS: WorkPattern[] = [
  {
    id: "wp-office",
    label: "Office · Mon–Fri 08:00–17:00",
    workingDays: [1, 2, 3, 4, 5],
    start: "08:00",
    end: "17:00",
    breakMinutes: 60,
  },
  {
    id: "wp-early",
    label: "Early shift · Mon–Sat 07:00–15:00",
    workingDays: [1, 2, 3, 4, 5, 6],
    start: "07:00",
    end: "15:00",
    breakMinutes: 45,
  },
  {
    id: "wp-late",
    label: "Late shift · Mon–Sat 14:00–22:00",
    workingDays: [1, 2, 3, 4, 5, 6],
    start: "14:00",
    end: "22:00",
    breakMinutes: 45,
  },
  {
    id: "wp-support",
    label: "Support · Tue–Sat 09:00–18:00",
    workingDays: [2, 3, 4, 5, 6],
    start: "09:00",
    end: "18:00",
    breakMinutes: 60,
  },
]

/** Operations and the branches run shifts; everyone else keeps office hours. */
const SHIFTED: Record<string, string> = {
  mensa: "wp-early",
  nii: "wp-late",
  yaa: "wp-early",
  kojo: "wp-late",
  akos: "wp-support",
  abla: "wp-support",
}

export const EMPLOYEE_SCHEDULES: EmployeeSchedule[] = EMPLOYEES.map((e) => ({
  employeeId: e.id,
  patternId: SHIFTED[e.id] ?? "wp-office",
}))

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

function dates(start: string, end: string) {
  const out: string[] = []
  const d = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}

const PERIOD_DATES = dates("2026-08-01", "2026-09-18")

/**
 * Two working months of captures. The shape is deliberately imperfect: a
 * handful of days close themselves, a few people drift past the grace
 * period, some work from home, and some days simply have nothing on them.
 */
export const CLOCK_EVENTS: ClockEvent[] = (() => {
  const out: ClockEvent[] = []

  for (const e of ON_STRENGTH) {
    const patternId = SHIFTED[e.id] ?? "wp-office"
    const pattern = WORK_PATTERNS.find((p) => p.id === patternId)!

    for (const date of PERIOD_DATES) {
      if (!pattern.workingDays.includes(isoWeekday(date))) continue

      const n = hash(e.id, date)

      // Roughly one working day in twenty-five has nothing captured at all.
      if (n % 25 === 0) continue

      const remote = patternId === "wp-office" && n % 11 === 0
      const drift = n % 17 === 0 ? 12 + (n % 25) : n % 7 === 0 ? 4 : 0
      const clockIn = toHhmm(toMinutes(pattern.start) + drift - (n % 3))
      const autoClosed = n % 29 === 0
      const overtime = n % 13 === 0 ? 45 + (n % 40) : 0

      out.push({
        id: `ce-${e.id}-${date}`,
        employeeId: e.id,
        date,
        clockIn,
        clockOut: autoClosed
          ? null
          : toHhmm(toMinutes(pattern.end) + overtime - (n % 5)),
        source: remote ? "web" : n % 8 === 0 ? "web" : "fingerprint",
        branch: remote ? "Remote" : e.branch,
        breakMinutes: pattern.breakMinutes,
        ...(autoClosed ? { autoClosed: true } : {}),
      })
    }
  }

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
