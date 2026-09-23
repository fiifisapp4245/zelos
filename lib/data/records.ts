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
  EmployeeDocument,
  LeaveBalance,
  LeaveTypeBalance,
  LeaveRequest,
  LifecycleEvent,
  Notification,
  OffboardingCase,
  OnboardingTask,
  PerformanceReview,
  Requisition,
} from "../types"
import { EMPLOYEES } from "./employees"

export const COMPANY: CompanyProfile = {
  legalName: "Xanthan Services Limited",
  tradingName: "Xanthan",
  industry: "Technology",
  companySize: "11-50 employees",
  registrationNumber: "CS-04829-2019",
  tin: "C0009827451",
  ssnitEmployerNumber: "E0012345678",
  incorporatedOn: "4 February 2019",
  companyEmail: "work@xanthan.com",
  website: "xanthan.com",
  mainLine: "+233 30 254 1180",
  postalAddress: "P.O. Box CT 8241, Cantonments, Accra",
}

export const BRANCHES: Branch[] = [
  {
    id: "accra",
    name: "Accra HQ",
    city: "Accra",
    region: "Greater Accra",
    archived: false,
  },
  {
    id: "kumasi",
    name: "Kumasi",
    city: "Kumasi",
    region: "Ashanti",
    archived: false,
  },
  {
    id: "takoradi",
    name: "Takoradi",
    city: "Takoradi",
    region: "Western",
    archived: false,
  },
  {
    id: "tamale",
    name: "Tamale",
    city: "Tamale",
    region: "Northern",
    archived: true,
  },
]

export const DEPARTMENTS: Department[] = [
  {
    id: "exec",
    name: "Executive",
    headId: "esi",
    parentId: null,
    branchId: "accra",
    archived: false,
  },
  {
    id: "eng",
    name: "Engineering",
    headId: "adwoa",
    parentId: null,
    branchId: "accra",
    archived: false,
  },
  {
    id: "product",
    name: "Product",
    headId: "kwesi",
    parentId: null,
    branchId: "accra",
    archived: false,
  },
  {
    id: "marketing",
    name: "Marketing",
    headId: "yaw",
    parentId: null,
    branchId: "accra",
    archived: false,
  },
  {
    id: "people",
    name: "People",
    headId: "fiifi",
    parentId: null,
    branchId: "accra",
    archived: false,
  },
  {
    id: "finance",
    name: "Finance",
    headId: "akwasi",
    parentId: null,
    branchId: "accra",
    archived: false,
  },
  {
    id: "ops",
    name: "Operations",
    headId: "kojo",
    parentId: null,
    branchId: "kumasi",
    archived: false,
  },
  {
    id: "data",
    name: "Data & Insights",
    headId: "adwoa",
    parentId: "eng",
    branchId: "accra",
    archived: false,
  },
  {
    id: "cs",
    name: "Customer Success",
    headId: "akos",
    parentId: "product",
    branchId: "accra",
    archived: false,
  },
  {
    id: "legacy",
    name: "Field Services",
    headId: null,
    parentId: null,
    branchId: "tamale",
    archived: true,
  },
]

