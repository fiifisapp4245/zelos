import type { DayRecord, PayPeriod, Timesheet, TimesheetStatus } from "./types"
import { scheduledHours, totalHours } from "./derive"

export const TIMESHEET_STATUS_LABEL: Record<TimesheetStatus, string> = {
  notSubmitted: "Not submitted",
  pendingReview: "Pending review",
  changesRequested: "Changes requested",
  approved: "Approved",
}

export const PERIOD_STATUS_LABEL: Record<PayPeriod["status"], string> = {
  open: "Open",
  inReview: "In review",
  readyForPayroll: "Ready for payroll",
  closed: "Closed",
}

export interface TimesheetSummary {
  employeeId: string
  status: TimesheetStatus
  worked: number
  scheduled: number
  variance: number
  overtime: number
  daysPresent: number
  noRecordDays: number
  autoClosedDays: number
  adjustmentCount: number
  records: DayRecord[]
}

/** One person's period, totalled from their days rather than stored. */
export function summarise(
  employeeId: string,
  records: DayRecord[],
  status: TimesheetStatus
): TimesheetSummary {
  const mine = records.filter((r) => r.employeeId === employeeId)
  const worked = totalHours(mine)
  const scheduled = scheduledHours(mine)
  return {
    employeeId,
    status,
    worked,
    scheduled,
    variance: Math.round((worked - scheduled) * 10) / 10,
    overtime:
      Math.round(mine.reduce((n, r) => n + r.overtimeHours, 0) * 10) / 10,
    daysPresent: mine.filter((r) => ["P", "R", "L"].includes(r.code)).length,
    noRecordDays: mine.filter((r) => r.code === "N").length,
    autoClosedDays: mine.filter((r) => r.autoClosed).length,
    adjustmentCount: mine.reduce((n, r) => n + r.adjustments.length, 0),
    records: mine,
  }
}

export function statusFor(
  timesheets: Timesheet[],
  periodId: string,
  employeeId: string
): TimesheetStatus {
  return (
    timesheets.find(
      (t) => t.periodId === periodId && t.employeeId === employeeId
    )?.status ?? "notSubmitted"
  )
}

/**
 * Why the period cannot be closed yet, in the order someone would fix it.
 * An empty list means the button is live.
 */
export function blockersFor({
  summaries,
  openExceptions,
}: {
  summaries: TimesheetSummary[]
  openExceptions: number
}): string[] {
  const out: string[] = []
  const unapproved = summaries.filter((s) => s.status !== "approved")
  if (unapproved.length > 0) {
    out.push(
      `${unapproved.length} ${unapproved.length === 1 ? "timesheet is" : "timesheets are"} not approved`
    )
  }
  if (openExceptions > 0) {
    out.push(
      `${openExceptions} ${openExceptions === 1 ? "exception is" : "exceptions are"} still open`
    )
  }
  return out
}
