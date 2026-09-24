import { totalDeductions, totalEmployerContributions } from "./payroll"
import type {
  CountryRulePack,
  FilingDeadline,
  PayGroup,
  Payslip,
  PayrollLine,
  PayrollRun,
  YtdTotals,
} from "./types"

/**
 * A payslip states a run's line. It is not a second copy of it.
 *
 * Everything here is read back out of the run, so a payslip and the
 * payroll register cannot drift apart — and a payslip for March still
 * shows March's rules, because the run it came from still does.
 */

/** Runs whose figures are final enough to state to an employee. */
export const PAYABLE_STATUSES = ["approved", "paying", "paid"] as const

export function isStated(run: PayrollRun) {
  return (PAYABLE_STATUSES as readonly string[]).includes(run.status)
}

export function ytdTotals(lines: PayrollLine[]): YtdTotals {
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    gross: round(lines.reduce((n, l) => n + l.gross, 0)),
    deductions: round(lines.reduce((n, l) => n + totalDeductions(l), 0)),
    employerContributions: round(
      lines.reduce((n, l) => n + totalEmployerContributions(l), 0)
    ),
    net: round(lines.reduce((n, l) => n + l.net, 0)),
  }
}

export function payslipId(runId: string, employeeId: string) {
  return `ps-${runId}-${employeeId}`
}

/**
 * One payslip.
 *
 * `priorLines` are that person's lines from earlier runs in the same
 * year, including this one, which is what makes the year-to-date
 * figures add up to what they have actually been paid.
 */
export function payslipFor(
  run: PayrollRun,
  line: PayrollLine,
  priorLines: PayrollLine[],
  rulePack: CountryRulePack | null,
  compensationVersionId: string | null
): Payslip {
  return {
    id: payslipId(run.id, line.employeeId),
    runId: run.id,
    employeeId: line.employeeId,
    period: run.periodStart.slice(0, 7),
    payDate: run.payDate,
    earnings: line.earnings,
    deductions: line.deductions,
    employerContributions: line.employerContributions,
    gross: line.gross,
    net: line.net,
    currency: line.currency,
    paymentChannel: line.paymentChannel,
    destinationMasked: line.paymentDestinationMasked,
    ytd: ytdTotals(priorLines),
    rulePackVersion: rulePack?.version ?? null,
    compensationVersionId,
  }
}

/* ── Trends ──────────────────────────────────────────────────────────── */

export interface TrendPoint {
  /** yyyy-mm */
  period: string
  currency: string
  gross: number
  deductions: number
  employerContributions: number
  net: number
  headcount: number
}

/**
 * Month by month, per currency. Currencies are kept apart here as
 * everywhere else: a line on a chart that adds cedis to naira is a line
 * that means nothing.
 */
export function trends(
  entries: { run: PayrollRun; lines: PayrollLine[] }[]
): TrendPoint[] {
  const map = new Map<string, TrendPoint>()

  for (const { run, lines } of entries) {
    if (!isStated(run)) continue
    for (const line of lines) {
      const key = `${run.periodStart.slice(0, 7)}|${line.currency}`
      const point = map.get(key) ?? {
        period: run.periodStart.slice(0, 7),
        currency: line.currency,
        gross: 0,
        deductions: 0,
        employerContributions: 0,
        net: 0,
        headcount: 0,
      }
      point.gross += line.gross
      point.deductions += totalDeductions(line)
      point.employerContributions += totalEmployerContributions(line)
      point.net += line.net
      point.headcount += 1
      map.set(key, point)
    }
  }

  return [...map.values()]
    .map((p) => ({
      ...p,
      gross: Math.round(p.gross * 100) / 100,
      deductions: Math.round(p.deductions * 100) / 100,
      employerContributions: Math.round(p.employerContributions * 100) / 100,
      net: Math.round(p.net * 100) / 100,
    }))
    .sort(
      (a, b) =>
        a.period.localeCompare(b.period) || a.currency.localeCompare(b.currency)
    )
}

export interface DepartmentCost {
  department: string
  currency: string
  headcount: number
  gross: number
  employerContributions: number
  total: number
}

/** What each department costs, per currency, for one run. */
export function costByDepartment(
  lines: PayrollLine[],
  departmentOf: (employeeId: string) => string
): DepartmentCost[] {
  const map = new Map<string, DepartmentCost>()

  for (const line of lines) {
    const department = departmentOf(line.employeeId)
    const key = `${department}|${line.currency}`
    const row = map.get(key) ?? {
      department,
      currency: line.currency,
      headcount: 0,
      gross: 0,
      employerContributions: 0,
      total: 0,
    }
    row.headcount += 1
    row.gross += line.gross
    row.employerContributions += totalEmployerContributions(line)
    row.total = row.gross + row.employerContributions
    map.set(key, row)
  }

  return [...map.values()]
    .map((r) => ({
      ...r,
      gross: Math.round(r.gross * 100) / 100,
      employerContributions: Math.round(r.employerContributions * 100) / 100,
      total: Math.round(r.total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)
}

/* ── Filing ──────────────────────────────────────────────────────────── */

export interface DatedDeadline extends FilingDeadline {
  /** The next time this one actually falls due. */
  nextDue: string
  daysAway: number
}

/**
 * Filing dates in the order they will arrive.
 *
 * The rule stays in the authority's own words; the date is worked out
 * from it, because "the 14th of the following month" is not something
 * anyone should have to convert in their head on the 13th.
 */
export function nextFilingDates(
  pack: CountryRulePack,
  fromIso: string
): DatedDeadline[] {
  const [year, month, day] = fromIso.split("-").map(Number)

  return pack.filingDeadlines
    .map((deadline) => {
      let nextDue = fromIso

      if (deadline.dueDayOfMonth !== undefined) {
        const dd = deadline.dueDayOfMonth
        nextDue =
          day < dd
            ? iso(year, month, dd)
            : month === 12
              ? iso(year + 1, 1, dd)
              : iso(year, month + 1, dd)
      } else if (deadline.annualOn) {
        const [m, d] = deadline.annualOn.split("-").map(Number)
        const thisYear = iso(year, m, d)
        nextDue = thisYear >= fromIso ? thisYear : iso(year + 1, m, d)
      }

      return {
        ...deadline,
        nextDue,
        daysAway: Math.round(
          (new Date(`${nextDue}T00:00:00`).getTime() -
            new Date(`${fromIso}T00:00:00`).getTime()) /
            86_400_000
        ),
      }
    })
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue))
}

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** What a group has to file, or who files it for them. */
export function statutoryFor(
  group: PayGroup,
  pack: CountryRulePack | null
): { reports: string[]; external: boolean } {
  if (group.calculationMode !== "native" || !pack)
    return { reports: [], external: true }
  return { reports: pack.statutoryReports, external: false }
}
