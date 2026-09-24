import { describe, expect, it } from "vitest"

import {
  dayRecordFor,
  datesBetween,
  exceptionsFrom,
  formatHours,
  groupExceptions,
  isoWeekday,
  metricsFor,
  scheduledHours,
  summariseGroups,
  toHhmm,
  toMinutes,
  type AttendanceInput,
} from "./derive"
import type { ClockEvent, TimeAdjustment, WorkPattern } from "./types"
import type { Employee, LeaveRequest } from "../types"

const OFFICE: WorkPattern = {
  id: "wp-office",
  label: "Office",
  workingDays: [1, 2, 3, 4, 5],
  start: "08:00",
  end: "17:00",
  breakMinutes: 60,
}

const EMPLOYEES = [
  { id: "kofi", department: "Engineering" },
] as unknown as Employee[]

function input(over: Partial<AttendanceInput> = {}): AttendanceInput {
  return {
    employees: EMPLOYEES,
    patterns: [OFFICE],
    schedules: [{ employeeId: "kofi", patternId: "wp-office" }],
    events: [],
    adjustments: [],
    leave: [],
    graceMinutes: 10,
    ...over,
  }
}

const event = (over: Partial<ClockEvent> = {}): ClockEvent => ({
  id: "e1",
  employeeId: "kofi",
  date: "2026-09-16", // a Wednesday
  clockIn: "08:00",
  clockOut: "17:00",
  source: "fingerprint",
  branch: "Accra HQ",
  breakMinutes: 60,
  ...over,
})

describe("time helpers", () => {
  it("round-trips hh:mm", () => {
    expect(toHhmm(toMinutes("09:42"))).toBe("09:42")
  })

  it("counts Monday as 1 and Sunday as 7", () => {
    expect(isoWeekday("2026-09-14")).toBe(1)
    expect(isoWeekday("2026-09-20")).toBe(7)
  })

  it("formats a signed shortfall the way the column reads", () => {
    expect(formatHours(-0.7, { signed: true })).toBe("−0h 42m")
    expect(formatHours(1.5, { signed: true })).toBe("+1h 30m")
    expect(formatHours(0, { signed: true })).toBe("0h 00m")
  })

  it("walks a date range inclusively", () => {
    expect(datesBetween("2026-09-16", "2026-09-18")).toEqual([
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
    ])
  })
})

describe("dayRecordFor", () => {
  it("marks a normal day present and counts the hours net of the break", () => {
    const r = dayRecordFor("kofi", "2026-09-16", input({ events: [event()] }))
    expect(r.code).toBe("P")
    expect(r.hours).toBe(8)
    expect(r.varianceHours).toBe(0)
  })

  it("does not call an arrival late until the grace period has passed", () => {
    const within = dayRecordFor(
      "kofi",
      "2026-09-16",
      input({ events: [event({ clockIn: "08:09" })] })
    )
    expect(within.code).toBe("P")
    expect(within.lateByMinutes).toBe(0)

    const past = dayRecordFor(
      "kofi",
      "2026-09-16",
      input({ events: [event({ clockIn: "08:25" })] })
    )
    expect(past.code).toBe("L")
    expect(past.lateByMinutes).toBe(15)
  })

  it("measures lateness against this person's own start, not a global one", () => {
    const early: WorkPattern = { ...OFFICE, id: "wp-early", start: "07:00" }
    const r = dayRecordFor(
      "kofi",
      "2026-09-16",
      input({
        patterns: [early],
        schedules: [{ employeeId: "kofi", patternId: "wp-early" }],
        events: [event({ clockIn: "07:30" })],
      })
    )
    // 08:00 would have been fine on the office pattern; on this one it is late.
    expect(r.code).toBe("L")
    expect(r.lateByMinutes).toBe(20)
  })

  it("calls a captured web day from home remote", () => {
    const r = dayRecordFor(
      "kofi",
      "2026-09-16",
      input({ events: [event({ source: "web", branch: "Remote" })] })
    )
    expect(r.code).toBe("R")
  })

  it("says no record — never absent — when nothing was captured", () => {
    const r = dayRecordFor("kofi", "2026-09-16", input())
    expect(r.code).toBe("N")
    expect(JSON.stringify(r).toLowerCase()).not.toContain("absent")
  })

  it("prefers leave over a missing capture", () => {
    const leave = [
      {
        id: "LR-1",
        employeeId: "kofi",
        status: "approved",
        startDate: "2026-09-14",
        endDate: "2026-09-18",
        type: "annual",
      },
    ] as unknown as LeaveRequest[]
    const r = dayRecordFor("kofi", "2026-09-16", input({ leave }))
    expect(r.code).toBe("V")
    expect(r.leaveRequestId).toBe("LR-1")
  })

  it("ignores leave that was never approved", () => {
    const leave = [
      {
        id: "LR-2",
        employeeId: "kofi",
        status: "pending",
        startDate: "2026-09-14",
        endDate: "2026-09-18",
        type: "annual",
      },
    ] as unknown as LeaveRequest[]
    expect(dayRecordFor("kofi", "2026-09-16", input({ leave })).code).toBe("N")
  })

  it("marks a public holiday, over and above the work pattern", () => {
    const r = dayRecordFor("kofi", "2026-09-21", input())
    expect(r.code).toBe("H")
    expect(r.holidayName).toBe("Kwame Nkrumah Memorial Day")
  })

  it("leaves a non-working day blank rather than counting it", () => {
    const r = dayRecordFor("kofi", "2026-09-19", input()) // Saturday
    expect(r.code).toBe("-")
    expect(r.scheduled).toBeNull()
  })

  it("applies an approved correction but keeps the original readable", () => {
    const adjustment: TimeAdjustment = {
      id: "a1",
      eventId: "e1",
      employeeId: "kofi",
      date: "2026-09-16",
      field: "clockIn",
      originalIn: "09:42",
      originalOut: "17:06",
      correctedIn: "09:05",
      correctedOut: "17:06",
      reason: "Fingerprint reader offline",
      requestedBy: "kofi",
      requestedAt: "2026-09-16T18:00:00",
      status: "approved",
    }
    const r = dayRecordFor(
      "kofi",
      "2026-09-16",
      input({
        events: [event({ clockIn: "09:42", clockOut: "17:06" })],
        adjustments: [adjustment],
      })
    )
    expect(r.clockIn).toBe("09:05")
    expect(r.adjustments[0].originalIn).toBe("09:42")
  })

  it("does not apply a correction that is still pending", () => {
    const pending: TimeAdjustment = {
      id: "a2",
      eventId: "e1",
      employeeId: "kofi",
      date: "2026-09-16",
      field: "clockIn",
      originalIn: "09:42",
      originalOut: "17:06",
      correctedIn: "09:05",
      correctedOut: "17:06",
      reason: "Reader offline",
      requestedBy: "kofi",
      requestedAt: "2026-09-16T18:00:00",
      status: "pending",
    }
    const r = dayRecordFor(
      "kofi",
      "2026-09-16",
      input({
        events: [event({ clockIn: "09:42", clockOut: "17:06" })],
        adjustments: [pending],
      })
    )
    expect(r.clockIn).toBe("09:42")
  })

  it("counts no hours for a day the system closed itself", () => {
    const r = dayRecordFor(
      "kofi",
      "2026-09-16",
      input({ events: [event({ clockOut: null, autoClosed: true })] })
    )
    expect(r.autoClosed).toBe(true)
    expect(r.hours).toBe(0)
  })

  it("counts the hours past the scheduled length as overtime", () => {
    const r = dayRecordFor(
      "kofi",
      "2026-09-16",
      input({ events: [event({ clockOut: "19:00" })] })
    )
    expect(r.overtimeHours).toBe(2)
    expect(r.varianceHours).toBe(2)
  })
})

