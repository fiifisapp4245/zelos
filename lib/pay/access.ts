import type { Employee } from "../types"
import type { Viewer } from "../rbac"

/**
 * Who may see, and who may act.
 *
 * Pay has a narrower reach than the rest of the product, and the reach is
 * decided once here rather than remembered on each screen. A line manager
 * can see and argue for their own people's pay but never decide it, and
 * Payroll can see everyone's without changing anything.
 */

export type PayRole = "approver" | "reader" | "proposer" | "self"

export function payRoleOf(viewer: Viewer): PayRole {
  if (viewer.roles.includes("hr_admin")) return "approver"
  if (viewer.roles.includes("payroll")) return "reader"
  if (
    viewer.roles.includes("line_manager") ||
    viewer.roles.includes("head_of_department")
  )
    return "proposer"
  return "self"
}

/** The people whose pay this session may open. */
export function payScope(viewer: Viewer, employees: Employee[]): Employee[] {
  const role = payRoleOf(viewer)
  if (role === "approver" || role === "reader") return employees
  if (role === "self")
    return employees.filter((e) => e.id === viewer.employeeId)
  return employees.filter(
    (e) =>
      e.managerId === viewer.employeeId ||
      e.dottedLineManagerId === viewer.employeeId ||
      e.id === viewer.employeeId
  )
}

export function canSeePay(
  viewer: Viewer,
  employee: Employee,
  employees: Employee[]
) {
  return payScope(viewer, employees).some((e) => e.id === employee.id)
}

/** Proposing is arguing for a change, which is not the same as making one. */
export function canProposeFor(
  viewer: Viewer,
  employee: Employee,
  employees: Employee[]
) {
  const role = payRoleOf(viewer)
  if (role === "reader" || role === "self") return false
  if (employee.id === viewer.employeeId) return false
  return canSeePay(viewer, employee, employees)
}

export const PAY_ROLE_NOTE: Record<PayRole, string> = {
  approver: "You can propose pay changes, and approve any but your own.",
  reader: "You can see compensation across the company, and change nothing.",
  proposer:
    "You can see and propose pay for your own reports. HR decides the outcome.",
  self: "You can see your own package and its history.",
}
