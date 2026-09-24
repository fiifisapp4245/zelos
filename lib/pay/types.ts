/**
 * The pay data contract.
 *
 * Three ideas hold the rest together:
 *
 *  - **A compensation version is a fact, not a field.** Pay is never edited
 *    in place. Every change writes a new version that supersedes the last,
 *    so what someone was paid in March is still readable in September and a
 *    rejection or cancellation leaves a record rather than a gap.
 *
 *  - **The country decides how pay is calculated, not the tenant.** Where a
 *    country rule pack exists, Zelos calculates; where it does not, results
 *    are uploaded from a local provider. Nobody types a tax rate into this
 *    product.
 *
 *  - **Currency never mixes.** Every amount carries its currency, and totals
 *    are grouped per currency. A sum across GHS, NGN and USD is not a number
 *    anyone can act on.
 */

export type Currency = string

export interface LegalEntity {
  id: string
  name: string
  country: string
  currency: Currency
}

export type PayFrequency = "monthly" | "semi_monthly" | "bi_weekly" | "weekly"

export type PaymentChannel =
  "bank_transfer" | "mobile_money" | "international_transfer"

/**
 * How a group's pay is worked out.
 *
 * Derived, never chosen: a country with a rule pack is native, a country
 * without one is external, and a group of contractors is contractor
 * whatever country they are in.
 */
export type CalculationMode = "native" | "external" | "contractor"

export interface PayGroup {
  id: string
  name: string
  entityId: string
  country: string
  currency: Currency
  frequency: PayFrequency
  /** In words, because the rule differs per country: "28th, or the last working day before it". */
  payDayRule: string
  paymentChannels: PaymentChannel[]
  /** Period-on-period movement above this asks the preparer to explain it. */
  varianceThresholdPercent: number
  calculationMode: CalculationMode
  contractorGroup?: boolean
}

/* ── Country rules ───────────────────────────────────────────────────── */

export interface ComponentTreatment {
  taxable: boolean
  socialSecurity: boolean
  /** Treated up to this amount per period; the excess falls outside. */
  cap?: number
}

export interface EmployerContributionRule {
  id: string
  name: string
  /** Percent of the base the employer pays on top of gross. */
  percentOfBase: number
  note: string
}

export interface RulePackUpdate {
  title: string
  effectiveFrom: string
  summary: string
}

export interface CountryRulePack {
  country: string
  version: string
  effectiveFrom: string
  /** componentId → how that component is treated in this country. */
  componentTreatments: Record<string, ComponentTreatment>
  employerContributionRules: EmployerContributionRule[]
  statutoryReports: string[]
  filingDeadlines: { name: string; due: string }[]
  updates: RulePackUpdate[]
}

/* ── Components ──────────────────────────────────────────────────────── */

export type ComponentCategory =
  | "earning"
  | "allowance"
  | "benefit_in_kind"
  | "deduction"
  | "employer_contribution"

export interface PayComponent {
  id: string
  name: string
  category: ComponentCategory
  calculation: "fixed" | "percent_of_base"
  recurrence: "recurring" | "one_off"
}

/** What a version carries for a component: an amount, or a rate on the base. */
export interface ComponentValue {
  componentId: string
  amount?: number
  rate?: number
}

/* ── Versions ────────────────────────────────────────────────────────── */

export type WorkerType = "employee" | "contractor"
export type PayBasis = "salaried" | "hourly" | "daily"

export type VersionStatus =
  | "pending"
  | "scheduled"
  | "effective"
  | "superseded"
  | "rejected"
  | "cancelled"

export interface CompensationVersion {
  id: string
  employeeId: string
  versionNumber: number
  effectiveFrom: string
  entityId: string
  workCountry: string
  taxResidency: string
  workerType: WorkerType
  payGroupId: string
  payBasis: PayBasis
  baseAmount: number
  currency: Currency
  frequency: PayFrequency
  components: ComponentValue[]
  reason: string
  proposedBy: string
  proposedAt: string
  approvedBy: string | null
  approvedAt: string | null
  status: VersionStatus
  /** The version this one replaces, so the chain reads backwards. */
  supersedesVersionId: string | null
  changeRequestId: string | null
}

/* ── Change requests ─────────────────────────────────────────────────── */

export type ChangeKind = "individual" | "bulk" | "relocation"

export interface ChangeDefinition {
  type: "percent" | "fixed_increase" | "new_amount"
  value: number
  /** Which component moves. Absent means the base. */
  componentId?: string
}

export type ChangeStatus = "pending" | "approved" | "rejected" | "cancelled"

export interface ChangeEvent {
  at: string
  by: string
  action: "proposed" | "approved" | "rejected" | "cancelled" | "commented"
  note?: string
}

export interface CompensationChangeRequest {
  id: string
  kind: ChangeKind
  employeeIds: string[]
  definition: ChangeDefinition
  effectiveFrom: string
  reason: string
  proposedBy: string
  status: ChangeStatus
  decision: { by: string; at: string; reason: string } | null
  /** Append-only. Nothing here is ever rewritten. */
  events: ChangeEvent[]
  /** Set on a relocation: where the person is moving to. */
  relocation?: { toCountry: string; toEntityId: string | null }
}

/* ── Settings ────────────────────────────────────────────────────────── */

export interface ApprovalSettings {
  compensationApproverRole: string
  payrollPreparerRole: string
  payrollApproverRole: string
  /** Acts for the approver while they are away. */
  delegateUserId: string | null
}

/* ── Working abroad ──────────────────────────────────────────────────── */

/**
 * Someone working outside their tax country for a while. Past 183 days in a
 * rolling year most treaties make them resident where they are sitting,
 * which changes who withholds — so the count is tracked before it is
 * crossed rather than found afterwards.
 */
export interface AssignmentAbroad {
  employeeId: string
  country: string
  since: string
  daysAbroad: number
}

/** The point at which residency usually moves. */
export const RESIDENCY_THRESHOLD_DAYS = 183
