/**
 * Permission layer.
 *
 * Three access models coexist here, per docs/system-maps/zelos-hr-foundation.md §3:
 *   - static role-based  (salary, official reviews)
 *   - purpose-based      (health/medical data — access must be justified)
 *   - lifecycle/state    (disciplinary cases, escalated coaching notes)
 *
 * State is therefore an input to visibility, not just role. Keeping that here
 * rather than scattered through components is the whole point.
 */

import type {
  Employee,
  PermissionRole,
  DisciplinaryCase,
  CoachingNote,
} from "./types"

export interface Viewer {
  employeeId: string
  roles: PermissionRole[]
}

export const ROLE_LABEL: Record<PermissionRole, string> = {
  hr_admin: "HR Admin",
  line_manager: "Line Manager",
  head_of_department: "Head of Department",
  employee: "Employee",
  payroll: "Payroll Officer",
}

export function has(viewer: Viewer, role: PermissionRole) {
  return viewer.roles.includes(role)
}

export function isSelf(viewer: Viewer, employee: Employee) {
  return viewer.employeeId === employee.id
}

export function isDirectReport(viewer: Viewer, employee: Employee) {
  return employee.managerId === viewer.employeeId
}

export function isDottedReport(viewer: Viewer, employee: Employee) {
  return employee.dottedLineManagerId === viewer.employeeId
}

/** Everyone at or below the viewer in the primary reporting tree. */
export function isInChain(
  viewer: Viewer,
  employee: Employee,
  all: Employee[]
): boolean {
  let cursor: Employee | undefined = employee
  const seen = new Set<string>()
  while (cursor?.managerId && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    if (cursor.managerId === viewer.employeeId) return true
    cursor = all.find((e) => e.id === cursor!.managerId)
  }
  return false
}

export function departmentOf(viewer: Viewer, all: Employee[]) {
  return all.find((e) => e.id === viewer.employeeId)?.department ?? null
}

/** Can the viewer open this employee's record at all? */
export function canViewRecord(
  viewer: Viewer,
  employee: Employee,
  all: Employee[]
) {
  if (has(viewer, "hr_admin") || has(viewer, "payroll")) return true
  if (isSelf(viewer, employee)) return true
  if (isInChain(viewer, employee, all) || isDottedReport(viewer, employee))
    return true
  if (
    has(viewer, "head_of_department") &&
    departmentOf(viewer, all) === employee.department
  )
    return true
  return false
}

/**
 * Salary: self + HR + Payroll only. Line managers are deliberately excluded —
 * a decided one-way door, not an oversight (system map §3).
 */
/**
 * Pay reaches further than it used to: a line manager can see what their
 * own reports are on, because they are the ones asked to argue for a
 * change. Seeing it is not deciding it — approval stays with HR, and
 * amounts stay masked until the manager asks for them.
 */
export function canViewCompensation(viewer: Viewer, employee: Employee) {
  return (
    has(viewer, "hr_admin") ||
    has(viewer, "payroll") ||
    isSelf(viewer, employee) ||
    isDirectReport(viewer, employee) ||
    isDottedReport(viewer, employee)
  )
}

/** Statutory IDs (SSNIT/TIN) are masked until an authorised user reveals them. */
export function canRevealStatutoryIds(viewer: Viewer, employee: Employee) {
  return (
    has(viewer, "hr_admin") ||
    has(viewer, "payroll") ||
    isSelf(viewer, employee)
  )
}

export function canEditRecord(viewer: Viewer, employee: Employee) {
  if (has(viewer, "hr_admin")) return true
  // Employees may edit a narrow set of their own fields; see SELF_EDITABLE_FIELDS.
  return isSelf(viewer, employee)
}

/** The only fields an employee may change on their own record without approval. */
export const SELF_EDITABLE_FIELDS = [
  "phone",
  "personalEmail",
  "residentialAddress",
  "gpsAddress",
  "emergencyContact",
] as const

export function canSelfEdit(field: string) {
  return (SELF_EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function canChangeLifecycle(viewer: Viewer) {
  return has(viewer, "hr_admin")
}

export function canApproveLeave(viewer: Viewer, employee: Employee) {
  if (has(viewer, "hr_admin")) return true
  if (isDirectReport(viewer, employee) || isDottedReport(viewer, employee))
    return true
  return false
}

/** Purpose-based: medical documents need a stated reason, seniority is not enough. */
export function canViewMedical(
  viewer: Viewer,
  employee: Employee,
  statedPurpose: string | null
) {
  if (isSelf(viewer, employee)) return true
  if (!statedPurpose || statedPurpose.trim().length < 8) return false
  return has(viewer, "hr_admin")
}

/** Lifecycle-based: who may read a disciplinary case depends on its state. */
export function canViewCase(
  viewer: Viewer,
  c: DisciplinaryCase,
  employee: Employee
) {
  if (has(viewer, "hr_admin")) return true
  if (c.raisedBy === viewer.employeeId) return true
  const finalised = c.state === "finalised" || c.state === "dismissed"
  if (isSelf(viewer, employee)) return finalised
  if (isDirectReport(viewer, employee)) return finalised
  return false
}

/** Coaching notes are private to their author until escalated. */
export function canViewCoachingNote(viewer: Viewer, note: CoachingNote) {
  if (note.authorId === viewer.employeeId) return true
  if (note.escalated) return has(viewer, "hr_admin")
  return false
}

/**
 * Aggregation floor for any derived/insight figure, so a small team's numbers
 * can't re-identify an individual (system map §9, item 8).
 */
export const MIN_AGGREGATION_GROUP = 5

export function canShowAggregate(groupSize: number) {
  return groupSize >= MIN_AGGREGATION_GROUP
}
