// Daily recorded time, and the corrections people have asked for against it.
// Small on purpose: one week for a handful of people, enough for the week
// bar on My day and the attendance and timesheet approvals.

export interface TimesheetEntry {
  id: string
  employeeId: string
  /** yyyy-mm-dd */
  date: string
  /** HH:mm as the clock actually recorded it, null where nothing was captured. */
  clockIn: string | null
  clockOut: string | null
  hours: number
  project?: string
}

/**
 * A request to change what the clock recorded. It carries both sides so the
 * approver can see what is being overwritten.
 */
export interface TimesheetCorrection {
  id: string
  entryId: string
  employeeId: string
  date: string
  recorded: { clockIn: string | null; clockOut: string | null; hours: number }
  corrected: { clockIn: string; clockOut: string; hours: number }
  reason: string
}

const WEEK = [
  "2026-09-14",
  "2026-09-15",
  "2026-09-16",
  "2026-09-17",
  "2026-09-18",
]

/** A full, unremarkable week for one person. */
function week(
  employeeId: string,
  hours: number,
  project?: string
): TimesheetEntry[] {
  return WEEK.map((date, i) => ({
    id: `ts-${employeeId}-${i}`,
    employeeId,
    date,
    clockIn: "08:00",
    clockOut: hours >= 9 ? "17:30" : "17:00",
    hours,
    project,
  }))
}

export const TIMESHEETS: TimesheetEntry[] = [
  ...week("kofi", 8.5, "Payments migration"),
  ...week("nana", 8, "Design system"),
  ...week("selorm", 9, "Platform reliability"),
  ...week("kwame", 8, "Insights"),
  // Afia forgot to clock out on the Tuesday — the correction below fixes it.
  ...week("afia", 8).map((e) =>
    e.date === "2026-09-15" ? { ...e, clockOut: null, hours: 0 } : e
  ),
]

export const TIMESHEET_CORRECTIONS: TimesheetCorrection[] = [
  {
    id: "tc-001",
    entryId: "ts-afia-1",
    employeeId: "afia",
    date: "2026-09-15",
    recorded: { clockIn: "08:00", clockOut: null, hours: 0 },
    corrected: { clockIn: "08:00", clockOut: "17:00", hours: 8 },
    reason: "Left through the back gate, card reader missed the exit.",
  },
  {
    id: "tc-002",
    entryId: "ts-selorm-3",
    employeeId: "selorm",
    date: "2026-09-17",
    recorded: { clockIn: "08:00", clockOut: "17:30", hours: 9 },
    corrected: { clockIn: "08:00", clockOut: "21:15", hours: 12.5 },
    reason: "Stayed for the failover test; overtime agreed beforehand.",
  },
]

export function weekTotal(employeeId: string, entries = TIMESHEETS) {
  return (
    Math.round(
      entries
        .filter((e) => e.employeeId === employeeId && WEEK.includes(e.date))
        .reduce((n, e) => n + e.hours, 0) * 10
    ) / 10
  )
}

export function entryById(id: string, entries = TIMESHEETS) {
  return entries.find((e) => e.id === id)
}
