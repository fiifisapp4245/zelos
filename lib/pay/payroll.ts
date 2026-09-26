import { datesBetween } from "../time"
import type {
  CompensationVersion,
  CountryRulePack,
  Currency,
  ExternalResult,
  LineAdjustment,
  LineFlag,
  LineItem,
  OneOffPayment,
  PayComponent,
  PaymentChannel,
  PayrollLine,
  PayrollRun,
  ReadinessCheck,
} from "./types"

/**
 * What a run works out, and what has to be true before it can.
 *
 * Every figure here is derived from the compensation versions in force,
 * the country's rules and whatever was added by hand — never stored as a
 * total. Re-running the same period twice gives the same answer, which
 * is the only way a payroll disagreement can be settled by looking.
 */

function round(n: number) {
  return Math.round(n * 100) / 100
}

/* ── One line ────────────────────────────────────────────────────────── */

export interface LineContext {
  runId: string
  /** The component library, for names and categories. */
  components: PayComponent[]
  /** What they took home last time, for the delta. Null if they are new. */
  previousNet: number | null
  paymentChannel: PaymentChannel | null
  paymentDestinationMasked: string | null
}

/** The rate the next cedi of taxable pay would be taxed at. */
export function marginalRate(taxable: number, pack: CountryRulePack) {
  let remaining = taxable
  for (const band of pack.taxBands) {
    if (band.upTo === null) return band.ratePercent / 100
    if (remaining <= band.upTo) return band.ratePercent / 100
    remaining -= band.upTo
  }
  return 0
}

export function taxOn(taxable: number, pack: CountryRulePack) {
  let remaining = Math.max(0, taxable)
  let tax = 0
  for (const band of pack.taxBands) {
    if (remaining <= 0) break
    const width = band.upTo ?? remaining
    const slice = Math.min(remaining, width)
    tax += (slice * band.ratePercent) / 100
    remaining -= slice
  }
  return round(tax)
}

/**
 * One person's pay for one period.
 *
 * A net-basis payment is grossed up at the marginal rate, so the person
 * receives the figure they were promised and the employer carries the
 * tax on it. Anything paid on top of base is taxed or not according to
 * the country's treatment of that component, never a rule set here.
 */
