import { chainFor } from "../approvals/approval-chains"
import { APPROVAL_MODULE } from "../approvals/approval-chains"
import type {
  ApprovalItem,
  ApprovalPayload,
  ApprovalType,
  Decision,
} from "../approvals/types"

/**
 * The approvals queue for the prototype, seeded against TODAY = 2026-09-18.
 *
 * Shaped so each persona opens on something worth working: HR at the HR step
 * across the company with three already overdue, Maame on the pay steps,
 * Adwoa on her own engineers. Several items carry past decisions and notes,
 * so In progress and Completed are not empty either.
 */

const ok = (
  stepIndex: number,
  actorId: string,
  at: string,
  note?: string
): Decision => ({ stepIndex, actorId, action: "approve", at, note })

const no = (
  stepIndex: number,
  actorId: string,
  at: string,
  note: string
): Decision => ({ stepIndex, actorId, action: "decline", at, note })

function mk(o: {
  id: string
  type: ApprovalType
  requester: string
  subject?: string
  summary: string
  submittedAt: string
  dueAt: string
  at?: number
  payload: ApprovalPayload
  history?: Decision[]
  status?: ApprovalItem["status"]
  payChanges?: boolean
  dismissal?: boolean
}): ApprovalItem {
  const chain = chainFor(o.type, {
    payChanges: o.payChanges,
    dismissal: o.dismissal,
  })
  return {
    id: o.id,
    type: o.type,
    module: APPROVAL_MODULE[o.type],
    requester: o.requester,
    subject: o.subject ?? o.requester,
    summary: o.summary,
    submittedAt: o.submittedAt,
    dueAt: o.dueAt,
    chain,
    currentStepIndex: o.at ?? 0,
    status: o.status ?? "pending",
    payload: o.payload,
    history: o.history ?? [],
  }
}

