import type { DayRecord } from "../attendance/types"
import type { ClockEvent } from "../attendance/types"
import type { Employee, LeaveRequest } from "../types"
import { addDays } from "../time"

/**
 * Where attendance and leave disagree.
 *
 * Neither record is altered to make the other true. A reconciliation
 * says who looked at the disagreement and what they did about it, and
 * the clock capture and the leave request both stay exactly as they
 * were — the correction, if one is needed, is made in the module that
 * owns the record.
 */

export type ReconcileKind =
  | "noRecordNoLeave"
  | "leaveAfterTheFact"
  | "clockedInOnLeave"
  | "pendingPastDate"

export const RECONCILE_LABEL: Record<ReconcileKind, string> = {
  noRecordNoLeave: "No record, no leave",
  leaveAfterTheFact: "Leave approved after the fact",
  clockedInOnLeave: "Clocked in during leave",
  pendingPastDate: "Pending leave on a past date",
}

export const RECONCILE_EXPLAINER: Record<ReconcileKind, string> = {
  noRecordNoLeave:
    "A scheduled day with nothing captured and no leave on file.",
  leaveAfterTheFact:
    "Leave was approved for a day that had already passed with no record.",
  clockedInOnLeave: "The clock captured someone on a day they were signed off.",
  pendingPastDate: "The days have passed and the request is still waiting.",
}

export type ReconcileAction =
  "linkedToLeave" | "noted" | "markedReconciled" | "reviewed" | "nudged"

export const ACTION_LABEL: Record<ReconcileAction, string> = {
  linkedToLeave: "Linked to leave",
  noted: "Noted",
  markedReconciled: "Marked reconciled",
  reviewed: "Reviewed with manager",
  nudged: "Approver nudged",
}

export interface ReconcileItem {
  /** `${kind}:${employeeId}:${first date}` */
  key: string
  kind: ReconcileKind
  employeeId: string
  /** Consecutive days, so a three-day gap is one item rather than three. */
  dates: string[]
  explanation: string
  /** The request this concerns, where one exists. */
  leaveRequestId: string | null
}

/** Who dealt with a mismatch, and when. Append-only. */
export interface Reconciliation {
  key: string
  action: ReconcileAction
  note?: string
  by: string
  at: string
}

/* ── Deriving the list ───────────────────────────────────────────────── */

interface Raw {
  kind: ReconcileKind
  employeeId: string
  date: string
  explanation: string
  leaveRequestId: string | null
}

/** Consecutive days for one person and one kind collapse into one item. */
function group(raw: Raw[]): ReconcileItem[] {
  const byKey = new Map<string, Raw[]>()
  for (const r of raw) {
    const id = `${r.kind}:${r.employeeId}:${r.leaveRequestId ?? ""}`
    const list = byKey.get(id)
    if (list) list.push(r)
    else byKey.set(id, [r])
  }

  const out: ReconcileItem[] = []
  for (const list of byKey.values()) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
    let run: Raw[] = []
    const flush = () => {
      if (run.length === 0) return
      out.push({
        key: `${run[0].kind}:${run[0].employeeId}:${run[0].date}`,
        kind: run[0].kind,
        employeeId: run[0].employeeId,
        dates: run.map((r) => r.date),
        explanation: run[0].explanation,
        leaveRequestId: run[0].leaveRequestId,
      })
      run = []
    }
    for (const r of sorted) {
      const last = run[run.length - 1]
      if (last && addDays(last.date, 1) !== r.date) flush()
      run.push(r)
    }
    flush()
  }

  return out.sort(
    (a, b) =>
      a.dates[0].localeCompare(b.dates[0]) || a.kind.localeCompare(b.kind)
  )
}

export interface ReconcileInput {
  records: DayRecord[]
  leave: LeaveRequest[]
  events: ClockEvent[]
  /** Dates in view, so nothing outside the period is judged. */
  dates: string[]
  /** Anything after this has not happened yet. */
  todayIso: string
}

