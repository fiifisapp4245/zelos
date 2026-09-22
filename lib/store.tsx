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
import type {
  Alert,
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
  PermissionRole,
  Requisition,
} from "./types"
import type { Viewer } from "./rbac"

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
  activeRole: "hr_admin",
}

const STORAGE_KEY = "zelos-hr-session-v1"

interface StoreValue extends State {
  viewer: Viewer
  setActiveRole: (role: PermissionRole) => void
  employeeById: (id: string | null | undefined) => Employee | undefined
  update: <K extends keyof State>(key: K, value: State[K]) => void
  patchEmployee: (id: string, patch: Partial<Employee>, note?: string) => void
  addEmployee: (employee: Employee) => void
  changeLifecycle: (id: string, to: LifecycleState, reason: string, effectiveDate: string) => void
  decideLeave: (id: string, status: "approved" | "rejected", note: string) => void
  submitLeave: (request: LeaveRequest) => void
  toggleOnboardingTask: (id: string) => void
  moveCandidate: (id: string, stage: Candidate["stage"]) => void
  acknowledgeAlert: (id: string) => void
  markNotificationsRead: () => void
  addCoachingNote: (note: CoachingNote) => void
  escalateNote: (id: string) => void
  log: (entry: Omit<AuditEntry, "id" | "at" | "actorId"> & { actorId?: string }) => void
  reset: () => void
}

const StoreContext = React.createContext<StoreValue | null>(null)

function nowIso() {
  return new Date().toISOString()
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState({ ...INITIAL, ...(JSON.parse(raw) as State) })
    } catch {
      // Private mode or blocked storage — the seeded state is still fine.
    }
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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

    function log(entry: Omit<AuditEntry, "id" | "at" | "actorId"> & { actorId?: string }) {
      setState((s) => ({
        ...s,
        auditLog: [
          { id: uid("a"), at: nowIso(), actorId: entry.actorId ?? actorId, ...entry },
          ...s.auditLog,
        ],
      }))
    }

    return {
      ...state,
      viewer,
      setActiveRole: (role) => setState((s) => ({ ...s, activeRole: role })),
      employeeById: (id) => (id ? state.employees.find((e) => e.id === id) : undefined),
      update: (key, val) => setState((s) => ({ ...s, [key]: val })),

      patchEmployee: (id, patch, note) => {
        setState((s) => {
          const before = s.employees.find((e) => e.id === id)
          const entries: AuditEntry[] = Object.entries(patch).flatMap(([field, after]) => {
            const prev = before ? (before as unknown as Record<string, unknown>)[field] : undefined
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
          })
          return {
            ...s,
            employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
            auditLog: [...entries, ...s.auditLog],
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
            employees: s.employees.map((e) => (e.id === id ? { ...e, lifecycleState: to } : e)),
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
              ? { ...r, status, decidedBy: actorId, decidedAt: nowIso(), decisionNote: note }
              : r
          ),
          auditLog: [
            {
              id: uid("a"),
              employeeId: s.leaveRequests.find((r) => r.id === id)?.employeeId ?? null,
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

      submitLeave: (request) => {
        setState((s) => ({ ...s, leaveRequests: [request, ...s.leaveRequests] }))
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
          candidates: s.candidates.map((c) => (c.id === id ? { ...c, stage } : c)),
        }))
      },

      acknowledgeAlert: (id) => {
        setState((s) => ({
          ...s,
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
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
              employeeId: s.coachingNotes.find((n) => n.id === id)?.employeeId ?? null,
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
