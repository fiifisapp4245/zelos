/**
 * Attendance records presence, never its absence.
 *
 * There is no "absent" anywhere in this model. A day with nothing captured
 * is a day with **no record** — which is a gap in the data, not a finding
 * about the person. Calling it absence would be the system asserting
 * something it cannot know.
 */

/** The letter shown in a register cell. N is no record, never absence. */
export type DayCode =
  | "P" // present on site
  | "R" // remote
  | "L" // late against the scheduled start plus grace
  | "N" // no record: nothing captured and no leave on file
  | "V" // on leave
  | "H" // public holiday
  | "-" // not a working day for this person

export type CaptureSource = "fingerprint" | "web"

/** Mon–Fri office hours, or a named shift for branch and operations staff. */
export interface WorkPattern {
  id: string
  label: string
  /** 1 = Monday … 7 = Sunday. */
  workingDays: number[]
  /** HH:mm, local. */
  start: string
  end: string
  breakMinutes: number
}

export interface EmployeeSchedule {
  employeeId: string
  patternId: string
}

/**
 * What the clock captured. Never edited and never deleted — a correction
 * adds a TimeAdjustment that points back here, so the original reading
 * survives alongside whatever replaced it.
 */
export interface ClockEvent {
  id: string
  employeeId: string
  /** yyyy-mm-dd */
  date: string
  /** HH:mm, or null where the reader captured nothing. */
  clockIn: string | null
  clockOut: string | null
  source: CaptureSource
  branch: string
  breakMinutes: number
  /** Set when the day was closed by the system rather than by the person. */
  autoClosed?: boolean
}

export type AdjustmentStatus = "pending" | "approved" | "declined"

/**
 * A correction. It supersedes a reading without overwriting it: the UI shows
 * "09:42 → 09:05", both times, who changed it and why.
 */
export interface TimeAdjustment {
  id: string
  /** → ClockEvent */
  eventId: string
  employeeId: string
  date: string
  field: "clockIn" | "clockOut" | "both"
  /** What the clock had. */
  originalIn: string | null
  originalOut: string | null
  /** What it should read. */
  correctedIn: string | null
  correctedOut: string | null
  reason: string
  requestedBy: string
  requestedAt: string
  status: AdjustmentStatus
  decidedBy?: string
  decidedAt?: string
}

/* ── Exceptions ──────────────────────────────────────────────────────── */

export type ExceptionKind =
  "noRecord" | "late" | "autoClosed" | "outsideSchedule"

export interface ExceptionResolution {
  /** `${kind}:${employeeId}:${date}` */
  key: string
  action: "linkedToLeave" | "noted" | "correctionRequested"
  note?: string
  resolvedBy: string
  resolvedAt: string
}

/* ── Pay periods and timesheets ──────────────────────────────────────── */

export type PayPeriodStatus = "open" | "inReview" | "readyForPayroll" | "closed"

export interface PayPeriod {
  id: string
  label: string
  /** yyyy-mm-dd, inclusive. */
  start: string
  end: string
  status: PayPeriodStatus
}

export type TimesheetStatus =
  "notSubmitted" | "pendingReview" | "changesRequested" | "approved"

export interface Timesheet {
  id: string
  periodId: string
  employeeId: string
  status: TimesheetStatus
  submittedAt?: string
  decidedBy?: string
  decidedAt?: string
  /** Required when changes are requested. */
  comment?: string
}

/* ── Derived ─────────────────────────────────────────────────────────── */

/** One employee, one day, after the raw data has been read together. */
export interface DayRecord {
  employeeId: string
  date: string
  code: DayCode
  /** The schedule that applied, where the day was a working one. */
  scheduled: { start: string; end: string; breakMinutes: number } | null
  /** After adjustments, which is what the hours are counted from. */
  clockIn: string | null
  clockOut: string | null
  source: CaptureSource | null
  branch: string | null
  breakMinutes: number
  hours: number
  /** Minutes past the scheduled start plus grace. 0 when not late. */
  lateByMinutes: number
  /** Hours beyond the scheduled length. */
  overtimeHours: number
  /** Worked minus scheduled, in hours. Negative is short. */
  varianceHours: number
  autoClosed: boolean
  adjustments: TimeAdjustment[]
  /** → LeaveRequest, when the day is covered by leave. */
  leaveRequestId: string | null
  leaveType: string | null
  holidayName: string | null
}
