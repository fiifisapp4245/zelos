import type { Alert, Employee, LeaveRequest } from "./types"
import { canApproveLeave, canViewRecord, isInChain, type Viewer } from "./rbac"
import { daysUntil, RETIREMENT_AGE, TODAY, age } from "./format"

/** Records the viewer is allowed to open, in directory order. */
export function visibleEmployees(viewer: Viewer, all: Employee[]) {
  return all.filter((e) => canViewRecord(viewer, e, all))
}

export function directReports(viewer: Viewer, all: Employee[]) {
  return all.filter((e) => e.managerId === viewer.employeeId)
}

export function dottedReports(viewer: Viewer, all: Employee[]) {
  return all.filter((e) => e.dottedLineManagerId === viewer.employeeId)
}

/** Direct reports plus everyone beneath them. */
export function wholeTeam(viewer: Viewer, all: Employee[]) {
  return all.filter((e) => e.id !== viewer.employeeId && isInChain(viewer, e, all))
}

export function pendingApprovalsFor(viewer: Viewer, all: Employee[], requests: LeaveRequest[]) {
  return requests.filter((r) => {
    if (r.status !== "pending") return false
    const emp = all.find((e) => e.id === r.employeeId)
    return emp ? canApproveLeave(viewer, emp) : false
  })
}

export const ACTIVE_STATES = ["active", "probation", "on_leave", "notice", "suspended"] as const

export function isOnStrength(e: Employee) {
  return (ACTIVE_STATES as readonly string[]).includes(e.lifecycleState)
}

/** Alerts the viewer should act on, newest-deadline first. */
export function openAlertsFor(viewer: Viewer, all: Employee[], alerts: Alert[]) {
  return alerts
    .filter((a) => !a.acknowledged)
    .filter((a) => {
      const emp = all.find((e) => e.id === a.employeeId)
      return emp ? canViewRecord(viewer, emp, all) : false
    })
    .sort((x, y) => (daysUntil(x.dueOn) ?? 0) - (daysUntil(y.dueOn) ?? 0))
}

export function headcountByDepartment(employees: Employee[]) {
  const map = new Map<string, number>()
  employees.filter(isOnStrength).forEach((e) => {
    map.set(e.department, (map.get(e.department) ?? 0) + 1)
  })
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

/**
 * A record is "complete" when every field payroll and compliance depend on is
 * present. Surfacing this early is what stops a payroll run discovering it.
 */
const REQUIRED_FOR_PAYROLL: (keyof Employee | string)[] = [
  "ghanaCard",
  "compensation.ssnitNumber",
  "compensation.tin",
  "compensation.grossMonthly",
  "phone",
  "startDate",
  "emergencyContact.phone",
]

export function completeness(e: Employee) {
  const read = (path: string): unknown =>
    path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], e)
  const missing = REQUIRED_FOR_PAYROLL.filter((f) => {
    const v = read(String(f))
    return v === null || v === undefined || v === "" || v === 0
  })
  return {
    missing: missing.map(String),
    percent: Math.round(((REQUIRED_FOR_PAYROLL.length - missing.length) / REQUIRED_FOR_PAYROLL.length) * 100),
  }
}

/** People within `withinDays` of statutory retirement age. */
export function approachingRetirement(employees: Employee[], withinDays = 365) {
  return employees
    .filter(isOnStrength)
    .map((e) => {
      const years = age(e.dateOfBirth)
      const retireOn = new Date(e.dateOfBirth)
      retireOn.setFullYear(retireOn.getFullYear() + RETIREMENT_AGE)
      return { employee: e, age: years, retireOn: retireOn.toISOString().slice(0, 10) }
    })
    .filter((r) => {
      const d = daysUntil(r.retireOn, TODAY)
      return d !== null && d <= withinDays
    })
    .sort((a, b) => (daysUntil(a.retireOn) ?? 0) - (daysUntil(b.retireOn) ?? 0))
}
