import { describe, expect, it } from "vitest"

import {
  assignmentFor,
  assignmentHistoryFor,
  breakSummary,
  daysSummary,
  expectedFor,
  expectedHours,
  hoursSummary,
  isRostered,
  unscheduled,
  weeklyHours,
  type ScheduleInput,
} from "./derive"
import { rosterWarnings, rosterTotals, unpublished } from "./warnings"
import type { PatternAssignment, Shift, WorkPattern } from "./types"
import type { Employee, LeaveRequest } from "../types"

const OFFICE: WorkPattern = {
  id: "wp-office",
  name: "Standard office",
  days: ([1, 2, 3, 4, 5] as const).map((weekday) => ({
    weekday,
    start: "08:00",
    end: "17:00",
  })),
  breakMinutes: 60,
  breakPaid: false,
  graceMinutes: null,
}

const SATURDAY: WorkPattern = {
  ...OFFICE,
  id: "wp-saturday",
  name: "Half day Saturday",
  days: [...OFFICE.days, { weekday: 6, start: "08:00", end: "12:00" }],
}

const EARLY: WorkPattern = {
  id: "wp-early",
  name: "Early shift",
  days: ([1, 2, 3, 4, 5, 6] as const).map((weekday) => ({
    weekday,
    start: "07:00",
    end: "15:00",
  })),
  breakMinutes: 45,
  breakPaid: true,
  graceMinutes: 5,
}

const people = [
  { id: "abla", department: "Marketing", branch: "Accra HQ" },
  { id: "mensa", department: "Operations", branch: "Kumasi" },
] as unknown as Employee[]
const [abla, mensa] = people

const assignment = (over: Partial<PatternAssignment>): PatternAssignment => ({
  id: "pa",
  patternId: "wp-office",
  scope: "company",
  target: null,
  effectiveFrom: "2026-01-01",
  reason: "Fixture",
  createdBy: "fiifi",
  createdAt: "2026-01-01T09:00:00",
  ...over,
})

const shift = (over: Partial<Shift> = {}): Shift => ({
  id: "sh-1",
  employeeId: "mensa",
  date: "2026-09-16",
  start: "07:00",
  end: "15:00",
  breakMinutes: 45,
  position: "Warehouse floor",
  branch: "Kumasi",
  department: "Operations",
  state: "published",
  publishedAt: "2026-09-10T16:00:00",
  ...over,
})

function input(over: Partial<ScheduleInput> = {}): ScheduleInput {
  return {
    patterns: [OFFICE, SATURDAY, EARLY],
    assignments: [assignment({ id: "pa-company" })],
    shifts: [],
    defaultGraceMinutes: 10,
    ...over,
  }
}

describe("reading a pattern", () => {
  it("summarises a run of days as a range", () => {
    expect(daysSummary(OFFICE)).toBe("Mon–Fri")
    expect(daysSummary(SATURDAY)).toBe("Mon–Sat")
  })

  it("splits the summary where the hours differ", () => {
    expect(hoursSummary(SATURDAY)).toBe("Mon–Fri 08:00–17:00 · Sat 08:00–12:00")
  })

  it("takes an unpaid break off the weekly hours and leaves a paid one on", () => {
    expect(weeklyHours(OFFICE)).toBe(40)
    expect(weeklyHours(SATURDAY)).toBe(43)
    // Six eight-hour days with the break paid.
    expect(weeklyHours(EARLY)).toBe(48)
  })

  it("says what the break is in words", () => {
    expect(breakSummary(OFFICE)).toBe("1h unpaid break")
    expect(breakSummary(EARLY)).toBe("45m paid break")
  })
})

describe("assignment precedence", () => {
  const assignments = [
    assignment({ id: "company", patternId: "wp-office" }),
    assignment({
      id: "branch",
      scope: "branch",
      target: "Kumasi",
      patternId: null,
    }),
    assignment({
      id: "dept",
      scope: "department",
      target: "Marketing",
      patternId: "wp-early",
    }),
    assignment({
      id: "person",
      scope: "employee",
      target: "abla",
      patternId: "wp-saturday",
      effectiveFrom: "2026-09-07",
    }),
  ]

  it("prefers the individual, then department, then branch, then company", () => {
    expect(assignmentFor(abla, "2026-09-10", assignments)?.id).toBe("person")
    expect(assignmentFor(abla, "2026-09-01", assignments)?.id).toBe("dept")
    expect(assignmentFor(mensa, "2026-09-10", assignments)?.id).toBe("branch")
  })

  it("leaves the past reading against the pattern in force at the time", () => {
    const before = expectedFor(abla, "2026-08-31", input({ assignments }))
    const after = expectedFor(abla, "2026-09-12", input({ assignments }))
    // 31 August is a Monday on the early shift; 12 September is a Saturday,
    // which only the pattern she moved onto works at all.
    expect(before?.start).toBe("07:00")
    expect(after?.start).toBe("08:00")
    expect(after?.end).toBe("12:00")
  })

  it("keeps every assignment that ever applied, newest first", () => {
    const history = assignmentHistoryFor(abla, assignments)
    expect(history.map((a) => a.id)).toEqual(["person", "dept", "company"])
  })

  it("treats a pattern of null as rostered rather than unassigned", () => {
    expect(isRostered(mensa, "2026-09-10", assignments)).toBe(true)
    expect(isRostered(abla, "2026-09-10", assignments)).toBe(false)
  })
})

