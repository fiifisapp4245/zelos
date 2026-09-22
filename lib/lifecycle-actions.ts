import type {
  Employee,
  LeaveRequest,
  LifecycleEvent,
  LifecycleState,
} from "./types"
import {
  LIFECYCLE_TRANSITIONS,
  RETIREMENT_AGE,
  TODAY_ISO,
  daysUntil,
} from "./format"
import { isOnStrength } from "./selectors"

/**
 * A lifecycle state is not a label — it is a promise that someone will do
 * something next. Probation ends, notice runs out, a suspension has to be
 * reviewed. These are the decisions the current states have made due.
 */
export type LifecycleActionKind =
  | "probation_due"
  | "start_due"
  | "notice_elapsed"
  | "leave_ended"
  | "suspension_review"
  | "retirement_due"
  | "contract_ending"

export interface LifecycleTask {
  id: string
  kind: LifecycleActionKind
  employee: Employee
  /** What the state machine is waiting for. */
  title: string
  detail: string
  /** The date the decision was or becomes due, as yyyy-mm-dd. */
  dueDate: string
  /** Negative once the date has passed. */
  daysLeft: number
  /** The transition offered as the default outcome. */
  primary: { label: string; to: LifecycleState }
  /** Other permitted outcomes for the same decision. */
  alternatives: { label: string; to: LifecycleState }[]
}

const KIND_LABEL: Record<LifecycleActionKind, string> = {
  probation_due: "Probation decision",
  start_due: "Start date reached",
  notice_elapsed: "Notice period served",
  leave_ended: "Return from leave",
  suspension_review: "Suspension review",
  retirement_due: "Retirement due",
  contract_ending: "Contract ending",
}

export function lifecycleActionLabel(kind: LifecycleActionKind) {
  return KIND_LABEL[kind]
}

/** yyyy-mm-dd, `days` after `iso`. */
function addDays(iso: string, days: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function retirementDate(dateOfBirth: string) {
  const d = new Date(dateOfBirth)
  d.setFullYear(d.getFullYear() + RETIREMENT_AGE)
  return d.toISOString().slice(0, 10)
}

/**
 * Builds the worklist from state alone, so it can never drift out of step with
 * the records. Only decisions that are due or overdue appear.
 */
export function lifecycleTasks(
  employees: Employee[],
  events: LifecycleEvent[],
  leave: LeaveRequest[],
  { horizonDays = 30 }: { horizonDays?: number } = {}
): LifecycleTask[] {
  const tasks: LifecycleTask[] = []

  const push = (t: Omit<LifecycleTask, "id" | "daysLeft">) => {
    const daysLeft = daysUntil(t.dueDate) ?? 0
    if (daysLeft > horizonDays) return

    // The worklist may only offer moves the state machine actually permits,
    // so an outcome can never be presented and then refused.
    const allowed = LIFECYCLE_TRANSITIONS[t.employee.lifecycleState]
    const offered = [t.primary, ...t.alternatives].filter((o) =>
      allowed.includes(o.to)
    )
    if (offered.length === 0) return

    tasks.push({
      ...t,
      id: `${t.kind}:${t.employee.id}`,
      daysLeft,
      primary: offered[0],
      alternatives: offered.slice(1),
    })
  }

  for (const e of employees) {
    if (!isOnStrength(e)) continue

    if (e.lifecycleState === "probation" && e.probationEndDate) {
      push({
        kind: "probation_due",
        employee: e,
        title: "Confirm or end probation",
        detail:
          "Probation cannot lapse quietly — the appointment is either confirmed or ended before the last day.",
        dueDate: e.probationEndDate,
        primary: { label: "Confirm appointment", to: "active" },
        alternatives: [{ label: "End probation", to: "terminated" }],
      })
    }

    if (e.lifecycleState === "pre_hire") {
      push({
        kind: "start_due",
        employee: e,
        title: "Bring onto strength",
        detail:
          "The record is still pre-hire. Nobody on pre-hire counts towards headcount or reaches payroll.",
        dueDate: e.startDate,
        primary: {
          label: e.probationEndDate ? "Start probation" : "Make active",
          to: e.probationEndDate ? "probation" : "active",
        },
        alternatives: [{ label: "Withdraw offer", to: "terminated" }],
      })
    }

    if (e.lifecycleState === "notice") {
      // Notice runs from the event that put them on notice, not from today.
      const onNotice = events
        .filter((ev) => ev.employeeId === e.id && ev.to === "notice")
        .sort((a, b) => b.at.localeCompare(a.at))[0]
      const from = onNotice?.effectiveDate ?? e.startDate
      push({
        kind: "notice_elapsed",
        employee: e,
        title: "Close out the exit",
        detail:
          "Notice has been served. Clearance and the final payroll run hang on this record leaving active headcount.",
        dueDate: addDays(from, e.noticePeriodDays),
        primary: { label: "Record resignation", to: "resigned" },
        alternatives: [
          { label: "Record termination", to: "terminated" },
          { label: "Withdraw notice", to: "active" },
        ],
      })
    }

    if (e.lifecycleState === "on_leave") {
      const current = leave
        .filter((l) => l.employeeId === e.id && l.status === "approved")
        .sort((a, b) => b.endDate.localeCompare(a.endDate))[0]
      if (current) {
        push({
          kind: "leave_ended",
          employee: e,
          title: "Return from leave",
          detail:
            "Approved leave has run its course. Attendance is expected again once the record is back to active.",
          dueDate: current.endDate,
          primary: { label: "Return to active", to: "active" },
          alternatives: [],
        })
      }
    }

    if (e.lifecycleState === "suspended") {
      const since = events
        .filter((ev) => ev.employeeId === e.id && ev.to === "suspended")
        .sort((a, b) => b.at.localeCompare(a.at))[0]
      push({
        kind: "suspension_review",
        employee: e,
        title: "Review the suspension",
        detail:
          "A suspension is a holding position, not an outcome. It is reviewed every 14 days until the case closes.",
        dueDate: addDays(since?.effectiveDate ?? TODAY_ISO, 14),
        primary: { label: "Lift suspension", to: "active" },
        alternatives: [{ label: "Terminate", to: "terminated" }],
      })
    }

    const retireOn = retirementDate(e.dateOfBirth)
    if ((daysUntil(retireOn) ?? 1e9) <= horizonDays) {
      push({
        kind: "retirement_due",
        employee: e,
        title: `Reaching ${RETIREMENT_AGE}`,
        detail:
          "Statutory retirement age. Either process the retirement or put a post-retirement contract in place first.",
        dueDate: retireOn,
        primary: { label: "Process retirement", to: "retired" },
        alternatives: [],
      })
    }

    if (e.contractEndDate && e.lifecycleState !== "notice") {
      push({
        kind: "contract_ending",
        employee: e,
        title: "Fixed-term contract ends",
        detail:
          "Renew it, convert it to permanent, or start notice. A contract that runs out unaddressed becomes a dispute.",
        dueDate: e.contractEndDate,
        primary: { label: "Start notice", to: "notice" },
        alternatives: [{ label: "Record expiry", to: "terminated" }],
      })
    }
  }

  return tasks.sort((a, b) => a.daysLeft - b.daysLeft)
}

export function isOverdue(t: LifecycleTask) {
  return t.daysLeft < 0
}
