/**
 * Zelos HR — domain types.
 *
 * Deliberately models permission roles separately from job roles: in the target
 * segment one person routinely holds several permission roles at once
 * (see docs/system-maps/zelos-hr-foundation.md §3).
 */

export type PermissionRole =
  "hr_admin" | "line_manager" | "head_of_department" | "employee" | "payroll"

export type LifecycleState =
  | "pre_hire"
  | "probation"
  | "active"
  | "on_leave"
  | "suspended"
  | "notice"
  | "resigned"
  | "terminated"
  | "retired"

export type EmploymentType =
  "full_time" | "part_time" | "contractor" | "intern" | "nsp"

export type ContractType = "permanent" | "fixed_term" | "probationary"

export type WorkArrangement = "onsite" | "hybrid" | "remote"

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email: string
}

export interface Compensation {
  grossMonthly: number
  currency: "GHS"
  payFrequency: "monthly" | "bi_weekly"
  payGrade: string
  effectiveFrom: string
  ssnitNumber: string
  tin: string
  tier2Provider: string
  tier3Provider: string | null
  paymentMethod: "mobile_money" | "bank"
  momoProvider?: string
  momoNumber?: string
  bankName?: string
  bankAccount?: string
}

export interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  jobTitle: string
  department: string
  branch: string
  employmentType: EmploymentType
  contractType: ContractType
  workArrangement: WorkArrangement
  lifecycleState: LifecycleState
  /** Primary reporting line. */
  managerId: string | null
  /** Optional secondary/matrix reporting line. */
  dottedLineManagerId: string | null
  email: string
  personalEmail: string
  phone: string
  dateOfBirth: string
  gender: "male" | "female" | "other"
  nationality: string
  ghanaCard: string
  gpsAddress: string
  residentialAddress: string
  startDate: string
  probationEndDate: string | null
  contractEndDate: string | null
  noticePeriodDays: number
  workingHoursPerWeek: number
  emergencyContact: EmergencyContact
  compensation: Compensation
  avatarTone: string
  isDraft?: boolean
}

export interface LifecycleEvent {
  id: string
  employeeId: string
  from: LifecycleState | null
  to: LifecycleState
  reason: string
  actorId: string
  at: string
  effectiveDate: string
}

export interface AuditEntry {
  id: string
  employeeId: string | null
  actorId: string
  action: string
  field?: string
  before?: string
  after?: string
  at: string
  /** Purpose-based access: why a sensitive field was read. */
  purpose?: string
}

export type DocumentStatus =
  "verified" | "pending" | "expiring" | "expired" | "missing"

export interface EmployeeDocument {
  id: string
  employeeId: string
  name: string
  category:
    "contract" | "identity" | "certificate" | "statutory" | "medical" | "other"
  status: DocumentStatus
  uploadedAt: string
  uploadedBy: string
  expiresOn: string | null
  sizeKb: number
  confidential: boolean
}

export type LeaveType =
  | "annual"
  | "sick"
  | "maternity"
  | "paternity"
  | "compassionate"
  | "unpaid"
  | "study"

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled"

export interface LeaveRequest {
  id: string
  employeeId: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: RequestStatus
  submittedAt: string
  decidedBy: string | null
  decidedAt: string | null
  decisionNote?: string
}

export interface LeaveTypeBalance {
  type: LeaveType
  entitlement: number
  taken: number
  pending: number
}

export interface LeaveBalance {
  employeeId: string
  annualEntitlement: number
  annualTaken: number
  annualPending: number
  sickEntitlement: number
  sickTaken: number
  carriedOver: number
  /** Every type the person is entitled to, for the balances tiles. */
  byType: LeaveTypeBalance[]
}

/**
 * The system records presence. A day with nothing captured is "no record",
 * never absence — it is a gap in the data, not a finding about the person.
 */
export type AttendanceStatus =
  | "present"
  | "remote"
  | "late"
  | "no_record"
  | "on_leave"
  | "holiday"
  | "weekend"

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  status: AttendanceStatus
  clockIn: string | null
  clockOut: string | null
  hours: number
  note?: string
}

export type RequisitionStatus =
  "draft" | "open" | "on_hold" | "filled" | "closed"

export interface Requisition {
  id: string
  title: string
  department: string
  branch: string
  employmentType: EmploymentType
  openings: number
  status: RequisitionStatus
  hiringManagerId: string
  openedOn: string
  targetStartDate: string
  budgetMonthly: number
  /** What the public careers page shows. Absent means it has never been set up. */
  careers?: CareersListing
}

