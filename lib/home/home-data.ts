import type {
  ActingAssignment,
  ApprovalRequest,
  ApprovalStage,
  Employee,
  EmployeeDocument,
  LeaveRequest,
  PerformanceReview,
} from "../types"
import type { NavAudience } from "../nav/nav-config"
import type { WidgetScope } from "./home-config"
import { TODAY, TODAY_ISO, daysUntil } from "../format"
import { completeness } from "../selectors"

/** The step a request is sitting on right now, if any. */
export function currentStep(request: ApprovalRequest) {
  return request.chain.find((s) => s.decision === "pending") ?? null
}

export function stepPosition(request: ApprovalRequest) {
  const index = request.chain.findIndex((s) => s.decision === "pending")
  return {
    step: index === -1 ? request.chain.length : index + 1,
    of: request.chain.length,
  }
}

export const STAGE_LABEL: Record<ApprovalStage, string> = {
  line_manager: "Line manager",
  head_of_department: "HoD",
  hr: "HR",
  payroll: "Payroll",
}

/** Which stages a persona is allowed to act on. */
const STAGES_BY_AUDIENCE: Record<NavAudience, ApprovalStage[]> = {
  hr_admin: ["hr"],
  manager: ["line_manager", "head_of_department"],
  payroll: ["payroll"],
  employee: [],
}

/**
 * The queue for one persona: only requests whose *current* step belongs to
 * them. An HR Admin sees the HR stage across the company; a manager sees only
 * their own people, and only while it is their turn.
 *
 * Sort is overdue first, then due today, then oldest — the order you would
 * work them in.
 */
export function approvalsFor(
  approvals: ApprovalRequest[],
  audience: NavAudience,
  viewerId: string,
  employees: Employee[],
  scope: WidgetScope | undefined
): ApprovalRequest[] {
  const stages = STAGES_BY_AUDIENCE[audience]
  if (stages.length === 0) return []

  const teamIds = new Set(
    employees
      .filter(
        (e) => e.managerId === viewerId || e.dottedLineManagerId === viewerId
      )
      .map((e) => e.id)
  )

  return approvals
    .filter((r) => r.status === "pending")
    .filter((r) => {
      const step = currentStep(r)
      if (!step || !stages.includes(step.stage)) return false

      // A document still waiting on the employee is their homework, not a
      // queue item — it shows up on their own requests list instead.
      if (r.kind === "document" && r.waitingOn === "employee") return false

      if (scope === "payDetails" && r.kind !== "pay_details") return false
      if (scope === "team" && !teamIds.has(r.employeeId)) return false
      return true
    })
    .sort((a, b) => {
      const da = daysUntil(a.dueOn) ?? 0
      const db = daysUntil(b.dueOn) ?? 0
      if (da !== db) return da - db
      return a.submittedAt.localeCompare(b.submittedAt)
    })
}

