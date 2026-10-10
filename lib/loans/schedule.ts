import type {
  Installment,
  InterestMethod,
  Loan,
  LoanScheme,
} from "./types"

/**
 * Repayment schedules.
 *
 * The schedule is derived from the loan's terms, never stored as a list
 * that could drift from them. The one thing it must guarantee is that
 * the installments add up to the total repayable exactly: a schedule
 * that leaves a pesewa behind leaves a debt nobody can close, and one
 * that overshoots takes money that was never owed.
 *
 * The last installment absorbs whatever rounding left over, which is
 * how every lender does it and the only way the arithmetic closes.
 */

function round(n: number) {
  return Math.round(n * 100) / 100
}

/** Adds months to a YYYY-MM period. */
export function addMonths(period: string, months: number): string {
  const [year, month] = period.split("-").map(Number)
  const zeroBased = month - 1 + months
  const newYear = year + Math.floor(zeroBased / 12)
  const newMonth = ((zeroBased % 12) + 12) % 12
  return `${newYear}-${String(newMonth + 1).padStart(2, "0")}`
}

/**
 * Total interest over the life of the loan.
 *
 * Flat interest is charged on the full principal for the whole term
 * however much has been repaid, which is why it costs more than the
 * headline rate suggests. Reducing balance charges only on what is
 * still owed, so the total falls out of the schedule rather than being
 * worked out up front.
 */
export function interestFor(
  principal: number,
  method: InterestMethod,
  annualRatePercent: number,
  months: number
): number {
  if (method === "none" || annualRatePercent === 0) return 0

  if (method === "flat")
    return round((principal * (annualRatePercent / 100) * months) / 12)

  // Reducing balance: the interest is the sum of the interest portions
  // of a level annuity payment.
  const monthlyRate = annualRatePercent / 100 / 12
  const payment = annuityPayment(principal, monthlyRate, months)
  return round(payment * months - principal)
}

/** The level payment that clears a principal over n periods. */
export function annuityPayment(
  principal: number,
  monthlyRate: number,
  months: number
): number {
  if (months <= 0) return 0
  if (monthlyRate === 0) return principal / months
  return (
    (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
  )
}

/**
 * The schedule for one loan.
 *
 * Every installment is rounded to the minor unit as it is produced, and
 * the final one is set to whatever is still outstanding, so the column
 * sums to the total repayable to the pesewa.
 */
export function scheduleFor(
  loan: Pick<
    Loan,
    | "principal"
    | "interest"
    | "totalRepayable"
    | "installmentCount"
    | "firstRepaymentPeriod"
  >,
  method: InterestMethod,
  annualRatePercent: number
): Installment[] {
  const count = loan.installmentCount
  if (count <= 0) return []

  const installments: Installment[] = []

  if (method === "reducing_balance" && annualRatePercent > 0) {
    const monthlyRate = annualRatePercent / 100 / 12
    const payment = annuityPayment(loan.principal, monthlyRate, count)
    let balance = loan.principal

    for (let i = 0; i < count; i++) {
      const last = i === count - 1
      const interest = round(balance * monthlyRate)
      // The final payment clears whatever is left, so rounding across
      // the term cannot leave a balance behind.
      const principalPart = last ? round(balance) : round(payment - interest)
      const total = round(principalPart + interest)
      balance = round(balance - principalPart)

      installments.push({
        period: addMonths(loan.firstRepaymentPeriod, i),
        principal: principalPart,
        interest,
        total,
        balanceAfter: Math.max(0, balance),
      })
    }

    return installments
  }

  // No interest, or flat: the cost is known up front and spread evenly.
  const perPeriod = round(loan.totalRepayable / count)
  const interestPerPeriod = round(loan.interest / count)
  let remaining = loan.totalRepayable

  for (let i = 0; i < count; i++) {
    const last = i === count - 1
    const total = last ? round(remaining) : perPeriod
    const interest = last
      ? round(loan.interest - interestPerPeriod * (count - 1))
      : interestPerPeriod
    remaining = round(remaining - total)

    installments.push({
      period: addMonths(loan.firstRepaymentPeriod, i),
      principal: round(total - interest),
      interest,
      total,
      balanceAfter: Math.max(0, remaining),
    })
  }

  return installments
}

/** What a loan costs in total, before any of it is scheduled. */
export function termsFor(
  principal: number,
  scheme: Pick<LoanScheme, "interestMethod" | "annualRatePercent">,
  months: number
): { interest: number; totalRepayable: number } {
  const interest = interestFor(
    principal,
    scheme.interestMethod,
    scheme.annualRatePercent,
    months
  )
  return { interest, totalRepayable: round(principal + interest) }
}

/* ── Eligibility ─────────────────────────────────────────────────────── */

/** The most this scheme will lend somebody on this basic salary. */
export function ceilingFor(
  scheme: Pick<LoanScheme, "maxAmount" | "maxMultipleOfBasic">,
  monthlyBasic: number
): number | null {
  const byMultiple =
    scheme.maxMultipleOfBasic === null
      ? null
      : round(monthlyBasic * scheme.maxMultipleOfBasic)
  if (scheme.maxAmount === null) return byMultiple
  if (byMultiple === null) return scheme.maxAmount
  // Both set: the tighter of the two, because both were meant as limits.
  return Math.min(scheme.maxAmount, byMultiple)
}

export interface EligibilityProblem {
  field: "amount" | "term" | "service"
  message: string
}

/** Why somebody cannot have this loan on these terms, in plain words. */
export function eligibilityProblems(
  scheme: LoanScheme,
  request: { amount: number; months: number; serviceMonths: number },
  monthlyBasic: number
): EligibilityProblem[] {
  const problems: EligibilityProblem[] = []
  const ceiling = ceilingFor(scheme, monthlyBasic)

  if (request.amount <= 0)
    problems.push({ field: "amount", message: "The amount must be above zero." })
  else if (ceiling !== null && request.amount > ceiling)
    problems.push({
      field: "amount",
      message: `${scheme.name} lends up to ${ceiling} on this salary, and this asks for ${request.amount}.`,
    })

  if (request.months <= 0)
    problems.push({ field: "term", message: "The term must be at least one period." })
  else if (request.months > scheme.maxTermMonths)
    problems.push({
      field: "term",
      message: `${scheme.name} runs for up to ${scheme.maxTermMonths} months, and this asks for ${request.months}.`,
    })

  if (request.serviceMonths < scheme.minimumServiceMonths)
    problems.push({
      field: "service",
      message: `${scheme.name} needs ${scheme.minimumServiceMonths} months of service, and this person has ${request.serviceMonths}.`,
    })

  return problems
}