export interface CareersListing {
  published: boolean
  summary: string
  responsibilities: string[]
  requirements: string[]
  /** Asked on the application form, each one required. */
  questions: string[]
  /** Last day to apply, or null for open until filled. */
  closesOn: string | null
}

export type CandidateStage =
  | "applied"
  | "screening"
  | "interview"
  | "assessment"
  | "offer"
  | "hired"
  | "rejected"

export interface Candidate {
  id: string
  requisitionId: string
  name: string
  email: string
  phone: string
  stage: CandidateStage
  appliedOn: string
  source: string
  rating: number
  avatarTone: string
  /** Recruiter's working notes. Not shared with the candidate. */
  notes: string
  /** Why they were turned down, so a rejection is never unexplained. */
  rejectedReason: string | null
  interviews: Interview[]
  offer: CandidateOffer | null
  /** The pre-hire record this person became, once hired. */
  employeeId: string | null
  /** What they said on the careers form, and the CV they attached. */
  answers?: Record<string, string>
  cvName?: string
}

export type InterviewKind = "phone" | "technical" | "panel" | "final"

export interface Interview {
  id: string
  kind: InterviewKind
  scheduledFor: string
  interviewerId: string
  /** 1–5, recorded after the interview. */
  score: number | null
  feedback: string | null
  /** Set when the interview came from a booking, so it has a time and a way to join. */
  startsAt?: string
  durationMin?: number
  link?: string
  bookingId?: string
  status?: "scheduled" | "cancelled" | "no_show"
}

export interface CandidateOffer {
  salaryMonthly: number
  startDate: string
  status: "draft" | "sent" | "accepted" | "declined"
  sentOn: string | null
  decidedOn: string | null
  /** The signing request this offer went out on, once sent for signature. */
  signatureId?: string
}

export interface OnboardingTask {
  id: string
  employeeId: string
  title: string
  owner: "hr" | "manager" | "employee" | "it"
  dueOn: string
  done: boolean
  category: "paperwork" | "access" | "orientation" | "compliance"
}

export type ReviewStatus =
  | "not_started"
  | "self_review"
  | "manager_review"
  | "calibration"
  | "shared"
  | "complete"

export interface PerformanceReview {
  id: string
  employeeId: string
  cycle: string
  status: ReviewStatus
  rating: number | null
  managerId: string
  dueOn: string
  sharedOn: string | null
  /** What the reviewer wrote, shown when the review is signed off. */
  reviewerComments: string | null
  /** The employee's own account of the period, written first. */
  selfSummary: string | null
  selfDevelopment: string | null
  selfRating: number | null
  selfSubmittedOn: string | null
  /** The manager's 1–5 score per competency, keyed by competency id. */
  scores: Record<string, number> | null
  /** Why HR moved the rating at calibration, when it moved. */
  calibrationNote: string | null
  /** The employee's reply once the review is shared with them. */
  employeeComment: string | null
  acknowledgedOn: string | null
  /** When whoever the review is waiting on was last nudged. */
  lastReminderOn?: string | null
}

/** Private to the authoring manager until deliberately escalated (system map §3). */
export interface CoachingNote {
  id: string
  employeeId: string
  authorId: string
  body: string
  createdAt: string
  escalated: boolean
  escalatedAt: string | null
}

export type CaseState =
  "open" | "investigation" | "hearing" | "finalised" | "dismissed"

export type SanctionKind =
  | "no_action"
  | "verbal_warning"
  | "written_warning"
  | "final_warning"
  | "suspension"
  | "demotion"
  | "dismissal"

export type CaseDocumentCategory =
  | "allegation"
  | "evidence"
  | "statement"
  | "report"
  | "hearing_notice"
  | "minutes"
  | "outcome"
  | "appeal"
  | "other"

export interface CaseDocument {
  id: string
  name: string
  category: CaseDocumentCategory
  sizeKb: number
  uploadedBy: string
  uploadedAt: string
}

export interface CaseEvent {
  id: string
  at: string
  actorId: string
  text: string
}

export interface CaseHearing {
  scheduledFor: string
  venue: string
  /** Notice is a due-process step: the employee must have time to prepare. */
  noticeGivenOn: string
  panelIds: string[]
  /** Who the employee brought, if anyone. */
  companion: string | null
  held: boolean
  minutes: string
}

