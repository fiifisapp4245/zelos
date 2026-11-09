/**
 * Zelos HR — domain types.
 *
 * Deliberately models permission roles separately from job roles: in the target
 * segment one person routinely holds several permission roles at once
 * (see docs/system-maps/zelos-hr-foundation.md §3).
 */

export type PermissionRole =
  "hr_admin" | "line_manager" | "head_of_department" | "employee" | "payroll"

export type LifecycleState =
  | "pre_hire"
  | "probation"
  | "active"
  | "on_leave"
  | "suspended"
  | "notice"
  | "resigned"
  | "terminated"
  | "retired"

export type EmploymentType =
  "full_time" | "part_time" | "contractor" | "intern" | "nsp"

export type ContractType = "permanent" | "fixed_term" | "probationary"

export type WorkArrangement = "onsite" | "hybrid" | "remote"

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email: string
}

export interface Compensation {
  grossMonthly: number
  currency: "GHS"
  payFrequency: "monthly" | "bi_weekly"
  payGrade: string
  effectiveFrom: string
  ssnitNumber: string
  tin: string
  tier2Provider: string
  tier3Provider: string | null
  paymentMethod: "mobile_money" | "bank"
  momoProvider?: string
  momoNumber?: string
  bankName?: string
  bankAccount?: string
}

export interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  jobTitle: string
  department: string
  branch: string
  employmentType: EmploymentType
  contractType: ContractType
  workArrangement: WorkArrangement
  lifecycleState: LifecycleState
  /** Primary reporting line. */
  managerId: string | null
  /** Optional secondary/matrix reporting line. */
  dottedLineManagerId: string | null
  email: string
  personalEmail: string
  phone: string
  dateOfBirth: string
  gender: "male" | "female" | "other"
  nationality: string
  ghanaCard: string
  gpsAddress: string
  residentialAddress: string
  startDate: string
  probationEndDate: string | null
  contractEndDate: string | null
  noticePeriodDays: number
  workingHoursPerWeek: number
  emergencyContact: EmergencyContact
  compensation: Compensation
  avatarTone: string
  isDraft?: boolean
}

export interface LifecycleEvent {
  id: string
  employeeId: string
  from: LifecycleState | null
  to: LifecycleState
  reason: string
  actorId: string
  at: string
  effectiveDate: string
}

export interface AuditEntry {
  id: string
  employeeId: string | null
  actorId: string
  action: string
  field?: string
  before?: string
  after?: string
  at: string
  /** Purpose-based access: why a sensitive field was read. */
  purpose?: string
}

export type DocumentStatus =
  "verified" | "pending" | "expiring" | "expired" | "missing"

export interface EmployeeDocument {
  id: string
  employeeId: string
  name: string
  category:
    "contract" | "identity" | "certificate" | "statutory" | "medical" | "other"
  status: DocumentStatus
  uploadedAt: string
  uploadedBy: string
  expiresOn: string | null
  sizeKb: number
  confidential: boolean
}

export type LeaveType =
  | "annual"
  | "sick"
  | "maternity"
  | "paternity"
  | "compassionate"
  | "unpaid"
  | "study"

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled"

export interface LeaveRequest {
  id: string
  employeeId: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: RequestStatus
  submittedAt: string
  decidedBy: string | null
  decidedAt: string | null
  decisionNote?: string
}

export interface LeaveTypeBalance {
  type: LeaveType
  entitlement: number
  taken: number
  pending: number
}

export interface LeaveBalance {
  employeeId: string
  annualEntitlement: number
  annualTaken: number
  annualPending: number
  sickEntitlement: number
  sickTaken: number
  carriedOver: number
  /** Every type the person is entitled to, for the balances tiles. */
  byType: LeaveTypeBalance[]
}

/**
 * The system records presence. A day with nothing captured is "no record",
 * never absence — it is a gap in the data, not a finding about the person.
 */
export type AttendanceStatus =
  | "present"
  | "remote"
  | "late"
  | "no_record"
  | "on_leave"
  | "holiday"
  | "weekend"

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  status: AttendanceStatus
  clockIn: string | null
  clockOut: string | null
  hours: number
  note?: string
}

export type RequisitionStatus =
  "draft" | "open" | "on_hold" | "filled" | "closed"

export interface Requisition {
  id: string
  title: string
  department: string
  branch: string
  employmentType: EmploymentType
  openings: number
  status: RequisitionStatus
  hiringManagerId: string
  openedOn: string
  targetStartDate: string
  budgetMonthly: number
}

export type CandidateStage =
  | "applied"
  | "screening"
  | "interview"
  | "assessment"
  | "offer"
  | "hired"
  | "rejected"

