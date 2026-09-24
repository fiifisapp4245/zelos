/**
 * Schedules are the source of truth for what was expected of someone on a
 * given day. Lateness, variance and overtime are all measured against what
 * this module says, so nothing else in the product gets to decide it.
 *
 * Two ways of expecting someone:
 *
 *  - a **work pattern**, for fixed-hours staff, assigned by company,
 *    branch, department or individually, from a date;
 *  - a **shift**, for rostered staff, which is a specific day's expectation
 *    and beats any pattern underneath it once published.
 *
 * Neither is ever rewritten in place. An assignment is superseded by a
 * later one, so history stays truthful for past dates, and every roster
 * change is recorded with who, when and why.
 */

/** 1 = Monday … 7 = Sunday, so week arithmetic reads the way people speak. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** One working day inside a pattern. Days not listed are non-working. */
export interface PatternDay {
  weekday: Weekday
  /** HH:mm, local. */
  start: string
  end: string
}

export interface WorkPattern {
  id: string
  name: string
  days: PatternDay[]
  breakMinutes: number
  /** An unpaid break comes off the hours; a paid one does not. */
  breakPaid: boolean
  /**
   * Minutes past the scheduled start before an arrival counts as late.
   * null takes the company figure from Settings → Time & attendance.
   */
  graceMinutes: number | null
  /** Pattern rows are kept once assigned, so history still resolves. */
  archived?: boolean
}

export type AssignmentScope = "company" | "branch" | "department" | "employee"

/**
 * Who follows which pattern, from when.
 *
 * `patternId: null` means rostered: this person's expectation comes from
 * published shifts, not from a pattern. It is a deliberate state, not a
 * gap — a rostered person with no shifts genuinely has no schedule, and
 * the roster says so rather than guessing.
 */
export interface PatternAssignment {
  id: string
  patternId: string | null
  scope: AssignmentScope
  /** Employee id, department name or branch name. null for company. */
  target: string | null
  /** yyyy-mm-dd. Applies to this date and every date after it. */
  effectiveFrom: string
  reason: string
  createdBy: string
  createdAt: string
}

/* ── Roster ──────────────────────────────────────────────────────────── */

export type ShiftState = "draft" | "published"

export interface Shift {
  id: string
  /** null is an open shift: rostered work with nobody on it yet. */
  employeeId: string | null
  /** yyyy-mm-dd */
  date: string
  start: string
  end: string
  breakMinutes: number
  position: string
  branch: string
  department: string
  note?: string
  state: ShiftState
  /** When it was last published. Absent on a shift never published. */
  publishedAt?: string
  /**
   * Edited after publishing. The people on it were told one thing and the
   * roster now says another, so the chip has to say so.
   */
  changedSincePublish?: boolean
  /**
   * A published shift that has been cancelled. It stays on the record —
   * deleting it would erase a commitment somebody was given.
   */
  cancelled?: boolean
}

export type ShiftAction =
  "created" | "edited" | "assigned" | "cancelled" | "published"

/** The trail. Append-only: nothing here is ever edited or removed. */
export interface ShiftChange {
  id: string
  shiftId: string
  action: ShiftAction
  /** Plain words: "09:00–17:00 → 10:00–18:00". */
  summary: string
  reason?: string
  by: string
  at: string
}

/* ── Derived ─────────────────────────────────────────────────────────── */

/** What was expected of one person on one day, whatever produced it. */
export interface Expectation {
  start: string
  end: string
  breakMinutes: number
  breakPaid: boolean
  graceMinutes: number
  /** Which of the two decided it, for the "why" in the day detail. */
  from: "shift" | "pattern"
  patternId: string | null
  shiftId: string | null
  position: string | null
}

export type WarningKind =
  "onLeave" | "overlap" | "overtime" | "shortRest" | "openShift"

export interface RosterWarning {
  key: string
  kind: WarningKind
  /** null on an open shift, which is nobody's yet. */
  employeeId: string | null
  date: string
  detail: string
  shiftIds: string[]
}