export const LIFECYCLE_EVENTS: LifecycleEvent[] = [
  {
    id: "le-1",
    employeeId: "kofi",
    from: null,
    to: "pre_hire",
    reason: "Offer accepted; start scheduled for 8 Jan 2024",
    actorId: "fiifi",
    at: "2023-12-20T16:02:00",
    effectiveDate: "2023-12-20",
  },
  {
    id: "le-2",
    employeeId: "kofi",
    from: "pre_hire",
    to: "active",
    reason: "First day of employment",
    actorId: "fiifi",
    at: "2024-01-08T09:14:00",
    effectiveDate: "2024-01-08",
  },
  {
    id: "le-3",
    employeeId: "afia",
    from: null,
    to: "pre_hire",
    reason: "Offer accepted",
    actorId: "serwa",
    at: "2025-10-18T11:20:00",
    effectiveDate: "2025-10-18",
  },
  {
    id: "le-4",
    employeeId: "afia",
    from: "pre_hire",
    to: "probation",
    reason: "Started 6-month probation",
    actorId: "serwa",
    at: "2025-11-03T08:40:00",
    effectiveDate: "2025-11-03",
  },
  {
    id: "le-5",
    employeeId: "akos",
    from: "active",
    to: "on_leave",
    reason: "Maternity leave — 14 weeks statutory",
    actorId: "fiifi",
    at: "2026-07-01T10:05:00",
    effectiveDate: "2026-07-06",
  },
  {
    id: "le-6",
    employeeId: "kobby",
    from: "active",
    to: "suspended",
    reason: "Pending outcome of disciplinary case DC-2026-03",
    actorId: "fiifi",
    at: "2026-08-24T15:30:00",
    effectiveDate: "2026-08-24",
  },
  {
    id: "le-7",
    employeeId: "kojo",
    from: "active",
    to: "notice",
    reason: "Resignation received — 1 month notice",
    actorId: "fiifi",
    at: "2026-09-01T09:00:00",
    effectiveDate: "2026-09-01",
  },
  {
    id: "le-8",
    employeeId: "nii",
    from: "active",
    to: "retired",
    reason: "Statutory retirement at 60",
    actorId: "fiifi",
    at: "2025-12-09T12:00:00",
    effectiveDate: "2025-12-31",
  },
  {
    id: "le-9",
    employeeId: "nana",
    from: null,
    to: "pre_hire",
    reason: "Offer accepted; start scheduled for 5 Oct 2026",
    actorId: "serwa",
    at: "2026-09-10T14:12:00",
    effectiveDate: "2026-09-10",
  },
]

export const AUDIT_LOG: AuditEntry[] = [
  {
    id: "a-1",
    employeeId: "kofi",
    actorId: "fiifi",
    action: "Updated phone number",
    field: "phone",
    before: "+233 20 332 7740",
    after: "+233 20 332 7745",
    at: "2026-09-16T09:14:00",
  },
  {
    id: "a-2",
    employeeId: "kofi",
    actorId: "fiifi",
    action: "Changed lifecycle state",
    field: "lifecycleState",
    before: "pre_hire",
    after: "active",
    at: "2026-09-14T11:02:00",
  },
  {
    id: "a-3",
    employeeId: "kofi",
    actorId: "maame",
    action: "Revealed statutory ID",
    field: "ssnitNumber",
    at: "2026-09-12T14:48:00",
    purpose: "September payroll run reconciliation",
  },
  {
    id: "a-4",
    employeeId: "ama",
    actorId: "fiifi",
    action: "Updated gross monthly salary",
    field: "compensation.grossMonthly",
    before: "GHS 10,800.00",
    after: "GHS 11,500.00",
    at: "2026-09-10T16:20:00",
  },
  {
    id: "a-5",
    employeeId: "kobby",
    actorId: "fiifi",
    action: "Opened disciplinary case",
    field: "state",
    after: "investigation",
    at: "2026-08-24T15:30:00",
  },
  {
    id: "a-6",
    employeeId: null,
    actorId: "fiifi",
    action: "Archived department",
    field: "Field Services",
    at: "2026-08-02T10:11:00",
  },
  {
    id: "a-7",
    employeeId: "akos",
    actorId: "serwa",
    action: "Approved leave request",
    field: "LR-2026-018",
    after: "approved",
    at: "2026-06-28T13:05:00",
  },
  {
    id: "a-8",
    employeeId: "afia",
    actorId: "adwoa",
    action: "Escalated coaching note to official record",
    at: "2026-09-05T17:40:00",
  },
]