describe("metrics", () => {
  const dates = [
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
  ]

  it("rates attendance over the days that were actually expected", () => {
    const events = [
      event({ date: "2026-09-14" }),
      event({ date: "2026-09-15", clockIn: "08:40" }), // late
      event({ date: "2026-09-16", source: "web", branch: "Remote" }), // remote
      event({ date: "2026-09-17" }),
      // 18th missing
    ]
    const records = dates.map((d) => dayRecordFor("kofi", d, input({ events })))
    const m = metricsFor(records)
    expect(m.scheduledDayCount).toBe(5)
    expect(m.attendanceRate).toBe(80)
    expect(m.lateArrivals).toBe(1)
    expect(m.noRecordDays).toBe(1)
  })

  it("does not hold leave or a holiday against the rate", () => {
    const leave = [
      {
        id: "LR-3",
        employeeId: "kofi",
        status: "approved",
        startDate: "2026-09-14",
        endDate: "2026-09-18",
        type: "annual",
      },
    ] as unknown as LeaveRequest[]
    const records = dates.map((d) => dayRecordFor("kofi", d, input({ leave })))
    const m = metricsFor(records)
    expect(m.scheduledDayCount).toBe(0)
    expect(m.noRecordDays).toBe(0)
  })

  it("counts scheduled hours from the pattern, net of breaks", () => {
    const records = dates.map((d) => dayRecordFor("kofi", d, input()))
    expect(scheduledHours(records)).toBe(40)
  })
})

describe("exceptions", () => {
  it("raises one per day per kind", () => {
    const events = [
      event({ date: "2026-09-15", clockIn: "08:40" }),
      event({ date: "2026-09-16", clockOut: null, autoClosed: true }),
    ]
    const records = ["2026-09-14", "2026-09-15", "2026-09-16"].map((d) =>
      dayRecordFor("kofi", d, input({ events }))
    )
    const kinds = exceptionsFrom(records)
      .map((e) => e.kind)
      .sort()
    expect(kinds).toEqual(["autoClosed", "late", "noRecord"])
  })

  it("collapses a repeated pattern into one line per person", () => {
    const events = [
      event({ date: "2026-09-15", clockIn: "08:40" }),
      event({ date: "2026-09-16", clockIn: "08:55" }),
      event({ date: "2026-09-17", clockIn: "09:10" }),
    ]
    const records = ["2026-09-15", "2026-09-16", "2026-09-17"].map((d) =>
      dayRecordFor("kofi", d, input({ events }))
    )
    const groups = groupExceptions(exceptionsFrom(records))
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(3)
    expect(summariseGroups(groups)).toBe("late 3×")
  })

  it("gives every exception a stable key, so resolving one is durable", () => {
    const records = [dayRecordFor("kofi", "2026-09-16", input())]
    expect(exceptionsFrom(records)[0].key).toBe("noRecord:kofi:2026-09-16")
  })
})