export interface CaseAppeal {
  lodgedOn: string
  grounds: string
  decision: "pending" | "upheld" | "overturned"
  decidedOn: string | null
}

export interface DisciplinaryCase {
  id: string
  employeeId: string
  title: string
  severity: "minor" | "serious" | "gross"
  state: CaseState
  raisedBy: string
  raisedOn: string
  outcome: string | null
  closedOn: string | null
  /** What is alleged, in plain words, as put to the employee. */
  description: string
  incidentOn: string
  investigatorId: string | null
  /** When the employee was told of the allegation in writing. */
  notifiedOn: string | null
  hearing: CaseHearing | null
  sanction: SanctionKind | null
  appeal: CaseAppeal | null
  documents: CaseDocument[]
  events: CaseEvent[]
}

export type OffboardingReason =
  | "resignation"
  | "termination"
  | "redundancy"
  | "retirement"
  | "contract_end"
  | "mutual"

/** One item of company property, tracked individually so exit is auditable. */
export interface AssetReturn {
  item: string
  /** The register entry this item is, so returning it here returns it there. */
  assetId?: string
  /** Asset tag or serial, where the item carries one. */
  tag?: string
  returned: boolean
  /** Written off rather than handed back. It clears the checklist, and the register says lost. */
  lost?: boolean
}

export interface OffboardingCase {
  id: string
  employeeId: string
  reason: OffboardingReason
  noticeGivenOn: string
  lastWorkingDay: string
  exitInterviewDone: boolean
  clearance: {
    /** Itemised, not a single tick: "assets returned" is several things. */
    assets: AssetReturn[]
    access: boolean
    finance: boolean
    handover: boolean
  }
  finalSettlement: number | null
  state: "notice" | "clearing" | "settled" | "closed"
  exitInterviewOn: string | null
  exitNotes: string | null
  /** What went into the settlement figure, so it can be checked. */
  settlement: SettlementBreakdown | null
  sentToPayrollOn: string | null
  /** Who takes over the work. */
  handoverTo: string | null
  closedOn: string | null
}

export interface SettlementBreakdown {
  /** Days worked in the final month and not yet paid. */
  salaryDays: number
  /** Accrued annual leave paid out. */
  leaveDays: number
  /** Notice the company waives and pays instead of working. */
  noticeInLieuDays: number
  /** Anything recovered from the final pay (loans, unreturned items). */
  deductions: number
  note: string
}

export interface Department {
  id: string
  name: string
  headId: string | null
  parentId: string | null
  branchId: string
  archived: boolean
}

export interface Branch {
  id: string
  name: string
  city: string
  region: string
  archived: boolean
}

export type AlertKind =
  "contract_expiry" | "probation_end" | "document_expiry" | "retirement"

export interface Alert {
  id: string
  kind: AlertKind
  employeeId: string
  thresholdDays: number
  dueOn: string
  acknowledged: boolean
  ref: string
}

export interface Notification {
  id: string
  title: string
  body: string
  at: string
  read: boolean
  kind: "approval" | "alert" | "mention" | "system"
  href?: string
}

/** The organisation's own record, edited under Company Settings. */
export interface CompanyProfile {
  legalName: string
  tradingName: string
  industry: string
  companySize: string
  registrationNumber: string
  tin: string
  ssnitEmployerNumber: string
  incorporatedOn: string
  companyEmail: string
  website: string
  mainLine: string
  postalAddress: string
}

/* ── Approvals ───────────────────────────────────────────────────────────── */

/**
 * Approval is a chain, not a flag: a request moves through named stages and
 * each one is owned by a role, so "waiting on you" is answerable.
 */
export type ApprovalStage =
  "line_manager" | "head_of_department" | "hr" | "payroll"

export interface ApprovalStep {
  stage: ApprovalStage
  /** The person expected to decide, when it is one named person. */
  approverId: string | null
  decision: "pending" | "approved" | "declined"
  decidedAt: string | null
  note?: string
}

export type ApprovalKind = "leave" | "pay_details" | "lifecycle" | "document"

interface ApprovalBase {
  id: string
  employeeId: string
  submittedAt: string
  /** When a decision is expected. Past this, the request is overdue. */
  dueOn: string
  chain: ApprovalStep[]
  status: RequestStatus
  decisionNote?: string
}

export interface LeaveApproval extends ApprovalBase {
  kind: "leave"
  leaveType: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
}