function doc(
  id: string,
  employeeId: string,
  name: string,
  category: EmployeeDocument["category"],
  status: EmployeeDocument["status"],
  expiresOn: string | null,
  confidential = false
): EmployeeDocument {
  return {
    id,
    employeeId,
    name,
    category,
    status,
    uploadedAt: "2026-02-14T10:00:00",
    uploadedBy: "fiifi",
    expiresOn,
    sizeKb: 120 + name.length * 9,
    confidential,
  }
}

export const DOCUMENTS: EmployeeDocument[] = [
  doc(
    "d-1",
    "kofi",
    "Employment contract.pdf",
    "contract",
    "verified",
    "2026-10-18"
  ),
  doc(
    "d-2",
    "kofi",
    "Ghana Card (front & back).pdf",
    "identity",
    "verified",
    "2031-04-18"
  ),
  doc(
    "d-3",
    "kofi",
    "BSc Computer Science certificate.pdf",
    "certificate",
    "verified",
    null
  ),
  doc("d-4", "kofi", "SSNIT registration.pdf", "statutory", "verified", null),
  doc(
    "d-5",
    "kofi",
    "Pre-employment medical.pdf",
    "medical",
    "verified",
    null,
    true
  ),
  doc("d-6", "ama", "Employment contract.pdf", "contract", "verified", null),
  doc(
    "d-7",
    "ama",
    "Ghana Card (front & back).pdf",
    "identity",
    "expiring",
    "2026-11-02"
  ),
  doc(
    "d-8",
    "abena",
    "Employment contract.pdf",
    "contract",
    "expiring",
    "2026-10-03"
  ),
  doc(
    "d-9",
    "kwame",
    "Consultancy agreement.pdf",
    "contract",
    "expiring",
    "2026-09-25"
  ),
  doc(
    "d-10",
    "kwame",
    "Ghana Card (front & back).pdf",
    "identity",
    "verified",
    "2029-08-30"
  ),
  doc("d-11", "afia", "Employment contract.pdf", "contract", "verified", null),
  doc(
    "d-12",
    "afia",
    "Ghana Card (front & back).pdf",
    "identity",
    "pending",
    null
  ),
  doc("d-13", "nana", "Signed offer letter.pdf", "contract", "verified", null),
  doc(
    "d-14",
    "nana",
    "Ghana Card (front & back).pdf",
    "identity",
    "missing",
    null
  ),
  doc(
    "d-15",
    "efua",
    "NSS appointment letter.pdf",
    "statutory",
    "verified",
    "2026-11-30"
  ),
  doc(
    "d-16",
    "akwasi",
    "Employment contract.pdf",
    "contract",
    "expiring",
    "2026-12-12"
  ),
  doc("d-17", "kobby", "Employment contract.pdf", "contract", "verified", null),
  doc(
    "d-18",
    "selorm",
    "AWS certification.pdf",
    "certificate",
    "expired",
    "2026-09-14"
  ),
]

