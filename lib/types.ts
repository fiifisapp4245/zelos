/**
 * Zelos HR — domain types.
 *
 * Deliberately models permission roles separately from job roles: in the target
 * segment one person routinely holds several permission roles at once
 * (see docs/system-maps/zelos-hr-foundation.md §3).
 */

export type PermissionRole =
  | "hr_admin"
  | "line_manager"
  | "head_of_department"
  | "employee"
  | "payroll"

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
  | "full_time"
  | "part_time"
  | "contractor"
  | "intern"
  | "nsp"

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

export type DocumentStatus = "verified" | "pending" | "expiring" | "expired" | "missing"

export interface EmployeeDocument {
  id: string
  employeeId: string
  name: string
  category: "contract" | "identity" | "certificate" | "statutory" | "medical" | "other"
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

export interface LeaveBalance {
  employeeId: string
  annualEntitlement: number
  annualTaken: number
  annualPending: number
  sickEntitlement: number
  sickTaken: number
  carriedOver: number
}

export type AttendanceStatus =
  | "present"
  | "remote"
  | "late"
  | "absent"
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

export type RequisitionStatus = "draft" | "open" | "on_hold" | "filled" | "closed"

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

export type ReviewStatus = "not_started" | "self_review" | "manager_review" | "calibration" | "shared" | "complete"

export interface PerformanceReview {
  id: string
  employeeId: string
  cycle: string
  status: ReviewStatus
  rating: number | null
  managerId: string
  dueOn: string
  sharedOn: string | null
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

export type CaseState = "open" | "investigation" | "hearing" | "finalised" | "dismissed"

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
}

export type OffboardingReason =
  | "resignation"
  | "termination"
  | "redundancy"
  | "retirement"
  | "contract_end"
  | "mutual"

export interface OffboardingCase {
  id: string
  employeeId: string
  reason: OffboardingReason
  noticeGivenOn: string
  lastWorkingDay: string
  exitInterviewDone: boolean
  clearance: { assets: boolean; access: boolean; finance: boolean; handover: boolean }
  finalSettlement: number | null
  state: "notice" | "clearing" | "settled" | "closed"
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

export type AlertKind = "contract_expiry" | "probation_end" | "document_expiry" | "retirement"

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