export function calculateLine(
  version: CompensationVersion,
  rulePack: CountryRulePack | null,
  oneOffs: OneOffPayment[],
  adjustments: LineAdjustment[],
  period: { start: string; end: string },
  context: LineContext
): PayrollLine {
  const named = (id: string, fallback: string) =>
    context.components.find((c) => c.id === id)?.name ?? fallback

  const earnings: LineItem[] = [
    {
      componentId: "pc-base",
      label: "Base pay",
      amount: round(version.baseAmount),
    },
  ]
  const deductions: LineItem[] = []
  const employerContributions: LineItem[] = []

  // Recurring components from the package.
  for (const value of version.components) {
    const definition = context.components.find(
      (c) => c.id === value.componentId
    )
    const amount = round(
      value.amount ?? (value.rate ? (version.baseAmount * value.rate) / 100 : 0)
    )
    if (amount === 0) continue
    const item = {
      componentId: value.componentId,
      label: definition?.name ?? value.componentId,
      amount,
    }
    if (definition?.category === "deduction") deductions.push(item)
    else if (definition?.category === "employer_contribution")
      employerContributions.push(item)
    else earnings.push(item)
  }

  // One-off payments that fall in this period.
  const dueOneOffs = oneOffs.filter(
    (o) =>
      o.employeeId === version.employeeId &&
      o.status !== "cancelled" &&
      o.payFromDate <= period.end
  )

  const contractor = version.workerType === "contractor"
  const pack = contractor ? null : rulePack

  // Gross-basis one-offs simply add to pay.
  for (const o of dueOneOffs.filter((o) => o.basis === "gross")) {
    earnings.push({
      componentId: o.componentId,
      label: named(o.componentId, "One-off payment"),
      amount: round(o.amount),
    })
  }

  for (const a of adjustments.filter((a) => a.direction === "add")) {
    earnings.push({
      componentId: a.componentId,
      label: named(a.componentId, "Adjustment"),
      amount: round(a.amount),
    })
  }
  for (const a of adjustments.filter((a) => a.direction === "deduct")) {
    deductions.push({
      componentId: a.componentId,
      label: named(a.componentId, "Adjustment"),
      amount: round(a.amount),
    })
  }

  // Net-basis one-offs are grossed up, so the person receives the amount
  // named and the tax on it is an employer cost.
  const netBasis = dueOneOffs.filter((o) => o.basis === "net")
  if (netBasis.length > 0) {
    const taxableSoFar = taxableOf(earnings, pack)
    const rate = pack ? marginalRate(taxableSoFar, pack) : 0
    for (const o of netBasis) {
      earnings.push({
        componentId: o.componentId,
        label: `${named(o.componentId, "One-off payment")} (grossed up)`,
        amount: round(rate < 1 ? o.amount / (1 - rate) : o.amount),
      })
    }
  }

  const gross = round(earnings.reduce((n, e) => n + e.amount, 0))

  if (pack) {
    const socialBase = version.baseAmount
    for (const rule of pack.employeeContributionRules) {
      deductions.push({
        componentId: rule.id,
        label: rule.name,
        amount: round((socialBase * rule.percentOfBase) / 100),
      })
    }
    for (const rule of pack.employerContributionRules) {
      employerContributions.push({
        componentId: rule.id,
        label: rule.name,
        amount: round((socialBase * rule.percentOfBase) / 100),
      })
    }

    const social = deductions
      .filter((d) =>
        pack.employeeContributionRules.some((r) => r.id === d.componentId)
      )
      .reduce((n, d) => n + d.amount, 0)

    const taxable = Math.max(0, taxableOf(earnings, pack) - social)
    deductions.push({
      componentId: "pc-paye",
      label: "PAYE",
      amount: taxOn(taxable, pack),
    })
  }

  const totalDeductions = round(deductions.reduce((n, d) => n + d.amount, 0))

  return {
    runId: context.runId,
    employeeId: version.employeeId,
    earnings,
    deductions,
    employerContributions,
    adjustments,
    gross,
    net: round(gross - totalDeductions),
    previousNet: context.previousNet,
    currency: version.currency,
    paymentChannel: context.paymentChannel,
    paymentDestinationMasked: context.paymentDestinationMasked,
    flags: [],
  }
}

/** Earnings the country treats as taxable, respecting any cap. */
function taxableOf(earnings: LineItem[], pack: CountryRulePack | null) {
  if (!pack) return 0
  return earnings.reduce((n, e) => {
    const treatment = pack.componentTreatments[e.componentId]
    // Anything the pack does not name is treated as taxable pay, which
    // is the safe direction: it is declared rather than quietly dropped.
    if (!treatment) return n + e.amount
    if (!treatment.taxable) return n
    return (
      n +
      (treatment.cap !== undefined
        ? Math.max(0, e.amount - treatment.cap)
        : e.amount)
    )
  }, 0)
}

export function totalDeductions(line: PayrollLine) {
  return round(line.deductions.reduce((n, d) => n + d.amount, 0))
}

export function totalEmployerContributions(line: PayrollLine) {
  return round(line.employerContributions.reduce((n, c) => n + c.amount, 0))
}

/** A line built from an uploaded result rather than calculated here. */
export function lineFromExternal(
  result: ExternalResult,
  currency: Currency,
  context: LineContext
): PayrollLine {
  return {
    runId: result.runId,
    employeeId: result.employeeId,
    earnings: [
      {
        componentId: "pc-external-gross",
        label: "Gross (uploaded)",
        amount: result.gross,
      },
    ],
    deductions: [
      {
        componentId: "pc-external-deductions",
        label: "Deductions (uploaded)",
        amount: result.deductions,
      },
    ],
    employerContributions: [],
    adjustments: [],
    gross: result.gross,
    net: result.net,
    previousNet: context.previousNet,
    currency,
    paymentChannel: context.paymentChannel,
    paymentDestinationMasked: context.paymentDestinationMasked,
    flags: [],
  }
}

/* ── Readiness ───────────────────────────────────────────────────────── */