export const LEAVE_BALANCES: LeaveBalance[] = EMPLOYEES.map((e, i) => {
  const annualEntitlement = 15 + (i % 3) * 3
  const annualTaken = (i * 2) % 11
  const annualPending = i % 4 === 0 ? 3 : 0
  const sickTaken = i % 5
  // Parental entitlement follows the Labour Act: 12 weeks maternity for
  // women, a discretionary week of paternity leave for men.
  const parental: LeaveTypeBalance =
    e.gender === "female"
      ? { type: "maternity", entitlement: 84, taken: 0, pending: 0 }
      : { type: "paternity", entitlement: 7, taken: 0, pending: 0 }

  return {
    employeeId: e.id,
    annualEntitlement,
    annualTaken,
    annualPending,
    sickEntitlement: 12,
    sickTaken,
    carriedOver: i % 3,
    byType: [
      {
        type: "annual",
        entitlement: annualEntitlement,
        taken: annualTaken,
        pending: annualPending,
      },
      { type: "sick", entitlement: 12, taken: sickTaken, pending: 0 },
      parental,
      { type: "compassionate", entitlement: 5, taken: i % 3 === 0 ? 2 : 0, pending: 0 },
      { type: "study", entitlement: 5, taken: 0, pending: i === 19 ? 5 : 0 },
    ],
  }
})

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "LR-2026-031",
    employeeId: "kofi",
    type: "annual",
    startDate: "2026-10-05",
    endDate: "2026-10-09",
    days: 5,
    reason: "Family visit to Cape Coast",
    status: "pending",
    submittedAt: "2026-09-15T08:30:00",
    decidedBy: null,
    decidedAt: null,
  },
  {
    id: "LR-2026-032",
    employeeId: "ama",
    type: "sick",
    startDate: "2026-09-18",
    endDate: "2026-09-19",
    days: 2,
    reason: "Malaria — medical note attached",
    status: "pending",
    submittedAt: "2026-09-17T19:02:00",
    decidedBy: null,
    decidedAt: null,
  },
  {
    id: "LR-2026-033",
    employeeId: "selorm",
    type: "annual",
    startDate: "2026-11-02",
    endDate: "2026-11-13",
    days: 10,
    reason: "Annual leave",
    status: "pending",
    submittedAt: "2026-09-16T11:45:00",
    decidedBy: null,
    decidedAt: null,
  },
  {
    id: "LR-2026-030",
    employeeId: "afia",
    type: "compassionate",
    startDate: "2026-09-08",
    endDate: "2026-09-10",
    days: 3,
    reason: "Bereavement — funeral in Koforidua",
    status: "approved",
    submittedAt: "2026-09-04T09:00:00",
    decidedBy: "adwoa",
    decidedAt: "2026-09-04T14:22:00",
    decisionNote: "Approved. Take the time you need.",
  },
  {
    id: "LR-2026-018",
    employeeId: "akos",
    type: "maternity",
    startDate: "2026-07-06",
    endDate: "2026-10-12",
    days: 70,
    reason: "Statutory maternity leave — 14 weeks",
    status: "approved",
    submittedAt: "2026-06-20T10:10:00",
    decidedBy: "serwa",
    decidedAt: "2026-06-28T13:05:00",
  },
  {
    id: "LR-2026-029",
    employeeId: "abla",
    type: "unpaid",
    startDate: "2026-09-22",
    endDate: "2026-09-26",
    days: 5,
    reason: "Personal",
    status: "rejected",
    submittedAt: "2026-09-02T15:30:00",
    decidedBy: "abena",
    decidedAt: "2026-09-03T09:18:00",
    decisionNote:
      "Campaign launch falls in that week — please re-submit for October.",
  },
  {
    id: "LR-2026-027",
    employeeId: "kwabena",
    type: "annual",
    startDate: "2026-08-10",
    endDate: "2026-08-14",
    days: 5,
    reason: "Annual leave",
    status: "approved",
    submittedAt: "2026-07-28T12:00:00",
    decidedBy: "yaw",
    decidedAt: "2026-07-29T08:40:00",
  },
]

const ATT_STATUSES: AttendanceRecord["status"][] = [
  "present",
  "present",
  "remote",
  "present",
  "late",
  "present",
  "remote",
  "present",
  "absent",
  "present",
]

/** Two working weeks of attendance for the whole workforce. */
export const ATTENDANCE: AttendanceRecord[] = (() => {
  const out: AttendanceRecord[] = []
  const start = new Date("2026-09-07T00:00:00")
  for (let d = 0; d < 12; d++) {
    const date = new Date(start)
    date.setDate(start.getDate() + d)
    const iso = date.toISOString().slice(0, 10)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    EMPLOYEES.forEach((e, i) => {
      if (
        ["pre_hire", "retired", "resigned", "terminated"].includes(
          e.lifecycleState
        )
      )
        return
      let status: AttendanceRecord["status"] = weekend
        ? "weekend"
        : e.lifecycleState === "on_leave"
          ? "on_leave"
          : ATT_STATUSES[(i + d) % ATT_STATUSES.length]
      if (!weekend && e.workArrangement === "remote" && status === "present")
        status = "remote"
      const worked =
        status === "present" || status === "remote" || status === "late"
      out.push({
        id: `att-${e.id}-${iso}`,
        employeeId: e.id,
        date: iso,
        status,
        clockIn: worked
          ? status === "late"
            ? "09:42"
            : "08:0" + (i % 9)
          : null,
        clockOut: worked
          ? "17:" + String(10 + (i % 45)).padStart(2, "0")
          : null,
        hours: worked ? 8 + ((i % 3) - 1) * 0.5 : 0,
      })
    })
  }
  return out
})()

