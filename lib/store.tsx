"use client"

/**
 * Session store.
 *
 * Everything lives in React state and is mirrored into localStorage, so edits
 * made while demoing survive navigation and are shared between tabs: a
 * candidate opening a booking link in a new tab is looking at the same data
 * the recruiter is. Which persona you are viewing as stays with the tab.
 * No backend.
 */

import * as React from "react"
import { EMPLOYEES, DEFAULT_VIEWER_BY_ROLE } from "./data/employees"
import {
  ALERTS,
  COMPANY,
  ATTENDANCE,
  AUDIT_LOG,
  BRANCHES,
  CANDIDATES,
  CASES,
  COACHING_NOTES,
  DEPARTMENTS,
  DOCUMENTS,
  LEAVE_BALANCES,
  LEAVE_REQUESTS,
  LIFECYCLE_EVENTS,
  NOTIFICATIONS,
  OFFBOARDING,
  ONBOARDING_TASKS,
  REQUISITIONS,
  REVIEWS,
} from "./data/records"
import { TABLE_ROWS, TABLE_SPECS, type TableRow } from "./data/settings-tables"
import { ACTING_ASSIGNMENTS, PAYSLIPS } from "./data/approvals"
import { APPROVAL_ITEMS } from "./data/approval-items"
import {
  CLOCK_EVENTS,
  EXCEPTION_RESOLUTIONS,
  PAY_PERIODS,
  TIMESHEETS as PERIOD_TIMESHEETS,
  TIME_ADJUSTMENTS,
} from "./data/attendance-log"
import {
  PATTERN_ASSIGNMENTS,
  SHIFTS,
  SHIFT_CHANGES,
  WORK_PATTERNS,
} from "./data/schedules"
import { RECONCILIATIONS } from "./data/reconciliations"
import {
  EXTERNAL_RESULTS,
  LINE_ADJUSTMENTS,
  ONE_OFF_PAYMENTS,
  PAYMENT_BATCHES,
  PAYROLL_RUNS,
  READINESS_ACKNOWLEDGEMENTS,
} from "./data/payroll"
import {
  APPROVAL_SETTINGS,
  ASSIGNMENTS_ABROAD,
  CHANGE_REQUESTS,
  COMPENSATION_VERSIONS,
  COUNTRY_RULE_PACKS,
  COUNTRY_SETUPS,
  FILING_RECORDS,
  LEGAL_ENTITIES,
  PACK_ACKNOWLEDGEMENTS,
  PAY_COMPONENTS,
  PAY_GROUPS,
} from "./data/pay"
import type {
  ClockEvent,
  ExceptionResolution,
  PayPeriod,
  TimeAdjustment,
  Timesheet,
} from "./attendance/types"
import type {
  PatternAssignment,
  Shift,
  ShiftChange,
  WorkPattern,
} from "./schedules/types"
import type { Reconciliation } from "./leave/reconcile"
import type {
  ApprovalSettings,
  AssignmentAbroad,
  ExternalResult,
  LineAdjustment,
  OneOffPayment,
  PaymentBatch,
  PaymentChannelKey,
  PayrollRun,
  ReadinessAcknowledgement,
  RunStatus,
  CompensationChangeRequest,
  CompensationVersion,
  CountryRulePack,
  CountrySetup,
  CoverageChoice,
  CoverageDecision,
  CustomPackSubmission,
  FilingRecord,
  LegalEntity,
  PackAcknowledgement,
  PackIssueReport,
  PayComponent,
  PayGroup,
} from "./pay/types"
import { applyDecision } from "./approvals/selectors"
import { applyChange } from "./pay/derive"
import { periodLabel } from "./pay/compliance"
import type { ApprovalItem, DecisionAction } from "./approvals/types"
import type {
  Alert,
  CompanyProfile,
  AttendanceRecord,
  AuditEntry,
  Branch,
  Candidate,
  CoachingNote,
  Department,
  DisciplinaryCase,
  Employee,
  EmployeeDocument,
  LeaveBalance,
  LeaveRequest,
  LifecycleEvent,
  LifecycleState,
  Notification,
  OffboardingCase,
  OnboardingTask,
  PerformanceReview,
  ActingAssignment,
  Payslip,
  PermissionRole,
  Requisition,
  CaseEvent,
  SavedReport,
  AlertSettings,
  ExternalReturnFile,
  EmailMessage,
  BookingPage,
  Availability,
  Booking,
  Question,
  AssessmentTest,
  TestInvitation,
  AnswerValue,
  IntegrityFlag,
} from "./types"
import { DEFAULT_ALERT_SETTINGS } from "./alerts"
import { TODAY, TODAY_ISO, LIFECYCLE_TRANSITIONS } from "./format"
import { addDays } from "./time"
import {
  BOOKING_PAGES,
  AVAILABILITY,
  BOOKINGS,
  OUTBOX,
  QUESTION_BANK,
  TESTS,
  INVITATIONS,
} from "./data/hiring-extra"
import { holidayDates, newToken } from "./booking/slots"
import {
  cancelledEmail,
  confirmationEmail,
  inviteEmail,
  interviewerEmail,
  planBooking,
  reminderEmails,
  type BookingPlan,
  type BookingWorld,
} from "./booking/plan"
import {
  acceptsAnswers,
  autoMarks,
  canStart,
  deadlineFor,
  issuePaper,
} from "./assess/logic"
import {
  STANDARD_ASSETS,
  caseStage,
  endStateFor,
  newCaseId as newOffboardingId,
} from "./talent/offboarding"
import { preHireFrom } from "./talent/recruitment"
import type { Viewer } from "./rbac"
import type { SessionContext } from "./session"

interface State {
  employees: Employee[]
  lifecycleEvents: LifecycleEvent[]
  auditLog: AuditEntry[]
  documents: EmployeeDocument[]
  leaveRequests: LeaveRequest[]
  leaveBalances: LeaveBalance[]
  attendance: AttendanceRecord[]
  requisitions: Requisition[]
  candidates: Candidate[]
  onboardingTasks: OnboardingTask[]
  reviews: PerformanceReview[]
  coachingNotes: CoachingNote[]
  cases: DisciplinaryCase[]
  offboarding: OffboardingCase[]
  departments: Department[]
  branches: Branch[]
  alerts: Alert[]
  notifications: Notification[]
  approvals: ApprovalItem[]
  payslips: Payslip[]
  workPatterns: WorkPattern[]
  patternAssignments: PatternAssignment[]
  shifts: Shift[]
  shiftChanges: ShiftChange[]
  reconciliations: Reconciliation[]
  legalEntities: LegalEntity[]
  payGroups: PayGroup[]
  payComponents: PayComponent[]
  countryRulePacks: CountryRulePack[]
  countrySetups: CountrySetup[]
  packAcknowledgements: PackAcknowledgement[]
  filingRecords: FilingRecord[]
  packIssueReports: PackIssueReport[]
  coverageDecisions: CoverageDecision[]
  customPackSubmissions: CustomPackSubmission[]
  compensationVersions: CompensationVersion[]
  changeRequests: CompensationChangeRequest[]
  assignmentsAbroad: AssignmentAbroad[]
  approvalSettings: ApprovalSettings
  payrollRuns: PayrollRun[]
  lineAdjustments: LineAdjustment[]
  oneOffPayments: OneOffPayment[]
  externalResults: ExternalResult[]
  readinessAcknowledgements: ReadinessAcknowledgement[]
  paymentBatches: PaymentBatch[]
  clockEvents: ClockEvent[]
  timeAdjustments: TimeAdjustment[]
  exceptionResolutions: ExceptionResolution[]
  payPeriods: PayPeriod[]
  timesheets: Timesheet[]
  actingAssignments: ActingAssignment[]
  savedReports: SavedReport[]
  alertSettings: AlertSettings
  externalReturnFiles: ExternalReturnFile[]
  outbox: EmailMessage[]
  bookingPages: BookingPage[]
  availability: Availability[]
  bookings: Booking[]
  questionBank: Question[]
  tests: AssessmentTest[]
  invitations: TestInvitation[]
  company: CompanyProfile
  /** Editable settings tables, keyed by table id. */
  tables: Record<string, TableRow[]>
  activeRole: PermissionRole
}

export const INITIAL: State = {
  employees: EMPLOYEES,
  lifecycleEvents: LIFECYCLE_EVENTS,
  auditLog: AUDIT_LOG,
  documents: DOCUMENTS,
  leaveRequests: LEAVE_REQUESTS,
  leaveBalances: LEAVE_BALANCES,
  attendance: ATTENDANCE,
  requisitions: REQUISITIONS,
  candidates: CANDIDATES,
  onboardingTasks: ONBOARDING_TASKS,
  reviews: REVIEWS,
  coachingNotes: COACHING_NOTES,
  cases: CASES,
  offboarding: OFFBOARDING,
  departments: DEPARTMENTS,
  branches: BRANCHES,
  alerts: ALERTS,
  notifications: NOTIFICATIONS,
  approvals: APPROVAL_ITEMS,
  payslips: PAYSLIPS,
  workPatterns: WORK_PATTERNS,
  patternAssignments: PATTERN_ASSIGNMENTS,
  shifts: SHIFTS,
  shiftChanges: SHIFT_CHANGES,
  reconciliations: RECONCILIATIONS,
  legalEntities: LEGAL_ENTITIES,
  payGroups: PAY_GROUPS,
  payComponents: PAY_COMPONENTS,
  countryRulePacks: COUNTRY_RULE_PACKS,
  countrySetups: COUNTRY_SETUPS,
  packAcknowledgements: PACK_ACKNOWLEDGEMENTS,
  filingRecords: FILING_RECORDS,
  packIssueReports: [],
  coverageDecisions: [],
  customPackSubmissions: [],
  compensationVersions: COMPENSATION_VERSIONS,
  changeRequests: CHANGE_REQUESTS,
  assignmentsAbroad: ASSIGNMENTS_ABROAD,
  approvalSettings: APPROVAL_SETTINGS,
  payrollRuns: PAYROLL_RUNS,
  lineAdjustments: LINE_ADJUSTMENTS,
  oneOffPayments: ONE_OFF_PAYMENTS,
  externalResults: EXTERNAL_RESULTS,
  readinessAcknowledgements: READINESS_ACKNOWLEDGEMENTS,
  paymentBatches: PAYMENT_BATCHES,
  clockEvents: CLOCK_EVENTS,
  timeAdjustments: TIME_ADJUSTMENTS,
  exceptionResolutions: EXCEPTION_RESOLUTIONS,
  payPeriods: PAY_PERIODS,
  timesheets: PERIOD_TIMESHEETS,
  actingAssignments: ACTING_ASSIGNMENTS,
  savedReports: [],
  alertSettings: DEFAULT_ALERT_SETTINGS,
  externalReturnFiles: [],
  outbox: OUTBOX,
  bookingPages: BOOKING_PAGES,
  availability: AVAILABILITY,
  bookings: BOOKINGS,
  questionBank: QUESTION_BANK,
  tests: TESTS,
  invitations: INVITATIONS,
  company: COMPANY,
  tables: TABLE_ROWS,
  activeRole: "hr_admin",
}

const STORAGE_KEY = "zelos-hr-session"
/** The persona is per tab, so two tabs can look at the same data as two people. */
export const ROLE_KEY = "zelos-hr-role"

/**
 * Bump this whenever a persisted shape changes. A stored blob from an older
 * version is discarded rather than merged — spreading last week's data over
 * this week's types is how you get a crash three screens away from the
 * change that caused it.
 */
export const STORAGE_VERSION = 13

/**
 * Keeps only the restored slices that still look like the ones we seed.
 *
 * Bumping the version above is the intended way to retire old data, and
 * it is one line somebody will one day forget — which white-screens the
 * whole app several screens from the change that caused it. So a slice
 * whose records are missing a field every seeded record carries is
 * dropped in favour of the seed, rather than being spread over types
 * that no longer describe it.
 *
 * Every seeded record, not the first: a field only some of them carry is
 * optional. Reading the first alone made an audit entry without a field,
 * or a remittance paid but never filed, look like stale data — and a
 * refresh quietly discarded the whole log.
 *
 * Losing a session's edits is a small, visible cost. Loading a page that
 * cannot render is not.
 */