export interface ReadinessSource {
  /** Attendance's own pay periods, which have to be settled first. */
  payPeriods: { id: string; start: string; end: string; status: string }[]
  /**
   * The people in this run with days attendance and leave disagree
   * about, by name. Names rather than ids, because the check exists to
   * be read: "Kofi Mensah and two others" is what sends somebody to the
   * right rows.
   */
  unexplainedNames: string[]
  /** People in this run whose payment details are awaiting approval. */
  pendingPaymentChanges: string[]
  /** People in this run with nowhere to send their pay. */
  missingDestinations: string[]
  /** People in this run with no compensation version in force. */
  missingCompensation: string[]
  acknowledgements: {
    checkId: string
    by: string
    reason: string
    at: string
  }[]
}

/**
 * What has to be true before a run can be calculated, and what merely
 * ought to be.
 *
 * A blocker stops the calculation, because the answer would be wrong. A
 * warning does not: it can be acknowledged with a reason, and the reason
 * stays on the run. Every item says where it is fixed, so nobody has to
 * go hunting for the screen that owns the problem.
 */
export function readiness(
  run: PayrollRun,
  source: ReadinessSource
): ReadinessCheck[] {
  const covering = source.payPeriods.find(
    (p) => p.start <= run.periodStart && p.end >= run.periodEnd
  )
  const settled = source.payPeriods.find(
    (p) =>
      p.start <= run.periodStart &&
      p.end >= run.periodEnd &&
      (p.status === "readyForPayroll" || p.status === "closed")
  )

  const raw: Omit<ReadinessCheck, "status" | "acknowledgement">[] = [
    {
      id: "attendance-closed",
      label: "Attendance for the period is settled",
      severity: "blocker",
      detail: settled
        ? "Timesheets for the period have been approved and the period marked ready."
        : "The attendance period covering this run has not been closed, so the hours behind it can still change.",
      // Straight to the period in question, not to the module's front door.
      link: covering ? `/timesheets?period=${covering.id}` : "/timesheets",
    },
    {
      id: "compensation-on-file",
      label: "Everyone has compensation on file",
      severity: "blocker",
      detail:
        source.missingCompensation.length === 0
          ? "Every person in this run has a version in force."
          : `${source.missingCompensation.length} ${source.missingCompensation.length === 1 ? "person has" : "people have"} no compensation version in force for this period.`,
      link: "/pay/compensation",
    },
    {
      id: "leave-reconciled",
      label: "Leave and attendance agree",
      severity: "warning",
      detail:
        source.unexplainedNames.length === 0
          ? "Nothing in the period is unexplained."
          : `${namesOf(source.unexplainedNames)} ${source.unexplainedNames.length === 1 ? "has days" : "have days"} in this period that leave does not explain.`,
      // Straight to the reconciliation list, over the same month, rather
      // than to the top of a page the list sits three sections below.
      link: "/attendance?tab=leave&period=month#reconciliation",
    },
    {
      id: "payment-changes",
      label: "No payment details awaiting approval",
      severity: "warning",
      detail:
        source.pendingPaymentChanges.length === 0
          ? "Nobody in this run is waiting on a change of account."
          : `${source.pendingPaymentChanges.length} ${source.pendingPaymentChanges.length === 1 ? "change of bank or mobile money details is" : "changes of bank or mobile money details are"} still waiting on approval. Pay would go to the old account.`,
      link: "/approvals?type=bankDetailsChange",
    },
    {
      id: "payment-details",
      label: "Everyone has somewhere to be paid",
      severity: "warning",
      detail:
        source.missingDestinations.length === 0
          ? "Every line has a payment destination."
          : `${source.missingDestinations.length} ${source.missingDestinations.length === 1 ? "person has" : "people have"} no bank account or mobile money number on file.`,
      link:
        source.missingDestinations.length === 1
          ? `/employees/${source.missingDestinations[0]}`
          : "/employees",
    },
  ]

  const failing: Record<string, boolean> = {
    "attendance-closed": !settled,
    "compensation-on-file": source.missingCompensation.length > 0,
    "leave-reconciled": source.unexplainedNames.length > 0,
    "payment-changes": source.pendingPaymentChanges.length > 0,
    "payment-details": source.missingDestinations.length > 0,
  }

  return raw.map((check) => {
    const ack = source.acknowledgements.find((a) => a.checkId === check.id)
    const failed = failing[check.id]
    return {
      ...check,
      status: !failed ? "pass" : ack ? "acknowledged" : "fail",
      ...(ack && failed
        ? { acknowledgement: { by: ack.by, reason: ack.reason, at: ack.at } }
        : {}),
    }
  })
}

