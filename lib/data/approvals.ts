import type {
  ActingAssignment,
  ApprovalRequest,
  ApprovalStep,
  Payslip,
} from "../types"
import { EMPLOYEES } from "./employees"

/**
 * Approval chains for the prototype.
 *
 * Every request carries the whole chain, decided steps included, so the queue
 * can answer "whose turn is it" without a second lookup and the stepper can
 * show where a request has been as well as where it is going.
 *
 * Seeded against TODAY = 2026-09-18 so each persona opens on a queue worth
 * looking at: HR at the HR stage across the company, Adwoa on her own team,
 * Maame on pay details, Kofi with one request of his own mid-chain.
 */

function done(
  stage: ApprovalStep["stage"],
  approverId: string,
  decidedAt: string
): ApprovalStep {
  return { stage, approverId, decision: "approved", decidedAt }
}

function waiting(
  stage: ApprovalStep["stage"],
  approverId: string | null
): ApprovalStep {
  return { stage, approverId, decision: "pending", decidedAt: null }
}

export const APPROVALS: ApprovalRequest[] = [
  // ── Leave ──────────────────────────────────────────────────────────────
  {
    id: "ap-001",
    kind: "leave",
    employeeId: "kofi",
    leaveType: "annual",
    startDate: "2026-10-05",
    endDate: "2026-10-14",
    days: 8,
    reason: "Family trip to Cape Coast, booked in July.",
    submittedAt: "2026-09-12T09:20:00",
    dueOn: "2026-09-22",
    status: "pending",
    // Over five days, so payroll is on the chain as well.
    chain: [
      done("line_manager", "adwoa", "2026-09-14T11:05:00"),
      waiting("hr", "fiifi"),
      waiting("payroll", "maame"),
    ],
  },
  {
    id: "ap-002",
    kind: "leave",
    employeeId: "afia",
    leaveType: "sick",
    startDate: "2026-09-21",
    endDate: "2026-09-23",
    days: 3,
    reason: "Medical certificate submitted to HR.",
    submittedAt: "2026-09-11T07:45:00",
    dueOn: "2026-09-15",
    status: "pending",
    chain: [waiting("line_manager", "adwoa"), waiting("hr", "fiifi")],
  },
  {
    id: "ap-003",
    kind: "leave",
    employeeId: "nana",
    leaveType: "annual",
    startDate: "2026-09-28",
    endDate: "2026-10-02",
    days: 5,
    reason: "Wedding in Kumasi.",
    submittedAt: "2026-09-15T16:10:00",
    dueOn: "2026-09-18",
    status: "pending",
    chain: [waiting("line_manager", "adwoa"), waiting("hr", "fiifi")],
  },
  {
    id: "ap-004",
    kind: "leave",
    employeeId: "selorm",
    leaveType: "compassionate",
    startDate: "2026-09-22",
    endDate: "2026-09-24",
    days: 3,
    reason: "Bereavement — funeral rites in Ho.",
    submittedAt: "2026-09-16T08:05:00",
    dueOn: "2026-09-19",
    status: "pending",
    chain: [waiting("line_manager", "adwoa"), waiting("hr", "fiifi")],
  },
  {
    id: "ap-005",
    kind: "leave",
    employeeId: "abena",
    leaveType: "maternity",
    startDate: "2026-10-01",
    endDate: "2026-12-24",
    days: 60,
    reason: "Statutory maternity leave.",
    submittedAt: "2026-09-08T10:00:00",
    dueOn: "2026-09-19",
    status: "pending",
    chain: [
      done("line_manager", "yaw", "2026-09-09T09:15:00"),
      waiting("hr", "fiifi"),
    ],
  },
  {
    id: "ap-006",
    kind: "leave",
    employeeId: "kojo",
    leaveType: "annual",
    startDate: "2026-09-29",
    endDate: "2026-10-02",
    days: 4,
    reason: "Carrying over days that expire in December.",
    submittedAt: "2026-09-14T13:30:00",
    dueOn: "2026-09-21",
    status: "pending",
    chain: [
      done("line_manager", "akwasi", "2026-09-15T08:40:00"),
      waiting("hr", "fiifi"),
    ],
  },
  {
    id: "ap-007",
    kind: "leave",
    employeeId: "adjoa",
    leaveType: "study",
    startDate: "2026-10-12",
    endDate: "2026-10-16",
    days: 5,
    reason: "ICAG Level 3 sittings.",
    submittedAt: "2026-09-04T11:00:00",
    dueOn: "2026-09-14",
    status: "pending",
    chain: [
      done("line_manager", "akwasi", "2026-09-05T15:20:00"),
      waiting("hr", "fiifi"),
    ],
  },

  // ── Pay details ────────────────────────────────────────────────────────
  {
    id: "ap-008",
    kind: "pay_details",
    employeeId: "kwame",
    method: "mobile_money",
    before: { provider: "MTN MoMo", account: "024 ••• 4821" },
    after: { provider: "MTN MoMo", account: "054 ••• 7734" },
    requestedBy: "kwame",
    submittedAt: "2026-09-13T12:00:00",
    dueOn: "2026-09-20",
    status: "pending",
    chain: [
      done("hr", "fiifi", "2026-09-15T09:00:00"),
      waiting("payroll", "maame"),
    ],
  },
  {
    id: "ap-009",
    kind: "pay_details",
    employeeId: "mensa",
    method: "bank",
    before: { provider: "GCB Bank", account: "•••• •••• 9021" },
    after: { provider: "Absa Ghana", account: "•••• •••• 4410" },
    requestedBy: "mensa",
    submittedAt: "2026-09-10T14:25:00",
    dueOn: "2026-09-17",
    status: "pending",
    chain: [
      done("hr", "serwa", "2026-09-11T10:30:00"),
      waiting("payroll", "maame"),
    ],
  },
  {
    id: "ap-010",
    kind: "pay_details",
    employeeId: "abla",
    method: "mobile_money",
    before: { provider: "Telecel Cash", account: "020 ••• 1180" },
    after: { provider: "MTN MoMo", account: "024 ••• 6652" },
    requestedBy: "abla",
    submittedAt: "2026-09-03T09:10:00",
    dueOn: "2026-09-12",
    status: "pending",
    chain: [waiting("hr", "fiifi"), waiting("payroll", "maame")],
  },
  {
    id: "ap-016",
    kind: "pay_details",
    employeeId: "serwa",
    method: "bank",
    before: { provider: "Fidelity Bank", account: "•••• •••• 3307" },
    after: { provider: "Stanbic Bank", account: "•••• •••• 8815" },
    requestedBy: "serwa",
    submittedAt: "2026-09-16T08:50:00",
    dueOn: "2026-09-23",
    status: "pending",
    chain: [
      done("hr", "fiifi", "2026-09-16T15:00:00"),
      waiting("payroll", "maame"),
    ],
  },

  // ── Lifecycle ──────────────────────────────────────────────────────────
  {
    id: "ap-011",
    kind: "lifecycle",
    employeeId: "kobby",
    change: "promotion",
    before: {
      jobTitle: "Software Engineer",
      payGrade: "L3",
      department: "Engineering",
    },
    after: {
      jobTitle: "Senior Software Engineer",
      payGrade: "L4",
      department: "Engineering",
    },
    effectiveDate: "2026-10-01",
    reason: "Consistently above expectations across two review cycles.",
    submittedAt: "2026-09-09T10:15:00",
    dueOn: "2026-09-20",
    status: "pending",
    chain: [
      done("head_of_department", "adwoa", "2026-09-10T09:00:00"),
      waiting("hr", "fiifi"),
    ],
  },
  {
    id: "ap-012",
    kind: "lifecycle",
    employeeId: "efua",
    change: "probation_confirmation",
    before: { jobTitle: "HR Intern", payGrade: "L1", department: "People" },
    after: {
      jobTitle: "Junior People Officer",
      payGrade: "L2",
      department: "People",
    },
    effectiveDate: "2026-09-30",
    reason: "Probation ends 30 September; supervisor recommends confirmation.",
    submittedAt: "2026-09-07T11:40:00",
    dueOn: "2026-09-16",
    status: "pending",
    chain: [
      done("line_manager", "serwa", "2026-09-08T14:00:00"),
      waiting("hr", "fiifi"),
    ],
  },
  {
    id: "ap-013",
    kind: "lifecycle",
    employeeId: "akos",
    change: "transfer",
    before: {
      jobTitle: "Customer Success Lead",
      payGrade: "L4",
      department: "Customer Success",
    },
    after: {
      jobTitle: "Customer Success Lead",
      payGrade: "L4",
      department: "Operations",
    },
    effectiveDate: "2026-11-01",
    reason: "Aligning support with the Operations cost centre.",
    submittedAt: "2026-09-17T09:00:00",
    dueOn: "2026-09-26",
    status: "pending",
    chain: [waiting("head_of_department", "kwesi"), waiting("hr", "fiifi")],
  },

  // ── Documents ──────────────────────────────────────────────────────────
  {
    id: "ap-014",
    kind: "document",
    employeeId: "yaa",
    documentId: "doc-yaa-card",
    documentName: "Ghana Card (renewed)",
    category: "identity",
    waitingOn: "hr",
    submittedAt: "2026-09-15T10:05:00",
    dueOn: "2026-09-19",
    status: "pending",
    chain: [waiting("hr", "fiifi")],
  },
  {
    id: "ap-015",
    kind: "document",
    employeeId: "kofi",
    documentName: "Degree certificate",
    documentId: "doc-kofi-degree",
    category: "certificate",
    // Waiting on the employee, so it belongs on their own list, not HR's queue.
    waitingOn: "employee",
    submittedAt: "2026-09-02T09:00:00",
    dueOn: "2026-09-16",
    status: "pending",
    chain: [waiting("hr", "fiifi")],
  },
]

