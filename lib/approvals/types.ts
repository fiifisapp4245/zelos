import type { LeaveType } from "../types"

/** The role a chain step is owned by. */
export type ApprovalRole =
  "line_manager" | "head_of_department" | "hr_admin" | "payroll_officer"

export type ApprovalModule =
  | "leave"
  | "attendance"
  | "timesheets"
  | "schedules"
  | "lifecycle"
  | "onboarding"
  | "offboarding"
  | "profile"
  | "compensation"
  | "payroll"
  | "recruitment"
  | "performance"
  | "disciplinary"
  | "documents"

export type ApprovalType =
  | "leaveRequest"
  | "leaveCancellation"
  | "attendanceCorrection"
  | "timesheet"
  | "overtimeClaim"
  | "shiftSwap"
  | "openShiftPickup"
  | "promotion"
  | "transfer"
  | "actingAssignment"
  | "gradeChange"
  | "newHireSignOff"
  | "resignation"
  | "exitClearance"
  | "finalSettlement"
  | "profileChange"
  | "bankDetailsChange"
  | "compensationChange"
  | "oneOffBonus"
  | "payrollRunSignOff"
  | "jobRequisition"
  | "offerApproval"
  | "reviewSignOff"
  | "calibrationOutcome"
  | "disciplinarySanction"
  | "documentVerification"

export interface ChainStep {
  role: ApprovalRole
  /** Named approver, where the chain resolves to one person. */
  assigneeId?: string
  label: string
}

export type DecisionAction = "approve" | "decline" | "verify" | "reject"

export interface Decision {
  stepIndex: number
  actorId: string
  action: DecisionAction
  note?: string
  at: string
}

export type ApprovalStatus = "pending" | "approved" | "declined" | "cancelled"

/* ── Payloads ────────────────────────────────────────────────────────────
   Each payload references the fixtures by id rather than copying them, so
   the target data model stays visible instead of hiding inside approvals. */

export interface LeavePayload {
  leaveType: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  /** Set on a cancellation: the request being withdrawn. */
  cancelsRequestId?: string
}

export interface TimeCorrectionPayload {
  /** → TIMESHEET_CORRECTIONS */
  correctionId: string
}

export interface TimesheetPayload {
  employeeId: string
  weekStarting: string
}

export interface OvertimePayload {
  correctionId: string
  hours: number
  rate: number
}

export interface ShiftSwapPayload {
  /** → SHIFTS */
  fromShiftId: string
  withShiftId: string
}

export interface OpenShiftPayload {
  shiftId: string
}

export interface RoleChangePayload {
  before: {
    jobTitle: string
    payGrade: string
    department: string
    grossMonthly: number
  }
  after: {
    jobTitle: string
    payGrade: string
    department: string
    grossMonthly: number
  }
  effectiveDate: string
  /** Set for an acting assignment, which always ends. */
  endsOn?: string
  reason: string
}

export interface OnboardingPayload {
  startDate: string
  outstandingTaskIds: string[]
}

export interface OffboardingPayload {
  /** → OFFBOARDING */
  caseId: string
  lastWorkingDay: string
  outstandingLeaveDays: number
  finalSettlement?: number
}

export interface ProfileChangePayload {
  field: string
  before: string
  after: string
}

export interface BankDetailsPayload {
  method: "bank" | "mobile_money"
  before: { provider: string; account: string }
  after: { provider: string; account: string }
}

export interface PayAdjustmentPayload {
  before: number
  after: number
  effectiveDate: string
  reason: string
  /** A bonus is one payment, not a new salary. */
  oneOff?: boolean
}

export interface PayrollRunPayload {
  period: string
  headcount: number
  grossGhs: number
  netGhs: number
  previousGrossGhs: number
}

export interface RequisitionPayload {
  /** → REQUISITIONS */
  requisitionId: string
  /** → CANDIDATES, on an offer. */
  candidateId?: string
  offerGhs?: number
}

export interface ReviewPayload {
  /** → REVIEWS */
  reviewId: string
}

export interface DisciplinaryPayload {
  /** → CASES */
  caseId: string
  sanction: string
  dismissal: boolean
}

export interface DocumentPayload {
  /** → DOCUMENTS */
  documentId: string
  expiresOn: string | null
}

export type ApprovalPayload =
  | LeavePayload
  | TimeCorrectionPayload
  | TimesheetPayload
  | OvertimePayload
  | ShiftSwapPayload
  | OpenShiftPayload
  | RoleChangePayload
  | OnboardingPayload
  | OffboardingPayload
  | ProfileChangePayload
  | BankDetailsPayload
  | PayAdjustmentPayload
  | PayrollRunPayload
  | RequisitionPayload
  | ReviewPayload
  | DisciplinaryPayload
  | DocumentPayload

export interface ApprovalItem {
  id: string
  type: ApprovalType
  module: ApprovalModule
  /** Who raised it. */
  requester: string
  /** Who it is about, which is not always the requester. */
  subject: string
  summary: string
  submittedAt: string
  dueAt: string
  chain: ChainStep[]
  currentStepIndex: number
  status: ApprovalStatus
  payload: ApprovalPayload
  history: Decision[]
}