/** "Kofi Mensah", "Kofi and Ama", "Kofi, Ama and 2 others". */
function namesOf(names: string[]) {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} ${names.length - 2 === 1 ? "other" : "others"}`
}

/** A run cannot be calculated while a blocker is outstanding. */
export function blockingChecks(checks: ReadinessCheck[]) {
  return checks.filter((c) => c.severity === "blocker" && c.status === "fail")
}

/* ── Variance ────────────────────────────────────────────────────────── */

export const FLAG_LABEL: Record<LineFlag, string> = {
  netChange: "Net pay moved",
  newPayee: "New payee",
  changedPaymentDetails: "Payment details changed",
  missingPaymentDetails: "No payment details",
  zeroOrNegativeNet: "Zero or negative net",
}

export function flagReason(
  flag: LineFlag,
  line: PayrollLine,
  threshold: number
) {
  switch (flag) {
    case "netChange": {
      const change =
        line.previousNet && line.previousNet !== 0
          ? ((line.net - line.previousNet) / line.previousNet) * 100
          : 0
      return `Net pay moved ${change > 0 ? "up" : "down"} ${Math.abs(Math.round(change * 10) / 10)}%, against a ${threshold}% threshold.`
    }
    case "newPayee":
      return "First run this person has appeared in."
    case "changedPaymentDetails":
      return "The account this pay is going to has changed since the last run."
    case "missingPaymentDetails":
      return "There is nowhere to send this pay."
    case "zeroOrNegativeNet":
      return "Deductions take this line to zero or below."
  }
}

/** Every line, with whatever is worth a second look attached to it. */
export function flagLines(
  lines: PayrollLine[],
  previousLines: PayrollLine[],
  threshold: number
): PayrollLine[] {
  // With nothing to compare against, everybody would read as new. The
  // first run a group ever has is not a run full of exceptions.
  const comparable = previousLines.length > 0

  return lines.map((line) => {
    const previous = previousLines.find((p) => p.employeeId === line.employeeId)
    const flags: LineFlag[] = []

    if (!previous && comparable) flags.push("newPayee")
    if (previous) {
      const change =
        previous.net === 0
          ? 0
          : Math.abs(((line.net - previous.net) / previous.net) * 100)
      if (change > threshold) flags.push("netChange")
      if (
        previous.paymentDestinationMasked &&
        line.paymentDestinationMasked &&
        previous.paymentDestinationMasked !== line.paymentDestinationMasked
      )
        flags.push("changedPaymentDetails")
    }

    if (!line.paymentDestinationMasked) flags.push("missingPaymentDetails")
    if (line.net <= 0) flags.push("zeroOrNegativeNet")

    return { ...line, flags }
  })
}

/** Only the lines somebody has to look at before this run goes out. */
export function variance(
  lines: PayrollLine[],
  previousLines: PayrollLine[],
  threshold: number
): PayrollLine[] {
  return flagLines(lines, previousLines, threshold).filter(
    (l) => l.flags.length > 0
  )
}

/* ── Totals ──────────────────────────────────────────────────────────── */

export interface RunTotal {
  currency: Currency
  headcount: number
  gross: number
  deductions: number
  employerContributions: number
  net: number
  employerCost: number
  /** Movement against the run before it, where there was one. */
  delta: {
    gross: number
    deductions: number
    employerContributions: number
    net: number
    employerCost: number
    headcount: number
  } | null
}

/**
 * Totals per currency. Never one number: a run that crosses currencies
 * has no single total, and pretending otherwise is how a figure nobody
 * can reconcile ends up in a board pack.
 */
export function runTotals(
  lines: PayrollLine[],
  previousLines: PayrollLine[] = []
): RunTotal[] {
  const currencies = [...new Set(lines.map((l) => l.currency))].sort()

  return currencies.map((currency) => {
    const mine = lines.filter((l) => l.currency === currency)
    const theirs = previousLines.filter((l) => l.currency === currency)
    const sum = (list: PayrollLine[]) => ({
      headcount: list.length,
      gross: round(list.reduce((n, l) => n + l.gross, 0)),
      deductions: round(list.reduce((n, l) => n + totalDeductions(l), 0)),
      employerContributions: round(
        list.reduce((n, l) => n + totalEmployerContributions(l), 0)
      ),
      net: round(list.reduce((n, l) => n + l.net, 0)),
    })

    const now = sum(mine)
    const before = theirs.length > 0 ? sum(theirs) : null
    const cost = round(now.gross + now.employerContributions)

    return {
      currency,
      ...now,
      employerCost: cost,
      delta: before
        ? {
            gross: round(now.gross - before.gross),
            deductions: round(now.deductions - before.deductions),
            employerContributions: round(
              now.employerContributions - before.employerContributions
            ),
            net: round(now.net - before.net),
            employerCost: round(
              cost - (before.gross + before.employerContributions)
            ),
            headcount: now.headcount - before.headcount,
          }
        : null,
    }
  })
}

/* ── Approval ────────────────────────────────────────────────────────── */

/**
 * Whether this person may sign a run off.
 *
 * The preparer never approves their own run. That is the whole control:
 * one person builds it, another looks at it before anybody is paid.
 */
export function canApproveRun(
  user: { employeeId: string; roles: string[] },
  run: PayrollRun
): { allowed: boolean; reason: string } {
  if (run.status !== "pending_approval")
    return {
      allowed: false,
      reason:
        run.status === "approved" ||
        run.status === "paid" ||
        run.status === "paying"
          ? "This run has already been approved."
          : "This run has not been submitted for approval yet.",
    }
  if (!user.roles.includes("hr_admin"))
    return {
      allowed: false,
      reason: "Only the payroll approver can sign a run off.",
    }
  if (run.preparedBy === user.employeeId)
    return {
      allowed: false,
      reason: "You prepared this run, so somebody else has to approve it.",
    }
  return { allowed: true, reason: "" }
}

/* ── External import ─────────────────────────────────────────────────── */

export interface ImportRow {
  employeeId: string
  gross: string | number
  deductions: string | number
  net: string | number
}

export interface ImportError {
  row: number
  employeeId: string
  problem: string
}

export const EXTERNAL_TEMPLATE_HEADERS = [
  "employee_id",
  "gross",
  "deductions",
  "net",
]

/**
 * Checking a provider's file before it becomes pay.
 *
 * Every refusal names the row and says what is wrong with it, because
 * "invalid file" sends somebody back to a spreadsheet with no idea
 * which line to look at.
 */
export function validateExternalImport(
  rows: ImportRow[],
  expectedEmployees: string[]
): { valid: ExternalResult[]; errors: ImportError[] } {
  const valid: ExternalResult[] = []
  const errors: ImportError[] = []
  const seen = new Set<string>()

  rows.forEach((row, i) => {
    const line = i + 1
    const id = String(row.employeeId ?? "").trim()

    if (!id) {
      errors.push({ row: line, employeeId: "—", problem: "No employee id." })
      return
    }
    if (!expectedEmployees.includes(id)) {
      errors.push({
        row: line,
        employeeId: id,
        problem: "Not in this pay group for this period.",
      })
      return
    }
    if (seen.has(id)) {
      errors.push({ row: line, employeeId: id, problem: "Appears twice." })
      return
    }
    seen.add(id)

    const gross = Number(row.gross)
    const deductions = Number(row.deductions)
    const net = Number(row.net)

    if ([gross, deductions, net].some((n) => Number.isNaN(n))) {
      errors.push({
        row: line,
        employeeId: id,
        problem: "Gross, deductions and net must all be numbers.",
      })
      return
    }
    if (Math.abs(gross - deductions - net) > 0.01) {
      errors.push({
        row: line,
        employeeId: id,
        problem: `Gross less deductions is ${round(gross - deductions)}, but net says ${net}.`,
      })
      return
    }

    valid.push({ runId: "", employeeId: id, gross, deductions, net })
  })

  for (const id of expectedEmployees) {
    if (!seen.has(id))
      errors.push({
        row: 0,
        employeeId: id,
        problem: "In the pay group, but missing from the file.",
      })
  }

  return { valid, errors }
}

/** Days in the period, for anything paid by the day. */
export function periodDays(run: PayrollRun) {
  return datesBetween(run.periodStart, run.periodEnd).length
}
