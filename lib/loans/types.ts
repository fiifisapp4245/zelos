import type { Currency } from "../pay/types"
import type { RuleTargets } from "../rules/types"

/**
 * Loans and advances.
 *
 * A loan is money the company has already handed over, recovered a
 * piece at a time from pay. That makes it unlike every other deduction:
 * it has a balance that must reach zero exactly, it cannot take so much
 * that somebody cannot live, and it outlives the employment if the
 * employment ends first.
 *
 * Nothing here decides tax. Where a country taxes the benefit of a
 * cheap loan, that treatment is read from its rule pack.
 */

export type LoanType = "staff_loan" | "salary_advance" | "asset_purchase"

export const LOAN_TYPE_LABEL: Record<LoanType, string> = {
  staff_loan: "Staff loan",
  salary_advance: "Salary advance",
  asset_purchase: "Asset purchase",
}

/**
 * How interest is worked out.
 *
 * Flat charges interest on the whole principal for the whole term, so
 * the cost does not fall as the balance does. Reducing balance charges
 * only on what is still owed. They are not interchangeable and a
 * borrower is owed the difference in plain words.
 */
export type InterestMethod = "none" | "flat" | "reducing_balance"

export const INTEREST_METHOD_LABEL: Record<InterestMethod, string> = {
  none: "No interest",
  flat: "Flat rate",
  reducing_balance: "Reducing balance",
}

/** The default terms, so HR does not retype them for every loan. */
export interface LoanScheme {
  id: string
  name: string
  type: LoanType
  interestMethod: InterestMethod
  /** Percent per year. Zero where there is no interest. */
  annualRatePercent: number
  /** A ceiling in money, or null where the multiple decides. */
  maxAmount: number | null
  /** A ceiling as a multiple of monthly basic, e.g. 3 for three months. */
  maxMultipleOfBasic: number | null
  maxTermMonths: number
  /** Months of service before somebody may borrow. */
  minimumServiceMonths: number
  eligibility: RuleTargets
  /**
   * Never take more than this share of net pay in one period. The floor
   * that protects somebody from a payslip they cannot live on.
   */
  maxDeductionPercentOfNet: number
  requiresApproval: boolean
  approverRole: string | null
}

/* ── One loan ────────────────────────────────────────────────────────── */

export type LoanStatus =
  | "requested"
  | "approved"
  | "disbursed"
  | "repaying"
  | "paused"
  | "settled"
  | "written_off"

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  disbursed: "Disbursed",
  repaying: "Repaying",
  paused: "Paused",
  settled: "Settled",
  written_off: "Written off",
}

/** One scheduled repayment. */
export interface Installment {
  /** The period it falls due in, as YYYY-MM. */
  period: string
  /** Toward the principal. */
  principal: number
  interest: number
  /** What the payslip shows: principal plus interest. */
  total: number
  /** What is still owed after this one is paid. */
  balanceAfter: number
}

/**
 * Something that happened to a loan. Loans are never edited in place —
 * a pause, a reschedule or a write-off is an event with a reason and an
 * author, so the history of a debt can always be read back.
 */
export interface LoanEvent {
  id: string
  at: string
  by: string
  kind:
    | "requested"
    | "approved"
    | "rejected"
    | "disbursed"
    | "paused"
    | "resumed"
    | "rescheduled"
    | "shortfall"
    | "settled"
    | "written_off"
    | "repaid_outside_payroll"
  reason: string
}

export interface Loan {
  id: string
  employeeId: string
  schemeId: string
  principal: number
  /** Worked out from the scheme at the time it was issued. */
  interest: number
  totalRepayable: number
  currency: Currency
  disbursedOn: string | null
  disbursementMethod: "payroll" | "bank_transfer" | "mobile_money" | null
  /** The first period a repayment is taken, as YYYY-MM. */
  firstRepaymentPeriod: string
  installmentCount: number
  status: LoanStatus
  /** Repayments that could not be taken in full, carried forward. */
  carriedForward: number
  events: LoanEvent[]
  reason: string
}

/** What one period's payroll should take, and why it might be less. */
export interface LoanDeduction {
  loanId: string
  label: string
  /** What the schedule asked for. */
  scheduled: number
  /** What the net-pay floor allowed. */
  taken: number
  /** Scheduled minus taken, added to the balance and the term. */
  shortfall: number
  balanceAfter: number
}