/** Cover arrangements, which expire and have to be closed off. */
export const ACTING_ASSIGNMENTS: ActingAssignment[] = [
  {
    id: "act-001",
    employeeId: "nana",
    jobTitle: "Frontend Lead",
    coveringForId: "adwoa",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
  },
  {
    id: "act-002",
    employeeId: "kwabena",
    jobTitle: "Head of Marketing",
    coveringForId: "yaw",
    startDate: "2026-08-15",
    endDate: "2026-09-25",
  },
  {
    id: "act-003",
    employeeId: "adjoa",
    jobTitle: "Finance Manager",
    coveringForId: "akwasi",
    startDate: "2026-09-01",
    endDate: "2026-12-15",
  },
]

/**
 * Three months of payslips per person, derived from their current salary.
 * September has not run yet — TODAY is the 18th and the run is on the 25th —
 * so the latest slip anyone has is August.
 */
export const PAYSLIPS: Payslip[] = EMPLOYEES.filter(
  (e) => !["pre_hire"].includes(e.lifecycleState)
).flatMap((e) =>
  [
    { period: "2026-08", paidOn: "2026-08-25" },
    { period: "2026-07", paidOn: "2026-07-25" },
    { period: "2026-06", paidOn: "2026-06-25" },
  ].map(({ period, paidOn }) => {
    const gross = e.compensation.grossMonthly
    const ssnitEmployee = Math.round(gross * 0.055 * 100) / 100
    const taxable = gross - ssnitEmployee
    // A flat effective rate stands in for the GRA band table, which the
    // payroll screen applies properly.
    const paye = Math.round(taxable * 0.17 * 100) / 100
    const otherDeductions = e.compensation.tier3Provider ? 50 : 0
    return {
      id: `ps-${e.id}-${period}`,
      employeeId: e.id,
      period,
      grossGhs: gross,
      ssnitEmployee,
      paye,
      otherDeductions,
      netGhs:
        Math.round((gross - ssnitEmployee - paye - otherDeductions) * 100) /
        100,
      paidOn,
    }
  })
)
