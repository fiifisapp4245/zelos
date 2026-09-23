// PROPOSED chains — only Leave is ratified; confirm before dev handoff

import type {
  ApprovalModule,
  ApprovalRole,
  ApprovalType,
  ChainStep,
} from "./types"

const step = (role: ApprovalRole, label: string): ChainStep => ({ role, label })

const LINE = step("line_manager", "Line manager")
const HOD = step("head_of_department", "Head of department")
const HR = step("hr_admin", "HR Admin")
const PAY = step("payroll_officer", "Payroll Officer")

/**
 * The route each kind of request takes. Steps are ordered; a request sits on
 * one of them at a time and only the role owning that step can decide it.
 *
 * Two chains vary with the request rather than the type — a lifecycle change
 * only reaches Payroll when the pay actually changes, and a disciplinary
 * sanction only reaches the HoD when it is a dismissal. Those are built by
 * `chainFor`, which takes the request into account.
 */
export const APPROVAL_CHAINS: Record<ApprovalType, ChainStep[]> = {
  leaveRequest: [LINE, HOD, HR],
  leaveCancellation: [LINE, HOD, HR],

  attendanceCorrection: [LINE],
  timesheet: [LINE],
  overtimeClaim: [LINE, PAY],

  shiftSwap: [LINE],
  openShiftPickup: [LINE],

  promotion: [HOD, HR],
  transfer: [HOD, HR],
  actingAssignment: [HOD, HR],
  gradeChange: [HOD, HR],

  newHireSignOff: [HR],

  resignation: [LINE, HR],
  exitClearance: [LINE, HR],
  finalSettlement: [LINE, HR, PAY],

  profileChange: [HR],
  bankDetailsChange: [HR, PAY],

  compensationChange: [HR, PAY],
  oneOffBonus: [HR, PAY],

  payrollRunSignOff: [HR],

  jobRequisition: [HOD, HR],
  offerApproval: [HOD, HR],

  reviewSignOff: [HOD, HR],
  calibrationOutcome: [HOD, HR],

  disciplinarySanction: [HR],

  documentVerification: [HR],
}

export const APPROVAL_MODULE: Record<ApprovalType, ApprovalModule> = {
  leaveRequest: "leave",
  leaveCancellation: "leave",
  attendanceCorrection: "attendance",
  timesheet: "timesheets",
  overtimeClaim: "timesheets",
  shiftSwap: "schedules",
  openShiftPickup: "schedules",
  promotion: "lifecycle",
  transfer: "lifecycle",
  actingAssignment: "lifecycle",
  gradeChange: "lifecycle",
  newHireSignOff: "onboarding",
  resignation: "offboarding",
  exitClearance: "offboarding",
  finalSettlement: "offboarding",
  profileChange: "profile",
  bankDetailsChange: "profile",
  compensationChange: "compensation",
  oneOffBonus: "compensation",
  payrollRunSignOff: "payroll",
  jobRequisition: "recruitment",
  offerApproval: "recruitment",
  reviewSignOff: "performance",
  calibrationOutcome: "performance",
  disciplinarySanction: "disciplinary",
  documentVerification: "documents",
}

/** Where "View in {module}" goes. */
export const MODULE_HREF: Record<ApprovalModule, string> = {
  leave: "/leave",
  attendance: "/attendance",
  timesheets: "/timesheets",
  schedules: "/schedules",
  lifecycle: "/lifecycle",
  onboarding: "/onboarding",
  offboarding: "/offboarding",
  profile: "/me/profile",
  compensation: "/compensation",
  payroll: "/payroll",
  recruitment: "/recruitment",
  performance: "/performance",
  disciplinary: "/disciplinary",
  documents: "/documents",
}

export const MODULE_LABEL: Record<ApprovalModule, string> = {
  leave: "Leave",
  attendance: "Attendance",
  timesheets: "Timesheets",
  schedules: "Schedules",
  lifecycle: "Lifecycle events",
  onboarding: "Onboarding",
  offboarding: "Offboarding",
  profile: "My profile",
  compensation: "Compensation",
  payroll: "Payroll",
  recruitment: "Recruitment",
  performance: "Performance",
  disciplinary: "Disciplinary",
  documents: "Documents",
}

export const TYPE_LABEL: Record<ApprovalType, string> = {
  leaveRequest: "Leave request",
  leaveCancellation: "Leave cancellation",
  attendanceCorrection: "Attendance correction",
  timesheet: "Timesheet",
  overtimeClaim: "Overtime claim",
  shiftSwap: "Shift swap",
  openShiftPickup: "Open shift pickup",
  promotion: "Promotion",
  transfer: "Transfer",
  actingAssignment: "Acting assignment",
  gradeChange: "Grade change",
  newHireSignOff: "New hire sign-off",
  resignation: "Resignation",
  exitClearance: "Exit clearance",
  finalSettlement: "Final settlement",
  profileChange: "Profile change",
  bankDetailsChange: "Bank details change",
  compensationChange: "Compensation change",
  oneOffBonus: "One-off bonus",
  payrollRunSignOff: "Payroll run sign-off",
  jobRequisition: "Job requisition",
  offerApproval: "Offer approval",
  reviewSignOff: "Review sign-off",
  calibrationOutcome: "Calibration outcome",
  disciplinarySanction: "Disciplinary sanction",
  documentVerification: "Document verification",
}

/** Documents are verified or rejected; everything else is approved or declined. */
export function actionWordsFor(type: ApprovalType) {
  return type === "documentVerification"
    ? { positive: "verify" as const, negative: "reject" as const }
    : { positive: "approve" as const, negative: "decline" as const }
}

const PAY_CHANGING: ApprovalType[] = [
  "promotion",
  "transfer",
  "actingAssignment",
  "gradeChange",
]

/**
 * The chain for a specific request. Two conditions in the spec depend on the
 * request rather than its type, so they are applied here rather than being
 * baked into the table above.
 */
export function chainFor(
  type: ApprovalType,
  opts: { payChanges?: boolean; dismissal?: boolean } = {}
): ChainStep[] {
  const base = APPROVAL_CHAINS[type]

  if (PAY_CHANGING.includes(type) && opts.payChanges) {
    return [...base, PAY]
  }
  if (type === "disciplinarySanction" && opts.dismissal) {
    return [HOD, ...base]
  }
  return base
}

/** Types where deciding several at once is safe and routine. */
const BULK_ELIGIBLE: ApprovalType[] = [
  "leaveRequest",
  "attendanceCorrection",
  "timesheet",
  "shiftSwap",
  "openShiftPickup",
]

export function canBulkApprove(type: ApprovalType) {
  return BULK_ELIGIBLE.includes(type)
}
