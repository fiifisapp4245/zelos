/**
 * Company pay rules — the layer between the law and the individual.
 *
 * A country's rule pack says what tax is. An individual's compensation
 * version says what one person earns. This sits between them: the
 * company's own policy, written once and applied to whoever it names.
 * "Housing is 15% of basic for grade B and above, capped at GHS 2,000"
 * is a rule. It is not the law, and it is not a single person's package.
 *
 * Rules can never produce a statutory amount. The component list they
 * draw on holds no tax and no social security, so there is no rule
 * anybody can write that changes what the state is owed.
 */

/** The shapes a rule can take. Each compiles to the same expression. */
export type RuleTemplate =
  | "fixed"
  | "percent"
  | "capped_percent"
  | "rate_x_quantity"
  | "tiered"
  | "one_off"
  | "formula"

/**
 * The variables a rule may read. Fixed and typed on purpose: a rule
 * that can reach anything is a rule nobody can reason about, and this
 * list is what makes a formula safe to evaluate without running code.
 */
export type RuleVariable =
  | "basic_salary"
  | "gross_pay"
  | "hourly_rate"
  | "daily_rate"
  | "days_worked"
  | "days_in_period"
  | "overtime_hours_weekday"
  | "overtime_hours_weekend"
  | "overtime_hours_holiday"
  | "years_of_service"
  | "age"

export const RULE_VARIABLES: RuleVariable[] = [
  "basic_salary",
  "gross_pay",
  "hourly_rate",
  "daily_rate",
  "days_worked",
  "days_in_period",
  "overtime_hours_weekday",
  "overtime_hours_weekend",
  "overtime_hours_holiday",
  "years_of_service",
  "age",
]

/** What a variable means, for the builder's autocomplete and hints. */
export const VARIABLE_BLURB: Record<RuleVariable, string> = {
  basic_salary: "Base pay for the period, before anything is added",
  gross_pay: "Everything earned this period. Deduction rules only.",
  hourly_rate: "Basic divided by the hours the pattern expects",
  daily_rate: "Basic divided by the days in the period",
  days_worked: "Days employed within this period",
  days_in_period: "Days the period covers",
  overtime_hours_weekday: "Approved overtime on a working day",
  overtime_hours_weekend: "Approved overtime on a rest day",
  overtime_hours_holiday: "Approved overtime on a public holiday",
  years_of_service: "Whole years since the start date",
  age: "Whole years since date of birth",
}

/** The inputs one evaluation has to hand. */
export type RuleContext = Record<RuleVariable, number>

/* ── Targeting ───────────────────────────────────────────────────────── */

/**
 * One clause of who a rule reaches. Every field set on a clause must
 * match, so a clause is an "and" and the list of clauses is an "or" —
 * which is how people describe this out loud: "grade B and above in
 * Ghana monthly, or anybody in the engineering rota".
 */
export interface TargetClause {
  payGroupId?: string
  branch?: string
  department?: string
  /** Matches this grade exactly. */
  grade?: string
  /** Matches this grade and every grade above it. */
  gradeFrom?: string
  employmentType?: string
  /** A saved group of people, by id. */
  customGroupId?: string
  employeeId?: string
}

export interface RuleTargets {
  /** Empty means everybody. */
  include: TargetClause[]
  exclude: TargetClause[]
}

/* ── Parameters, per template ────────────────────────────────────────── */

export interface FixedParams {
  amount: number
}

export interface PercentParams {
  percent: number
  of: RuleVariable
}

export interface CappedPercentParams extends PercentParams {
  /** Never pays more than this. Null for no ceiling. */
  max: number | null
  /** Never pays less than this, where it pays at all. Null for none. */
  min: number | null
}

export interface RateQuantityParams {
  rate: number
  /** Multiplies the rate, e.g. 2 for double time. */
  multiplier: number
  quantity: RuleVariable
}

export interface TierParams {
  /** The variable the bands are read against. */
  of: RuleVariable
  bands: {
    /** Applies from this value upward, until the next band. */
    from: number
    /** A percent of `basis`, or a flat amount when `basis` is null. */
    percent?: number
    amount?: number
  }[]
  /** What a percent band is a percent of. */
  basis: RuleVariable
}

export interface OneOffParams {
  amount: number
  /** The period this is paid in, as YYYY-MM. */
  period: string
}

export type RuleParams =
  | ({ template: "fixed" } & FixedParams)
  | ({ template: "percent" } & PercentParams)
  | ({ template: "capped_percent" } & CappedPercentParams)
  | ({ template: "rate_x_quantity" } & RateQuantityParams)
  | ({ template: "tiered" } & TierParams)
  | ({ template: "one_off" } & OneOffParams)
  | { template: "formula"; formula: string }

/* ── The rule ────────────────────────────────────────────────────────── */

export type RuleStatus = "draft" | "pending_approval" | "active" | "retired"

export interface PayRule {
  id: string
  /** The component this pays or deducts. Never a statutory one. */
  componentId: string
  name: string
  params: RuleParams
  targets: RuleTargets
  /** Reduced for part of a period, for joiners and leavers. */
  prorate: boolean
  /** Higher wins where two rules pay the same component. */
  priority: number
  effectiveFrom: string
  /** Null while it is still in force. */
  effectiveTo: string | null
  version: number
  status: RuleStatus
  /** Null until somebody approves it. */
  approvedBy: string | null
  /** Why it exists, in the author's words. */
  reason: string
}
