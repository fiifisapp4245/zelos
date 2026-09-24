import type {
  AttendanceStatus,
  CandidateStage,
  CaseState,
  DocumentStatus,
  EmploymentType,
  Employee,
  LeaveType,
  LifecycleState,
  RequestStatus,
  RequisitionStatus,
  ReviewStatus,
  OffboardingReason,
  WorkArrangement,
  ContractType,
} from "./types"

/** The prototype runs against a fixed "today" so mock dates stay meaningful. */
export const TODAY = new Date("2026-09-18T09:00:00")
/** The same fixed day as a yyyy-mm-dd string, for date inputs. */
export const TODAY_ISO = "2026-09-18"

export function fullName(e: Employee | undefined | null) {
  return e ? `${e.firstName} ${e.lastName}` : "—"
}

export function initials(
  e: Employee | { firstName: string; lastName: string } | string
) {
  if (typeof e === "string") {
    const parts = e.trim().split(/\s+/)
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
  }
  return (e.firstName[0] + e.lastName[0]).toUpperCase()
}

export function ghs(amount: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && amount >= 1000) {
    return `GHS ${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`
  }
  return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(
  iso: string | null | undefined,
  style: "short" | "long" = "short"
) {
  if (!iso) return "—"
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  })
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${formatDate(iso)}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
}

export function daysUntil(iso: string | null | undefined, from: Date = TODAY) {
  if (!iso) return null
  const target = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(target.getTime())) return null
  return Math.round((target.getTime() - from.getTime()) / 86_400_000)
}

export function relativeTime(iso: string, from: Date = TODAY) {
  const diff = daysUntil(iso, from)
  if (diff === null) return "—"
  if (diff === 0) return "today"
  if (diff === -1) return "yesterday"
  if (diff === 1) return "tomorrow"
  if (diff < 0) {
    const n = Math.abs(diff)
    if (n < 30) return `${n} days ago`
    if (n < 365) return `${Math.round(n / 30)} months ago`
    return `${Math.round(n / 365)} years ago`
  }
  if (diff < 30) return `in ${diff} days`
  if (diff < 365) return `in ${Math.round(diff / 30)} months`
  return `in ${Math.round(diff / 365)} years`
}

export function yearsOfService(startDate: string, from: Date = TODAY) {
  const d = daysUntil(startDate, from)
  return d === null ? 0 : Math.max(0, Math.floor(-d / 365.25))
}

export function age(dateOfBirth: string, from: Date = TODAY) {
  const d = daysUntil(dateOfBirth, from)
  return d === null ? 0 : Math.floor(-d / 365.25)
}

/** Masks all but the last three characters — used for SSNIT and TIN. */
export function maskId(value: string) {
  if (value.length <= 5) return value
  return `${value.slice(0, 2)}${"•".repeat(Math.max(4, value.length - 5))}${value.slice(-3)}`
}

export const LIFECYCLE_LABEL: Record<LifecycleState, string> = {
  pre_hire: "Pre-hire",
  probation: "Probation",
  active: "Active",
  on_leave: "On leave",
  suspended: "Suspended",
  notice: "Serving notice",
  resigned: "Resigned",
  terminated: "Terminated",
  retired: "Retired",
}

/**
 * The lifecycle state machine. Resigned, Terminated and Retired are end states —
 * nothing transitions out of them, which is what makes them irreversible.
 */
export const LIFECYCLE_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  pre_hire: ["probation", "active", "terminated"],
  probation: ["active", "on_leave", "terminated", "resigned"],
  active: [
    "on_leave",
    "suspended",
    "notice",
    "resigned",
    "terminated",
    "retired",
  ],
  on_leave: ["active", "resigned", "terminated"],
  suspended: ["active", "terminated", "resigned"],
  notice: ["resigned", "terminated", "retired", "active"],
  resigned: [],
  terminated: [],
  retired: [],
}

export const IRREVERSIBLE: LifecycleState[] = [
  "resigned",
  "terminated",
  "retired",
]

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contractor: "Contractor",
  intern: "Intern",
  nsp: "National Service",
}

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  permanent: "Permanent",
  fixed_term: "Fixed-term",
  probationary: "Probationary",
}

export const ARRANGEMENT_LABEL: Record<WorkArrangement, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
}

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  annual: "Annual",
  sick: "Sick",
  maternity: "Maternity",
  paternity: "Paternity",
  compassionate: "Compassionate",
  unpaid: "Unpaid",
  study: "Study",
}

/**
 * The letter a leave type gets in a grid cell.
 *
 * Not simply the first letter: paternity and a pending request would
 * both be "P", and a code that means two things is worse than no code.
 * Every one of these is spelled out in the legend beside the grid.
 */
export const LEAVE_TYPE_LETTER: Record<LeaveType, string> = {
  annual: "A",
  sick: "S",
  maternity: "M",
  paternity: "Pt",
  compassionate: "C",
  unpaid: "U",
  study: "St",
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  remote: "Remote",
  late: "Late",
  no_record: "No record",
  on_leave: "On leave",
  holiday: "Holiday",
  weekend: "Weekend",
}

export const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  verified: "Verified",
  pending: "Pending review",
  expiring: "Expiring",
  expired: "Expired",
  missing: "Missing",
}

export const STAGE_LABEL: Record<CandidateStage, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  assessment: "Assessment",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
}

export const PIPELINE_STAGES: CandidateStage[] = [
  "applied",
  "screening",
  "interview",
  "assessment",
  "offer",
  "hired",
]

export const REQ_STATUS_LABEL: Record<RequisitionStatus, string> = {
  draft: "Draft",
  open: "Open",
  on_hold: "On hold",
  filled: "Filled",
  closed: "Closed",
}

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  not_started: "Not started",
  self_review: "Self review",
  manager_review: "Manager review",
  calibration: "Calibration",
  shared: "Shared",
  complete: "Complete",
}

export const CASE_STATE_LABEL: Record<CaseState, string> = {
  open: "Open",
  investigation: "Investigation",
  hearing: "Hearing",
  finalised: "Finalised",
  dismissed: "Dismissed",
}

export const OFFBOARD_REASON_LABEL: Record<OffboardingReason, string> = {
  resignation: "Resignation",
  termination: "Termination",
  redundancy: "Redundancy",
  retirement: "Retirement",
  contract_end: "Contract end",
  mutual: "Mutual agreement",
}

/** Statutory retirement age in the launch jurisdiction. */
export const RETIREMENT_AGE = 60