export function reconcileItems({
  records,
  leave,
  events,
  dates,
  todayIso,
}: ReconcileInput): ReconcileItem[] {
  const inRange = new Set(dates)
  const people = new Set(records.map((r) => r.employeeId))
  const raw: Raw[] = []

  for (const r of records) {
    if (r.code !== "N") continue
    // A day that has not happened yet is not a day with no record.
    if (r.date > todayIso) continue
    raw.push({
      kind: "noRecordNoLeave",
      employeeId: r.employeeId,
      date: r.date,
      explanation:
        "Scheduled to work, nothing captured, and no leave covering the day.",
      leaveRequestId: null,
    })
  }

  for (const l of leave) {
    if (!people.has(l.employeeId)) continue

    if (
      l.status === "approved" &&
      l.decidedAt &&
      l.decidedAt.slice(0, 10) > l.startDate
    ) {
      for (const date of datesOf(l)) {
        if (!inRange.has(date) || date > todayIso) continue
        raw.push({
          kind: "leaveAfterTheFact",
          employeeId: l.employeeId,
          date,
          explanation: `Approved on ${l.decidedAt.slice(0, 10)}, after the day had passed. The register read no record until then.`,
          leaveRequestId: l.id,
        })
      }
    }

    if (l.status === "approved") {
      for (const date of datesOf(l)) {
        if (!inRange.has(date)) continue
        const event = events.find(
          (e) => e.employeeId === l.employeeId && e.date === date && e.clockIn
        )
        if (!event) continue
        raw.push({
          kind: "clockedInOnLeave",
          employeeId: l.employeeId,
          date,
          explanation: `Clocked in at ${event.clockIn} on an approved leave day.`,
          leaveRequestId: l.id,
        })
      }
    }

    if (l.status === "pending" && l.startDate <= todayIso) {
      for (const date of datesOf(l)) {
        if (!inRange.has(date) || date > todayIso) continue
        raw.push({
          kind: "pendingPastDate",
          employeeId: l.employeeId,
          date,
          explanation: `Submitted ${l.submittedAt.slice(0, 10)} and still waiting on a decision.`,
          leaveRequestId: l.id,
        })
      }
    }
  }

  return group(raw)
}

function datesOf(l: LeaveRequest) {
  const out: string[] = []
  for (let d = l.startDate; d <= l.endDate; d = addDays(d, 1)) out.push(d)
  return out
}

export function isReconciled(item: ReconcileItem, list: Reconciliation[]) {
  return list.some((r) => r.key === item.key)
}

/** What can be done about a mismatch, in the order a person would try. */
export const SUGGESTED: Record<
  ReconcileKind,
  { action: ReconcileAction; label: string; opensLeave?: boolean }[]
> = {
  noRecordNoLeave: [
    { action: "linkedToLeave", label: "Link to leave", opensLeave: true },
    { action: "noted", label: "Add note" },
  ],
  leaveAfterTheFact: [{ action: "markedReconciled", label: "Mark reconciled" }],
  clockedInOnLeave: [
    { action: "reviewed", label: "Review with manager" },
    {
      action: "markedReconciled",
      label: "Cancel remaining leave",
      opensLeave: true,
    },
  ],
  pendingPastDate: [
    { action: "nudged", label: "Nudge approver", opensLeave: true },
  ],
}

/* ── Coverage ────────────────────────────────────────────────────────── */

export interface CoverageCell {
  department: string
  date: string
  away: number
  headcount: number
  /** Above the company's threshold for one department on one day. */
  warn: boolean
}

/**
 * How thin a department is on a day. Approved leave only: a pending
 * request has not taken anyone out of the building yet.
 */
export function coverage(
  employees: Employee[],
  dates: string[],
  leave: LeaveRequest[],
  warnPercent: number
): CoverageCell[] {
  const departments = [...new Set(employees.map((e) => e.department))].sort()
  const out: CoverageCell[] = []

  for (const department of departments) {
    const people = employees.filter((e) => e.department === department)
    for (const date of dates) {
      const away = people.filter((e) =>
        leave.some(
          (l) =>
            l.employeeId === e.id &&
            l.status === "approved" &&
            l.startDate <= date &&
            l.endDate >= date
        )
      ).length
      out.push({
        department,
        date,
        away,
        headcount: people.length,
        warn: people.length > 0 && (away / people.length) * 100 >= warnPercent,
      })
    }
  }

  return out
}