export const REQUISITIONS: Requisition[] = [
  {
    id: "REQ-014",
    title: "Senior Backend Engineer",
    department: "Engineering",
    branch: "Accra HQ",
    employmentType: "full_time",
    openings: 2,
    status: "open",
    hiringManagerId: "adwoa",
    openedOn: "2026-08-04",
    targetStartDate: "2026-11-02",
    budgetMonthly: 15000,
  },
  {
    id: "REQ-015",
    title: "Product Marketing Manager",
    department: "Marketing",
    branch: "Accra HQ",
    employmentType: "full_time",
    openings: 1,
    status: "open",
    hiringManagerId: "yaw",
    openedOn: "2026-08-19",
    targetStartDate: "2026-10-19",
    budgetMonthly: 12000,
  },
  {
    id: "REQ-016",
    title: "Warehouse Assistant",
    department: "Operations",
    branch: "Kumasi",
    employmentType: "full_time",
    openings: 3,
    status: "on_hold",
    hiringManagerId: "kojo",
    openedOn: "2026-07-11",
    targetStartDate: "2026-10-01",
    budgetMonthly: 3200,
  },
  {
    id: "REQ-013",
    title: "Frontend Engineer",
    department: "Engineering",
    branch: "Accra HQ",
    employmentType: "full_time",
    openings: 1,
    status: "filled",
    hiringManagerId: "adwoa",
    openedOn: "2026-06-02",
    targetStartDate: "2026-10-05",
    budgetMonthly: 9000,
  },
  {
    id: "REQ-017",
    title: "Data Engineer",
    department: "Data & Insights",
    branch: "Accra HQ",
    employmentType: "contractor",
    openings: 1,
    status: "draft",
    hiringManagerId: "adwoa",
    openedOn: "2026-09-12",
    targetStartDate: "2026-11-16",
    budgetMonthly: 11000,
  },
]

const CAND_TONES = [
  "bg-emerald-600",
  "bg-blue-600",
  "bg-amber-700",
  "bg-violet-600",
  "bg-rose-600",
]

function cand(
  id: string,
  requisitionId: string,
  name: string,
  stage: Candidate["stage"],
  source: string,
  rating: number,
  appliedOn: string,
  i: number
): Candidate {
  const slug = name.toLowerCase().replace(/\s+/g, ".")
  return {
    id,
    requisitionId,
    name,
    email: `${slug}@gmail.com`,
    phone: `+233 24 ${500 + i} ${3000 + i * 11}`,
    stage,
    appliedOn,
    source,
    rating,
    avatarTone: CAND_TONES[i % CAND_TONES.length],
  }
}

