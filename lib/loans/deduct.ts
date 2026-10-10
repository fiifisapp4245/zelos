import { scheduleFor } from "./schedule"
import type { Loan, LoanDeduction, LoanScheme } from "./types"

/**
 * Taking repayments, without taking too much.
 *
 * Payroll never produces a negative net, and never takes a person below
 * the floor the company set. Statutory deductions are not reducible —
 * the state is owed what it is owed — so the only things that can give
 * way are the voluntary ones, and they give way in a stated order
 * rather than whichever the code happened to reach first.
 *
 * What cannot be taken is not forgiven. It is carried forward, the term
 * extends, and the run says whose pay it happened to.
 */

function round(n: number) {
  return Math.round(n * 100) / 100
}

/** What the company will not take somebody below. */
export interface NetPayFloor {
  /** A flat amount, or null where the percentage decides. */
  minimumNet: number | null
  /** A share of gross, e.g. 40 for "never below 40% of gross". */
  minimumPercentOfGross: number | null
}

/** The floor in money, for one person's gross. */
export function floorFor(floor: NetPayFloor, gross: number): number {
  const byPercent =
    floor.minimumPercentOfGross === null
      ? null
      : round((gross * floor.minimumPercentOfGross) / 100)
  const candidates = [floor.minimumNet, byPercent].filter(
    (n): n is number => n !== null
  )
  // The most protective of whatever was set: both were written as
  // protections, so the higher one is the one that was meant.
  return candidates.length === 0 ? 0 : Math.max(...candidates)
}

/** What the schedule asks of one loan in one period. */
export function dueIn(
  loan: Loan,
  scheme: LoanScheme,
  period: string
): number {
  if (loan.status === "paused") return 0
  if (loan.status === "settled" || loan.status === "written_off") return 0
  if (loan.status !== "disbursed" && loan.status !== "repaying") return 0

  const installments = scheduleFor(
    loan,
    scheme.interestMethod,
    scheme.annualRatePercent
  )
  const due = installments.find((i) => i.period === period)
  if (!due) return 0

  // Anything a previous period could not take is added to this one, so
  // the debt does not quietly stretch forever.
  return round(due.total + loan.carriedForward)
}

export interface DeductionRequest {
  loan: Loan
  scheme: LoanScheme
  /** Lower goes first when something has to give way. */
  priority: number
  outstanding: number
  /** The period being paid, as YYYY-MM. */
  period: string
}

export interface FloorOutcome {
  deductions: LoanDeduction[]
  /** Net after everything that could be taken was taken. */
  net: number
  /** True when something had to give way, which the run must show. */
  reduced: boolean
}

/**
 * Takes what each loan is owed, in priority order, stopping at the
 * floor.
 *
 * Each loan is also capped by its own scheme's share of net pay, so a
 * scheme that says "never more than 30% of net" is honoured even when
 * the company floor would have allowed more.
 */
export function applyWithFloor(
  requests: DeductionRequest[],
  netBeforeLoans: number,
  gross: number,
  floor: NetPayFloor
): FloorOutcome {
  const minimum = floorFor(floor, gross)
  let available = round(Math.max(0, netBeforeLoans - minimum))
  let net = netBeforeLoans
  const deductions: LoanDeduction[] = []
  let reduced = false

  const ordered = [...requests].sort((a, b) => a.priority - b.priority)

  for (const request of ordered) {
    const scheduled = round(
      Math.min(
        dueIn(request.loan, request.scheme, request.period),
        request.outstanding
      )
    )
    if (scheduled <= 0) continue

    // Two ceilings: what this scheme allows, and what is left before
    // the floor. The lower of the two is what can actually be taken.
    const schemeCeiling = round(
      (netBeforeLoans * request.scheme.maxDeductionPercentOfNet) / 100
    )
    const taken = round(Math.max(0, Math.min(scheduled, schemeCeiling, available)))
    const shortfall = round(scheduled - taken)

    if (shortfall > 0) reduced = true
    available = round(available - taken)
    net = round(net - taken)

    deductions.push({
      loanId: request.loan.id,
      label: request.scheme.name,
      scheduled,
      taken,
      shortfall,
      balanceAfter: round(request.outstanding - taken),
    })
  }

  return { deductions, net, reduced }
}

/** What is still owed on a loan, from what has been taken so far. */
export function outstandingOf(
  loan: Loan,
  takenSoFar: number
): number {
  return round(Math.max(0, loan.totalRepayable - takenSoFar))
}

/** A loan is settled the moment nothing is left, never before. */
export function isSettled(loan: Loan, takenSoFar: number): boolean {
  return outstandingOf(loan, takenSoFar) <= 0
}
