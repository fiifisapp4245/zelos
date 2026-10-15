import {
  calculateLine,
  remittancesFor,
  taxWorkings,
  type BandUse,
} from "./payroll"
import type {
  ComponentValue,
  CompensationVersion,
  CountryRulePack,
  LineItem,
  PayComponent,
  PayGroup,
  PayrollLine,
} from "./types"

/**
 * One person's pay worked out away from a run: for Test a calculation,
 * and for the impact preview of a new rule pack. Both call previewLine,
 * which calls the engine a run calls, so a preview, a test and the first
 * run under the same rules cannot give three different answers.
 */

/** Regular package only, for one ordinary period under the pack. */
export function previewLine(
  version: CompensationVersion,
  pack: CountryRulePack | null,
  library: PayComponent[]
): PayrollLine {
  const on = pack?.effectiveFrom ?? version.effectiveFrom
  return calculateLine(
    version,
    pack,
    [],
    [],
    { start: on, end: on },
    {
      runId: "preview",
      components: library,
      previousNet: null,
      paymentChannel: "bank_transfer",
      paymentDestinationMasked: null,
    }
  )
}

/** What somebody types into Test a calculation. */
export interface CalculatorInput {
  group: PayGroup
  baseAmount: number
  components: ComponentValue[]
}

/** The typed-in figures as the compensation version a run would read. */
export function calculatorVersion(
  input: CalculatorInput,
  effectiveFrom: string
): CompensationVersion {
  return {
    id: "calculator",
    employeeId: "calculator",
    versionNumber: 1,
    effectiveFrom,
    entityId: input.group.entityId,
    workCountry: input.group.country,
    taxResidency: input.group.country,
    workerType: input.group.contractorGroup ? "contractor" : "employee",
    payGroupId: input.group.id,
    payBasis: "salaried",
    baseAmount: Math.max(0, input.baseAmount),
    currency: input.group.currency,
    frequency: input.group.frequency,
    components: input.components.filter(
      (c) => (c.amount ?? 0) > 0 || (c.rate ?? 0) > 0
    ),
    reason: "",
    proposedBy: "",
    proposedAt: "",
    approvedBy: null,
    approvedAt: null,
    status: "effective",
    supersedesVersionId: null,
    changeRequestId: null,
  }
}

/**
 * A line laid out in the order it is worked out, for somebody checking a
 * payslip: gross, what comes off before tax, what tax is charged on and
 * band by band how, then what comes off after, and what the employer
 * adds. Every figure is read off the engine's own line and workings.
 */
export interface Explanation {
  line: PayrollLine
  earnings: LineItem[]
  gross: number
  /** Taken off before tax; relief may be less than the amount. */
  preTax: (LineItem & { relief: number })[]
  employeeContributions: LineItem[]
  /** Pay the country does not tax: exempt components and caps. */
  untaxed: number
  taxable: number
  bands: BandUse[]
  tax: number
  postTax: LineItem[]
  net: number
  employerContributions: LineItem[]
  employerCost: number
  remittances: { name: string; amount: number }[]
}

export function explain(
  version: CompensationVersion,
  pack: CountryRulePack,
  library: PayComponent[]
): Explanation {
  const line = previewLine(version, pack, library)
  const contributionIds = new Set(
    pack.employeeContributionRules.map((r) => r.id)
  )
  const beforeTax = line.deductions.filter((d) => d.componentId !== "pc-paye")
  const workings = taxWorkings(
    line.earnings,
    beforeTax,
    version.baseAmount,
    pack
  )
  const preTaxItems = beforeTax.filter(
    (d) => pack.componentTreatments[d.componentId]?.preTax
  )
  const limitOf = (id: string) =>
    pack.componentTreatments[id]?.preTax?.upToPercentOfBase
  const employer = line.employerContributions.reduce((n, c) => n + c.amount, 0)

  return {
    line,
    earnings: line.earnings,
    gross: line.gross,
    preTax: preTaxItems.map((d) => {
      const limit = limitOf(d.componentId)
      return {
        ...d,
        relief:
          limit === undefined
            ? d.amount
            : Math.min(d.amount, (version.baseAmount * limit) / 100),
      }
    }),
    employeeContributions: beforeTax.filter((d) =>
      contributionIds.has(d.componentId)
    ),
    untaxed: Math.round((line.gross - workings.taxableEarnings) * 100) / 100,
    taxable: workings.taxable,
    bands: workings.bands,
    tax: workings.tax,
    postTax: beforeTax.filter(
      (d) =>
        !contributionIds.has(d.componentId) &&
        !pack.componentTreatments[d.componentId]?.preTax
    ),
    net: line.net,
    employerContributions: line.employerContributions,
    employerCost: Math.round((line.gross + employer) * 100) / 100,
    remittances: remittancesFor(version.baseAmount, pack).map((r) => ({
      name: r.name,
      amount: r.amount,
    })),
  }
}