export const CANDIDATES: Candidate[] = [
  cand(
    "c-1",
    "REQ-014",
    "Kwaku Boateng",
    "interview",
    "LinkedIn",
    4,
    "2026-08-08",
    0
  ),
  cand(
    "c-2",
    "REQ-014",
    "Naa Ayikai Quaye",
    "assessment",
    "Referral",
    5,
    "2026-08-06",
    1
  ),
  cand(
    "c-3",
    "REQ-014",
    "Samuel Adom",
    "screening",
    "Job board",
    3,
    "2026-08-21",
    2
  ),
  cand(
    "c-4",
    "REQ-014",
    "Priscilla Mensah",
    "applied",
    "Careers page",
    3,
    "2026-09-02",
    3
  ),
  cand(
    "c-5",
    "REQ-014",
    "Daniel Ofori",
    "offer",
    "Referral",
    5,
    "2026-07-30",
    4
  ),
  cand(
    "c-6",
    "REQ-015",
    "Linda Amoah",
    "interview",
    "LinkedIn",
    4,
    "2026-08-25",
    5
  ),
  cand(
    "c-7",
    "REQ-015",
    "Gideon Tetteh",
    "applied",
    "Job board",
    2,
    "2026-09-05",
    6
  ),
  cand(
    "c-8",
    "REQ-015",
    "Hannah Sarpong",
    "screening",
    "Careers page",
    4,
    "2026-09-01",
    7
  ),
  cand(
    "c-9",
    "REQ-016",
    "Isaac Nkrumah",
    "applied",
    "Walk-in",
    3,
    "2026-08-14",
    8
  ),
  cand(
    "c-10",
    "REQ-013",
    "Nana Adjei",
    "hired",
    "Referral",
    5,
    "2026-06-18",
    9
  ),
  cand(
    "c-11",
    "REQ-014",
    "Comfort Baidoo",
    "rejected",
    "Job board",
    2,
    "2026-08-12",
    10
  ),
]

export const ONBOARDING_TASKS: OnboardingTask[] = [
  {
    id: "ot-1",
    employeeId: "nana",
    title: "Return signed employment contract",
    owner: "employee",
    dueOn: "2026-09-25",
    done: true,
    category: "paperwork",
  },
  {
    id: "ot-2",
    employeeId: "nana",
    title: "Submit Ghana Card & SSNIT number",
    owner: "employee",
    dueOn: "2026-09-26",
    done: false,
    category: "compliance",
  },
  {
    id: "ot-3",
    employeeId: "nana",
    title: "Create work email & Slack account",
    owner: "it",
    dueOn: "2026-10-01",
    done: true,
    category: "access",
  },
  {
    id: "ot-4",
    employeeId: "nana",
    title: "Issue laptop and access badge",
    owner: "it",
    dueOn: "2026-10-03",
    done: false,
    category: "access",
  },
  {
    id: "ot-5",
    employeeId: "nana",
    title: "Register on payroll (Tier 2 provider)",
    owner: "hr",
    dueOn: "2026-10-02",
    done: false,
    category: "compliance",
  },
  {
    id: "ot-6",
    employeeId: "nana",
    title: "Day-one orientation session",
    owner: "hr",
    dueOn: "2026-10-05",
    done: false,
    category: "orientation",
  },
  {
    id: "ot-7",
    employeeId: "nana",
    title: "Assign onboarding buddy",
    owner: "manager",
    dueOn: "2026-10-05",
    done: true,
    category: "orientation",
  },
  {
    id: "ot-8",
    employeeId: "nana",
    title: "First-week goals conversation",
    owner: "manager",
    dueOn: "2026-10-09",
    done: false,
    category: "orientation",
  },
  {
    id: "ot-9",
    employeeId: "afia",
    title: "Probation mid-point check-in",
    owner: "manager",
    dueOn: "2026-02-03",
    done: true,
    category: "orientation",
  },
  {
    id: "ot-10",
    employeeId: "afia",
    title: "Confirm Ghana Card upload",
    owner: "hr",
    dueOn: "2026-09-30",
    done: false,
    category: "compliance",
  },
  {
    id: "ot-11",
    employeeId: "efua",
    title: "NSS placement letter to Finance",
    owner: "hr",
    dueOn: "2025-09-15",
    done: true,
    category: "paperwork",
  },
]

