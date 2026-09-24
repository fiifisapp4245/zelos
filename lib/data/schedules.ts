import { EMPLOYEES } from "./employees"
import { addDays, datesBetween, isoWeekday } from "../time"
import { holidaysBetween } from "../fixtures/ghanaHolidays"
import type {
  PatternAssignment,
  Shift,
  ShiftChange,
  WorkPattern,
} from "../schedules/types"

/**
 * The schedules the prototype runs on, against TODAY = 2026-09-18.
 *
 * These are what "expected" means everywhere else: the register measures
 * lateness against them, timesheets measure variance against them, and
 * overtime is whatever exceeds them.
 */

/**
 * Company rules, edited in Settings → Time & attendance. They are figures
 * the business sets, not constants of the code, which is why the roster
 * quotes them back ("against a 11h minimum") rather than asserting them.
 */
export const SCHEDULE_POLICY = {
  /** Above this many rostered hours in a week, the roster warns. */
  overtimeWeeklyHours: 48,
  /** Rest a person should get between two shifts. */
  shortRestHours: 11,
  /** Share of a department away on one day before coverage warns. */
  coverageWarnPercent: 40,
  /**
   * How the company mostly works, which decides whether Schedules opens
   * on patterns or on the roster.
   */
  primaryWorkModel: "mixed" as "office" | "mixed" | "shift",
}

const MON_TO_FRI = [1, 2, 3, 4, 5] as const

export const WORK_PATTERNS: WorkPattern[] = [
  {
    id: "wp-standard-office",
    name: "Standard office",
    days: MON_TO_FRI.map((weekday) => ({
      weekday,
      start: "08:00",
      end: "17:00",
    })),
    breakMinutes: 60,
    breakPaid: false,
    graceMinutes: null,
  },
  {
    id: "wp-half-saturday",
    name: "Half day Saturday",
    days: [
      ...MON_TO_FRI.map((weekday) => ({
        weekday,
        start: "08:00",
        end: "17:00",
      })),
      { weekday: 6 as const, start: "08:00", end: "12:00" },
    ],
    breakMinutes: 60,
    breakPaid: false,
    graceMinutes: null,
  },
  {
    id: "wp-support-week",
    name: "Support week",
    days: ([2, 3, 4, 5, 6] as const).map((weekday) => ({
      weekday,
      start: "09:00",
      end: "18:00",
    })),
    breakMinutes: 60,
    breakPaid: false,
    graceMinutes: null,
  },
  {
    id: "wp-early-shift",
    name: "Early shift",
    days: ([1, 2, 3, 4, 5, 6] as const).map((weekday) => ({
      weekday,
      start: "07:00",
      end: "15:00",
    })),
    breakMinutes: 45,
    breakPaid: true,
    // The floor reader is busiest at seven; five minutes, not ten.
    graceMinutes: 5,
  },
  {
    id: "wp-late-shift",
    name: "Late shift",
    days: ([1, 2, 3, 4, 5, 6] as const).map((weekday) => ({
      weekday,
      start: "14:00",
      end: "22:00",
    })),
    breakMinutes: 45,
    breakPaid: true,
    graceMinutes: 5,
  },
]

/**
 * Who follows what, from when.
 *
 * Read in precedence order — individual, department, branch, company —
 * and within a level, the latest effective date. Nothing here is ever
 * edited: Abla's September change leaves her August reading against the
 * pattern she was actually on at the time.
 */