describe("the expectation", () => {
  const rostered = [
    assignment({
      id: "branch",
      scope: "branch",
      target: "Kumasi",
      patternId: null,
    }),
  ]

  it("prefers a published shift over the pattern underneath it", () => {
    const assignments = [assignment({ id: "company", patternId: "wp-office" })]
    const e = expectedFor(
      mensa,
      "2026-09-16",
      input({ assignments, shifts: [shift()] })
    )
    expect(e?.from).toBe("shift")
    expect(e?.start).toBe("07:00")
    expect(e?.position).toBe("Warehouse floor")
  })

  it("expects nothing from a draft, because nobody has been told", () => {
    const e = expectedFor(
      mensa,
      "2026-09-16",
      input({
        assignments: rostered,
        shifts: [shift({ state: "draft", publishedAt: undefined })],
      })
    )
    expect(e).toBeNull()
  })

  it("expects nothing from a cancelled shift", () => {
    const e = expectedFor(
      mensa,
      "2026-09-16",
      input({ assignments: rostered, shifts: [shift({ cancelled: true })] })
    )
    expect(e).toBeNull()
  })

  it("counts a rostered break off the hours", () => {
    const e = expectedFor(
      mensa,
      "2026-09-16",
      input({ assignments: rostered, shifts: [shift()] })
    )!
    expect(expectedHours(e)).toBe(7.25)
  })

  it("names the people nothing expects anywhere in the range", () => {
    const dates = ["2026-09-14", "2026-09-15", "2026-09-16"]
    // Abla is on the company pattern; Mensa is rostered with no shifts,
    // so nothing says what was expected of him.
    const list = unscheduled(
      people,
      dates,
      input({ assignments: [assignment({ id: "company" }), ...rostered] })
    )
    expect(list.map((e) => e.id)).toEqual(["mensa"])
  })
})

describe("roster warnings", () => {
  const leave = [
    {
      id: "LR-9",
      employeeId: "mensa",
      status: "approved",
      startDate: "2026-09-24",
      endDate: "2026-09-25",
      type: "annual",
    },
  ] as unknown as LeaveRequest[]

  const thresholds = { overtimeWeeklyHours: 48, shortRestHours: 11 }

  it("flags a shift on a day the person is signed off", () => {
    const w = rosterWarnings(
      [shift({ id: "a", date: "2026-09-24" })],
      leave,
      thresholds
    )
    expect(w.map((x) => x.kind)).toEqual(["onLeave"])
  })

  it("flags two shifts that run over each other", () => {
    const w = rosterWarnings(
      [
        shift({ id: "a", date: "2026-09-22", start: "07:00", end: "15:00" }),
        shift({ id: "b", date: "2026-09-22", start: "14:00", end: "22:00" }),
      ],
      [],
      thresholds
    )
    expect(w.map((x) => x.kind)).toEqual(["overlap"])
  })

  it("flags less than the minimum rest between two days", () => {
    const w = rosterWarnings(
      [
        shift({ id: "a", date: "2026-09-22", start: "14:00", end: "22:00" }),
        shift({ id: "b", date: "2026-09-23", start: "07:00", end: "15:00" }),
      ],
      [],
      thresholds
    )
    expect(w.map((x) => x.kind)).toEqual(["shortRest"])
    expect(w[0].detail).toContain("9h")
  })

  it("flags a week rostered past the threshold", () => {
    const week = [
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ].map((date, i) =>
      shift({
        id: `s${i}`,
        date,
        start: "09:00",
        end: "19:00",
        breakMinutes: 60,
      })
    )
    const kinds = rosterWarnings(week, [], thresholds).map((w) => w.kind)
    expect(kinds).toContain("overtime")
  })

  it("flags a shift with nobody on it", () => {
    const w = rosterWarnings([shift({ employeeId: null })], [], thresholds)
    expect(w.map((x) => x.kind)).toEqual(["openShift"])
  })

  it("counts drafts and post-publish edits as unpublished", () => {
    const list = [
      shift({ id: "a" }),
      shift({ id: "b", state: "draft", publishedAt: undefined }),
      shift({ id: "c", changedSincePublish: true }),
    ]
    expect(unpublished(list).map((s) => s.id)).toEqual(["b", "c"])
  })

  it("totals a day without counting a cancelled shift", () => {
    const totals = rosterTotals([
      shift({ id: "a" }),
      shift({ id: "b", employeeId: "kojo", cancelled: true }),
    ])
    expect(totals.headcount).toBe(1)
    expect(totals.hours).toBe(7.3)
  })
})