export const REVIEWS: PerformanceReview[] = [
  {
    id: "pr-1",
    employeeId: "kofi",
    cycle: "H2 2026",
    status: "self_review",
    rating: null,
    managerId: "adwoa",
    dueOn: "2026-10-15",
    sharedOn: null,
  },
  {
    id: "pr-2",
    employeeId: "ama",
    cycle: "H2 2026",
    status: "manager_review",
    rating: null,
    managerId: "kwesi",
    dueOn: "2026-10-15",
    sharedOn: null,
  },
  {
    id: "pr-3",
    employeeId: "selorm",
    cycle: "H2 2026",
    status: "complete",
    rating: 4.5,
    managerId: "adwoa",
    dueOn: "2026-10-15",
    sharedOn: "2026-09-12",
  },
  {
    id: "pr-4",
    employeeId: "afia",
    cycle: "Probation",
    status: "manager_review",
    rating: null,
    managerId: "adwoa",
    dueOn: "2026-04-20",
    sharedOn: null,
  },
  {
    id: "pr-5",
    employeeId: "abena",
    cycle: "H2 2026",
    status: "not_started",
    rating: null,
    managerId: "yaw",
    dueOn: "2026-10-15",
    sharedOn: null,
  },
  {
    id: "pr-6",
    employeeId: "kwabena",
    cycle: "H1 2026",
    status: "complete",
    rating: 3.5,
    managerId: "yaw",
    dueOn: "2026-04-15",
    sharedOn: "2026-04-11",
  },
  {
    id: "pr-7",
    employeeId: "abla",
    cycle: "H2 2026",
    status: "calibration",
    rating: 4,
    managerId: "abena",
    dueOn: "2026-10-15",
    sharedOn: null,
  },
  {
    id: "pr-8",
    employeeId: "adjoa",
    cycle: "H2 2026",
    status: "shared",
    rating: 4,
    managerId: "akwasi",
    dueOn: "2026-10-15",
    sharedOn: "2026-09-14",
  },
]

export const COACHING_NOTES: CoachingNote[] = [
  {
    id: "cn-1",
    employeeId: "kofi",
    authorId: "adwoa",
    body: "Strong delivery on the payments refactor. Needs to bring design in earlier — twice now we've had rework after the fact.",
    createdAt: "2026-09-02T16:20:00",
    escalated: false,
    escalatedAt: null,
  },
  {
    id: "cn-2",
    employeeId: "afia",
    authorId: "adwoa",
    body: "Third missed stand-up this fortnight with no notice. Raised informally on 28 Aug; no change since.",
    createdAt: "2026-09-05T09:10:00",
    escalated: true,
    escalatedAt: "2026-09-05T17:40:00",
  },
  {
    id: "cn-3",
    employeeId: "selorm",
    authorId: "adwoa",
    body: "Ready for L6 conversation at next cycle. Quietly carrying most of the on-call load.",
    createdAt: "2026-08-19T11:00:00",
    escalated: false,
    escalatedAt: null,
  },
  {
    id: "cn-4",
    employeeId: "abla",
    authorId: "abena",
    body: "Copy quality has lifted noticeably since the July feedback. Worth saying so publicly.",
    createdAt: "2026-09-08T13:45:00",
    escalated: false,
    escalatedAt: null,
  },
]

export const CASES: DisciplinaryCase[] = [
  {
    id: "DC-2026-03",
    employeeId: "kobby",
    title: "Unauthorised access to a colleague's records",
    severity: "gross",
    state: "investigation",
    raisedBy: "fiifi",
    raisedOn: "2026-08-24",
    outcome: null,
    closedOn: null,
  },
  {
    id: "DC-2026-02",
    employeeId: "afia",
    title: "Repeated unexplained lateness",
    severity: "minor",
    state: "hearing",
    raisedBy: "adwoa",
    raisedOn: "2026-09-05",
    outcome: null,
    closedOn: null,
  },
  {
    id: "DC-2026-01",
    employeeId: "abla",
    title: "Breach of social media policy",
    severity: "serious",
    state: "finalised",
    raisedBy: "abena",
    raisedOn: "2026-04-02",
    outcome: "Written warning issued; policy refresher completed 2026-05-10.",
    closedOn: "2026-05-10",
  },
]

