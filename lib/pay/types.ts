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

import type { ProrationMethod } from "./proration"

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
  /** How a part-period is worked out for joiners and leavers. */
  prorationMethod: ProrationMethod
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

/** What the employee pays out of their own gross, by the country's rules. */
export interface EmployeeContributionRule {
  id: string
  name: string
  percentOfBase: number
  /** The scheme or trustee the money goes to, for the remittance file. */
  remittedTo: string
  note: string
}

/** A slice of taxable pay and the rate that applies to it. */
export interface TaxBand {
  /** Width of the band per period. The last band is open-ended. */
  upTo: number | null
  ratePercent: number
}

export interface EmployerContributionRule {
  id: string
  name: string
  /** Percent of the base the employer pays on top of gross. */
  percentOfBase: number
  /** The scheme or trustee the money goes to, for the remittance file. */
  remittedTo: string
  note: string
}

/**
 * A scheme the country recognises but neither side is obliged to join,
 * so it carries no rate. What somebody actually contributes is their own
 * pay component; this is only the country saying the scheme exists.
 */
export interface VoluntaryScheme {
  id: string
  name: string
  remittedTo: string
  note: string
}

export interface RulePackUpdate {
  title: string
  effectiveFrom: string
  summary: string
}

export interface FilingDeadline {
  name: string
  /** The rule in words, as the authority states it. */
  due: string
  /** Day of the month it falls on, where it is monthly. */
  dueDayOfMonth?: number
  /** MM-DD, where it is annual. */
  annualOn?: string
}

