import type {
  AssessmentTest,
  TestInvitation,
  Candidate,
  CandidateStage,
  Employee,
  InterviewKind,
  Requisition,
} from "../types"
import { PIPELINE_STAGES, TODAY_ISO } from "../format"

export const INTERVIEW_KIND_LABEL: Record<InterviewKind, string> = {
  phone: "Phone screen",
  technical: "Technical",
  panel: "Panel",
  final: "Final",
}

export const SOURCES = [
  "LinkedIn",
  "Referral",
  "Careers page",
  "Job board",
  "Agency",
  "Walk-in",
]

export const REJECTION_REASONS = [
  "Skills do not match the role",
  "Not enough experience",
  "Salary expectation too high",
  "Failed the assessment",
  "Withdrew from the process",
  "Offer declined",
  "Another candidate chosen",
]

/** The stage after this one, or null at the end. */
export function nextStage(stage: CandidateStage): CandidateStage | null {
  const i = PIPELINE_STAGES.indexOf(stage)
  return i >= 0 ? (PIPELINE_STAGES[i + 1] ?? null) : null
}

/**
 * Moving a candidate on has to mean something happened. Returns why they
 * cannot move yet, or null when they can.
 */
export interface AssessmentGates {
  tests: AssessmentTest[]
  invitations: TestInvitation[]
}

export function advanceBlocker(
  c: Candidate,
  gates?: AssessmentGates
): string | null {
  const next = nextStage(c.stage)
  if (!next) return "Already hired."
  if (next === "assessment") {
    const scored = c.interviews.filter((i) => i.score !== null)
    if (scored.length === 0)
      return "Record feedback from at least one interview first."
  }
  if (next === "offer" && gates) {
    // A test marked "needed for offer" has to have been taken and signed off.
    for (const inv of gates.invitations.filter((i) => i.candidateId === c.id)) {
      const t = gates.tests.find((x) => x.id === inv.testId)
      if (!t?.requiredForOffer || inv.status === "expired") continue
      if (inv.status !== "submitted")
        return `Waiting for them to take “${t.name}”.`
      if (!inv.reviewed) return `Review “${t.name}” before making an offer.`
    }
  }
  if (next === "offer") {
    const scored = c.interviews.filter((i) => i.score !== null)
    if (scored.length === 0) return "No interview feedback on file."
  }
  if (next === "hired") {
    if (c.offer?.status !== "accepted")
      return "The offer has to be accepted before they can be hired."
  }
  return null
}

export function averageInterviewScore(c: Candidate) {
  const s = c.interviews
    .map((i) => i.score)
    .filter((v): v is number => v !== null)
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null
}

/** Days from a requisition opening to its first hire. Null until someone is hired. */
export function daysToFill(req: Requisition, pool: Candidate[]) {
  const hired = pool.filter(
    (c) => c.requisitionId === req.id && c.stage === "hired"
  )
  if (hired.length === 0) return null
  const open = new Date(req.openedOn).getTime()
  const days = Math.round((new Date(TODAY_ISO).getTime() - open) / 86_400_000)
  return Math.max(0, days)
}

export function newRequisitionId(existing: Requisition[]) {
  const n = existing
    .map((r) => Number(r.id.replace(/\D/g, "")))
    .reduce((m, v) => Math.max(m, v), 0)
  return `REQ-${String(n + 1).padStart(3, "0")}`
}

/**
 * The record a hire becomes: pre-hire, carrying what the offer promised, with
 * the fields only the employee can supply left blank for them to complete.
 */
export function preHireFrom(
  c: Candidate,
  req: Requisition,
  all: Employee[]
): Employee {
  const [first, ...rest] = c.name.trim().split(/\s+/)
  const last = rest.join(" ") || first
  const base = `${first}-${last}`.toLowerCase().replace(/[^a-z]+/g, "-")
  let id = base
  let n = 2
  while (all.some((e) => e.id === id)) id = `${base}-${n++}`
  const offer = c.offer
  const start = offer?.startDate ?? req.targetStartDate
  return {
    id,
    employeeId: `ZEL-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    firstName: first,
    lastName: last,
    jobTitle: req.title,
    department: req.department,
    branch: req.branch,
    employmentType: req.employmentType,
    contractType:
      req.employmentType === "contractor" ? "fixed_term" : "probationary",
    workArrangement: "onsite",
    lifecycleState: "pre_hire",
    managerId: req.hiringManagerId,
    dottedLineManagerId: null,
    email:
      `${first}.${last}`.toLowerCase().replace(/\s+/g, "") + "@xanthan.com",
    personalEmail: c.email,
    phone: c.phone,
    dateOfBirth: "",
    gender: "other",
    nationality: "Ghanaian",
    ghanaCard: "",
    gpsAddress: "",
    residentialAddress: "",
    startDate: start,
    probationEndDate: null,
    contractEndDate: null,
    noticePeriodDays: 30,
    workingHoursPerWeek: 40,
    emergencyContact: { name: "", relationship: "", phone: "", email: "" },
    compensation: {
      grossMonthly: offer?.salaryMonthly ?? req.budgetMonthly,
      currency: "GHS",
      payFrequency: "monthly",
      payGrade: "",
      effectiveFrom: start,
      ssnitNumber: "",
      tin: "",
      tier2Provider: "",
      tier3Provider: null,
      paymentMethod: "mobile_money",
    },
    avatarTone: c.avatarTone,
  }
}

export interface FunnelRow {
  stage: CandidateStage
  reached: number
}

/** How many candidates reached each stage at least, so conversion reads off it. */
export function funnel(pool: Candidate[]): FunnelRow[] {
  return PIPELINE_STAGES.map((stage, i) => ({
    stage,
    reached: pool.filter((c) => {
      if (c.stage === "rejected") return false
      return PIPELINE_STAGES.indexOf(c.stage) >= i
    }).length,
  }))
}