export interface Candidate {
  id: string
  requisitionId: string
  name: string
  email: string
  phone: string
  stage: CandidateStage
  appliedOn: string
  source: string
  rating: number
  avatarTone: string
  /** Recruiter's working notes. Not shared with the candidate. */
  notes: string
  /** Why they were turned down, so a rejection is never unexplained. */
  rejectedReason: string | null
  interviews: Interview[]
  offer: CandidateOffer | null
  /** The pre-hire record this person became, once hired. */
  employeeId: string | null
}

export type InterviewKind = "phone" | "technical" | "panel" | "final"

export interface Interview {
  id: string
  kind: InterviewKind
  scheduledFor: string
  interviewerId: string
  /** 1–5, recorded after the interview. */
  score: number | null
  feedback: string | null
}

export interface CandidateOffer {
  salaryMonthly: number
  startDate: string
  status: "draft" | "sent" | "accepted" | "declined"
  sentOn: string | null
  decidedOn: string | null
}

export interface OnboardingTask {
  id: string
  employeeId: string
  title: string
  owner: "hr" | "manager" | "employee" | "it"
  dueOn: string
  done: boolean
  category: "paperwork" | "access" | "orientation" | "compliance"
}

export type ReviewStatus =
  | "not_started"
  | "self_review"
  | "manager_review"
  | "calibration"
  | "shared"
  | "complete"

export interface PerformanceReview {
  id: string
  employeeId: string
  cycle: string
  status: ReviewStatus
  rating: number | null
  managerId: string
  dueOn: string
  sharedOn: string | null
  /** What the reviewer wrote, shown when the review is signed off. */
  reviewerComments: string | null
  /** The employee's own account of the period, written first. */
  selfSummary: string | null
  selfDevelopment: string | null
  selfRating: number | null
  selfSubmittedOn: string | null
  /** The manager's 1–5 score per competency, keyed by competency id. */
  scores: Record<string, number> | null
  /** Why HR moved the rating at calibration, when it moved. */
  calibrationNote: string | null
  /** The employee's reply once the review is shared with them. */
  employeeComment: string | null
  acknowledgedOn: string | null
  /** When whoever the review is waiting on was last nudged. */
  lastReminderOn?: string | null
}

/** Private to the authoring manager until deliberately escalated (system map §3). */
export interface CoachingNote {
  id: string
  employeeId: string
  authorId: string
  body: string
  createdAt: string
  escalated: boolean
  escalatedAt: string | null
}

export type CaseState =
  "open" | "investigation" | "hearing" | "finalised" | "dismissed"

export type SanctionKind =
  | "no_action"
  | "verbal_warning"
  | "written_warning"
  | "final_warning"
  | "suspension"
  | "demotion"
  | "dismissal"

export type CaseDocumentCategory =
  | "allegation"
  | "evidence"
  | "statement"
  | "report"
  | "hearing_notice"
  | "minutes"
  | "outcome"
  | "appeal"
  | "other"

export interface CaseDocument {
  id: string
  name: string
  category: CaseDocumentCategory
  sizeKb: number
  uploadedBy: string
  uploadedAt: string
}

export interface CaseEvent {
  id: string
  at: string
  actorId: string
  text: string
}

export interface CaseHearing {
  scheduledFor: string
  venue: string
  /** Notice is a due-process step: the employee must have time to prepare. */
  noticeGivenOn: string
  panelIds: string[]
  /** Who the employee brought, if anyone. */
  companion: string | null
  held: boolean
  minutes: string
}

export interface CaseAppeal {
  lodgedOn: string
  grounds: string
  decision: "pending" | "upheld" | "overturned"
  decidedOn: string | null
}

export interface DisciplinaryCase {
  id: string
  employeeId: string
  title: string
  severity: "minor" | "serious" | "gross"
  state: CaseState
  raisedBy: string
  raisedOn: string
  outcome: string | null
  closedOn: string | null
  /** What is alleged, in plain words, as put to the employee. */
  description: string
  incidentOn: string
  investigatorId: string | null
  /** When the employee was told of the allegation in writing. */
  notifiedOn: string | null
  hearing: CaseHearing | null
  sanction: SanctionKind | null
  appeal: CaseAppeal | null
  documents: CaseDocument[]
  events: CaseEvent[]
}

export type OffboardingReason =
  | "resignation"
  | "termination"
  | "redundancy"
  | "retirement"
  | "contract_end"
  | "mutual"

/** One item of company property, tracked individually so exit is auditable. */
export interface AssetReturn {
  item: string
  /** Asset tag or serial, where the item carries one. */
  tag?: string
  returned: boolean
}

export interface OffboardingCase {
  id: string
  employeeId: string
  reason: OffboardingReason
  noticeGivenOn: string
  lastWorkingDay: string
  exitInterviewDone: boolean
  clearance: {
    /** Itemised, not a single tick: "assets returned" is several things. */
    assets: AssetReturn[]
    access: boolean
    finance: boolean
    handover: boolean
  }
  finalSettlement: number | null
  state: "notice" | "clearing" | "settled" | "closed"
  exitInterviewOn: string | null
  exitNotes: string | null
  /** What went into the settlement figure, so it can be checked. */
  settlement: SettlementBreakdown | null
  sentToPayrollOn: string | null
  /** Who takes over the work. */
  handoverTo: string | null
  closedOn: string | null
}