/** Masked on both sides — the point is that the details changed, not what they are. */
export interface PayDetailsApproval extends ApprovalBase {
  kind: "pay_details"
  method: "bank" | "mobile_money"
  before: { provider: string; account: string }
  after: { provider: string; account: string }
  requestedBy: string
}

export interface LifecycleApproval extends ApprovalBase {
  kind: "lifecycle"
  change: "promotion" | "transfer" | "acting" | "probation_confirmation"
  before: { jobTitle: string; payGrade: string; department: string }
  after: { jobTitle: string; payGrade: string; department: string }
  effectiveDate: string
  reason: string
}

export interface DocumentApproval extends ApprovalBase {
  kind: "document"
  documentId: string
  documentName: string
  category: EmployeeDocument["category"]
  /** "employee" means it is the employee who still owes something. */
  waitingOn: "hr" | "employee"
}

export type ApprovalRequest =
  LeaveApproval | PayDetailsApproval | LifecycleApproval | DocumentApproval

/* ── Pay ─────────────────────────────────────────────────────────────────── */

export interface Payslip {
  id: string
  employeeId: string
  /** yyyy-mm, the period it covers. */
  period: string
  grossGhs: number
  netGhs: number
  ssnitEmployee: number
  paye: number
  otherDeductions: number
  paidOn: string
}

/* ── Acting assignments ──────────────────────────────────────────────────── */

export interface ActingAssignment {
  id: string
  employeeId: string
  /** The role being covered. */
  jobTitle: string
  coveringForId: string | null
  startDate: string
  endDate: string
}

/* ── Reports ─────────────────────────────────────────────────────────────── */

export interface SavedReport {
  id: string
  /** Which report this is a saved view of. */
  reportId: string
  /** The choices the report was saved with, e.g. what it groups by. */
  options: Record<string, string>
  name: string
  createdBy: string
  createdOn: string
  schedule: "none" | "weekly" | "monthly"
  lastRunOn: string | null
  /** Who the file is emailed to when it is due. */
  recipients: string[]
  /** The roles of whoever saved it, so it runs with the same access they had. */
  createdRoles: PermissionRole[]
}

/** How far ahead each kind of alert starts appearing, and when HR last chased managers. */
export interface AlertSettings {
  leadDays: Record<AlertKind, number>
  lastEmailedOn: string | null
}

/** A return produced outside Zelos (by a local provider) and kept with the pay group. */
export interface ExternalReturnFile {
  id: string
  payGroupId: string
  name: string
  sizeKb: number
  uploadedBy: string
  uploadedAt: string
}

/* ── Email outbox ────────────────────────────────────────────────────────── */

export type EmailKind =
  | "booking_invite"
  | "booking_confirmation"
  | "booking_reminder"
  | "booking_cancelled"
  | "assessment_invite"
  | "assessment_submitted"
  | "assessment_reminder"
  | "manager_alert"
  | "report"
  | "other"

/**
 * What the prototype would have emailed. There is no mail server, so a message
 * is recorded here instead: HR can read exactly what was sent, and follow its
 * links, which is what a real build would have delivered.
 */
export interface EmailMessage {
  id: string
  kind: EmailKind
  to: string
  toName: string
  subject: string
  body: string
  /** The one button in the message, when it has one. */
  cta?: { label: string; href: string }
  createdAt: string
  /** A file that travels with the message, e.g. a report's CSV. */
  attachment?: { name: string; type: string; content: string }
  /** When it goes out. Later than now means it is still waiting. */
  sendAt: string
  status: "sent" | "scheduled" | "cancelled"
  relatedId?: string
}

/* ── Interview booking ───────────────────────────────────────────────────── */

export interface BookingPage {
  id: string
  name: string
  /** Pinned to one requisition, or null for any. */
  requisitionId: string | null
  kind: InterviewKind
  durationMin: number
  bufferMin: number
  /** How many days ahead a candidate can book. */
  advanceDays: number
  /** The least notice allowed, in hours. */
  minNoticeHours: number
  /** Most interviews of this kind in one day. */
  dailyLimit: number
  interviewerIds: string[]
  assign: "round_robin" | "fixed"
  video: "zelos_meet" | "external" | "in_person"
  /** A meeting URL for external, or an address for in person. */
  videoLink: string
  /** Asked before they book. */
  questions: string[]
  /** Hours before the interview after which they can no longer change it. */
  cancelCutoffHours: number
  active: boolean
}