export interface CountryRulePack {
  country: string
  version: string
  effectiveFrom: string
  /** componentId → how that component is treated in this country. */
  componentTreatments: Record<string, ComponentTreatment>
  employerContributionRules: EmployerContributionRule[]
  employeeContributionRules: EmployeeContributionRule[]
  /** Recognised but optional. Nothing is deducted for these by default. */
  voluntarySchemes: VoluntaryScheme[]
  /** Applied in order to taxable pay, per pay period. */
  taxBands: TaxBand[]
  statutoryReports: string[]
  filingDeadlines: FilingDeadline[]
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

/* ── Payroll runs ────────────────────────────────────────────────────── */

export type RunKind = "regular" | "off_cycle"

/**
 * Where a run has got to. The order is the stepper, and every state has
 * a word — a run is too consequential to be told apart by colour.
 */
export type RunStatus =
  | "upcoming"
  | "inputs_open"
  | "inputs_locked"
  | "calculated"
  | "pending_approval"
  | "approved"
  | "paying"
  | "paid"

/** Append-only. A run's history is part of the run. */
export interface PayrollEvent {
  at: string
  by: string
  action: string
  note?: string
}

/** The rate used to state one currency in another, fixed when approved. */
export interface FxRate {
  from: Currency
  to: Currency
  rate: number
  capturedAt: string
}

export interface PayrollRun {
  id: string
  payGroupId: string
  kind: RunKind
  periodStart: string
  periodEnd: string
  payDate: string
  status: RunStatus
  preparedBy: string
  submittedAt: string | null
  decision: {
    by: string
    at: string
    outcome: "approved" | "rejected"
    reason: string
  } | null
  /** Captured at approval, so a later market move cannot restate a run. */
  fxRates: FxRate[]
  events: PayrollEvent[]
  /** Off-cycle runs name who they are for and why they exist. */
  employeeIds?: string[]
  reason?: string
}

export interface LineItem {
  componentId: string
  label: string
  amount: number
}

/** A hand-made change to one line, with the person who made it attached. */
export interface LineAdjustment {
  id: string
  runId: string
  employeeId: string
  componentId: string
  amount: number
  direction: "add" | "deduct"
  note: string
  by: string
  at: string
}

/**
 * Why a line is worth a second look. Never colour alone: each one has a
 * sentence attached wherever it is shown.
 */
export type LineFlag =
  | "netChange"
  | "newPayee"
  | "changedPaymentDetails"
  | "missingPaymentDetails"
  | "zeroOrNegativeNet"

export interface PayrollLine {
  runId: string
  employeeId: string
  earnings: LineItem[]
  deductions: LineItem[]
  employerContributions: LineItem[]
  adjustments: LineAdjustment[]
  gross: number
  net: number
  /** Null where this is the first run the person has appeared in. */
  previousNet: number | null
  /** Carried on the line so no total has to look up which run it came from. */
  currency: Currency
  paymentChannel: PaymentChannel | null
  paymentDestinationMasked: string | null
  flags: LineFlag[]
}

/* ── One-off payments ────────────────────────────────────────────────── */

export type OneOffStatus = "upcoming" | "included" | "paid" | "cancelled"

export interface OneOffPayment {
  id: string
  employeeId: string
  componentId: string
  amount: number
  /** Gross is what it costs; net is what the person receives. */
  basis: "gross" | "net"
  payFromDate: string
  recurrence: "once" | "monthly_for_n"
  /** How many months, where the recurrence repeats. */
  months?: number
  status: OneOffStatus
  includedInRunId: string | null
  note?: string
  events: PayrollEvent[]
}

/* ── Readiness ───────────────────────────────────────────────────────── */

export interface ReadinessCheck {
  id: string
  label: string
  severity: "blocker" | "warning"
  status: "pass" | "fail" | "acknowledged"
  detail: string
  /** Where the thing is actually fixed. */
  link: string
  acknowledgement?: { by: string; reason: string; at: string }
}

/** Somebody deciding to proceed with a warning, on the record. */
export interface ReadinessAcknowledgement {
  runId: string
  checkId: string
  by: string
  reason: string
  at: string
}

/** A gross-to-net result uploaded from a provider, for external groups. */
export interface ExternalResult {
  runId: string
  employeeId: string
  gross: number
  deductions: number
  net: number
}

/* ── Payments ────────────────────────────────────────────────────────── */

/**
 * How money actually leaves. A bank file goes to the bank as a file;
 * the mobile money channels are per provider, because a batch goes to
 * one provider at a time.
 */
export type PaymentChannelKey =
  | "bank_file"
  | "mtn_momo"
  | "telecel_cash"
  | "airteltigo_money"
  | "international_transfer"

export type BatchStatus = "initiated" | "sent" | "confirmed" | "failed"
export type PaymentItemStatus = "pending" | "sent" | "confirmed" | "failed"

export interface PaymentItem {
  employeeId: string
  amount: number
  currency: Currency
  destinationMasked: string
  status: PaymentItemStatus
  /** Why the money came back, in the provider's words. */
  failureReason?: string
  /** Set where a failed item was paid another way instead. */
  paidByChannel?: PaymentChannelKey
}

export interface PaymentBatch {
  id: string
  runId: string
  channel: PaymentChannelKey
  count: number
  totalsPerCurrency: { currency: Currency; amount: number }[]
  status: BatchStatus
  items: PaymentItem[]
  events: PayrollEvent[]
}

/* ── Payslips ────────────────────────────────────────────────────────── */

export interface YtdTotals {
  gross: number
  deductions: number
  employerContributions: number
  net: number
}

/**
 * A payslip is a statement of a run's line, not a second copy of it. It
 * is derived from the run every time, so a payslip and the register can
 * never disagree.
 */
export interface Payslip {
  id: string
  runId: string
  employeeId: string
  /** yyyy-mm, the period it covers. */
  period: string
  payDate: string
  earnings: LineItem[]
  deductions: LineItem[]
  employerContributions: LineItem[]
  gross: number
  net: number
  currency: Currency
  paymentChannel: PaymentChannel | null
  destinationMasked: string | null
  ytd: YtdTotals
  /** Which version of the country's rules worked this out. */
  rulePackVersion: string | null
  /** The compensation version the figures were calculated from. */
  compensationVersionId: string | null
}