export const PATTERN_ASSIGNMENTS: PatternAssignment[] = [
  {
    id: "pa-company",
    patternId: "wp-standard-office",
    scope: "company",
    target: null,
    effectiveFrom: "2026-01-01",
    reason: "Company default for salaried office staff.",
    createdBy: "fiifi",
    createdAt: "2026-01-02T09:00:00",
  },
  {
    id: "pa-branch-kumasi",
    patternId: null,
    scope: "branch",
    target: "Kumasi",
    effectiveFrom: "2026-01-01",
    reason: "Kumasi runs a roster; hours come from published shifts.",
    createdBy: "fiifi",
    createdAt: "2026-01-02T09:05:00",
  },
  {
    id: "pa-branch-takoradi",
    patternId: null,
    scope: "branch",
    target: "Takoradi",
    effectiveFrom: "2026-01-01",
    reason: "Takoradi runs a roster; hours come from published shifts.",
    createdBy: "fiifi",
    createdAt: "2026-01-02T09:06:00",
  },
  {
    id: "pa-dept-cs",
    patternId: "wp-support-week",
    scope: "department",
    target: "Customer Success",
    effectiveFrom: "2026-03-01",
    reason: "Saturday cover for the support line.",
    createdBy: "kwesi",
    createdAt: "2026-02-20T14:30:00",
  },
  {
    id: "pa-abla-office",
    patternId: "wp-standard-office",
    scope: "employee",
    target: "abla",
    effectiveFrom: "2026-01-01",
    reason: "Standard hours on joining the content team.",
    createdBy: "abena",
    createdAt: "2026-01-05T10:00:00",
  },
  {
    // The versioning case: from 7 September she works Saturdays, and
    // August still reads against the pattern she was on then.
    id: "pa-abla-saturday",
    patternId: "wp-half-saturday",
    scope: "employee",
    target: "abla",
    effectiveFrom: "2026-09-07",
    reason: "Covering Saturday campaign pushes until the launch.",
    createdBy: "abena",
    createdAt: "2026-09-02T16:20:00",
  },
  {
    id: "pa-kwame-engagement",
    patternId: null,
    scope: "employee",
    target: "kwame",
    effectiveFrom: "2026-01-01",
    reason: "Contractor — hours are agreed per engagement, not rostered.",
    createdBy: "adwoa",
    createdAt: "2026-01-08T11:15:00",
  },
]

/* ── Roster ──────────────────────────────────────────────────────────── */

/** Who the branches roster, and what they are rostered to do. */
const ROSTERED: Record<
  string,
  { branch: string; department: string; position: string }
> = {
  mensa: {
    branch: "Kumasi",
    department: "Operations",
    position: "Warehouse floor",
  },
  kojo: { branch: "Kumasi", department: "Operations", position: "Dispatch" },
  yaa: {
    branch: "Takoradi",
    department: "Operations",
    position: "Procurement desk",
  },
  kwabena: {
    branch: "Takoradi",
    department: "Marketing",
    position: "Regional sales",
  },
}

export const ROSTERED_IDS = Object.keys(ROSTERED)

/** The Monday the hand-written roster takes over from the generated past. */
const ROSTER_FROM = "2026-09-14"

const HISTORY_FROM = "2026-08-01"

function shift(
  id: string,
  employeeId: string | null,
  date: string,
  start: string,
  end: string,
  extra: Partial<Shift> = {}
): Shift {
  const who = employeeId ? ROSTERED[employeeId] : null
  return {
    id,
    employeeId,
    date,
    start,
    end,
    breakMinutes: 45,
    position: who?.position ?? "Cover",
    branch: who?.branch ?? "Kumasi",
    department: who?.department ?? "Operations",
    state: "published",
    publishedAt: "2026-09-11T16:00:00",
    ...extra,
  }
}

/**
 * Six weeks of settled roster behind today, so the register and the
 * timesheets have something to measure. Alternating weeks put the two
 * Kumasi hands on opposite shifts.
 */