export function reconcile(saved: State): Partial<State> {
  const kept: Record<string, unknown> = {}

  for (const [key, savedValue] of Object.entries(saved)) {
    const seeded = (INITIAL as unknown as Record<string, unknown>)[key]

    // A slice we no longer hold at all.
    if (seeded === undefined) continue

    if (!Array.isArray(savedValue) || !Array.isArray(seeded)) {
      kept[key] = savedValue
      continue
    }

    // Nothing seeded to compare against, so nothing to check it with.
    const sample = seeded[0]
    if (!sample || typeof sample !== "object") {
      kept[key] = savedValue
      continue
    }

    const expected = Object.keys(sample as object).filter((field) =>
      seeded.every((record) => field in (record as object))
    )
    const intact = savedValue.every(
      (record) =>
        record &&
        typeof record === "object" &&
        expected.every((field) => field in (record as object))
    )

    kept[key] = intact ? savedValue : seeded
  }

  return kept as Partial<State>
}

interface StoreValue extends State {
  /** False until saved data has been read, so a page does not judge the empty seed. */
  ready: boolean
  viewer: Viewer
  session: SessionContext
  setActiveRole: (role: PermissionRole) => void
  employeeById: (id: string | null | undefined) => Employee | undefined
  update: <K extends keyof State>(key: K, value: State[K]) => void
  patchEmployee: (id: string, patch: Partial<Employee>, note?: string) => void
  updateCompany: (patch: Partial<CompanyProfile>) => void
  addTableRow: (tableId: string, row: Omit<TableRow, "id">) => void
  updateTableRow: (
    tableId: string,
    rowId: string,
    patch: Partial<TableRow>
  ) => void
  deleteTableRow: (tableId: string, rowId: string) => void
  addEmployee: (employee: Employee) => void
  changeLifecycle: (
    id: string,
    to: LifecycleState,
    reason: string,
    effectiveDate: string
  ) => void
  decideLeave: (
    id: string,
    status: "approved" | "rejected",
    note: string
  ) => void
  submitLeave: (request: LeaveRequest) => void
  /**
   * Records a decision on the step an approval is sitting on. The pure
   * applyDecision does the moving; this wires it to state and the audit log.
   */
  decideApproval: (id: string, action: DecisionAction, note?: string) => void
  /** Same decision across several items, for the bulk bar. */
  decideApprovals: (
    ids: string[],
    action: DecisionAction,
    note?: string
  ) => void
  clockIn: () => void
  clockOut: () => void

  /**
   * Corrections never touch the reading they supersede. This files a new
   * adjustment against the original event, pending a decision.
   */
  requestCorrection: (
    input: Omit<TimeAdjustment, "id" | "requestedBy" | "requestedAt" | "status">
  ) => void
  decideCorrection: (id: string, status: "approved" | "declined") => void
  /** Marks an exception dealt with. The record underneath is untouched. */
  resolveException: (
    key: string,
    action: ExceptionResolution["action"],
    note?: string
  ) => void
  reopenException: (key: string) => void

  /** Schedules own what was expected, so they own these writes. */
  savePattern: (pattern: WorkPattern) => void
  assignPattern: (
    draft: Omit<PatternAssignment, "id" | "createdBy" | "createdAt">
  ) => void
  /** An id on the draft edits that shift; without one it creates. */
  saveShift: (draft: Shift, reason?: string) => void
  cancelShift: (id: string, reason: string) => void
  publishShifts: (ids: string[]) => void
  copyWeek: (fromMonday: string, toMonday: string) => void

  /** Records that a mismatch was dealt with. Neither record is altered. */
  reconcile: (
    key: string,
    action: Reconciliation["action"],
    note?: string
  ) => void
  reopenReconciliation: (key: string) => void

  /**
   * Pay is append-only. Proposing writes a request, deciding writes the
   * decision and the versions it creates, and nothing is ever deleted.
   */
  proposeCompensationChange: (
    draft: Omit<
      CompensationChangeRequest,
      "id" | "proposedBy" | "status" | "decision" | "events"
    >
  ) => CompensationChangeRequest
  decideCompensationChange: (
    id: string,
    action: "approved" | "rejected",
    reason: string
  ) => void
  /** Stands a future version down. It stays on the record, marked. */
  cancelScheduledVersion: (versionId: string, reason: string) => void
  savePayGroup: (group: PayGroup) => void
  savePayComponent: (component: PayComponent) => void

  /* Country rules: the company's side. The rules themselves never change here. */
  saveCountrySetup: (setup: CountrySetup) => void
  /** Confirms a version was seen before a run uses it. Not approval of the law. */
  acknowledgePack: (country: string, version: string) => void
  /** Records a deadline filed or paid, or a receipt attached, for one period. */
  recordFiling: (
    record: Pick<FilingRecord, "country" | "deadlineId" | "period"> &
      Partial<Pick<FilingRecord, "filed" | "paid" | "receiptName">>
  ) => void
  reportPackIssue: (report: Omit<PackIssueReport, "id" | "by" | "at">) => void
  chooseCoverage: (country: string, choice: CoverageChoice) => void
  submitCustomPack: (country: string, note: string) => void
  saveApprovalSettings: (patch: Partial<ApprovalSettings>) => void

  /**
   * A run moves forward a step at a time and records who moved it.
   * Nothing here edits an approved run: a correction is a new off-cycle
   * run, not a rewrite of one that has been signed off.
   */
  advanceRun: (id: string, to: RunStatus, note?: string) => void
  decideRun: (
    id: string,
    outcome: "approved" | "rejected",
    reason: string
  ) => void
  addLineAdjustment: (draft: Omit<LineAdjustment, "id" | "by" | "at">) => void
  acknowledgeReadiness: (runId: string, checkId: string, reason: string) => void
  importExternalResults: (runId: string, rows: ExternalResult[]) => void
  startOffCycleRun: (draft: {
    payGroupId: string
    employeeIds: string[]
    reason: string
    payDate: string
  }) => PayrollRun
  addOneOffPayment: (
    draft: Omit<OneOffPayment, "id" | "status" | "includedInRunId" | "events">
  ) => void
  cancelOneOffPayment: (id: string, reason: string) => void

  /** Money leaves in batches, and every step of one is recorded. */
  createPaymentBatches: (runId: string, batches: PaymentBatch[]) => void
  advanceBatch: (batchId: string, to: PaymentBatch["status"]) => void
  /** A failed item is tried again; the first attempt stays on the record. */
  retryPaymentItem: (batchId: string, employeeId: string) => void
  payItemByChannel: (
    batchId: string,
    employeeId: string,
    channel: PaymentChannelKey
  ) => void
  decideTimesheet: (
    periodId: string,
    employeeIds: string[],
    status: Timesheet["status"],
    comment?: string
  ) => void
  submitTimesheet: (periodId: string, employeeId: string) => void
  closePayPeriod: (periodId: string) => void
  cancelLeave: (id: string) => void
  addOnboardingTask: (task: OnboardingTask) => void
  deleteOnboardingTask: (id: string) => void
  addDocuments: (docs: EmployeeDocument[]) => void
  updateDocument: (id: string, patch: Partial<EmployeeDocument>) => void
  deleteDocument: (id: string) => void
  updateRequisition: (id: string, patch: Partial<Requisition>) => void
  toggleClearance: (
    caseId: string,
    key: "access" | "finance" | "handover"
  ) => void
  /** Opens an exit: the case, and the record moves to Serving notice. */
  openOffboarding: (draft: {
    employeeId: string
    reason: OffboardingCase["reason"]
    noticeGivenOn: string
    lastWorkingDay: string
  }) => OffboardingCase | null
  updateOffboarding: (
    id: string,
    patch: Partial<OffboardingCase>,
    action: string
  ) => void
  /** Closes the case and moves the record to its end state. */
  closeOffboarding: (id: string) => void
  addRequisition: (r: Requisition) => void
  addCandidate: (c: Candidate) => void
  updateCandidate: (id: string, patch: Partial<Candidate>) => void
  /** Turns a hired candidate into a pre-hire record, with onboarding started. */
  hireCandidate: (id: string) => Employee | null
  updateReview: (
    id: string,
    patch: Partial<PerformanceReview>,
    action?: string
  ) => void
  addReviews: (reviews: PerformanceReview[]) => void
  raiseCase: (c: DisciplinaryCase) => void
  /** Changes a case and writes what happened into its own history. */
  updateCase: (
    id: string,
    patch: Partial<DisciplinaryCase>,
    event: string
  ) => void
  addExternalReturnFiles: (files: ExternalReturnFile[]) => void
  removeExternalReturnFile: (id: string) => void
  setAlertSettings: (patch: Partial<AlertSettings>) => void

  /** Records an email the prototype would have sent. */
  queueEmail: (
    m: Omit<EmailMessage, "id" | "createdAt" | "status"> & {
      status?: EmailMessage["status"]
    }
  ) => void
  deliverEmail: (id: string) => void
  cancelEmail: (id: string) => void

  saveBookingPage: (p: BookingPage) => void
  deleteBookingPage: (id: string) => void
  setAvailability: (a: Availability) => void
  /** Makes a private booking link for a candidate and emails it. */
  sendBookingLink: (
    candidateId: string,
    pageId: string
  ) => { ok: true; token: string } | { ok: false; reason: string }
  makeBooking: (
    token: string,
    start: string,
    timeZone: string,
    answers: Record<string, string>
  ) => { ok: true } | { ok: false; reason: string }
  cancelBooking: (token: string, by: "candidate" | "recruiter") => void
  markNoShow: (bookingId: string) => void

  saveQuestion: (q: Question) => void
  deleteQuestion: (id: string) => void
  saveTest: (t: AssessmentTest) => void
  deleteTest: (id: string) => void
  sendAssessment: (
    candidateId: string,
    testId: string
  ) => { ok: true; token: string } | { ok: false; reason: string }
  startTest: (token: string) => { ok: true } | { ok: false; reason: string }
  saveAnswers: (token: string, answers: Record<string, AnswerValue>) => boolean
  logFlag: (token: string, flag: Omit<IntegrityFlag, "at">) => void
  submitTest: (token: string) => void
  saveReview: (
    id: string,
    marks: Record<string, number>,
    note: string,
    finish: boolean
  ) => void
  grantExtraTime: (id: string, minutes: number, note: string) => void
  saveReport: (
    r: Omit<SavedReport, "id" | "createdBy" | "createdOn" | "lastRunOn">
  ) => void
  updateSavedReport: (id: string, patch: Partial<SavedReport>) => void
  deleteSavedReport: (id: string) => void
  toggleOnboardingTask: (id: string) => void
  moveCandidate: (id: string, stage: Candidate["stage"]) => void
  acknowledgeAlert: (id: string) => void
  markNotificationsRead: () => void
  /** Puts a notification in the bell, where the rest of them live. */
  addNotification: (n: Omit<Notification, "id" | "at" | "read">) => void
  addCoachingNote: (note: CoachingNote) => void
  escalateNote: (id: string) => void
  log: (
    entry: Omit<AuditEntry, "id" | "at" | "actorId"> & { actorId?: string }
  ) => void
  reset: () => void
}

/** What each step of a run is called in its own history. */
const RUN_STEP_LABEL: Record<RunStatus, string> = {
  upcoming: "Reopened",
  inputs_open: "Inputs opened",
  inputs_locked: "Inputs locked",
  calculated: "Calculated",
  pending_approval: "Submitted for approval",
  approved: "Approved",
  paying: "Payments started",
  paid: "Paid",
}

/**
 * The rate used to state a foreign-currency run in the reporting
 * currency, fixed at the moment of approval so a later market move
 * cannot restate a run that has already been signed off.
 */
function FX_AT_APPROVAL(payGroupId: string, at: string) {
  if (payGroupId === "pg-contractors")
    return [{ from: "USD", to: "GHS", rate: 12.42, capturedAt: at }]
  if (payGroupId === "pg-ng-monthly")
    return [{ from: "NGN", to: "GHS", rate: 0.0079, capturedAt: at }]
  return []
}

