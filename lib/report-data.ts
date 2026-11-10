/**
 * The slice of the company a report may see, for one viewer: their own team
 * for a manager, the whole company for HR. Shared by the Reports screen and by
 * scheduled reports, so a file that is emailed contains exactly what the
 * person who saved it would have seen on screen.
 */
import type { ReportData } from "./reports"
import type {
  AttendanceRecord,
  Candidate,
  DisciplinaryCase,
  Employee,
  EmployeeDocument,
  LeaveBalance,
  LeaveRequest,
  OffboardingCase,
  PerformanceReview,
  Requisition,
} from "./types"
import { has, type Viewer } from "./rbac"
import { visibleEmployees } from "./selectors"

export interface ReportSource {
  employees: Employee[]
  requisitions: Requisition[]
  candidates: Candidate[]
  reviews: PerformanceReview[]
  cases: DisciplinaryCase[]
  offboarding: OffboardingCase[]
  leaveRequests: LeaveRequest[]
  leaveBalances: LeaveBalance[]
  documents: EmployeeDocument[]
  attendance: AttendanceRecord[]
}

export function buildReportData(viewer: Viewer, s: ReportSource): ReportData {
  const people = visibleEmployees(viewer, s.employees)
  const ids = new Set(people.map((e) => e.id))
  const mine = has(viewer, "hr_admin")
    ? s.requisitions
    : s.requisitions.filter((r) => r.hiringManagerId === viewer.employeeId)
  const reqIds = new Set(mine.map((r) => r.id))
  return {
    employees: people,
    requisitions: mine,
    candidates: s.candidates.filter((c) => reqIds.has(c.requisitionId)),
    reviews: s.reviews.filter((r) => ids.has(r.employeeId)),
    cases: s.cases.filter((c) => ids.has(c.employeeId)),
    offboarding: s.offboarding.filter((c) => ids.has(c.employeeId)),
    leaveRequests: s.leaveRequests.filter((r) => ids.has(r.employeeId)),
    leaveBalances: s.leaveBalances.filter((b) => ids.has(b.employeeId)),
    documents: s.documents.filter((d) => ids.has(d.employeeId)),
    attendance: s.attendance.filter((a) => ids.has(a.employeeId)),
  }
}