/** When someone can be interviewed. Times are in the company's time zone. */
export interface Availability {
  employeeId: string
  /** 1 = Monday … 7 = Sunday. */
  days: number[]
  start: string
  end: string
}

export interface Booking {
  id: string
  /** The private link's key. Unguessable, expires, and works only for one candidate. */
  token: string
  candidateId: string
  pageId: string
  status: "invited" | "booked" | "cancelled" | "no_show" | "completed"
  invitedOn: string
  expiresOn: string
  slotStart: string | null
  interviewerId: string | null
  timeZone: string | null
  answers: Record<string, string>
  bookedOn: string | null
  link: string | null
  interviewId: string | null
  history: { at: string; text: string }[]
}

/* ── Assessments ─────────────────────────────────────────────────────────── */

export type QuestionKind =
  "mcq" | "multi" | "short" | "long" | "upload" | "code"

export interface TestCase {
  args: unknown[]
  expected: unknown
  /** Hidden cases decide the score; visible ones are for trying the code. */
  hidden: boolean
}

export interface Question {
  id: string
  kind: QuestionKind
  prompt: string
  skill: string
  level: "junior" | "mid" | "senior"
  marks: number
  options?: string[]
  /** Indexes of the right option(s), for mcq and multi. */
  correct?: number[]
  /** What a reviewer should look for in a written answer. */
  guide?: string
  code?: {
    language: "javascript"
    /** The function the tests call. */
    fn: string
    starter: string
    tests: TestCase[]
  }
}

export interface AssessmentTest {
  id: string
  name: string
  requisitionId: string | null
  questionIds: string[]
  /** Give each candidate a random N of the pool, so no two papers match. */
  pickCount: number | null
  shuffle: boolean
  durationMin: number
  passMarkPct: number
  /** How long the invitation stays open to start. */
  windowDays: number
  /** Moving to Offer waits for a reviewed result. */
  requiredForOffer: boolean
  active: boolean
}

export interface AnswerValue {
  text?: string
  choices?: number[]
  fileName?: string
  code?: string
  /** Hidden-test result from the last submit, so the score is not just the editor's say-so. */
  passed?: number
  total?: number
}

export interface IntegrityFlag {
  at: string
  kind: "tab_left" | "paste" | "fullscreen_exit"
  detail?: string
}

export interface TestInvitation {
  id: string
  token: string
  candidateId: string
  testId: string
  status: "invited" | "started" | "submitted" | "expired"
  invitedOn: string
  windowEnd: string
  startedAt: string | null
  /** The server's deadline. Answers after it are refused. */
  deadline: string | null
  /** Extra time granted, e.g. for an accessibility need. Recorded, never silent. */
  extraMinutes: number
  extraNote: string | null
  submittedAt: string | null
  /** The paper this person was issued. */
  questionIds: string[]
  answers: Record<string, AnswerValue>
  flags: IntegrityFlag[]
  autoMarks: Record<string, number>
  reviewMarks: Record<string, number>
  reviewed: boolean
  reviewNote: string | null
  reviewerId: string | null
}

/* ── Offer letters and e-signature ───────────────────────────────────────── */

export interface OfferTemplate {
  id: string
  name: string
  /** Plain text with {{placeholders}}, filled from the candidate and the role. */
  body: string
}

export interface OfferSignature {
  id: string
  /** The private link's key for the candidate. */
  token: string
  candidateId: string
  templateId: string | null
  /** The letter exactly as sent. Never re-rendered, so what was signed is what is shown. */
  letter: string
  /** SHA-256 of the letter, so a changed letter is detectable. */
  letterHash: string
  salaryMonthly: number
  startDate: string
  status: "sent" | "viewed" | "signed" | "declined" | "withdrawn" | "expired"
  sentOn: string
  expiresOn: string
  viewedOn: string | null
  signedOn: string | null
  signedName: string | null
  /** A drawn signature as a small image, when they drew one. */
  signatureImage: string | null
  declinedReason: string | null
  /** Every step, in order, with a time. This is the audit trail. */
  trail: { at: string; text: string }[]
}

/* ── Pre-hire portal ─────────────────────────────────────────────────────── */

export type PortalSection =
  "personal" | "identity" | "statutory" | "pay" | "emergency"

export interface PortalUpload {
  id: string
  name: string
  sizeKb: number
}