export const OFFBOARDING: OffboardingCase[] = [
  {
    id: "OFF-2026-04",
    employeeId: "kojo",
    reason: "resignation",
    noticeGivenOn: "2026-09-01",
    lastWorkingDay: "2026-09-30",
    exitInterviewDone: false,
    clearance: { assets: true, access: false, finance: false, handover: true },
    finalSettlement: null,
    state: "clearing",
  },
  {
    id: "OFF-2025-11",
    employeeId: "nii",
    reason: "retirement",
    noticeGivenOn: "2025-09-30",
    lastWorkingDay: "2025-12-31",
    exitInterviewDone: true,
    clearance: { assets: true, access: true, finance: true, handover: true },
    finalSettlement: 41300,
    state: "closed",
  },
]

export const ALERTS: Alert[] = [
  // Thresholds match the days actually remaining, so each row reads truthfully.
  {
    id: "al-1",
    kind: "contract_expiry",
    employeeId: "abena",
    thresholdDays: 15,
    dueOn: "2026-10-03",
    acknowledged: false,
    ref: "001",
  },
  {
    id: "al-2",
    kind: "contract_expiry",
    employeeId: "kofi",
    thresholdDays: 30,
    dueOn: "2026-10-18",
    acknowledged: false,
    ref: "002",
  },
  {
    id: "al-3",
    kind: "contract_expiry",
    employeeId: "kwame",
    thresholdDays: 7,
    dueOn: "2026-09-25",
    acknowledged: false,
    ref: "003",
  },
  {
    id: "al-4",
    kind: "contract_expiry",
    employeeId: "akwasi",
    thresholdDays: 30,
    dueOn: "2026-12-12",
    acknowledged: true,
    ref: "004",
  },
  {
    id: "al-5",
    kind: "probation_end",
    employeeId: "afia",
    thresholdDays: 30,
    dueOn: "2026-10-10",
    acknowledged: false,
    ref: "005",
  },
  {
    id: "al-6",
    kind: "document_expiry",
    employeeId: "ama",
    thresholdDays: 60,
    dueOn: "2026-11-02",
    acknowledged: false,
    ref: "006",
  },
  {
    id: "al-7",
    kind: "document_expiry",
    employeeId: "selorm",
    thresholdDays: 60,
    dueOn: "2026-09-14",
    acknowledged: false,
    ref: "007",
  },
  {
    id: "al-8",
    kind: "retirement",
    employeeId: "yaa",
    thresholdDays: 180,
    dueOn: "2027-03-02",
    acknowledged: false,
    ref: "008",
  },
]

export const NOTIFICATIONS: Notification[] = [
  {
    id: "n-1",
    title: "3 leave requests need your decision",
    body: "Kofi Mensah, Ama Asante and Selorm Dzokoto are waiting.",
    at: "2026-09-17T19:02:00",
    read: false,
    kind: "approval",
    href: "/leave",
  },
  {
    id: "n-2",
    title: "Contract expiring in 29 days",
    body: "Kofi Mensah — fixed-term contract ends 4 Jun 2026.",
    at: "2026-09-17T08:00:00",
    read: false,
    kind: "alert",
    href: "/alerts",
  },
  {
    id: "n-3",
    title: "Ghana Card missing for Nana Adjei",
    body: "Required before the 5 Oct start date.",
    at: "2026-09-16T11:30:00",
    read: false,
    kind: "alert",
    href: "/onboarding",
  },
  {
    id: "n-4",
    title: "H2 2026 review cycle opens in 5 days",
    body: "8 reviews will be assigned across 4 managers.",
    at: "2026-09-15T09:00:00",
    read: true,
    kind: "system",
    href: "/performance",
  },
  {
    id: "n-5",
    title: "Kojo Antwi clearance outstanding",
    body: "Access revocation and final settlement still open. Last day 30 Sep.",
    at: "2026-09-14T16:20:00",
    read: true,
    kind: "alert",
    href: "/offboarding",
  },
]
