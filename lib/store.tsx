"use client"

/**
 * Session store.
 *
 * Everything lives in React state and is mirrored into sessionStorage, so edits
 * made while demoing survive navigation but reset on a new tab. No backend.
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
  LEGAL_ENTITIES,
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
  LegalEntity,
  PayComponent,
  PayGroup,
} from "./pay/types"
import { applyDecision } from "./approvals/selectors"
import { applyChange } from "./pay/derive"
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
} from "./types"
import { TODAY, TODAY_ISO } from "./format"
import { addDays } from "./time"
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
  company: CompanyProfile
  /** Editable settings tables, keyed by table id. */
  tables: Record<string, TableRow[]>
  activeRole: PermissionRole
}

const INITIAL: State = {
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
  company: COMPANY,
  tables: TABLE_ROWS,
  activeRole: "hr_admin",
}

const STORAGE_KEY = "zelos-hr-session"

/**
 * Bump this whenever a persisted shape changes. A stored blob from an older
 * version is discarded rather than merged — spreading last week's data over
 * this week's types is how you get a crash three screens away from the
 * change that caused it.
 */
const STORAGE_VERSION = 6

interface StoreValue extends State {
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
  updateDocument: (id: string, patch: Partial<EmployeeDocument>) => void
  deleteDocument: (id: string) => void
  updateRequisition: (id: string, patch: Partial<Requisition>) => void
  toggleClearance: (
    caseId: string,
    key: keyof OffboardingCase["clearance"]
  ) => void
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(INITIAL)
  const [hydrated, setHydrated] = React.useState(false)

  // Restore on mount only, so the server and first client render agree. This has
  // to happen after hydration, which is exactly what the lint rule warns about —
  // reading sessionStorage during render would produce a mismatch instead.
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { version?: number; state?: State }
        if (saved.version === STORAGE_VERSION && saved.state) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setState({ ...INITIAL, ...saved.state })
        } else {
          sessionStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      // Private mode or blocked storage — the seeded state is still fine.
    }
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, state })
      )
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
        setState((s) => ({
          ...s,
          offboarding: s.offboarding.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  clearance: { ...c.clearance, [key]: !c.clearance[key] },
                }
              : c
          ),
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
          sessionStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
        setState(INITIAL)
      },
    }
  }, [state])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>")
  return ctx
}
