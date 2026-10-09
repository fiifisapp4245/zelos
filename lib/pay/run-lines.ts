import { packFor } from "./rule-packs"
import type { Employee } from "../types"
import { currentVersion } from "./derive"
import { calculateLine, flagLines, lineFromExternal } from "./payroll"
import type {
  CompensationVersion,
  CountryRulePack,
  ExternalResult,
  LineAdjustment,
  OneOffPayment,
  PayComponent,
  PaymentChannel,
  PayGroup,
  PayrollLine,
  PayrollRun,
} from "./types"

/**
 * Turning a run into lines.
 *
 * Lines are never stored. They are worked out from the compensation
 * versions in force at the end of the period, the country's rules, the
 * one-off payments that fall due and whatever was added by hand — which
 * is why approving a run captures nothing but a decision, and why the
 * same period always recalculates to the same answer.
 */

export interface RunSource {
  employees: Employee[]
  versions: CompensationVersion[]
  payGroups: PayGroup[]
  rulePacks: CountryRulePack[]
  components: PayComponent[]
  oneOffs: OneOffPayment[]
  adjustments: LineAdjustment[]
  externalResults: ExternalResult[]
  /**
   * What the destination was at the time of a past run. Payment details
   * change, and a past run has to keep saying where the money went.
   */
  destinationOverrides?: Record<string, Record<string, string>>
  runs: PayrollRun[]
}

/** Where someone's pay is sent, masked. Empty means nowhere yet. */
export function destinationFor(employee: Employee): {
  channel: PaymentChannel | null
  masked: string | null
} {
  const c = employee.compensation
  if (c.paymentMethod === "mobile_money") {
    const number = (c.momoNumber ?? "").trim()
    if (!number || number === "—")
      return { channel: "mobile_money", masked: null }
    return {
      channel: "mobile_money",
      masked: `${c.momoProvider ?? "Mobile money"} · ${mask(number)}`,
    }
  }
  const account = (c.bankAccount ?? "").trim()
  if (!account || account === "—")
    return { channel: "bank_transfer", masked: null }
  return {
    channel: "bank_transfer",
    masked: `${c.bankName ?? "Bank"} · ${mask(account)}`,
  }
}

function mask(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim()
  if (trimmed.length <= 4) return `••• ${trimmed}`
  return `••• ${trimmed.slice(-4)}`
}

/** Who is in a run: the pay group's people, or the named few off-cycle. */
export function membersOf(run: PayrollRun, source: RunSource): Employee[] {
  if (run.employeeIds?.length)
    return source.employees.filter((e) => run.employeeIds!.includes(e.id))

  return source.employees.filter((e) => {
    const version = currentVersion(source.versions, e.id, run.periodEnd)
    return version?.payGroupId === run.payGroupId
  })
}

/** The run immediately before this one for the same pay group. */
export function previousRunOf(run: PayrollRun, runs: PayrollRun[]) {
  return (
    runs
      .filter(
        (r) =>
          r.payGroupId === run.payGroupId &&
          r.kind === "regular" &&
          r.periodEnd < run.periodStart
      )
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0] ?? null
  )
}

function rawLines(run: PayrollRun, source: RunSource): PayrollLine[] {
  const group = source.payGroups.find((g) => g.id === run.payGroupId)
  // The rules as they stood at the end of the period being paid, not as
  // they stand today — so a re-run of a closed month still agrees with
  // the payslips people already have.
  const pack = group
    ? packFor(source.rulePacks, group.country, run.periodEnd)
    : null
  const overrides = source.destinationOverrides?.[run.id] ?? {}

  return membersOf(run, source).flatMap((employee) => {
    const version = currentVersion(source.versions, employee.id, run.periodEnd)
    if (!version) return []

    const destination = destinationFor(employee)
    const masked = overrides[employee.id] ?? destination.masked

    const context = {
      runId: run.id,
      components: source.components,
      previousNet: null,
      paymentChannel: destination.channel,
      paymentDestinationMasked: masked,
    }

    // An external group's numbers come from the provider, not from here.
    if (group?.calculationMode === "external") {
      const result = source.externalResults.find(
        (r) => r.runId === run.id && r.employeeId === employee.id
      )
      if (!result) return []
      return [lineFromExternal(result, version.currency, context)]
    }

    return [
      calculateLine(
        version,
        pack,
        source.oneOffs,
        source.adjustments.filter(
          (a) => a.runId === run.id && a.employeeId === employee.id
        ),
        { start: run.periodStart, end: run.periodEnd },
        context
      ),
    ]
  })
}

/**
 * A run's lines, each carrying what it was last time and anything worth
 * a second look.
 */
export function linesForRun(
  run: PayrollRun,
  source: RunSource
): { lines: PayrollLine[]; previous: PayrollLine[] } {
  const group = source.payGroups.find((g) => g.id === run.payGroupId)
  const before = previousRunOf(run, source.runs)
  const previous = before ? rawLines(before, source) : []

  const withPrevious = rawLines(run, source).map((line) => ({
    ...line,
    previousNet:
      previous.find((p) => p.employeeId === line.employeeId)?.net ?? null,
  }))

  return {
    lines: flagLines(
      withPrevious,
      previous,
      group?.varianceThresholdPercent ?? 10
    ),
    previous,
  }
}