const HISTORY: Shift[] = (() => {
  const out: Shift[] = []
  const dates = datesBetween(HISTORY_FROM, addDays(ROSTER_FROM, -1))

  for (const date of dates) {
    const weekday = isoWeekday(date)
    if (weekday === 7) continue
    if (holidaysBetween(date, date).length) continue

    const week = Math.floor(
      (new Date(`${date}T00:00:00`).getTime() -
        new Date(`${HISTORY_FROM}T00:00:00`).getTime()) /
        (7 * 86_400_000)
    )
    const swap = week % 2 === 1

    out.push(
      shift(
        `sh-mensa-${date}`,
        "mensa",
        date,
        swap ? "14:00" : "07:00",
        swap ? "22:00" : "15:00",
        { publishedAt: `${addDays(date, -7)}T16:00:00` }
      ),
      shift(
        `sh-kojo-${date}`,
        "kojo",
        date,
        swap ? "07:00" : "14:00",
        swap ? "15:00" : "22:00",
        { publishedAt: `${addDays(date, -7)}T16:00:00` }
      )
    )

    if (weekday <= 5) {
      out.push(
        shift(`sh-yaa-${date}`, "yaa", date, "08:00", "16:30", {
          breakMinutes: 60,
          publishedAt: `${addDays(date, -7)}T16:00:00`,
        }),
        shift(`sh-kwabena-${date}`, "kwabena", date, "09:00", "18:00", {
          breakMinutes: 60,
          publishedAt: `${addDays(date, -7)}T16:00:00`,
        })
      )
    }
  }

  return out
})()

/**
 * The two weeks either side of today, written by hand so the roster shows
 * what a roster actually looks like: mostly settled, a few drafts, a
 * couple of things changed after people had already been told, two shifts
 * nobody is on yet, and one cancellation that stays on the record.
 */
const CURRENT: Shift[] = [
  // Week of 14 September — published and quiet.
  shift("sh-mensa-2026-09-14", "mensa", "2026-09-14", "07:00", "15:00"),
  shift("sh-mensa-2026-09-15", "mensa", "2026-09-15", "07:00", "15:00"),
  shift("sh-mensa-2026-09-16", "mensa", "2026-09-16", "07:00", "15:00"),
  shift("sh-mensa-2026-09-17", "mensa", "2026-09-17", "07:00", "15:00"),
  shift("sh-mensa-2026-09-18", "mensa", "2026-09-18", "07:00", "15:00"),
  shift("sh-mensa-2026-09-19", "mensa", "2026-09-19", "07:00", "15:00"),

  shift("sh-kojo-2026-09-14", "kojo", "2026-09-14", "14:00", "22:00"),
  shift("sh-kojo-2026-09-15", "kojo", "2026-09-15", "14:00", "22:00"),
  shift("sh-kojo-2026-09-16", "kojo", "2026-09-16", "14:00", "22:00"),
  // Published, then cancelled. It stays here: somebody was told to work it.
  shift("sh-kojo-2026-09-17", "kojo", "2026-09-17", "14:00", "22:00", {
    cancelled: true,
  }),

  ...["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"].map(
    (date) =>
      shift(`sh-yaa-${date}`, "yaa", date, "08:00", "16:30", {
        breakMinutes: 60,
      })
  ),
  ...["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"].map(
    (date) =>
      shift(`sh-kwabena-${date}`, "kwabena", date, "09:00", "18:00", {
        breakMinutes: 60,
      })
  ),

  // Week of 21 September. The 21st is Kwame Nkrumah Memorial Day, so the
  // branches are shut and nobody is on.
  shift("sh-mensa-2026-09-22", "mensa", "2026-09-22", "07:00", "15:00"),
  // Drafted on top of the morning, which is the overlap the roster flags.
  shift("sh-mensa-2026-09-22-late", "mensa", "2026-09-22", "14:00", "22:00", {
    state: "draft",
    publishedAt: undefined,
    note: "Cover for the stock count.",
  }),
  // Nine hours after that late finish: the short-rest warning.
  shift("sh-mensa-2026-09-23", "mensa", "2026-09-23", "07:00", "15:00"),
  // Published at 07:00, moved to 08:00 afterwards.
  shift("sh-mensa-2026-09-24", "mensa", "2026-09-24", "08:00", "16:00", {
    changedSincePublish: true,
  }),
  shift("sh-mensa-2026-09-25", "mensa", "2026-09-25", "07:00", "15:00"),
  shift("sh-mensa-2026-09-26", "mensa", "2026-09-26", "07:00", "15:00"),

  shift("sh-yaa-2026-09-22", "yaa", "2026-09-22", "08:00", "16:30", {
    breakMinutes: 60,
  }),
  shift("sh-yaa-2026-09-23", "yaa", "2026-09-23", "08:00", "16:30", {
    breakMinutes: 60,
  }),
  // Rostered before her leave was approved: the on-leave warning.
  shift("sh-yaa-2026-09-24", "yaa", "2026-09-24", "08:00", "16:30", {
    breakMinutes: 60,
  }),
  shift("sh-yaa-2026-09-26", "yaa", "2026-09-26", "09:00", "13:00", {
    breakMinutes: 0,
    state: "draft",
    publishedAt: undefined,
    note: "Saturday stock take.",
  }),

  // Six nine-hour days: over the weekly threshold.
  ...[
    "2026-09-22",
    "2026-09-23",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-09-27",
  ].map((date) =>
    shift(`sh-kwabena-${date}`, "kwabena", date, "09:00", "19:00", {
      breakMinutes: 60,
      ...(date === "2026-09-22"
        ? { changedSincePublish: true, position: "Trade counter" }
        : {}),
    })
  ),

  // Nobody on these two yet.
  shift("sh-open-kumasi-2026-09-25", null, "2026-09-25", "07:00", "15:00", {
    position: "Dispatch",
    branch: "Kumasi",
    department: "Operations",
  }),
  shift("sh-open-takoradi-2026-09-26", null, "2026-09-26", "09:00", "17:00", {
    position: "Counter cover",
    branch: "Takoradi",
    department: "Operations",
    state: "draft",
    publishedAt: undefined,
  }),
]

