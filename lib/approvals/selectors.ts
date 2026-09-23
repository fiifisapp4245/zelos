import type { Employee } from "../types"
import type { SessionContext } from "../session"
import { resolveAudience } from "../nav/get-nav-for-user"
import { APPROVAL_MODULE } from "./approval-chains"
import type {
  ApprovalItem,
  ApprovalModule,
  ApprovalRole,
  ApprovalType,
  Decision,
} from "./types"

export type ApprovalTab = "waiting" | "inProgress" | "completed"

export interface ApprovalFilters {
  module?: ApprovalModule | "all"
  type?: ApprovalType | "all"
  requester?: string | "all"
  /** Branch or department name, matched against the subject's record. */
  unit?: string | "all"
  from?: string
  to?: string
  overdueOnly?: boolean
}

/** Which chain roles a persona may act on. */
const ROLES_BY_AUDIENCE: Record<string, ApprovalRole[]> = {
  hr_admin: ["hr_admin"],
  payroll: ["payroll_officer"],
  manager: ["line_manager", "head_of_department"],
  employee: [],
}

export function currentStep(item: ApprovalItem) {
  return item.chain[item.currentStepIndex]
}

export function isOverdue(item: ApprovalItem, now: Date) {
  if (item.status !== "pending") return false
  return item.dueAt < now.toISOString().slice(0, 10)
}

/** Whether this session owns the step the item is sitting on. */
export function isWaitingOn(
  item: ApprovalItem,
  session: SessionContext,
  employees: Employee[]
) {
  if (item.status !== "pending") return false

  const audience = resolveAudience(session)
  const roles = ROLES_BY_AUDIENCE[audience] ?? []
  const step = currentStep(item)
  if (!step || !roles.includes(step.role)) return false

  // A named assignee settles it outright.
  if (step.assigneeId) return step.assigneeId === session.id

  if (audience === "manager") {
    const subject = employees.find((e) => e.id === item.subject)
    if (!subject) return false
    // A line manager answers for their reports; a head of department for
    // everyone in the department they run.
    if (step.role === "line_manager") {
      return (
        subject.managerId === session.id ||
        subject.dottedLineManagerId === session.id
      )
    }
    return subject.department === session.department
  }

  return true
}

/**
 * Overdue first, then due today, then oldest submitted — which is just the
 * due date ascending, then the submission date. No clock needed: a date
 * further in the past is more urgent whenever "now" happens to be.
 */
function byUrgency(a: ApprovalItem, b: ApprovalItem) {
  if (a.dueAt !== b.dueAt) return a.dueAt < b.dueAt ? -1 : 1
  return a.submittedAt.localeCompare(b.submittedAt)
}

function matches(
  item: ApprovalItem,
  f: ApprovalFilters,
  employees: Employee[],
  now: Date
) {
  if (f.module && f.module !== "all" && item.module !== f.module) return false
  if (f.type && f.type !== "all" && item.type !== f.type) return false
  if (f.requester && f.requester !== "all" && item.requester !== f.requester)
    return false
  if (f.unit && f.unit !== "all") {
    const subject = employees.find((e) => e.id === item.subject)
    if (subject?.department !== f.unit && subject?.branch !== f.unit)
      return false
  }
  if (f.from && item.submittedAt.slice(0, 10) < f.from) return false
  if (f.to && item.submittedAt.slice(0, 10) > f.to) return false
  if (f.overdueOnly && !isOverdue(item, now)) return false
  return true
}

/**
 * The approvals one session sees on one tab.
 *
 * - waiting: pending, and the current step is theirs
 * - inProgress: they already decided, and it is still moving
 * - completed: they decided, and it has settled
 *
 * The same function serves the Approvals page and the Home widget, so the
 * two can never show different queues.
 */
export function getApprovalsForUser(
  session: SessionContext,
  items: ApprovalItem[],
  {
    tab = "waiting",
    filters = {},
    employees = [],
    now = new Date(),
  }: {
    tab?: ApprovalTab
    filters?: ApprovalFilters
    employees?: Employee[]
    now?: Date
  } = {}
): ApprovalItem[] {
  if (resolveAudience(session) === "employee") return []

  const decidedByMe = (i: ApprovalItem) =>
    i.history.some((d) => d.actorId === session.id)

  const pool = items.filter((item) => {
    if (tab === "waiting") return isWaitingOn(item, session, employees)
    if (tab === "inProgress")
      return item.status === "pending" && decidedByMe(item)
    return item.status !== "pending" && decidedByMe(item)
  })

  return pool.filter((i) => matches(i, filters, employees, now)).sort(byUrgency)
}

/**
 * Records a decision and moves the item on.
 *
 * A decline or reject is terminal: the chain stops there and the item is
 * declined. Resubmitting creates a new item — a declined one is never
 * reopened. An approval advances to the next step, or settles the item when
 * there is no next step.
 */
export function applyDecision(
  item: ApprovalItem,
  decision: Decision
): ApprovalItem {
  const history = [...item.history, decision]
  const negative = decision.action === "decline" || decision.action === "reject"

  if (negative) {
    return { ...item, history, status: "declined" }
  }

  const next = item.currentStepIndex + 1
  if (next >= item.chain.length) {
    return {
      ...item,
      history,
      currentStepIndex: item.chain.length - 1,
      status: "approved",
    }
  }
  return { ...item, history, currentStepIndex: next, status: "pending" }
}

/** "Step 2 of 3", one-based, for the stepper and its text equivalent. */
export function stepPosition(item: ApprovalItem) {
  return { step: item.currentStepIndex + 1, of: item.chain.length }
}

export function moduleOf(type: ApprovalType) {
  return APPROVAL_MODULE[type]
}