export const APPROVAL_ITEMS: ApprovalItem[] = [
  /* ── Waiting on HR Admin (Fiifi) ─────────────────────────────────────── */
  mk({
    id: "AP-001",
    type: "leaveRequest",
    requester: "kofi",
    summary: "Annual leave · 5 – 14 Oct · 8 days",
    submittedAt: "2026-09-12T09:20:00",
    dueAt: "2026-09-22",
    at: 2,
    payload: {
      leaveType: "annual",
      startDate: "2026-10-05",
      endDate: "2026-10-14",
      days: 8,
      reason: "Family trip to Cape Coast, booked in July.",
    },
    history: [
      ok(0, "adwoa", "2026-09-14T11:05:00", "Cover agreed with Nana."),
      ok(1, "kwesi", "2026-09-15T08:30:00"),
    ],
  }),
  mk({
    id: "AP-002",
    type: "leaveCancellation",
    requester: "abena",
    summary: "Cancelling 3 days in October",
    submittedAt: "2026-09-13T14:00:00",
    dueAt: "2026-09-23",
    at: 2,
    payload: {
      leaveType: "annual",
      startDate: "2026-10-20",
      endDate: "2026-10-22",
      days: 3,
      reason: "Client workshop moved onto the same week.",
      cancelsRequestId: "LR-2026-044",
    },
    history: [
      ok(0, "yaw", "2026-09-14T09:00:00"),
      ok(1, "yaw", "2026-09-14T09:01:00"),
    ],
  }),
  mk({
    id: "AP-003",
    type: "newHireSignOff",
    requester: "serwa",
    subject: "efua",
    summary: "Efua Tetteh — start 1 Oct, 2 tasks outstanding",
    submittedAt: "2026-09-05T10:00:00",
    dueAt: "2026-09-15", // overdue
    payload: {
      startDate: "2026-10-01",
      outstandingTaskIds: ["ot-10", "ot-11"],
    },
  }),
  mk({
    id: "AP-004",
    type: "profileChange",
    requester: "kwabena",
    summary: "Residential address",
    submittedAt: "2026-09-16T08:10:00",
    dueAt: "2026-09-26",
    payload: {
      field: "Residential address",
      before: "14 Ring Road East, Accra",
      after: "22 Beach Road, Takoradi",
    },
  }),
  mk({
    id: "AP-005",
    type: "bankDetailsChange",
    requester: "abla",
    summary: "Mobile money · Telecel Cash → MTN MoMo",
    submittedAt: "2026-09-03T09:10:00",
    dueAt: "2026-09-12", // overdue
    payload: {
      method: "mobile_money",
      before: { provider: "Telecel Cash", account: "020 ••• 1180" },
      after: { provider: "MTN MoMo", account: "024 ••• 6652" },
    },
  }),
  mk({
    id: "AP-006",
    type: "compensationChange",
    requester: "adwoa",
    subject: "nana",
    summary: "GHS 6,200 → 7,000 from 1 Nov",
    submittedAt: "2026-09-15T11:20:00",
    dueAt: "2026-09-25",
    payload: {
      before: 6200,
      after: 7000,
      effectiveDate: "2026-11-01",
      reason: "Market adjustment for frontend engineers.",
    },
  }),
  mk({
    id: "AP-007",
    type: "payrollRunSignOff",
    requester: "maame",
    subject: "maame",
    summary: "September 2026 · 23 people",
    submittedAt: "2026-09-17T16:00:00",
    dueAt: "2026-09-24",
    payload: {
      period: "2026-09",
      headcount: 23,
      grossGhs: 214500,
      netGhs: 168930,
      previousGrossGhs: 209800,
    },
  }),
  mk({
    id: "AP-008",
    type: "promotion",
    requester: "adwoa",
    subject: "kobby",
    summary: "Software Engineer → Senior Software Engineer",
    submittedAt: "2026-09-09T10:15:00",
    dueAt: "2026-09-20",
    at: 1,
    payChanges: true,
    payload: {
      before: {
        jobTitle: "Software Engineer",
        payGrade: "L3",
        department: "Engineering",
        grossMonthly: 7800,
      },
      after: {
        jobTitle: "Senior Software Engineer",
        payGrade: "L4",
        department: "Engineering",
        grossMonthly: 9600,
      },
      effectiveDate: "2026-10-01",
      reason: "Above expectations across two review cycles.",
    },
    history: [ok(0, "adwoa", "2026-09-10T09:00:00", "Fully supported.")],
  }),
  mk({
    id: "AP-009",
    type: "jobRequisition",
    requester: "adwoa",
    subject: "adwoa",
    summary: "Senior Backend Engineer · Engineering · L4",
    submittedAt: "2026-09-11T09:00:00",
    dueAt: "2026-09-21",
    at: 1,
    payload: { requisitionId: "REQ-014" },
    history: [ok(0, "adwoa", "2026-09-11T09:30:00")],
  }),
  mk({
    id: "AP-010",
    type: "reviewSignOff",
    requester: "adwoa",
    subject: "kofi",
    summary: "H2 2026 review · rating 4",
    submittedAt: "2026-09-08T13:00:00",
    dueAt: "2026-09-19",
    at: 1,
    payload: { reviewId: "pr-1" },
    history: [
      ok(0, "kwesi", "2026-09-09T10:00:00", "Calibrated with the other L3s."),
    ],
  }),
  mk({
    id: "AP-011",
    type: "disciplinarySanction",
    requester: "akwasi",
    subject: "mensa",
    summary: "Written warning · repeated lateness",
    submittedAt: "2026-09-04T11:00:00",
    dueAt: "2026-09-14", // overdue
    payload: {
      caseId: "DC-2026-03",
      sanction: "Written warning, six months on file",
      dismissal: false,
    },
  }),
  mk({
    id: "AP-012",
    type: "documentVerification",
    requester: "yaa",
    summary: "Ghana Card (renewed) · expires 2031",
    submittedAt: "2026-09-15T10:05:00",
    dueAt: "2026-09-19",
    payload: { documentId: "d-2", expiresOn: "2031-04-30" },
  }),
  mk({
    id: "AP-013",
    type: "resignation",
    requester: "kojo",
    summary: "Last working day 31 Oct",
    submittedAt: "2026-09-12T15:30:00",
    dueAt: "2026-09-22",
    at: 1,
    payload: {
      caseId: "OFF-2026-04",
      lastWorkingDay: "2026-10-31",
      outstandingLeaveDays: 6,
    },
    history: [ok(0, "akwasi", "2026-09-13T09:00:00", "Sorry to see him go.")],
  }),
  mk({
    id: "AP-014",
    type: "offerApproval",
    requester: "serwa",
    subject: "serwa",
    summary: "Naa Ayikai Quaye · Senior Backend Engineer · GHS 9,800",
    submittedAt: "2026-09-16T12:00:00",
    dueAt: "2026-09-23",
    at: 1,
    payload: { requisitionId: "REQ-014", candidateId: "c-2", offerGhs: 9800 },
    history: [ok(0, "adwoa", "2026-09-16T16:00:00", "Strongest of the three.")],
  }),

  /* ── Waiting on Payroll (Maame) ──────────────────────────────────────── */
  mk({
    id: "AP-015",
    type: "overtimeClaim",
    requester: "selorm",
    summary: "3.5 hours · failover test · 17 Sept",
    submittedAt: "2026-09-17T20:00:00",
    dueAt: "2026-09-24",
    at: 1,
    payload: { correctionId: "tc-002", hours: 3.5, rate: 1.5 },
    history: [ok(0, "adwoa", "2026-09-18T07:40:00", "Agreed in advance.")],
  }),
  mk({
    id: "AP-016",
    type: "bankDetailsChange",
    requester: "kwame",
    summary: "Mobile money · 024 → 054",
    submittedAt: "2026-09-13T12:00:00",
    dueAt: "2026-09-20",
    at: 1,
    payload: {
      method: "mobile_money",
      before: { provider: "MTN MoMo", account: "024 ••• 4821" },
      after: { provider: "MTN MoMo", account: "054 ••• 7734" },
    },
    history: [
      ok(0, "fiifi", "2026-09-15T09:00:00", "ID checked against the record."),
    ],
  }),
  mk({
    id: "AP-017",
    type: "oneOffBonus",
    requester: "fiifi",
    subject: "akos",
    summary: "GHS 2,500 · retention bonus",
    submittedAt: "2026-09-14T10:00:00",
    dueAt: "2026-09-21",
    at: 1,
    payload: {
      before: 0,
      after: 2500,
      effectiveDate: "2026-09-25",
      reason: "Held the Takoradi rollout together single-handed.",
      oneOff: true,
    },
    history: [ok(0, "fiifi", "2026-09-14T10:05:00")],
  }),
  mk({
    id: "AP-018",
    type: "finalSettlement",
    requester: "serwa",
    subject: "nii",
    summary: "GHS 41,300 · last day was 31 Aug",
    submittedAt: "2026-09-08T09:00:00",
    dueAt: "2026-09-16", // overdue for payroll
    at: 2,
    payload: {
      caseId: "OFF-2025-11",
      lastWorkingDay: "2026-08-31",
      outstandingLeaveDays: 4,
      finalSettlement: 41300,
    },
    history: [
      ok(0, "kojo", "2026-09-09T09:00:00"),
      ok(1, "fiifi", "2026-09-10T11:00:00", "Clearance complete."),
    ],
  }),
  mk({
    id: "AP-019",
    type: "gradeChange",
    requester: "kwesi",
    subject: "ama",
    summary: "L4 → L5 · Senior Product Designer",
    submittedAt: "2026-09-10T09:00:00",
    dueAt: "2026-09-23",
    at: 2,
    payChanges: true,
    payload: {
      before: {
        jobTitle: "Senior Product Designer",
        payGrade: "L4",
        department: "Product",
        grossMonthly: 8900,
      },
      after: {
        jobTitle: "Senior Product Designer",
        payGrade: "L5",
        department: "Product",
        grossMonthly: 10400,
      },
      effectiveDate: "2026-10-01",
      reason: "Grade corrected after the job catalogue review.",
    },
    history: [
      ok(0, "kwesi", "2026-09-10T15:00:00"),
      ok(1, "fiifi", "2026-09-12T09:30:00", "Within band."),
    ],
  }),
  mk({
    id: "AP-020",
    type: "compensationChange",
    requester: "fiifi",
    subject: "serwa",
    summary: "GHS 5,400 → 6,000 from 1 Oct",
    submittedAt: "2026-09-16T08:50:00",
    dueAt: "2026-09-26",
    at: 1,
    payload: {
      before: 5400,
      after: 6000,
      effectiveDate: "2026-10-01",
      reason: "Took on payroll support alongside her own role.",
    },
    history: [ok(0, "fiifi", "2026-09-16T15:00:00")],
  }),

  /* ── Waiting on Adwoa (line manager, Engineering) ────────────────────── */
  mk({
    id: "AP-021",
    type: "leaveRequest",
    requester: "afia",
    summary: "Sick leave · 21 – 23 Sept · 3 days",
    submittedAt: "2026-09-11T07:45:00",
    dueAt: "2026-09-15", // overdue
    payload: {
      leaveType: "sick",
      startDate: "2026-09-21",
      endDate: "2026-09-23",
      days: 3,
      reason: "Medical certificate submitted to HR.",
    },
  }),
  mk({
    id: "AP-022",
    type: "attendanceCorrection",
    requester: "afia",
    summary: "15 Sept · missing clock-out",
    submittedAt: "2026-09-16T08:30:00",
    dueAt: "2026-09-19",
    payload: { correctionId: "tc-001" },
  }),
  mk({
    id: "AP-023",
    type: "timesheet",
    requester: "kofi",
    summary: "Week of 14 Sept · 42.5 hours",
    submittedAt: "2026-09-18T08:05:00",
    dueAt: "2026-09-21",
    payload: { employeeId: "kofi", weekStarting: "2026-09-14" },
  }),
  mk({
    id: "AP-024",
    type: "leaveCancellation",
    requester: "nana",
    summary: "Cancelling 2 days in September",
    submittedAt: "2026-09-17T10:00:00",
    dueAt: "2026-09-20",
    payload: {
      leaveType: "annual",
      startDate: "2026-09-28",
      endDate: "2026-09-29",
      days: 2,
      reason: "Wedding postponed.",
      cancelsRequestId: "LR-2026-051",
    },
  }),
  mk({
    id: "AP-025",
    type: "resignation",
    requester: "kobby",
    summary: "Last working day 30 Nov",
    submittedAt: "2026-09-17T17:30:00",
    dueAt: "2026-09-24",
    payload: {
      caseId: "OFF-2026-04",
      lastWorkingDay: "2026-11-30",
      outstandingLeaveDays: 9,
    },
  }),
  mk({
    id: "AP-026",
    type: "actingAssignment",
    requester: "adwoa",
    subject: "nana",
    summary: "Acting Frontend Lead · to 31 Dec",
    submittedAt: "2026-09-16T09:00:00",
    dueAt: "2026-09-25",
    payload: {
      before: {
        jobTitle: "Frontend Engineer",
        payGrade: "L3",
        department: "Engineering",
        grossMonthly: 6200,
      },
      after: {
        jobTitle: "Frontend Lead (Acting)",
        payGrade: "L3",
        department: "Engineering",
        grossMonthly: 6200,
      },
      effectiveDate: "2026-10-01",
      endsOn: "2026-12-31",
      reason: "Covering while the lead role is recruited.",
    },
  }),

  /* ── Waiting elsewhere, so every type has a live example ─────────────── */
  mk({
    id: "AP-027",
    type: "transfer",
    requester: "kwesi",
    subject: "akos",
    summary: "Product → Operations, same grade",
    submittedAt: "2026-09-17T09:00:00",
    dueAt: "2026-09-26",
    payload: {
      before: {
        jobTitle: "Customer Success Lead",
        payGrade: "L4",
        department: "Customer Success",
        grossMonthly: 8100,
      },
      after: {
        jobTitle: "Customer Success Lead",
        payGrade: "L4",
        department: "Operations",
        grossMonthly: 8100,
      },
      effectiveDate: "2026-11-01",
      reason: "Aligning support with the Operations cost centre.",
    },
  }),
  mk({
    id: "AP-028",
    type: "shiftSwap",
    requester: "mensa",
    summary: "Early 21 Sept ↔ Nii's late shift",
    submittedAt: "2026-09-17T18:00:00",
    dueAt: "2026-09-20",
    payload: { fromShiftId: "sh-001", withShiftId: "sh-003" },
  }),
  mk({
    id: "AP-029",
    type: "openShiftPickup",
    requester: "abla",
    summary: "Saturday 27 Sept · 09:00 – 15:00 · Accra HQ",
    submittedAt: "2026-09-18T07:30:00",
    dueAt: "2026-09-22",
    payload: { shiftId: "sh-012" },
  }),
  mk({
    id: "AP-030",
    type: "exitClearance",
    requester: "akwasi",
    subject: "kojo",
    summary: "1 asset still out · access not revoked",
    submittedAt: "2026-09-16T11:00:00",
    dueAt: "2026-09-23",
    payload: {
      caseId: "OFF-2026-04",
      lastWorkingDay: "2026-10-31",
      outstandingLeaveDays: 6,
    },
  }),
  mk({
    id: "AP-031",
    type: "calibrationOutcome",
    requester: "kwesi",
    subject: "ama",
    summary: "H2 2026 · moderated from 4 to 5",
    submittedAt: "2026-09-15T14:00:00",
    dueAt: "2026-09-24",
    payload: { reviewId: "pr-2" },
  }),

  /* ── Settled, so Completed has history ───────────────────────────────── */
  mk({
    id: "AP-032",
    type: "leaveRequest",
    requester: "kwame",
    summary: "Annual leave · 1 – 4 Sept · 4 days",
    submittedAt: "2026-08-20T09:00:00",
    dueAt: "2026-08-28",
    at: 2,
    status: "approved",
    payload: {
      leaveType: "annual",
      startDate: "2026-09-01",
      endDate: "2026-09-04",
      days: 4,
      reason: "Time with family before the term starts.",
    },
    history: [
      ok(0, "adwoa", "2026-08-21T09:00:00"),
      ok(1, "kwesi", "2026-08-22T10:00:00"),
      ok(2, "fiifi", "2026-08-23T08:30:00", "Balance checked."),
    ],
  }),
  mk({
    id: "AP-033",
    type: "bankDetailsChange",
    requester: "yaa",
    summary: "Bank account · GCB → Absa",
    submittedAt: "2026-08-30T09:00:00",
    dueAt: "2026-09-06",
    status: "declined",
    payload: {
      method: "bank",
      before: { provider: "GCB Bank", account: "•••• •••• 9021" },
      after: { provider: "Absa Ghana", account: "•••• •••• 4410" },
    },
    history: [
      no(
        0,
        "fiifi",
        "2026-09-02T11:00:00",
        "Account name does not match the record. Resubmit with a bank letter."
      ),
    ],
  }),
  mk({
    id: "AP-034",
    type: "timesheet",
    requester: "nana",
    summary: "Week of 7 Sept · 40 hours",
    submittedAt: "2026-09-11T17:00:00",
    dueAt: "2026-09-14",
    status: "approved",
    payload: { employeeId: "nana", weekStarting: "2026-09-07" },
    history: [ok(0, "adwoa", "2026-09-12T08:00:00")],
  }),
]