/** What a new hire has filled in so far. Everything is text until HR accepts it. */
export interface PortalData {
  dateOfBirth: string
  gender: "" | "male" | "female" | "other"
  nationality: string
  phone: string
  personalEmail: string
  residentialAddress: string
  gpsAddress: string
  ghanaCard: string
  idDocuments: PortalUpload[]
  ssnitNumber: string
  tin: string
  tier2Provider: string
  tier3Provider: string
  paymentMethod: "" | "mobile_money" | "bank"
  momoProvider: string
  momoNumber: string
  bankName: string
  bankAccount: string
  accountName: string
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
  emergencyEmail: string
}

export interface PortalReview {
  status: "ok" | "changes"
  note: string
}

export interface PreHirePortal {
  id: string
  /** The private link's key. */
  token: string
  employeeId: string
  status:
    "invited" | "in_progress" | "submitted" | "changes_requested" | "approved"
  invitedOn: string
  expiresOn: string
  data: PortalData
  submittedOn: string | null
  review: Partial<Record<PortalSection, PortalReview>>
  reviewedBy: string | null
  history: { at: string; text: string }[]
}

/* ── Announcements ───────────────────────────────────────────────────────── */

export interface Audience {
  kind: "all" | "department" | "branch"
  /** The department or branch name, when it is not everyone. */
  value: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  audience: Audience
  postedBy: string
  postedOn: string
  pinned: boolean
  /** A policy: each person has to say they have read and understood it. */
  requiresAck: boolean
  archived: boolean
}

export interface AnnouncementRead {
  announcementId: string
  employeeId: string
  readOn: string
  acknowledgedOn: string | null
}

/* ── Company assets ──────────────────────────────────────────────────────── */

export type AssetKind =
  "laptop" | "phone" | "sim" | "card" | "vehicle" | "other"
export type AssetStatus =
  "in_stock" | "assigned" | "repair" | "retired" | "lost"

export interface Asset {
  id: string
  /** The label stuck on it. Unique. */
  tag: string
  kind: AssetKind
  name: string
  serial: string
  status: AssetStatus
  assignedTo: string | null
  assignedOn: string | null
  history: { at: string; text: string }[]
}

/* ── Pulse surveys ───────────────────────────────────────────────────────── */

export interface PulseQuestion {
  id: string
  /** enps is 0-10 "would you recommend"; scale is 1-5; text is free words. */
  kind: "enps" | "scale" | "text"
  prompt: string
}

export interface Survey {
  id: string
  title: string
  intro: string
  questions: PulseQuestion[]
  audience: Audience
  status: "draft" | "open" | "closed"
  createdBy: string
  createdOn: string
  closesOn: string | null
}

/**
 * An answer, with no name on it. Only the team it came from is kept, so
 * results can be split by department, and only shown for a group big enough
 * that no one can be picked out of it.
 */
export interface SurveyResponse {
  id: string
  surveyId: string
  department: string
  answers: Record<string, number | string>
  on: string
}

/** That someone took part, kept apart from what they said. */
export interface SurveyParticipation {
  surveyId: string
  employeeId: string
}

/* ── Goals and OKRs ──────────────────────────────────────────────────────── */

export type GoalLevel = "company" | "team" | "individual"

export type GoalStatus = "draft" | "proposed" | "active" | "done" | "cancelled"

export interface KeyResult {
  id: string
  title: string
  /** yes_no is 0 or 1; percent and number are measured between start and target. */
  kind: "number" | "percent" | "yes_no"
  start: number
  target: number
  current: number
  /** What the number counts, e.g. "customers". */
  unit: string
}

export interface Goal {
  id: string
  title: string
  description: string
  level: GoalLevel
  /** The person, for an individual goal. */
  ownerId: string | null
  /** The department, for a team goal. */
  team: string | null
  /** The goal this one supports, so effort can be traced up to what the company is trying to do. */
  parentId: string | null
  /** The review cycle it belongs to, e.g. "H2 2026", so reviews can show it. */
  cycle: string
  startOn: string
  dueOn: string
  status: GoalStatus
  keyResults: KeyResult[]
  createdBy: string
  /** Set when a manager sent it back, so the owner knows what to change. */
  returnNote: string | null
}

export type Confidence = "on_track" | "at_risk" | "off_track"

export interface CheckIn {
  id: string
  goalId: string
  at: string
  by: string
  confidence: Confidence
  note: string
  /** Where each key result stood after this check-in. */
  values: Record<string, number>
}