export interface SettlementBreakdown {
  /** Days worked in the final month and not yet paid. */
  salaryDays: number
  /** Accrued annual leave paid out. */
  leaveDays: number
  /** Notice the company waives and pays instead of working. */
  noticeInLieuDays: number
  /** Anything recovered from the final pay (loans, unreturned items). */
  deductions: number
  note: string
}

export interface Department {
  id: string
  name: string
  headId: string | null
  parentId: string | null
  branchId: string
  archived: boolean
}

export interface Branch {
  id: string
  name: string
  city: string
  region: string
  archived: boolean
}

export type AlertKind =
  "contract_expiry" | "probation_end" | "document_expiry" | "retirement"

export interface Alert {
  id: string
  kind: AlertKind
  employeeId: string
  thresholdDays: number
  dueOn: string
  acknowledged: boolean
  ref: string
}

export interface Notification {
  id: string
  title: string
  body: string
  at: string
  read: boolean
  kind: "approval" | "alert" | "mention" | "system"
  href?: string
}

/** The organisation's own record, edited under Company Settings. */
export interface CompanyProfile {
  legalName: string
  tradingName: string
  industry: string
  companySize: string
  registrationNumber: string
  tin: string
  ssnitEmployerNumber: string
  incorporatedOn: string
  companyEmail: string
  website: string
  mainLine: string
  postalAddress: string
}

/* ── Approvals ───────────────────────────────────────────────────────────── */

/**
 * Approval is a chain, not a flag: a request moves through named stages and
 * each one is owned by a role, so "waiting on you" is answerable.
 */
export type ApprovalStage =
  "line_manager" | "head_of_department" | "hr" | "payroll"

export interface ApprovalStep {
  stage: ApprovalStage
  /** The person expected to decide, when it is one named person. */
  approverId: string | null
  decision: "pending" | "approved" | "declined"
  decidedAt: string | null
  note?: string
}

export type ApprovalKind = "leave" | "pay_details" | "lifecycle" | "document"

interface ApprovalBase {
  id: string
  employeeId: string
  submittedAt: string
  /** When a decision is expected. Past this, the request is overdue. */
  dueOn: string
  chain: ApprovalStep[]
  status: RequestStatus
  decisionNote?: string
}

export interface LeaveApproval extends ApprovalBase {
  kind: "leave"
  leaveType: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
}

/** Masked on both sides — the point is that the details changed, not what they are. */
export interface PayDetailsApproval extends ApprovalBase {
  kind: "pay_details"
  method: "bank" | "mobile_money"
  before: { provider: string; account: string }
  after: { provider: string; account: string }
  requestedBy: string
}

export interface LifecycleApproval extends ApprovalBase {
  kind: "lifecycle"
  change: "promotion" | "transfer" | "acting" | "probation_confirmation"
  before: { jobTitle: string; payGrade: string; department: string }
  after: { jobTitle: string; payGrade: string; department: string }
  effectiveDate: string
  reason: string
}

export interface DocumentApproval extends ApprovalBase {
  kind: "document"
  documentId: string
  documentName: string
  category: EmployeeDocument["category"]
  /** "employee" means it is the employee who still owes something. */
  waitingOn: "hr" | "employee"
}

export type ApprovalRequest =
  LeaveApproval | PayDetailsApproval | LifecycleApproval | DocumentApproval

/* ── Pay ─────────────────────────────────────────────────────────────────── */

export interface Payslip {
  id: string
  employeeId: string
  /** yyyy-mm, the period it covers. */
  period: string
  grossGhs: number
  netGhs: number
  ssnitEmployee: number
  paye: number
  otherDeductions: number
  paidOn: string
}

/* ── Acting assignments ──────────────────────────────────────────────────── */

export interface ActingAssignment {
  id: string
  employeeId: string
  /** The role being covered. */
  jobTitle: string
  coveringForId: string | null
  startDate: string
  endDate: string
}

/* ── Reports ─────────────────────────────────────────────────────────────── */

export interface SavedReport {
  id: string
  /** Which report this is a saved view of. */
  reportId: string
  /** The choices the report was saved with, e.g. what it groups by. */
  options: Record<string, string>
  name: string
  createdBy: string
  createdOn: string
  schedule: "none" | "weekly" | "monthly"
  lastRunOn: string | null
}

/** How far ahead each kind of alert starts appearing, and when HR last chased managers. */
export interface AlertSettings {
  leadDays: Record<AlertKind, number>
  lastEmailedOn: string | null
}

/** A return produced outside Zelos (by a local provider) and kept with the pay group. */
export interface ExternalReturnFile {
  id: string
  payGroupId: string
  name: string
  sizeKb: number
  uploadedBy: string
  uploadedAt: string
}