/** Requests belonging to one person, whatever stage they are at. */
export function myRequests(
  approvals: ApprovalRequest[],
  employeeId: string
): ApprovalRequest[] {
  return approvals
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

/* ── Needs attention ─────────────────────────────────────────────────────── */

export type AttentionKind =
  | "documentExpiring"
  | "probationEnding"
  | "actingEnding"
  | "recordIncomplete"
  | "contractEnding"
  | "reviewDue"
  | "missingPayDetails"
  | "missingStatutoryIds"
  | "lifecycleThisPeriod"

export interface AttentionItem {
  id: string
  kind: AttentionKind
  employee: Employee
  issue: string
  /** yyyy-mm-dd, or null when the item has no date of its own. */
  dueOn: string | null
  daysLeft: number | null
  actionLabel: string
  href: string
}

export type AttentionBucket = "Overdue" | "This week" | "Later"

export function bucketFor(item: AttentionItem): AttentionBucket {
  if (item.daysLeft === null) return "Later"
  if (item.daysLeft < 0) return "Overdue"
  if (item.daysLeft <= 7) return "This week"
  return "Later"
}

export function attentionItemsFor({
  scope,
  viewerId,
  employees,
  documents,
  acting,
  reviews,
  approvals,
}: {
  scope: WidgetScope | undefined
  viewerId: string
  employees: Employee[]
  documents: EmployeeDocument[]
  acting: ActingAssignment[]
  reviews: PerformanceReview[]
  approvals: ApprovalRequest[]
}): AttentionItem[] {
  const inScope = (id: string) => {
    if (scope !== "team") return true
    const e = employees.find((x) => x.id === id)
    return e?.managerId === viewerId || e?.dottedLineManagerId === viewerId
  }
  const byId = (id: string) => employees.find((e) => e.id === id)
  const items: AttentionItem[] = []

  const push = (
    partial: Omit<AttentionItem, "daysLeft"> & { dueOn: string | null }
  ) =>
    items.push({
      ...partial,
      daysLeft: partial.dueOn ? daysUntil(partial.dueOn) : null,
    })

  // Payroll cares about whether the run will clear, not about probation.
  if (scope === "payroll") {
    for (const e of employees) {
      if (!e.compensation.bankAccount && !e.compensation.momoNumber) {
        push({
          id: `pay-${e.id}`,
          kind: "missingPayDetails",
          employee: e,
          issue: "No bank or mobile money account on file",
          dueOn: null,
          actionLabel: "Complete record",
          href: `/employees/${e.id}`,
        })
      }
      if (!e.compensation.ssnitNumber || !e.compensation.tin) {
        push({
          id: `ids-${e.id}`,
          kind: "missingStatutoryIds",
          employee: e,
          issue: !e.compensation.ssnitNumber
            ? "Missing SSNIT number"
            : "Missing TIN",
          dueOn: null,
          actionLabel: "Complete record",
          href: `/employees/${e.id}`,
        })
      }
    }
    for (const r of approvals) {
      if (r.kind !== "lifecycle" || r.status !== "pending") continue
      const e = byId(r.employeeId)
      const d = daysUntil(r.effectiveDate)
      // Anything landing inside this pay period changes what payroll owes.
      if (!e || d === null || d > 30) continue
      push({
        id: `lc-${r.id}`,
        kind: "lifecycleThisPeriod",
        employee: e,
        issue: `${r.after.jobTitle} on ${r.after.payGrade} — effective this pay period`,
        dueOn: r.effectiveDate,
        actionLabel: "Review",
        href: "/approvals",
      })
    }
    return items.sort(sortAttention)
  }

  for (const d of documents) {
    if (!d.expiresOn || !inScope(d.employeeId)) continue
    const left = daysUntil(d.expiresOn)
    if (left === null || left > 30) continue
    const e = byId(d.employeeId)
    if (!e) continue
    push({
      id: `doc-${d.id}`,
      kind: "documentExpiring",
      employee: e,
      issue: `${d.name} expires`,
      dueOn: d.expiresOn,
      actionLabel: "Review",
      href: `/employees/${e.id}`,
    })
  }

  for (const e of employees) {
    if (!inScope(e.id)) continue

    if (e.lifecycleState === "probation" && e.probationEndDate) {
      const left = daysUntil(e.probationEndDate)
      if (left !== null && left <= 14) {
        push({
          id: `prob-${e.id}`,
          kind: "probationEnding",
          employee: e,
          issue: "Probation ends",
          dueOn: e.probationEndDate,
          actionLabel: "Confirm probation",
          href: `/employees/${e.id}`,
        })
      }
    }

    if (e.contractEndDate) {
      const left = daysUntil(e.contractEndDate)
      if (left !== null && left <= 30) {
        push({
          id: `con-${e.id}`,
          kind: "contractEnding",
          employee: e,
          issue: "Fixed-term contract ends",
          dueOn: e.contractEndDate,
          actionLabel: "Review",
          href: `/employees/${e.id}`,
        })
      }
    }

    // Records are only HR's problem; a manager cannot fill these in.
    if (scope !== "team") {
      const record = completeness(e)
      if (record.missing.length > 0) {
        push({
          id: `rec-${e.id}`,
          kind: "recordIncomplete",
          employee: e,
          issue: `Record ${record.percent}% complete — ${record.missing.join(", ")}`,
          dueOn: null,
          actionLabel: "Complete record",
          href: `/employees/${e.id}`,
        })
      }
    }
  }

  for (const a of acting) {
    if (!inScope(a.employeeId)) continue
    const left = daysUntil(a.endDate)
    if (left === null || left > 14) continue
    const e = byId(a.employeeId)
    if (!e) continue
    push({
      id: `act-${a.id}`,
      kind: "actingEnding",
      employee: e,
      issue: `Acting as ${a.jobTitle} ends`,
      dueOn: a.endDate,
      actionLabel: "Extend or end",
      href: `/employees/${e.id}`,
    })
  }

  // "Reviews you own", which used to be its own panel on the old overview.
  for (const r of reviews) {
    if (r.status === "complete") continue
    if (scope === "team" && r.managerId !== viewerId) continue
    const e = byId(r.employeeId)
    if (!e) continue
    push({
      id: `rev-${r.id}`,
      kind: "reviewDue",
      employee: e,
      issue: `${r.cycle} review still open`,
      dueOn: r.dueOn,
      actionLabel: "Review",
      href: "/performance",
    })
  }

  return items.sort(sortAttention)
}

function sortAttention(a: AttentionItem, b: AttentionItem) {
  if (a.daysLeft === null && b.daysLeft === null) return 0
  if (a.daysLeft === null) return 1
  if (b.daysLeft === null) return -1
  return a.daysLeft - b.daysLeft
}

/* ── Rail ────────────────────────────────────────────────────────────────── */

export interface Celebration {
  employee: Employee
  kind: "birthday" | "anniversary"
  /** yyyy-mm-dd of the occasion this year. */
  on: string
  daysAway: number
  years?: number
}

/** The same month and day, in the year that makes it upcoming. */
function nextOccurrence(iso: string) {
  const d = new Date(iso)
  const candidate = new Date(TODAY)
  candidate.setMonth(d.getMonth(), d.getDate())
  if (candidate < new Date(TODAY_ISO))
    candidate.setFullYear(candidate.getFullYear() + 1)
  return candidate.toISOString().slice(0, 10)
}

export function celebrationsFor(
  employees: Employee[],
  withinDays = 7
): Celebration[] {
  const out: Celebration[] = []
  for (const e of employees) {
    const birthday = nextOccurrence(e.dateOfBirth)
    const bd = daysUntil(birthday)
    if (bd !== null && bd >= 0 && bd <= withinDays) {
      out.push({ employee: e, kind: "birthday", on: birthday, daysAway: bd })
    }
    const anniversary = nextOccurrence(e.startDate)
    const ad = daysUntil(anniversary)
    const years =
      new Date(anniversary).getFullYear() - new Date(e.startDate).getFullYear()
    if (ad !== null && ad >= 0 && ad <= withinDays && years > 0) {
      out.push({
        employee: e,
        kind: "anniversary",
        on: anniversary,
        daysAway: ad,
        years,
      })
    }
  }
  return out.sort((a, b) => a.daysAway - b.daysAway)
}

/** Who is away today, from approved leave that spans the date. */
export function outToday(employees: Employee[], leave: LeaveRequest[]) {
  const ids = new Set(employees.map((e) => e.id))
  return leave
    .filter(
      (l) =>
        l.status === "approved" &&
        ids.has(l.employeeId) &&
        l.startDate <= TODAY_ISO &&
        l.endDate >= TODAY_ISO
    )
    .map((l) => ({
      employee: employees.find((e) => e.id === l.employeeId)!,
      type: l.type,
      until: l.endDate,
    }))
}

/** The people a manager is responsible for, direct and dotted. */
export function teamOf(employees: Employee[], viewerId: string) {
  return employees.filter(
    (e) => e.managerId === viewerId || e.dottedLineManagerId === viewerId
  )
}