export const SHIFTS: Shift[] = [...HISTORY, ...CURRENT]

/**
 * The trail. Append-only: every entry says who changed what and when, and
 * a cancellation is an entry rather than a deletion.
 */
export const SHIFT_CHANGES: ShiftChange[] = [
  {
    id: "sc-001",
    shiftId: "sh-kojo-2026-09-17",
    action: "cancelled",
    summary: "Dispatch 14:00–22:00 cancelled",
    reason: "Van off the road; the run moved to Friday.",
    by: "akwasi",
    at: "2026-09-16T17:40:00",
  },
  {
    id: "sc-002",
    shiftId: "sh-mensa-2026-09-24",
    action: "edited",
    summary: "07:00–15:00 → 08:00–16:00",
    reason: "Stock auditors arrive at eight.",
    by: "akwasi",
    at: "2026-09-17T09:15:00",
  },
  {
    id: "sc-003",
    shiftId: "sh-kwabena-2026-09-22",
    action: "edited",
    summary: "Regional sales → Trade counter",
    reason: "Counter is short while the new hire is in induction.",
    by: "yaw",
    at: "2026-09-17T11:05:00",
  },
  {
    id: "sc-004",
    shiftId: "sh-mensa-2026-09-22-late",
    action: "created",
    summary: "Warehouse floor 14:00–22:00 drafted",
    reason: "Stock count needs a second pass.",
    by: "akwasi",
    at: "2026-09-17T15:30:00",
  },
  {
    id: "sc-005",
    shiftId: "sh-open-kumasi-2026-09-25",
    action: "created",
    summary: "Dispatch 07:00–15:00 opened",
    reason: "Extra run for the Friday deliveries.",
    by: "akwasi",
    at: "2026-09-16T08:20:00",
  },
]

/** Positions the roster offers, taken from what is already rostered. */
export const SHIFT_POSITIONS = [
  ...new Set([...SHIFTS.map((s) => s.position), "Goods in", "Counter cover"]),
].sort()

export const ROSTER_BRANCHES = [...new Set(SHIFTS.map((s) => s.branch))].sort()

/** Employees the roster covers, used to seed its rows. */
export const ROSTERED_EMPLOYEES = EMPLOYEES.filter((e) =>
  ROSTERED_IDS.includes(e.id)
)