/** Exported so a demo view can provide a starved store to a subtree. */
export const StoreContext = React.createContext<StoreValue | null>(null)

/**
 * Writes are timestamped against the fixture's fixed TODAY, not the wall
 * clock. Using the real date put anything you did during a demo six days in
 * the future — "in 6 days" on a notification you just created. The counter
 * keeps successive writes distinct so ordering stays stable.
 */
let writeSeq = 0
function nowIso() {
  const t = new Date(TODAY)
  t.setSeconds(t.getSeconds() + writeSeq++)
  return t.toISOString()
}

/**
 * Applies one decision to several approvals and writes an audit entry for
 * each. Bulk and single go through the same path so they cannot diverge.
 */
function decideIn(
  s: State,
  ids: string[],
  action: DecisionAction,
  note: string | undefined,
  actorId: string
): State {
  const at = new Date().toISOString()
  const entries: AuditEntry[] = []

  const approvals = s.approvals.map((item) => {
    if (!ids.includes(item.id) || item.status !== "pending") return item
    const next = applyDecision(item, {
      stepIndex: item.currentStepIndex,
      actorId,
      action,
      note,
      at,
    })
    entries.push({
      id: uid("a"),
      employeeId: item.subject,
      actorId,
      action: `${action[0].toUpperCase()}${action.slice(1)}d ${item.type}`,
      field: item.id,
      after: next.status,
      at,
      ...(note ? { purpose: note } : {}),
    })
    return next
  })

  return { ...s, approvals, auditLog: [...entries, ...s.auditLog] }
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function makeEmail(
  m: Omit<EmailMessage, "id" | "createdAt" | "status"> & {
    status?: EmailMessage["status"]
  }
): EmailMessage {
  const at = nowIso()
  const status = m.status ?? (m.sendAt > at ? "scheduled" : "sent")
  return { ...m, id: uid("em"), createdAt: at, status }
}

/** The slice of state a booking decision reads. */
function bookingWorld(s: State): BookingWorld {
  const rows = (s.tables["public-holidays"] ?? []) as {
    date?: string
    observed?: string
  }[]
  const year = TODAY.getFullYear()
  return {
    candidates: s.candidates,
    bookings: s.bookings,
    bookingPages: s.bookingPages,
    availability: s.availability,
    leaveRequests: s.leaveRequests,
    holidays: [...holidayDates(rows, year), ...holidayDates(rows, year + 1)],
  }
}

function applyBooking(
  s: State,
  plan: Extract<BookingPlan, { ok: true }>,
  timeZone: string,
  answers: Record<string, string>
): State {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const company = s.company.tradingName || s.company.legalName
  const req = s.requisitions.find((r) => r.id === plan.candidate.requisitionId)
  const role = req?.title ?? "the role"
  const interviewer = s.employees.find((e) => e.id === plan.slot.interviewerId)
  const url = `${origin}/book/${plan.booking.token}`
  const at = nowIso()

  // A reschedule: the old reminders no longer apply.
  const outbox = s.outbox.map((e) =>
    e.relatedId === plan.booking.id &&
    e.kind === "booking_reminder" &&
    e.status === "scheduled"
      ? { ...e, status: "cancelled" as const }
      : e
  )

  const mails: EmailMessage[] = [
    makeEmail({
      ...confirmationEmail({
        plan,
        tz: timeZone,
        role,
        company,
        url,
        interviewerName: interviewer
          ? `${interviewer.firstName} ${interviewer.lastName}`
          : "the team",
        sendAt: at,
      }),
      status: "sent",
    }),
    ...(interviewer
      ? [
          makeEmail({
            ...interviewerEmail({
              plan,
              interviewer,
              role,
              url: `${origin}/recruitment`,
              sendAt: at,
            }),
            status: "sent",
          }),
        ]
      : []),
    ...reminderEmails({ plan, tz: timeZone, url })
      // Only a reminder that is still in the future is worth scheduling.
      .filter((r) => new Date(r.sendAt).getTime() > TODAY.getTime())
      .map((r) => makeEmail({ ...r, status: "scheduled" })),
  ]

  return {
    ...s,
    bookings: s.bookings.map((b) =>
      b.id === plan.booking.id
        ? {
            ...b,
            status: "booked" as const,
            slotStart: plan.slot.start,
            interviewerId: plan.slot.interviewerId,
            timeZone,
            answers,
            bookedOn: TODAY_ISO,
            link: plan.meetingLink,
            interviewId: plan.interview.id,
            history: [
              ...b.history,
              {
                at,
                text: plan.rescheduled
                  ? `Moved to ${plan.slot.start}.`
                  : `Booked ${plan.slot.start}.`,
              },
            ],
          }
        : b
    ),
    candidates: s.candidates.map((c) => {
      if (c.id !== plan.candidate.id) return c
      const has = c.interviews.some((i) => i.id === plan.interview.id)
      return {
        ...c,
        interviews: has
          ? c.interviews.map((i) =>
              i.id === plan.interview.id ? plan.interview : i
            )
          : [...c.interviews, plan.interview],
        stage: ["applied", "screening"].includes(c.stage)
          ? ("interview" as const)
          : c.stage,
      }
    }),
    outbox: [...mails, ...outbox],
    notifications: [
      {
        id: uid("n"),
        title: `${plan.candidate.name} ${plan.rescheduled ? "rescheduled" : "booked"} an interview`,
        body: `${plan.page.name} · ${plan.slot.start.slice(0, 16).replace("T", " ")} UTC`,
        at,
        read: false,
        kind: "system" as const,
        href: "/recruitment",
      },
      ...s.notifications,
    ],
    auditLog: [
      {
        id: uid("a"),
        employeeId: null,
        actorId: plan.slot.interviewerId,
        action: `${plan.rescheduled ? "Rescheduled" : "Booked"} an interview for ${plan.candidate.name}`,
        field: plan.page.name,
        at,
      },
      ...s.auditLog,
    ],
  }
}

function applyCancel(
  s: State,
  token: string,
  by: "candidate" | "recruiter",
  actorId: string
): State {
  const b = s.bookings.find((x) => x.token === token)
  if (!b || (b.status !== "booked" && b.status !== "invited")) return s
  const page = s.bookingPages.find((p) => p.id === b.pageId)
  const c = s.candidates.find((x) => x.id === b.candidateId)
  const origin = typeof window === "undefined" ? "" : window.location.origin
  const at = nowIso()
  const wasBooked = b.status === "booked" && !!b.slotStart
  const mail =
    wasBooked && page && c
      ? [
          makeEmail({
            ...cancelledEmail({
              candidate: c,
              page,
              slotStart: b.slotStart!,
              tz: b.timeZone ?? "Africa/Accra",
              by,
              sendAt: at,
              relatedId: b.id,
              url: `${origin}/book/${b.token}`,
            }),
            status: "sent",
          }),
        ]
      : []
  return {
    ...s,
    bookings: s.bookings.map((x) =>
      x.id === b.id
        ? {
            ...x,
            status: "cancelled" as const,
            history: [...x.history, { at, text: `Cancelled by the ${by}.` }],
          }
        : x
    ),
    candidates: s.candidates.map((x) =>
      x.id === b.candidateId
        ? {
            ...x,
            interviews: x.interviews.map((i) =>
              i.id === b.interviewId
                ? { ...i, status: "cancelled" as const }
                : i
            ),
          }
        : x
    ),
    outbox: [
      ...mail,
      ...s.outbox.map((e) =>
        e.relatedId === b.id &&
        e.kind === "booking_reminder" &&
        e.status === "scheduled"
          ? { ...e, status: "cancelled" as const }
          : e
      ),
    ],
    auditLog: [
      {
        id: uid("a"),
        employeeId: null,
        actorId: by === "recruiter" ? actorId : (b.interviewerId ?? actorId),
        action: `Cancelled an interview booking for ${c?.name ?? "a candidate"}`,
        field: `by the ${by}`,
        at,
      },
      ...s.auditLog,
    ],
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(INITIAL)
  const [hydrated, setHydrated] = React.useState(false)
  // Actions that must decide before they write read the latest state from here.
  const stateRef = React.useRef(state)
  React.useEffect(() => {
    stateRef.current = state
  })

  // Restore on mount only, so the server and first client render agree. This has
  // to happen after hydration, which is exactly what the lint rule warns about —
  // reading storage during render would produce a mismatch instead.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const role = sessionStorage.getItem(ROLE_KEY) as PermissionRole | null
      if (raw) {
        const saved = JSON.parse(raw) as { version?: number; state?: State }
        if (saved.version === STORAGE_VERSION && saved.state) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setState({
            ...INITIAL,
            ...reconcile(saved.state),
            activeRole: role ?? INITIAL.activeRole,
          })
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } else if (role) {
        setState((s) => ({ ...s, activeRole: role }))
      }
    } catch {
      // Private mode or blocked storage — the seeded state is still fine.
    }
    setHydrated(true)
  }, [])

  // Another tab changed the data: take it, but keep this tab's persona.
  React.useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      try {
        if (e.newValue === null) {
          setState((s) => ({ ...INITIAL, activeRole: s.activeRole }))
          return
        }
        const saved = JSON.parse(e.newValue) as {
          version?: number
          state?: State
        }
        if (saved.version === STORAGE_VERSION && saved.state)
          setState((s) => ({
            ...INITIAL,
            ...reconcile(saved.state!),
            activeRole: s.activeRole,
          }))
      } catch {
        // A half-written value: the next write replaces it.
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(ROLE_KEY, state.activeRole)
      // The persona is left out of what is shared, or two tabs viewing as
      // different people would keep overwriting each other.
      const { activeRole, ...shared } = state
      void activeRole
      const next = JSON.stringify({
        version: STORAGE_VERSION,
        state: shared,
      })
      // Writing what is already there would wake every other tab for nothing.
      if (localStorage.getItem(STORAGE_KEY) !== next)
        localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Over quota or blocked; the in-memory state remains authoritative.
    }
  }, [state, hydrated])

  const value = React.useMemo<StoreValue>(() => {
    const actorId = DEFAULT_VIEWER_BY_ROLE[state.activeRole] ?? "fiifi"

    const viewer: Viewer = {
      employeeId: actorId,
      // A real deployment composes roles per user; the switcher picks one at a
      // time so each perspective can be demonstrated cleanly.
      roles:
        state.activeRole === "hr_admin"
          ? ["hr_admin", "employee"]
          : state.activeRole === "head_of_department"
            ? ["head_of_department", "line_manager", "employee"]
            : state.activeRole === "line_manager"
              ? ["line_manager", "employee"]
              : state.activeRole === "payroll"
                ? ["payroll", "employee"]
                : ["employee"],
    }

    function log(
      entry: Omit<AuditEntry, "id" | "at" | "actorId"> & { actorId?: string }
    ) {
      setState((s) => ({
        ...s,
        auditLog: [
          {
            id: uid("a"),
            at: nowIso(),
            actorId: entry.actorId ?? actorId,
            ...entry,
          },
          ...s.auditLog,
        ],
      }))
    }

    const me = state.employees.find((e) => e.id === actorId)

    // Shaped like the planned GET /api/me/ response, so the sidebar reads the
    // same fields it will read against the real API. Managing people is
    // counted off the org chart rather than stored.
    const session: SessionContext = {
      id: actorId,
      first_name: me?.firstName ?? "",
      last_name: me?.lastName ?? "",
      email: me?.email ?? "",
      job_title: me?.jobTitle ?? "",
      department: me?.department ?? "",
      roles: viewer.roles,
      direct_report_count: state.employees.filter(
        (e) => e.managerId === actorId
      ).length,
      company: { name: state.company.tradingName || state.company.legalName },
    }

    return {
      ...state,
      ready: hydrated,
      viewer,
      session,
      setActiveRole: (role) => setState((s) => ({ ...s, activeRole: role })),
      employeeById: (id) =>
        id ? state.employees.find((e) => e.id === id) : undefined,
      update: (key, val) => setState((s) => ({ ...s, [key]: val })),

      patchEmployee: (id, patch, note) => {
        setState((s) => {
          const before = s.employees.find((e) => e.id === id)
          const entries: AuditEntry[] = Object.entries(patch).flatMap(
            ([field, after]) => {
              const prev = before
                ? (before as unknown as Record<string, unknown>)[field]
                : undefined
              if (typeof after === "object" || prev === after) return []
              return [
                {
                  id: uid("a"),
                  employeeId: id,
                  actorId,
                  action: note ?? `Updated ${field}`,
                  field,
                  before: String(prev ?? ""),
                  after: String(after ?? ""),
                  at: nowIso(),
                },
              ]
            }
          )
          return {
            ...s,
            employees: s.employees.map((e) =>
              e.id === id ? { ...e, ...patch } : e
            ),
            auditLog: [...entries, ...s.auditLog],
          }
        })
      },

      updateCompany: (patch) => {
        setState((s) => {
          const entries: AuditEntry[] = Object.entries(patch).flatMap(
            ([field, after]) => {
              const before = (s.company as unknown as Record<string, unknown>)[
                field
              ]
              if (before === after) return []
              return [
                {
                  id: uid("a"),
                  employeeId: null,
                  actorId,
                  action: "Updated company information",
                  field,
                  before: String(before ?? ""),
                  after: String(after ?? ""),
                  at: nowIso(),
                },
              ]
            }
          )
          if (entries.length === 0) return s
          return {
            ...s,
            company: { ...s.company, ...patch },
            auditLog: [...entries, ...s.auditLog],
          }
        })
      },

      addTableRow: (tableId, row) => {
        setState((s) => {
          const spec = TABLE_SPECS[tableId]
          const next = { id: uid("row"), ...row } as TableRow
          return {
            ...s,
            tables: {
              ...s.tables,
              [tableId]: [...(s.tables[tableId] ?? []), next],
            },
            auditLog: [
              {
                id: uid("a"),
                employeeId: null,
                actorId,
                action: `Added a row to ${spec?.title ?? tableId}`,
                field: tableId,
                after: String(next[spec?.labelKey ?? "id"] ?? ""),
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      updateTableRow: (tableId, rowId, patch) => {
        setState((s) => {
          const spec = TABLE_SPECS[tableId]
          const rows = s.tables[tableId] ?? []
          const before = rows.find((r) => r.id === rowId)
          if (!before) return s
          const changed = Object.entries(patch).filter(
            ([k, v]) => before[k] !== v
          )
          if (changed.length === 0) return s
          return {
            ...s,
            tables: {
              ...s.tables,
              [tableId]: rows.map((r) =>
                r.id === rowId ? ({ ...r, ...patch } as TableRow) : r
              ),
            },
            auditLog: [
              ...changed.map(([field, after]) => ({
                id: uid("a"),
                employeeId: null,
                actorId,
                action: `Updated ${before[spec?.labelKey ?? "id"]} in ${spec?.title ?? tableId}`,
                field,
                before: String(before[field] ?? ""),
                after: String(after ?? ""),
                at: nowIso(),
              })),
              ...s.auditLog,
            ],
          }
        })
      },

      deleteTableRow: (tableId, rowId) => {
        setState((s) => {
          const spec = TABLE_SPECS[tableId]
          const rows = s.tables[tableId] ?? []
          const gone = rows.find((r) => r.id === rowId)
          if (!gone) return s
          return {
            ...s,
            tables: {
              ...s.tables,
              [tableId]: rows.filter((r) => r.id !== rowId),
            },
            auditLog: [
              {
                id: uid("a"),
                employeeId: null,
                actorId,
                action: `Removed a row from ${spec?.title ?? tableId}`,
                field: tableId,
                before: String(gone[spec?.labelKey ?? "id"] ?? ""),
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      addEmployee: (employee) => {
        setState((s) => ({
          ...s,
          employees: [employee, ...s.employees],
          lifecycleEvents: [
            {
              id: uid("le"),
              employeeId: employee.id,
              from: null,
              to: employee.lifecycleState,
              reason: "Record created",
              actorId,
              at: nowIso(),
              effectiveDate: employee.startDate,
            },
            ...s.lifecycleEvents,
          ],
          auditLog: [
            {
              id: uid("a"),
              employeeId: employee.id,
              actorId,
              action: "Created employee record",
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
      },

      changeLifecycle: (id, to, reason, effectiveDate) => {
        setState((s) => {
          const emp = s.employees.find((e) => e.id === id)
          if (!emp) return s
          return {
            ...s,
            employees: s.employees.map((e) =>
              e.id === id ? { ...e, lifecycleState: to } : e
            ),
            lifecycleEvents: [
              {
                id: uid("le"),
                employeeId: id,
                from: emp.lifecycleState,
                to,
                reason,
                actorId,
                at: nowIso(),
                effectiveDate,
              },
              ...s.lifecycleEvents,
            ],
            auditLog: [
              {
                id: uid("a"),
                employeeId: id,
                actorId,
                action: "Changed lifecycle state",
                field: "lifecycleState",
                before: emp.lifecycleState,
                after: to,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      decideLeave: (id, status, note) => {
        setState((s) => ({
          ...s,
          leaveRequests: s.leaveRequests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status,
                  decidedBy: actorId,
                  decidedAt: nowIso(),
                  decisionNote: note,
                }
              : r
          ),
          auditLog: [
            {
              id: uid("a"),
              employeeId:
                s.leaveRequests.find((r) => r.id === id)?.employeeId ?? null,
              actorId,
              action: `${status === "approved" ? "Approved" : "Rejected"} leave request`,
              field: id,
              after: status,
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
      },

      decideApproval: (id, action, note) => {
        setState((s) => decideIn(s, [id], action, note, actorId))
      },

      decideApprovals: (ids, action, note) => {
        setState((s) => decideIn(s, ids, action, note, actorId))
      },

      clockIn: () => {
        setState((s) => {
          const date = TODAY_ISO
          const time = new Date().toTimeString().slice(0, 5)
          const existing = s.attendance.find(
            (a) => a.employeeId === actorId && a.date === date
          )
          if (existing?.clockIn) return s
          const record = {
            id: existing?.id ?? uid("at"),
            employeeId: actorId,
            date,
            status: "present" as const,
            clockIn: time,
            clockOut: null,
            hours: 0,
          }
          return {
            ...s,
            attendance: existing
              ? s.attendance.map((a) => (a.id === existing.id ? record : a))
              : [record, ...s.attendance],
          }
        })
      },

      clockOut: () => {
        setState((s) => {
          const date = TODAY_ISO
          const existing = s.attendance.find(
            (a) => a.employeeId === actorId && a.date === date
          )
          if (!existing?.clockIn || existing.clockOut) return s
          const out = new Date().toTimeString().slice(0, 5)
          const toMinutes = (t: string) =>
            Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
          const hours =
            Math.round(
              ((toMinutes(out) - toMinutes(existing.clockIn)) / 60) * 10
            ) / 10
          return {
            ...s,
            attendance: s.attendance.map((a) =>
              a.id === existing.id
                ? { ...a, clockOut: out, hours: Math.max(hours, 0) }
                : a
            ),
          }
        })
      },

      requestCorrection: (draft) => {
        setState((s) => ({
          ...s,
          timeAdjustments: [
            {
              ...draft,
              id: uid("adj"),
              requestedBy: actorId,
              requestedAt: nowIso(),
              status: "pending",
            },
            ...s.timeAdjustments,
          ],
          auditLog: [
            {
              id: uid("a"),
              employeeId: draft.employeeId,
              actorId,
              action: `Requested a time correction for ${draft.date}`,
              field: draft.eventId,
              before: `${draft.originalIn ?? "—"} – ${draft.originalOut ?? "—"}`,
              after: `${draft.correctedIn ?? "—"} – ${draft.correctedOut ?? "—"}`,
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
      },

      decideCorrection: (id, status) => {
        setState((s) => ({
          ...s,
          timeAdjustments: s.timeAdjustments.map((a) =>
            a.id === id
              ? { ...a, status, decidedBy: actorId, decidedAt: nowIso() }
              : a
          ),
        }))
      },

      resolveException: (key, action, note) => {
        setState((s) => ({
          ...s,
          exceptionResolutions: [
            ...s.exceptionResolutions.filter((r) => r.key !== key),
            { key, action, note, resolvedBy: actorId, resolvedAt: nowIso() },
          ],
        }))
      },

      reopenException: (key) => {
        setState((s) => ({
          ...s,
          exceptionResolutions: s.exceptionResolutions.filter(
            (r) => r.key !== key
          ),
        }))
      },

      /* ── Schedules ─────────────────────────────────────────────── */

      savePattern: (pattern) => {
        setState((s) => ({
          ...s,
          workPatterns: s.workPatterns.some((p) => p.id === pattern.id)
            ? s.workPatterns.map((p) => (p.id === pattern.id ? pattern : p))
            : [...s.workPatterns, pattern],
        }))
      },

      /**
       * Assigning never edits what came before. The new row takes effect
       * from its own date, and every date before it still resolves to
       * whatever was in force then.
       */
      assignPattern: (draft) => {
        setState((s) => ({
          ...s,
          patternAssignments: [
            ...s.patternAssignments,
            {
              ...draft,
              id: uid("pa"),
              createdBy: actorId,
              createdAt: nowIso(),
            },
          ],
        }))
      },

      saveShift: (draft, reason) => {
        setState((s) => {
          const existing = draft.id
            ? s.shifts.find((x) => x.id === draft.id)
            : undefined

          if (!existing) {
            const shift: Shift = { ...draft, id: draft.id || uid("sh") }
            return {
              ...s,
              shifts: [...s.shifts, shift],
              shiftChanges: [
                {
                  id: uid("sc"),
                  shiftId: shift.id,
                  action: "created",
                  summary: `${shift.position} ${shift.start}–${shift.end} drafted`,
                  reason,
                  by: actorId,
                  at: nowIso(),
                },
                ...s.shiftChanges,
              ],
            }
          }

          const changed =
            existing.start !== draft.start ||
            existing.end !== draft.end ||
            existing.position !== draft.position ||
            existing.employeeId !== draft.employeeId
          const summary =
            existing.start !== draft.start || existing.end !== draft.end
              ? `${existing.start}–${existing.end} → ${draft.start}–${draft.end}`
              : existing.position !== draft.position
                ? `${existing.position} → ${draft.position}`
                : "Details updated"

          return {
            ...s,
            shifts: s.shifts.map((x) =>
              x.id === existing.id
                ? {
                    ...draft,
                    id: existing.id,
                    // Published and then edited: the people on it were
                    // told something that is no longer true.
                    changedSincePublish:
                      existing.state === "published" && changed
                        ? true
                        : existing.changedSincePublish,
                  }
                : x
            ),
            shiftChanges: [
              {
                id: uid("sc"),
                shiftId: existing.id,
                action:
                  existing.employeeId !== draft.employeeId
                    ? "assigned"
                    : "edited",
                summary,
                reason,
                by: actorId,
                at: nowIso(),
              },
              ...s.shiftChanges,
            ],
          }
        })
      },

      /**
       * A draft can go; a published shift cannot. Somebody was told to
       * work it, so it stays on the roster marked cancelled with the
       * reason attached.
       */
      cancelShift: (id, reason) => {
        setState((s) => {
          const shift = s.shifts.find((x) => x.id === id)
          if (!shift) return s
          const trail = {
            id: uid("sc"),
            shiftId: id,
            action: "cancelled" as const,
            summary: `${shift.position} ${shift.start}–${shift.end} cancelled`,
            reason,
            by: actorId,
            at: nowIso(),
          }
          return {
            ...s,
            shifts:
              shift.state === "draft"
                ? s.shifts.filter((x) => x.id !== id)
                : s.shifts.map((x) =>
                    x.id === id ? { ...x, cancelled: true } : x
                  ),
            shiftChanges: [trail, ...s.shiftChanges],
          }
        })
      },

      publishShifts: (ids) => {
        setState((s) => {
          const at = nowIso()
          return {
            ...s,
            shifts: s.shifts.map((x) =>
              ids.includes(x.id)
                ? {
                    ...x,
                    state: "published",
                    publishedAt: at,
                    changedSincePublish: false,
                  }
                : x
            ),
            shiftChanges: [
              ...ids.map((shiftId) => ({
                id: uid("sc"),
                shiftId,
                action: "published" as const,
                summary: "Published to the people on it",
                by: actorId,
                at,
              })),
              ...s.shiftChanges,
            ],
          }
        })
      },

      /** Last week again as drafts, which is how most weeks start. */
      copyWeek: (fromMonday, toMonday) => {
        setState((s) => {
          const offset = Math.round(
            (new Date(`${toMonday}T00:00:00`).getTime() -
              new Date(`${fromMonday}T00:00:00`).getTime()) /
              86_400_000
          )
          const source = s.shifts.filter(
            (x) =>
              !x.cancelled &&
              x.date >= fromMonday &&
              x.date <= addDays(fromMonday, 6)
          )
          const copies: Shift[] = source.map((x) => ({
            ...x,
            id: uid("sh"),
            date: addDays(x.date, offset),
            state: "draft",
            publishedAt: undefined,
            changedSincePublish: false,
          }))
          return {
            ...s,
            shifts: [...s.shifts, ...copies],
            shiftChanges: [
              ...copies.map((c) => ({
                id: uid("sc"),
                shiftId: c.id,
                action: "created" as const,
                summary: `Copied from the week of ${fromMonday}`,
                by: actorId,
                at: nowIso(),
              })),
              ...s.shiftChanges,
            ],
          }
        })
      },

      /* ── Reconciliation ────────────────────────────────────────── */

      reconcile: (key, action, note) => {
        setState((s) => ({
          ...s,
          reconciliations: [
            ...s.reconciliations.filter((r) => r.key !== key),
            { key, action, note, by: actorId, at: nowIso() },
          ],
        }))
      },

      reopenReconciliation: (key) => {
        setState((s) => ({
          ...s,
          reconciliations: s.reconciliations.filter((r) => r.key !== key),
        }))
      },

      /* ── Pay ───────────────────────────────────────────────────── */

      proposeCompensationChange: (draft) => {
        const request: CompensationChangeRequest = {
          ...draft,
          id: uid("cr"),
          proposedBy: actorId,
          status: "pending",
          decision: null,
          events: [{ at: nowIso(), by: actorId, action: "proposed" }],
        }
        setState((s) => ({
          ...s,
          changeRequests: [request, ...s.changeRequests],
          auditLog: [
            {
              id: uid("a"),
              employeeId: draft.employeeIds[0] ?? null,
              actorId,
              action: `Proposed a pay change for ${draft.employeeIds.length} ${draft.employeeIds.length === 1 ? "person" : "people"}`,
              field: request.id,
              after: draft.reason,
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
        return request
      },

      decideCompensationChange: (id, action, reason) => {
        setState((s) => {
          const request = s.changeRequests.find((r) => r.id === id)
          if (!request || request.status !== "pending") return s
          const at = nowIso()

          const decided: CompensationChangeRequest = {
            ...request,
            status: action,
            decision: { by: actorId, at, reason },
            events: [
              ...request.events,
              { at, by: actorId, action, note: reason },
            ],
          }

          // A rejection creates no version. An approval creates one per
          // person, superseding what they are on without touching it.
          const created: CompensationVersion[] = []
          const superseded = new Set<string>()

          if (action === "approved") {
            for (const employeeId of request.employeeIds) {
              const rows = applyChange(
                request.definition,
                [employeeId],
                s.compensationVersions,
                TODAY_ISO
              )
              const row = rows[0]
              if (!row.current) continue
              superseded.add(row.current.id)
              created.push({
                ...row.current,
                id: uid("cv"),
                versionNumber: row.current.versionNumber + 1,
                effectiveFrom: request.effectiveFrom,
                baseAmount: row.newAmount,
                reason: request.reason,
                proposedBy: request.proposedBy,
                proposedAt: request.events[0]?.at ?? at,
                approvedBy: actorId,
                approvedAt: at,
                status:
                  request.effectiveFrom > TODAY_ISO ? "scheduled" : "effective",
                supersedesVersionId: row.current.id,
                changeRequestId: request.id,
              })
            }
          }

          return {
            ...s,
            changeRequests: s.changeRequests.map((r) =>
              r.id === id ? decided : r
            ),
            compensationVersions: [
              ...s.compensationVersions.map((v) =>
                superseded.has(v.id) && request.effectiveFrom <= TODAY_ISO
                  ? { ...v, status: "superseded" as const }
                  : v
              ),
              ...created,
            ],
            auditLog: [
              {
                id: uid("a"),
                employeeId: request.employeeIds[0] ?? null,
                actorId,
                action: `${action === "approved" ? "Approved" : "Rejected"} pay change ${request.id}`,
                field: request.id,
                after: reason,
                at,
              },
              ...s.auditLog,
            ],
          }
        })
      },

      cancelScheduledVersion: (versionId, reason) => {
        setState((s) => {
          const version = s.compensationVersions.find((v) => v.id === versionId)
          if (!version) return s
          const at = nowIso()
          return {
            ...s,
            // Marked, not removed: it was agreed once, and the record
            // has to keep saying so.
            compensationVersions: s.compensationVersions.map((v) =>
              v.id === versionId ? { ...v, status: "cancelled" as const } : v
            ),
            changeRequests: s.changeRequests.map((r) =>
              r.id === version.changeRequestId
                ? {
                    ...r,
                    status: "cancelled" as const,
                    decision: { by: actorId, at, reason },
                    events: [
                      ...r.events,
                      {
                        at,
                        by: actorId,
                        action: "cancelled" as const,
                        note: reason,
                      },
                    ],
                  }
                : r
            ),
            auditLog: [
              {
                id: uid("a"),
                employeeId: version.employeeId,
                actorId,
                action: "Cancelled a scheduled pay change",
                field: versionId,
                after: reason,
                at,
              },
              ...s.auditLog,
            ],
          }
        })
      },

      savePayGroup: (group) => {
        setState((s) => ({
          ...s,
          payGroups: s.payGroups.some((g) => g.id === group.id)
            ? s.payGroups.map((g) => (g.id === group.id ? group : g))
            : [...s.payGroups, group],
        }))
      },

      savePayComponent: (component) => {
        setState((s) => ({
          ...s,
          payComponents: s.payComponents.some((c) => c.id === component.id)
            ? s.payComponents.map((c) =>
                c.id === component.id ? component : c
              )
            : [...s.payComponents, component],
        }))
      },

      saveCountrySetup: (setup) => {
        setState((s) => ({
          ...s,
          countrySetups: s.countrySetups.some(
            (c) => c.country === setup.country
          )
            ? s.countrySetups.map((c) =>
                c.country === setup.country ? setup : c
              )
            : [...s.countrySetups, setup],
        }))
        log({
          employeeId: null,
          action: `Updated the company's setup for ${setup.country}`,
        })
      },

      acknowledgePack: (country, version) => {
        setState((s) =>
          s.packAcknowledgements.some(
            (a) => a.country === country && a.version === version
          )
            ? s
            : {
                ...s,
                packAcknowledgements: [
                  ...s.packAcknowledgements,
                  { country, version, by: actorId, at: nowIso() },
                ],
              }
        )
        log({
          employeeId: null,
          action: `Acknowledged ${country} rule pack ${version}`,
        })
      },

      recordFiling: (patch) => {
        setState((s) => {
          const existing = s.filingRecords.find(
            (f) =>
              f.country === patch.country &&
              f.deadlineId === patch.deadlineId &&
              f.period === patch.period
          )
          const next: FilingRecord = {
            ...(existing ?? {
              id: uid("fr"),
              country: patch.country,
              deadlineId: patch.deadlineId,
              period: patch.period,
            }),
            ...patch,
          }
          return {
            ...s,
            filingRecords: existing
              ? s.filingRecords.map((f) => (f.id === existing.id ? next : f))
              : [...s.filingRecords, next],
          }
        })
        const what = patch.paid
          ? `Marked paid (${patch.paid.ref})`
          : patch.filed
            ? `Marked filed (${patch.filed.ref})`
            : `Attached receipt ${patch.receiptName ?? ""}`.trim()
        // Named as the screen names it, not by id: an audit line reads
        // "Ghana PAYE monthly return, Aug 2026".
        const deadline = state.countryRulePacks
          .flatMap((p) => p.filingDeadlines)
          .find((d) => d.id === patch.deadlineId)
        log({
          employeeId: null,
          action: `${what}: ${patch.country} ${deadline?.name ?? patch.deadlineId}, ${periodLabel(patch.period)}`,
        })
      },

      reportPackIssue: (report) => {
        setState((s) => ({
          ...s,
          packIssueReports: [
            ...s.packIssueReports,
            { ...report, id: uid("pi"), by: actorId, at: nowIso() },
          ],
        }))
        log({
          employeeId: null,
          action: `Reported an issue with ${report.country} rule pack ${report.version}: ${report.field}`,
        })
      },

      chooseCoverage: (country, choice) => {
        setState((s) => ({
          ...s,
          coverageDecisions: [
            ...s.coverageDecisions.filter((d) => d.country !== country),
            { country, choice, by: actorId, at: nowIso() },
          ],
        }))
        log({
          employeeId: null,
          action: `Chose how ${country} is paid: ${choice.replace(/_/g, " ")}`,
        })
      },

      submitCustomPack: (country, note) => {
        setState((s) => ({
          ...s,
          customPackSubmissions: [
            ...s.customPackSubmissions.filter((p) => p.country !== country),
            { country, note, by: actorId, at: nowIso() },
          ],
        }))
        log({
          employeeId: null,
          action: `Sent ${country}'s rules to Zelos to build as a custom pack`,
        })
      },

      saveApprovalSettings: (patch) => {
        setState((s) => ({
          ...s,
          approvalSettings: { ...s.approvalSettings, ...patch },
        }))
      },

      /* ── Payroll runs ──────────────────────────────────────────── */

      advanceRun: (id, to, note) => {
        setState((s) => ({
          ...s,
          payrollRuns: s.payrollRuns.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: to,
                  submittedAt:
                    to === "pending_approval" ? nowIso() : r.submittedAt,
                  events: [
                    ...r.events,
                    {
                      at: nowIso(),
                      by: actorId,
                      action: RUN_STEP_LABEL[to],
                      ...(note ? { note } : {}),
                    },
                  ],
                }
              : r
          ),
        }))
      },

      decideRun: (id, outcome, reason) => {
        setState((s) => {
          const run = s.payrollRuns.find((r) => r.id === id)
          if (!run) return s
          const at = nowIso()
          return {
            ...s,
            payrollRuns: s.payrollRuns.map((r) =>
              r.id === id
                ? {
                    ...r,
                    // A rejection sends it back to the preparer with the
                    // reason attached; it does not discard the work.
                    status: outcome === "approved" ? "approved" : "calculated",
                    decision: { by: actorId, at, outcome, reason },
                    fxRates:
                      outcome === "approved" && r.fxRates.length === 0
                        ? FX_AT_APPROVAL(r.payGroupId, at)
                        : r.fxRates,
                    events: [
                      ...r.events,
                      {
                        at,
                        by: actorId,
                        action:
                          outcome === "approved" ? "Approved" : "Rejected",
                        note: reason,
                      },
                    ],
                  }
                : r
            ),
            auditLog: [
              {
                id: uid("a"),
                employeeId: null,
                actorId,
                action: `${outcome === "approved" ? "Approved" : "Rejected"} payroll run ${id}`,
                field: id,
                after: reason,
                at,
              },
              ...s.auditLog,
            ],
          }
        })
      },

      addLineAdjustment: (draft) => {
        setState((s) => ({
          ...s,
          lineAdjustments: [
            ...s.lineAdjustments,
            { ...draft, id: uid("adj"), by: actorId, at: nowIso() },
          ],
          payrollRuns: s.payrollRuns.map((r) =>
            r.id === draft.runId
              ? {
                  ...r,
                  events: [
                    ...r.events,
                    {
                      at: nowIso(),
                      by: actorId,
                      action: "Adjustment added",
                      note: draft.note,
                      employeeId: draft.employeeId,
                    },
                  ],
                }
              : r
          ),
        }))
      },

      acknowledgeReadiness: (runId, checkId, reason) => {
        setState((s) => ({
          ...s,
          // Append-only: an acknowledgement is a decision somebody made,
          // and it stays on the run whatever happens next.
          readinessAcknowledgements: [
            ...s.readinessAcknowledgements,
            { runId, checkId, by: actorId, reason, at: nowIso() },
          ],
        }))
      },

      importExternalResults: (runId, rows) => {
        setState((s) => ({
          ...s,
          externalResults: [
            ...s.externalResults.filter((r) => r.runId !== runId),
            ...rows.map((r) => ({ ...r, runId })),
          ],
          payrollRuns: s.payrollRuns.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  status: "calculated" as const,
                  events: [
                    ...r.events,
                    {
                      at: nowIso(),
                      by: actorId,
                      action: "Results uploaded",
                      note: `${rows.length} lines from the provider's file.`,
                    },
                  ],
                }
              : r
          ),
        }))
      },

      startOffCycleRun: (draft) => {
        const run: PayrollRun = {
          id: uid("run"),
          payGroupId: draft.payGroupId,
          kind: "off_cycle",
          periodStart: TODAY_ISO,
          periodEnd: TODAY_ISO,
          payDate: draft.payDate,
          status: "inputs_open",
          preparedBy: actorId,
          submittedAt: null,
          decision: null,
          fxRates: [],
          employeeIds: draft.employeeIds,
          reason: draft.reason,
          events: [
            {
              at: nowIso(),
              by: actorId,
              action: "Off-cycle run started",
              note: draft.reason,
            },
          ],
        }
        setState((s) => ({ ...s, payrollRuns: [run, ...s.payrollRuns] }))
        return run
      },

      addOneOffPayment: (draft) => {
        setState((s) => ({
          ...s,
          oneOffPayments: [
            {
              ...draft,
              id: uid("oo"),
              status: "upcoming",
              includedInRunId: null,
              events: [{ at: nowIso(), by: actorId, action: "Added" }],
            },
            ...s.oneOffPayments,
          ],
        }))
      },

      createPaymentBatches: (runId, batches) => {
        setState((s) => ({
          ...s,
          paymentBatches: [
            ...s.paymentBatches.filter((b) => b.runId !== runId),
            ...batches.map((b) => ({
              ...b,
              events: [{ at: nowIso(), by: actorId, action: "Initiated" }],
            })),
          ],
          payrollRuns: s.payrollRuns.map((r) =>
            r.id === runId && r.status === "approved"
              ? {
                  ...r,
                  status: "paying" as const,
                  events: [
                    ...r.events,
                    { at: nowIso(), by: actorId, action: "Payments started" },
                  ],
                }
              : r
          ),
        }))
      },

      advanceBatch: (batchId, to) => {
        setState((s) => {
          const batches = s.paymentBatches.map((b) =>
            b.id === batchId
              ? {
                  ...b,
                  status: to,
                  items: b.items.map((i) =>
                    i.status === "failed"
                      ? i
                      : {
                          ...i,
                          status:
                            to === "confirmed"
                              ? ("confirmed" as const)
                              : to === "sent"
                                ? ("sent" as const)
                                : i.status,
                        }
                  ),
                  events: [
                    ...b.events,
                    {
                      at: nowIso(),
                      by: actorId,
                      action:
                        to === "sent"
                          ? "Sent to the provider"
                          : to === "confirmed"
                            ? "Confirmed"
                            : "Failed",
                    },
                  ],
                }
              : b
          )

          // A run is paid once every batch on it has settled.
          const batch = batches.find((b) => b.id === batchId)
          const runBatches = batch
            ? batches.filter((b) => b.runId === batch.runId)
            : []
          const allDone =
            runBatches.length > 0 &&
            runBatches.every((b) => b.status === "confirmed")

          return {
            ...s,
            paymentBatches: batches,
            payrollRuns: s.payrollRuns.map((r) =>
              batch && r.id === batch.runId && allDone && r.status !== "paid"
                ? {
                    ...r,
                    status: "paid" as const,
                    events: [
                      ...r.events,
                      { at: nowIso(), by: actorId, action: "Paid" },
                    ],
                  }
                : r
            ),
          }
        })
      },

      retryPaymentItem: (batchId, employeeId) => {
        setState((s) => ({
          ...s,
          paymentBatches: s.paymentBatches.map((b) =>
            b.id === batchId
              ? {
                  ...b,
                  items: b.items.map((i) =>
                    i.employeeId === employeeId
                      ? { ...i, status: "sent" as const }
                      : i
                  ),
                  status: "sent" as const,
                  events: [
                    ...b.events,
                    {
                      at: nowIso(),
                      by: actorId,
                      action: "Retried",
                      note: `Sent again to the same destination.`,
                    },
                  ],
                }
              : b
          ),
        }))
      },

      payItemByChannel: (batchId, employeeId, channel) => {
        setState((s) => ({
          ...s,
          paymentBatches: s.paymentBatches.map((b) =>
            b.id === batchId
              ? {
                  ...b,
                  items: b.items.map((i) =>
                    i.employeeId === employeeId
                      ? {
                          ...i,
                          status: "sent" as const,
                          paidByChannel: channel,
                        }
                      : i
                  ),
                  events: [
                    ...b.events,
                    {
                      at: nowIso(),
                      by: actorId,
                      action: "Sent by another channel",
                      note: channel,
                    },
                  ],
                }
              : b
          ),
        }))
      },

      cancelOneOffPayment: (id, reason) => {
        setState((s) => ({
          ...s,
          // Cancelling writes an event. There is no delete in Pay.
          oneOffPayments: s.oneOffPayments.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: "cancelled" as const,
                  events: [
                    ...o.events,
                    {
                      at: nowIso(),
                      by: actorId,
                      action: "Cancelled",
                      note: reason,
                    },
                  ],
                }
              : o
          ),
        }))
      },

      decideTimesheet: (periodId, employeeIds, status, comment) => {
        setState((s) => ({
          ...s,
          timesheets: s.timesheets.map((t) =>
            t.periodId === periodId && employeeIds.includes(t.employeeId)
              ? {
                  ...t,
                  status,
                  decidedBy: actorId,
                  decidedAt: nowIso(),
                  ...(comment ? { comment } : {}),
                }
              : t
          ),
        }))
      },

      submitTimesheet: (periodId, employeeId) => {
        setState((s) => ({
          ...s,
          timesheets: s.timesheets.map((t) =>
            t.periodId === periodId && t.employeeId === employeeId
              ? { ...t, status: "pendingReview", submittedAt: nowIso() }
              : t
          ),
        }))
      },

      closePayPeriod: (periodId) => {
        setState((s) => ({
          ...s,
          payPeriods: s.payPeriods.map((p) =>
            p.id === periodId ? { ...p, status: "closed" } : p
          ),
        }))
      },

      submitLeave: (request) => {
        setState((s) => ({
          ...s,
          leaveRequests: [request, ...s.leaveRequests],
        }))
      },

      cancelLeave: (id) => {
        setState((s) => ({
          ...s,
          leaveRequests: s.leaveRequests.map((r) =>
            r.id === id ? { ...r, status: "cancelled" as const } : r
          ),
          auditLog: [
            {
              id: uid("a"),
              employeeId:
                s.leaveRequests.find((r) => r.id === id)?.employeeId ?? null,
              actorId,
              action: "Cancelled leave request",
              field: id,
              after: "cancelled",
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
      },

      addOnboardingTask: (task) => {
        setState((s) => ({
          ...s,
          onboardingTasks: [...s.onboardingTasks, task],
        }))
      },

      deleteOnboardingTask: (id) => {
        setState((s) => ({
          ...s,
          onboardingTasks: s.onboardingTasks.filter((t) => t.id !== id),
        }))
      },

      addDocuments: (docs) => {
        setState((s) => ({
          ...s,
          documents: [...docs, ...s.documents],
          auditLog: [
            ...docs.map((d) => ({
              id: uid("a"),
              employeeId: d.employeeId,
              actorId,
              action: `Uploaded document ${d.name}`,
              field: d.category,
              at: nowIso(),
            })),
            ...s.auditLog,
          ],
        }))
      },

      updateDocument: (id, patch) => {
        setState((s) => {
          const doc = s.documents.find((d) => d.id === id)
          if (!doc) return s
          return {
            ...s,
            documents: s.documents.map((d) =>
              d.id === id ? { ...d, ...patch } : d
            ),
            auditLog: [
              {
                id: uid("a"),
                employeeId: doc.employeeId,
                actorId,
                action: `Updated document ${doc.name}`,
                field: Object.keys(patch).join(", "),
                after: Object.values(patch).map(String).join(", "),
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      deleteDocument: (id) => {
        setState((s) => {
          const doc = s.documents.find((d) => d.id === id)
          if (!doc) return s
          return {
            ...s,
            documents: s.documents.filter((d) => d.id !== id),
            auditLog: [
              {
                id: uid("a"),
                employeeId: doc.employeeId,
                actorId,
                action: "Removed a document",
                before: doc.name,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      updateRequisition: (id, patch) => {
        setState((s) => ({
          ...s,
          requisitions: s.requisitions.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        }))
      },

      toggleClearance: (caseId, key) => {
        setState((s) => {
          const c = s.offboarding.find((x) => x.id === caseId)
          if (!c) return s
          return {
            ...s,
            offboarding: s.offboarding.map((x) =>
              x.id === caseId
                ? {
                    ...x,
                    clearance: { ...x.clearance, [key]: !x.clearance[key] },
                  }
                : x
            ),
            auditLog: [
              {
                id: uid("a"),
                employeeId: c.employeeId,
                actorId,
                action: `Marked ${key} clearance ${c.clearance[key] ? "outstanding" : "done"}`,
                field: caseId,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      openOffboarding: (draft) => {
        let created: OffboardingCase | null = null
        setState((s) => {
          const emp = s.employees.find((e) => e.id === draft.employeeId)
          if (!emp) return s
          const open = s.offboarding.some(
            (c) => c.employeeId === emp.id && c.state !== "closed"
          )
          if (open) return s
          created = {
            id: newOffboardingId(s.offboarding),
            employeeId: emp.id,
            reason: draft.reason,
            noticeGivenOn: draft.noticeGivenOn,
            lastWorkingDay: draft.lastWorkingDay,
            exitInterviewDone: false,
            clearance: {
              assets: STANDARD_ASSETS.map((a) => ({ ...a })),
              access: false,
              finance: false,
              handover: false,
            },
            finalSettlement: null,
            state: "notice",
            exitInterviewOn: null,
            exitNotes: null,
            settlement: null,
            sentToPayrollOn: null,
            handoverTo: null,
            closedOn: null,
          }
          // Only a record that may legally go on notice is moved there; a
          // probationer or someone already dismissed keeps their state until close.
          const moving =
            emp.lifecycleState !== "notice" &&
            LIFECYCLE_TRANSITIONS[emp.lifecycleState].includes("notice")
          return {
            ...s,
            offboarding: [created, ...s.offboarding],
            employees: moving
              ? s.employees.map((e) =>
                  e.id === emp.id ? { ...e, lifecycleState: "notice" } : e
                )
              : s.employees,
            lifecycleEvents: moving
              ? [
                  {
                    id: uid("le"),
                    employeeId: emp.id,
                    from: emp.lifecycleState,
                    to: "notice",
                    reason: `Offboarding opened: ${draft.reason.replace("_", " ")}`,
                    actorId,
                    at: nowIso(),
                    effectiveDate: draft.noticeGivenOn,
                  },
                  ...s.lifecycleEvents,
                ]
              : s.lifecycleEvents,
            auditLog: [
              {
                id: uid("a"),
                employeeId: emp.id,
                actorId,
                action: "Opened an offboarding case",
                field: created.id,
                after: draft.reason,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
        return created
      },

      updateOffboarding: (id, patch, action) => {
        setState((s) => {
          const c = s.offboarding.find((x) => x.id === id)
          if (!c) return s
          const merged = { ...c, ...patch }
          merged.state = caseStage(merged)
          return {
            ...s,
            offboarding: s.offboarding.map((x) => (x.id === id ? merged : x)),
            auditLog: [
              {
                id: uid("a"),
                employeeId: c.employeeId,
                actorId,
                action,
                field: id,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      closeOffboarding: (id) => {
        setState((s) => {
          const c = s.offboarding.find((x) => x.id === id)
          if (!c || c.closedOn) return s
          const emp = s.employees.find((e) => e.id === c.employeeId)
          const end = endStateFor(c.reason)
          // Someone already terminated by a disciplinary outcome is at their
          // end state; the case still closes, but the record is not moved twice.
          const move =
            !!emp && LIFECYCLE_TRANSITIONS[emp.lifecycleState].includes(end)
          return {
            ...s,
            offboarding: s.offboarding.map((x) =>
              x.id === id ? { ...x, closedOn: TODAY_ISO, state: "closed" } : x
            ),
            employees: move
              ? s.employees.map((e) =>
                  e.id === c.employeeId ? { ...e, lifecycleState: end } : e
                )
              : s.employees,
            lifecycleEvents: move
              ? [
                  {
                    id: uid("le"),
                    employeeId: c.employeeId,
                    from: emp!.lifecycleState,
                    to: end,
                    reason: "Offboarding complete",
                    actorId,
                    at: nowIso(),
                    effectiveDate: c.lastWorkingDay,
                  },
                  ...s.lifecycleEvents,
                ]
              : s.lifecycleEvents,
            auditLog: [
              {
                id: uid("a"),
                employeeId: c.employeeId,
                actorId,
                action: "Closed an offboarding case",
                field: id,
                after: end,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      addRequisition: (r) => {
        setState((s) => ({ ...s, requisitions: [r, ...s.requisitions] }))
      },

      addCandidate: (c) => {
        setState((s) => ({ ...s, candidates: [c, ...s.candidates] }))
      },

      updateCandidate: (id, patch) => {
        setState((s) => ({
          ...s,
          candidates: s.candidates.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        }))
      },

      hireCandidate: (id) => {
        let created: Employee | null = null
        setState((s) => {
          const c = s.candidates.find((x) => x.id === id)
          const req = c && s.requisitions.find((r) => r.id === c.requisitionId)
          if (!c || !req || c.employeeId) return s
          const emp = preHireFrom(c, req, s.employees)
          created = emp
          const hiredCount = s.candidates.filter(
            (x) =>
              x.requisitionId === req.id && (x.stage === "hired" || x.id === id)
          ).length
          const due = (days: number) => addDays(emp.startDate, days)
          const tasks: OnboardingTask[] = (
            [
              [
                "Return signed employment contract",
                "employee",
                -3,
                "paperwork",
              ],
              [
                "Submit Ghana Card & SSNIT number",
                "employee",
                -2,
                "compliance",
              ],
              ["Create work email & accounts", "it", -2, "access"],
              ["Issue laptop and access badge", "it", -1, "access"],
              ["Register on payroll", "hr", -1, "compliance"],
              ["Day-one orientation", "hr", 0, "orientation"],
            ] as const
          ).map(([title, owner, offset, category]) => ({
            id: uid("ot"),
            employeeId: emp.id,
            title,
            owner,
            dueOn: due(offset),
            done: false,
            category,
          }))
          return {
            ...s,
            employees: [emp, ...s.employees],
            candidates: s.candidates.map((x) =>
              x.id === id ? { ...x, stage: "hired", employeeId: emp.id } : x
            ),
            requisitions: s.requisitions.map((r) =>
              r.id === req.id && hiredCount >= r.openings
                ? { ...r, status: "filled" }
                : r
            ),
            onboardingTasks: [...s.onboardingTasks, ...tasks],
            lifecycleEvents: [
              {
                id: uid("le"),
                employeeId: emp.id,
                from: null,
                to: "pre_hire",
                reason: `Hired from ${req.id}`,
                actorId,
                at: nowIso(),
                effectiveDate: emp.startDate,
              },
              ...s.lifecycleEvents,
            ],
            auditLog: [
              {
                id: uid("a"),
                employeeId: emp.id,
                actorId,
                action: "Created pre-hire record from a recruitment hire",
                field: c.id,
                after: req.id,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
        return created
      },

      updateReview: (id, patch, action) => {
        setState((s) => {
          const r = s.reviews.find((x) => x.id === id)
          if (!r) return s
          return {
            ...s,
            reviews: s.reviews.map((x) =>
              x.id === id ? { ...x, ...patch } : x
            ),
            auditLog: action
              ? [
                  {
                    id: uid("a"),
                    employeeId: r.employeeId,
                    actorId,
                    action,
                    field: id,
                    after: patch.status,
                    at: nowIso(),
                  },
                  ...s.auditLog,
                ]
              : s.auditLog,
          }
        })
      },

      addReviews: (reviews) => {
        setState((s) => ({
          ...s,
          reviews: [...reviews, ...s.reviews],
          auditLog: [
            {
              id: uid("a"),
              employeeId: null,
              actorId,
              action: `Launched a review cycle for ${reviews.length} people`,
              field: reviews[0]?.cycle,
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
      },

      raiseCase: (c) => {
        setState((s) => ({
          ...s,
          cases: [c, ...s.cases],
          auditLog: [
            {
              id: uid("a"),
              employeeId: c.employeeId,
              actorId,
              action: "Raised a disciplinary case",
              field: c.id,
              after: c.severity,
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
      },

      updateCase: (id, patch, event) => {
        setState((s) => {
          const c = s.cases.find((x) => x.id === id)
          if (!c) return s
          const at = nowIso()
          const entry: CaseEvent = { id: uid("ce"), at, actorId, text: event }
          return {
            ...s,
            cases: s.cases.map((x) =>
              x.id === id
                ? {
                    ...x,
                    ...patch,
                    events: [...(patch.events ?? x.events), entry],
                  }
                : x
            ),
            auditLog: [
              {
                id: uid("a"),
                employeeId: c.employeeId,
                actorId,
                action: "Updated a disciplinary case",
                field: id,
                after: event,
                at,
              },
              ...s.auditLog,
            ],
          }
        })
      },

      addExternalReturnFiles: (files) => {
        setState((s) => ({
          ...s,
          externalReturnFiles: [...files, ...s.externalReturnFiles],
          auditLog: [
            ...files.map((f) => ({
              id: uid("a"),
              employeeId: null,
              actorId,
              action: `Attached an external return: ${f.name}`,
              field: f.payGroupId,
              at: nowIso(),
            })),
            ...s.auditLog,
          ],
        }))
      },

      removeExternalReturnFile: (id) => {
        setState((s) => ({
          ...s,
          externalReturnFiles: s.externalReturnFiles.filter((f) => f.id !== id),
        }))
      },

      queueEmail: (m) => {
        setState((s) => ({ ...s, outbox: [makeEmail(m), ...s.outbox] }))
      },

      deliverEmail: (id) => {
        setState((s) => ({
          ...s,
          outbox: s.outbox.map((e) =>
            e.id === id && e.status === "scheduled"
              ? { ...e, status: "sent" as const, sendAt: nowIso() }
              : e
          ),
        }))
      },

      cancelEmail: (id) => {
        setState((s) => ({
          ...s,
          outbox: s.outbox.map((e) =>
            e.id === id && e.status === "scheduled"
              ? { ...e, status: "cancelled" as const }
              : e
          ),
        }))
      },

      saveBookingPage: (p) => {
        setState((s) => ({
          ...s,
          bookingPages: s.bookingPages.some((x) => x.id === p.id)
            ? s.bookingPages.map((x) => (x.id === p.id ? p : x))
            : [p, ...s.bookingPages],
          auditLog: [
            {
              id: uid("a"),
              employeeId: null,
              actorId,
              action: `Saved booking page ${p.name}`,
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
      },

      deleteBookingPage: (id) => {
        setState((s) => ({
          ...s,
          bookingPages: s.bookingPages.filter((p) => p.id !== id),
        }))
      },

      setAvailability: (a) => {
        setState((s) => ({
          ...s,
          availability: s.availability.some(
            (x) => x.employeeId === a.employeeId
          )
            ? s.availability.map((x) => (x.employeeId === a.employeeId ? a : x))
            : [...s.availability, a],
        }))
      },

      sendBookingLink: (candidateId, pageId) => {
        const s0 = stateRef.current
        const c = s0.candidates.find((x) => x.id === candidateId)
        const page = s0.bookingPages.find((p) => p.id === pageId)
        if (!c || !page)
          return { ok: false, reason: "Candidate or booking page not found." }
        if (c.stage === "rejected" || c.stage === "hired")
          return { ok: false, reason: "This application is closed." }
        if (!page.active)
          return { ok: false, reason: "That booking page is switched off." }
        const live = s0.bookings.find(
          (b) =>
            b.candidateId === candidateId &&
            b.pageId === pageId &&
            (b.status === "invited" || b.status === "booked")
        )
        if (live?.status === "booked")
          return {
            ok: false,
            reason:
              "They have already booked. Reschedule it from their booking.",
          }
        const token = live?.token ?? newToken()
        const origin =
          typeof window === "undefined" ? "" : window.location.origin
        const req = s0.requisitions.find((r) => r.id === c.requisitionId)
        const expiresOn = addDays(TODAY_ISO, 7)
        setState((s) => {
          const booking: Booking = live
            ? {
                ...live,
                expiresOn,
                history: [
                  ...live.history,
                  { at: nowIso(), text: "Link sent again." },
                ],
              }
            : {
                id: uid("bk"),
                token,
                candidateId,
                pageId,
                status: "invited",
                invitedOn: TODAY_ISO,
                expiresOn,
                slotStart: null,
                interviewerId: null,
                timeZone: null,
                answers: {},
                bookedOn: null,
                link: null,
                interviewId: null,
                history: [{ at: nowIso(), text: "Booking link sent." }],
              }
          const mail = inviteEmail({
            candidate: c,
            page,
            role: req?.title ?? "the role",
            company: s.company.tradingName || s.company.legalName,
            url: `${origin}/book/${token}`,
            expiresOn,
            sendAt: nowIso(),
          })
          return {
            ...s,
            bookings: live
              ? s.bookings.map((b) => (b.id === live.id ? booking : b))
              : [booking, ...s.bookings],
            outbox: [
              makeEmail({ ...mail, relatedId: booking.id, status: "sent" }),
              ...s.outbox,
            ],
            auditLog: [
              {
                id: uid("a"),
                employeeId: null,
                actorId,
                action: `Sent a booking link to ${c.name}`,
                field: page.name,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
        return { ok: true, token }
      },

      makeBooking: (token, start, timeZone, answers) => {
        const decide = (s: State) =>
          planBooking(bookingWorld(s), token, start, timeZone, answers, TODAY, {
            interview: uid("iv"),
          })
        const first = decide(stateRef.current)
        if (!first.ok) return { ok: false, reason: first.reason }
        setState((s) => {
          // Decided again against the newest state, so a slot taken a moment
          // ago in another tab is still refused.
          const plan = decide(s)
          return plan.ok ? applyBooking(s, plan, timeZone, answers) : s
        })
        return { ok: true }
      },

      cancelBooking: (token, by) => {
        setState((s) => applyCancel(s, token, by, actorId))
      },

      markNoShow: (bookingId) => {
        setState((s) => {
          const b = s.bookings.find((x) => x.id === bookingId)
          if (!b || b.status !== "booked") return s
          return {
            ...s,
            bookings: s.bookings.map((x) =>
              x.id === bookingId
                ? {
                    ...x,
                    status: "no_show" as const,
                    history: [
                      ...x.history,
                      { at: nowIso(), text: "Marked as a no-show." },
                    ],
                  }
                : x
            ),
            candidates: s.candidates.map((c) =>
              c.id === b.candidateId
                ? {
                    ...c,
                    interviews: c.interviews.map((i) =>
                      i.id === b.interviewId
                        ? { ...i, status: "no_show" as const }
                        : i
                    ),
                  }
                : c
            ),
            auditLog: [
              {
                id: uid("a"),
                employeeId: null,
                actorId,
                action: "Marked an interview as a no-show",
                field: b.id,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      saveQuestion: (q) => {
        setState((s) => ({
          ...s,
          questionBank: s.questionBank.some((x) => x.id === q.id)
            ? s.questionBank.map((x) => (x.id === q.id ? q : x))
            : [q, ...s.questionBank],
        }))
      },

      deleteQuestion: (id) => {
        setState((s) => ({
          ...s,
          questionBank: s.questionBank.filter((q) => q.id !== id),
          // A test that used it simply stops asking it; papers already issued keep their copy of the id.
          tests: s.tests.map((t) => ({
            ...t,
            questionIds: t.questionIds.filter((x) => x !== id),
          })),
        }))
      },

      saveTest: (t) => {
        setState((s) => ({
          ...s,
          tests: s.tests.some((x) => x.id === t.id)
            ? s.tests.map((x) => (x.id === t.id ? t : x))
            : [t, ...s.tests],
        }))
      },

      deleteTest: (id) => {
        setState((s) => ({ ...s, tests: s.tests.filter((t) => t.id !== id) }))
      },

      sendAssessment: (candidateId, testId) => {
        const s0 = stateRef.current
        const c = s0.candidates.find((x) => x.id === candidateId)
        const test = s0.tests.find((t) => t.id === testId)
        if (!c || !test)
          return { ok: false, reason: "Candidate or test not found." }
        if (c.stage === "rejected" || c.stage === "hired")
          return { ok: false, reason: "This application is closed." }
        if (!test.active)
          return { ok: false, reason: "That test is switched off." }
        const live = s0.invitations.find(
          (i) =>
            i.candidateId === candidateId &&
            i.testId === testId &&
            (i.status === "invited" || i.status === "started")
        )
        if (live)
          return { ok: false, reason: "They already have this test open." }
        const token = newToken()
        const origin =
          typeof window === "undefined" ? "" : window.location.origin
        const paper = issuePaper(test, s0.questionBank)
        if (paper.length === 0)
          return { ok: false, reason: "This test has no questions." }
        const req = s0.requisitions.find((r) => r.id === c.requisitionId)
        // Real time, not the demo's fixed date: the clock has to really run.
        const windowEnd = new Date(
          Date.now() + test.windowDays * 86_400_000
        ).toISOString()
        setState((s) => {
          const inv: TestInvitation = {
            id: uid("inv"),
            token,
            candidateId,
            testId,
            status: "invited",
            invitedOn: new Date().toISOString(),
            windowEnd,
            startedAt: null,
            deadline: null,
            extraMinutes: 0,
            extraNote: null,
            submittedAt: null,
            questionIds: paper,
            answers: {},
            flags: [],
            autoMarks: {},
            reviewMarks: {},
            reviewed: false,
            reviewNote: null,
            reviewerId: null,
          }
          const company = s.company.tradingName || s.company.legalName
          return {
            ...s,
            invitations: [inv, ...s.invitations],
            outbox: [
              makeEmail({
                kind: "assessment_invite",
                to: c.email,
                toName: c.name,
                subject: `${company}: your online assessment for ${req?.title ?? "the role"}`,
                body: `Hello ${c.name.split(" ")[0]},\n\nAs part of your application, please complete "${test.name}". It has ${paper.length} questions and a ${test.durationMin}-minute time limit; the clock starts when you press Start and cannot be paused. You have one attempt, and the link is open until ${windowEnd.slice(0, 10)}. Use a laptop for any coding questions.`,
                cta: {
                  label: "Open the assessment",
                  href: `${origin}/assess/${token}`,
                },
                sendAt: nowIso(),
                relatedId: inv.id,
                status: "sent",
              }),
              ...s.outbox,
            ],
            // The stage is left alone: moving to Assessment is the recruiter's
            // call, and has its own rule (interview feedback first).
            auditLog: [
              {
                id: uid("a"),
                employeeId: null,
                actorId,
                action: `Sent an assessment to ${c.name}`,
                field: test.name,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
        return { ok: true, token }
      },

      startTest: (token) => {
        const inv = stateRef.current.invitations.find((i) => i.token === token)
        if (!inv)
          return { ok: false, reason: "This assessment link is not valid." }
        if (inv.status === "started") return { ok: true }
        if (!canStart(inv, Date.now()))
          return {
            ok: false,
            reason:
              inv.status === "invited"
                ? "This invitation has expired."
                : "This assessment has already been taken.",
          }
        setState((s) => {
          const i = s.invitations.find((x) => x.token === token)
          const test = i && s.tests.find((t) => t.id === i.testId)
          if (!i || !test || i.status !== "invited") return s
          const startedAt = new Date().toISOString()
          return {
            ...s,
            invitations: s.invitations.map((x) =>
              x.token === token
                ? {
                    ...x,
                    status: "started" as const,
                    startedAt,
                    deadline: deadlineFor(startedAt, test, x.extraMinutes),
                  }
                : x
            ),
          }
        })
        return { ok: true }
      },

      saveAnswers: (token, answers) => {
        const inv = stateRef.current.invitations.find((i) => i.token === token)
        if (!inv || !acceptsAnswers(inv, Date.now())) return false
        setState((s) => ({
          ...s,
          invitations: s.invitations.map((x) =>
            x.token === token && acceptsAnswers(x, Date.now())
              ? { ...x, answers: { ...x.answers, ...answers } }
              : x
          ),
        }))
        return true
      },

      logFlag: (token, flag) => {
        setState((s) => ({
          ...s,
          invitations: s.invitations.map((x) =>
            x.token === token && x.status === "started"
              ? {
                  ...x,
                  flags: [
                    ...x.flags,
                    { ...flag, at: new Date().toISOString() },
                  ],
                }
              : x
          ),
        }))
      },

      submitTest: (token) => {
        setState((s) => {
          const inv = s.invitations.find((i) => i.token === token)
          if (!inv || inv.status !== "started") return s
          const test = s.tests.find((t) => t.id === inv.testId)
          const c = s.candidates.find((x) => x.id === inv.candidateId)
          const company = s.company.tradingName || s.company.legalName
          const submittedAt = new Date().toISOString()
          return {
            ...s,
            invitations: s.invitations.map((x) =>
              x.token === token
                ? {
                    ...x,
                    status: "submitted" as const,
                    submittedAt,
                    autoMarks: autoMarks(
                      x.questionIds,
                      s.questionBank,
                      x.answers
                    ),
                  }
                : x
            ),
            outbox: c
              ? [
                  makeEmail({
                    kind: "assessment_submitted",
                    to: c.email,
                    toName: c.name,
                    subject: `${company}: we received your assessment`,
                    body: `Hello ${c.name.split(" ")[0]},\n\nThank you. Your answers to "${test?.name ?? "the assessment"}" were submitted at ${submittedAt.slice(11, 16)} UTC. The team will be in touch about next steps.`,
                    sendAt: nowIso(),
                    relatedId: inv.id,
                    status: "sent",
                  }),
                  ...s.outbox,
                ]
              : s.outbox,
            notifications: [
              {
                id: uid("n"),
                title: `${c?.name ?? "A candidate"} submitted an assessment`,
                body: `${test?.name ?? "Assessment"} is ready to review.`,
                at: nowIso(),
                read: false,
                kind: "system" as const,
                href: "/recruitment",
              },
              ...s.notifications,
            ],
          }
        })
      },

      saveReview: (id, marks, note, finish) => {
        setState((s) => {
          const inv = s.invitations.find((i) => i.id === id)
          if (!inv || inv.status !== "submitted") return s
          return {
            ...s,
            invitations: s.invitations.map((x) =>
              x.id === id
                ? {
                    ...x,
                    reviewMarks: marks,
                    reviewNote: note || null,
                    reviewed: finish,
                    reviewerId: actorId,
                  }
                : x
            ),
            auditLog: finish
              ? [
                  {
                    id: uid("a"),
                    employeeId: null,
                    actorId,
                    action: "Reviewed an assessment",
                    field: id,
                    at: nowIso(),
                  },
                  ...s.auditLog,
                ]
              : s.auditLog,
          }
        })
      },

      grantExtraTime: (id, minutes, note) => {
        setState((s) => {
          const inv = s.invitations.find((i) => i.id === id)
          const test = inv && s.tests.find((t) => t.id === inv.testId)
          if (!inv || !test || inv.status === "submitted" || minutes <= 0)
            return s
          const extra = inv.extraMinutes + minutes
          return {
            ...s,
            invitations: s.invitations.map((x) =>
              x.id === id
                ? {
                    ...x,
                    extraMinutes: extra,
                    extraNote: [x.extraNote, `${minutes} min: ${note}`]
                      .filter(Boolean)
                      .join("; "),
                    deadline: x.startedAt
                      ? deadlineFor(x.startedAt, test, extra)
                      : x.deadline,
                  }
                : x
            ),
            auditLog: [
              {
                id: uid("a"),
                employeeId: null,
                actorId,
                action: `Granted ${minutes} extra minutes on an assessment`,
                field: note,
                at: nowIso(),
              },
              ...s.auditLog,
            ],
          }
        })
      },

      setAlertSettings: (patch) => {
        setState((s) => ({
          ...s,
          alertSettings: { ...s.alertSettings, ...patch },
          auditLog: [
            {
              id: uid("a"),
              employeeId: null,
              actorId,
              action: "Changed compliance alert settings",
              field: Object.keys(patch).join(", "),
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
      },

      saveReport: (r) => {
        setState((s) => ({
          ...s,
          savedReports: [
            {
              ...r,
              id: uid("sr"),
              createdBy: actorId,
              createdOn: TODAY_ISO,
              lastRunOn: null,
            },
            ...s.savedReports,
          ],
        }))
      },

      updateSavedReport: (id, patch) => {
        setState((s) => ({
          ...s,
          savedReports: s.savedReports.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        }))
      },

      deleteSavedReport: (id) => {
        setState((s) => ({
          ...s,
          savedReports: s.savedReports.filter((r) => r.id !== id),
        }))
      },

      toggleOnboardingTask: (id) => {
        setState((s) => ({
          ...s,
          onboardingTasks: s.onboardingTasks.map((t) =>
            t.id === id ? { ...t, done: !t.done } : t
          ),
        }))
      },

      moveCandidate: (id, stage) => {
        setState((s) => ({
          ...s,
          candidates: s.candidates.map((c) =>
            c.id === id ? { ...c, stage } : c
          ),
        }))
      },

      acknowledgeAlert: (id) => {
        setState((s) => ({
          ...s,
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, acknowledged: true } : a
          ),
        }))
      },

      addNotification: (n) => {
        setState((s) => ({
          ...s,
          notifications: [
            { ...n, id: uid("n"), at: nowIso(), read: false },
            ...s.notifications,
          ],
        }))
      },

      markNotificationsRead: () => {
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        }))
      },

      addCoachingNote: (note) => {
        setState((s) => ({ ...s, coachingNotes: [note, ...s.coachingNotes] }))
      },

      escalateNote: (id) => {
        setState((s) => ({
          ...s,
          coachingNotes: s.coachingNotes.map((n) =>
            n.id === id ? { ...n, escalated: true, escalatedAt: nowIso() } : n
          ),
          auditLog: [
            {
              id: uid("a"),
              employeeId:
                s.coachingNotes.find((n) => n.id === id)?.employeeId ?? null,
              actorId,
              action: "Escalated coaching note to official record",
              at: nowIso(),
            },
            ...s.auditLog,
          ],
        }))
      },

      log,
      reset: () => {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
        setState((s) => ({ ...INITIAL, activeRole: s.activeRole }))
      },
    }
  }, [state, hydrated])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>")
  return ctx
}
