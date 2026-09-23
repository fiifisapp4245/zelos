// A small roster: enough to populate Schedules, My schedule and the shift
// swap approvals. Times are local, 24-hour, at the employee's own branch.

export interface Shift {
  id: string
  employeeId: string
  /** yyyy-mm-dd */
  date: string
  /** HH:mm */
  start: string
  end: string
  branch: string
  pattern: "day" | "early" | "late" | "weekend"
  /** Set while the shift is open for anyone to pick up. */
  open?: boolean
}

export const SHIFTS: Shift[] = [
  // Operations runs a two-shift day at Takoradi.
  {
    id: "sh-001",
    employeeId: "mensa",
    date: "2026-09-21",
    start: "06:00",
    end: "14:00",
    branch: "Takoradi",
    pattern: "early",
  },
  {
    id: "sh-002",
    employeeId: "mensa",
    date: "2026-09-22",
    start: "06:00",
    end: "14:00",
    branch: "Takoradi",
    pattern: "early",
  },
  {
    id: "sh-003",
    employeeId: "nii",
    date: "2026-09-21",
    start: "14:00",
    end: "22:00",
    branch: "Takoradi",
    pattern: "late",
  },
  {
    id: "sh-004",
    employeeId: "nii",
    date: "2026-09-22",
    start: "14:00",
    end: "22:00",
    branch: "Takoradi",
    pattern: "late",
  },
  {
    id: "sh-005",
    employeeId: "kojo",
    date: "2026-09-23",
    start: "06:00",
    end: "14:00",
    branch: "Takoradi",
    pattern: "early",
  },
  {
    id: "sh-006",
    employeeId: "yaa",
    date: "2026-09-23",
    start: "14:00",
    end: "22:00",
    branch: "Takoradi",
    pattern: "late",
  },

  // Customer Success covers Saturday from Accra.
  {
    id: "sh-007",
    employeeId: "akos",
    date: "2026-09-26",
    start: "09:00",
    end: "15:00",
    branch: "Accra HQ",
    pattern: "weekend",
  },
  {
    id: "sh-008",
    employeeId: "abla",
    date: "2026-10-03",
    start: "09:00",
    end: "15:00",
    branch: "Accra HQ",
    pattern: "weekend",
  },

  // Standard office days, for the My schedule view.
  {
    id: "sh-009",
    employeeId: "kofi",
    date: "2026-09-21",
    start: "08:00",
    end: "17:00",
    branch: "Accra HQ",
    pattern: "day",
  },
  {
    id: "sh-010",
    employeeId: "kofi",
    date: "2026-09-22",
    start: "08:00",
    end: "17:00",
    branch: "Accra HQ",
    pattern: "day",
  },
  {
    id: "sh-011",
    employeeId: "kofi",
    date: "2026-09-23",
    start: "08:00",
    end: "17:00",
    branch: "Accra HQ",
    pattern: "day",
  },

  // Unassigned, waiting for someone to claim it.
  {
    id: "sh-012",
    employeeId: "",
    date: "2026-09-27",
    start: "09:00",
    end: "15:00",
    branch: "Accra HQ",
    pattern: "weekend",
    open: true,
  },
]

export function shiftById(id: string) {
  return SHIFTS.find((s) => s.id === id)
}
