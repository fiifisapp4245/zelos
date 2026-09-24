import { describe, expect, it } from "vitest"

import {
  blockingChecks,
  calculateLine,
  canApproveRun,
  flagLines,
  lineFromExternal,
  marginalRate,
  readiness,
  runTotals,
  taxOn,
  totalDeductions,
  validateExternalImport,
  variance,
  type LineContext,
  type ReadinessSource,
} from "./payroll"
import type {
  CompensationVersion,
  CountryRulePack,
  OneOffPayment,
  PayComponent,
  PayrollLine,
  PayrollRun,
} from "./types"

const PACK: CountryRulePack = {
  country: "Ghana",
  version: "test",
  effectiveFrom: "2026-01-01",
  componentTreatments: {
    "pc-base": { taxable: true, socialSecurity: true },
    "pc-transport": { taxable: false, socialSecurity: false, cap: 300 },
  },
  employeeContributionRules: [
    {
      id: "ssnit-employee",
      name: "SSNIT (employee)",
      percentOfBase: 5.5,
      note: "",
    },
  ],
  employerContributionRules: [
    {
      id: "ssnit-employer",
      name: "SSNIT (employer)",
      percentOfBase: 13,
      note: "",
    },
  ],
  taxBands: [
    { upTo: 500, ratePercent: 0 },
    { upTo: 2000, ratePercent: 10 },
    { upTo: null, ratePercent: 25 },
  ],
  statutoryReports: [],
  filingDeadlines: [],
  updates: [],
}

const COMPONENTS: PayComponent[] = [
  {
    id: "pc-transport",
    name: "Transport allowance",
    category: "allowance",
    calculation: "fixed",
    recurrence: "recurring",
  },
  {
    id: "pc-loan",
    name: "Staff loan repayment",
    category: "deduction",
    calculation: "fixed",
    recurrence: "recurring",
  },
  {
    id: "pc-bonus",
    name: "Performance bonus",
    category: "earning",
    calculation: "fixed",
    recurrence: "one_off",
  },
]

const version = (
  over: Partial<CompensationVersion> = {}
): CompensationVersion => ({
  id: "cv-1",
  employeeId: "kofi",
  versionNumber: 1,
  effectiveFrom: "2026-01-01",
  entityId: "ent-gh",
  workCountry: "Ghana",
  taxResidency: "Ghana",
  workerType: "employee",
  payGroupId: "pg-gh-monthly",
  payBasis: "salaried",
  baseAmount: 8000,
  currency: "GHS",
  frequency: "monthly",
  components: [],
  reason: "Fixture",
  proposedBy: "fiifi",
  proposedAt: "2026-01-01T09:00:00",
  approvedBy: "esi",
  approvedAt: "2026-01-01T09:00:00",
  status: "effective",
  supersedesVersionId: null,
  changeRequestId: null,
  ...over,
})

const context = (over: Partial<LineContext> = {}): LineContext => ({
  runId: "run-1",
  components: COMPONENTS,
  previousNet: null,
  paymentChannel: "mobile_money",
  paymentDestinationMasked: "024 ••• 6652",
  ...over,
})

const PERIOD = { start: "2026-09-01", end: "2026-09-30" }

const oneOff = (over: Partial<OneOffPayment> = {}): OneOffPayment => ({
  id: "oo-1",
  employeeId: "kofi",
  componentId: "pc-bonus",
  amount: 1000,
  basis: "gross",
  payFromDate: "2026-09-01",
  recurrence: "once",
  status: "included",
  includedInRunId: "run-1",
  events: [],
  ...over,
})

const line = (over: Partial<PayrollLine> = {}): PayrollLine => ({
  runId: "run-1",
  employeeId: "kofi",
  earnings: [],
  deductions: [],
  employerContributions: [],
  adjustments: [],
  gross: 8000,
  net: 6500,
  previousNet: 6500,
  currency: "GHS",
  paymentChannel: "mobile_money",
  paymentDestinationMasked: "024 ••• 6652",
  flags: [],
  ...over,
})

describe("tax", () => {
  it("works through the bands in order", () => {
    // 500 free, 2000 at 10%, the rest at 25%.
    expect(taxOn(500, PACK)).toBe(0)
    expect(taxOn(2500, PACK)).toBe(200)
    expect(taxOn(3500, PACK)).toBe(450)
  })

  it("knows what the next cedi would cost", () => {
    expect(marginalRate(100, PACK)).toBe(0)
    expect(marginalRate(1000, PACK)).toBe(0.1)
    expect(marginalRate(9000, PACK)).toBe(0.25)
  })
})

describe("calculateLine", () => {
  it("builds gross from base and the recurring package", () => {
    const l = calculateLine(
      version({ components: [{ componentId: "pc-transport", amount: 300 }] }),
      PACK,
      [],
      [],
      PERIOD,
      context()
    )
    expect(l.gross).toBe(8300)
    expect(l.employerContributions[0].amount).toBe(1040)
  })

  it("leaves an untaxed allowance out of taxable pay", () => {
    const withAllowance = calculateLine(
      version({ components: [{ componentId: "pc-transport", amount: 300 }] }),
      PACK,
      [],
      [],
      PERIOD,
      context()
    )
    const without = calculateLine(version(), PACK, [], [], PERIOD, context())
    const paye = (l: PayrollLine) =>
      l.deductions.find((d) => d.componentId === "pc-paye")!.amount
    // The transport allowance is inside its cap, so no more tax is due.
    expect(paye(withAllowance)).toBe(paye(without))
    expect(withAllowance.net).toBe(without.net + 300)
  })

  it("puts a gross one-off straight into pay", () => {
    const l = calculateLine(version(), PACK, [oneOff()], [], PERIOD, context())
    expect(l.gross).toBe(9000)
  })

  it("grosses a net-basis payment up, so the person gets what they were told", () => {
    const base = calculateLine(version(), PACK, [], [], PERIOD, context())
    const withNet = calculateLine(
      version(),
      PACK,
      [oneOff({ basis: "net", amount: 1000 })],
      [],
      PERIOD,
      context()
    )
    expect(withNet.net - base.net).toBeCloseTo(1000, 0)
    expect(withNet.gross).toBeGreaterThan(base.gross + 1000)
  })

  it("does not pay a one-off dated after the period", () => {
    const l = calculateLine(
      version(),
      PACK,
      [oneOff({ payFromDate: "2026-11-01" })],
      [],
      PERIOD,
      context()
    )
    expect(l.gross).toBe(8000)
  })

  it("ignores a cancelled one-off", () => {
    const l = calculateLine(
      version(),
      PACK,
      [oneOff({ status: "cancelled" })],
      [],
      PERIOD,
      context()
    )
    expect(l.gross).toBe(8000)
  })

  it("takes an adjustment off the line and keeps it attached", () => {
    const adjustment = {
      id: "adj-1",
      runId: "run-1",
      employeeId: "kofi",
      componentId: "pc-loan",
      amount: 500,
      direction: "deduct" as const,
      note: "Salary advance recovery",
      by: "maame",
      at: "2026-09-16T10:00:00",
    }
    const l = calculateLine(
      version(),
      PACK,
      [],
      [adjustment],
      PERIOD,
      context()
    )
    expect(l.deductions.some((d) => d.amount === 500)).toBe(true)
    expect(l.adjustments).toHaveLength(1)
    expect(l.adjustments[0].note).toBe("Salary advance recovery")
  })

  it("withholds nothing from a contractor", () => {
    const l = calculateLine(
      version({ workerType: "contractor", currency: "USD", baseAmount: 4200 }),
      PACK,
      [],
      [],
      PERIOD,
      context()
    )
    expect(l.deductions).toHaveLength(0)
    expect(l.employerContributions).toHaveLength(0)
    expect(l.net).toBe(4200)
  })

  it("takes an uploaded result at its word", () => {
    const l = lineFromExternal(
      {
        runId: "run-ng",
        employeeId: "abena",
        gross: 1_150_000,
        deductions: 250_000,
        net: 900_000,
      },
      "NGN",
      context({ runId: "run-ng" })
    )
    expect(l.net).toBe(900_000)
    expect(totalDeductions(l)).toBe(250_000)
  })
})

describe("variance", () => {
  const previous = [line({ employeeId: "kofi", net: 6500 })]

  it("flags a net move past the threshold, and leaves a small one alone", () => {
    expect(flagLines([line({ net: 6600 })], previous, 10)[0].flags).toEqual([])
    expect(flagLines([line({ net: 8000 })], previous, 10)[0].flags).toContain(
      "netChange"
    )
  })

  it("flags somebody who was not in the last run", () => {
    expect(
      flagLines([line({ employeeId: "harriet" })], previous, 10)[0].flags
    ).toContain("newPayee")
  })

  it("flags a changed and a missing destination", () => {
    expect(
      flagLines(
        [line({ paymentDestinationMasked: "054 ••• 7734" })],
        previous,
        10
      )[0].flags
    ).toContain("changedPaymentDetails")
    expect(
      flagLines([line({ paymentDestinationMasked: null })], previous, 10)[0]
        .flags
    ).toContain("missingPaymentDetails")
  })

  it("flags a line that nets to nothing", () => {
    expect(flagLines([line({ net: -200 })], previous, 10)[0].flags).toContain(
      "zeroOrNegativeNet"
    )
  })

  it("returns only the lines worth looking at", () => {
    const flagged = variance(
      [line({ net: 6550 }), line({ employeeId: "ama", net: 20000 })],
      previous,
      10
    )
    expect(flagged.map((l) => l.employeeId)).toEqual(["ama"])
  })
})

describe("runTotals", () => {
  const lines = [
    line({
      employeeId: "kofi",
      gross: 8000,
      net: 6500,
      deductions: [{ componentId: "d", label: "d", amount: 1500 }],
      employerContributions: [{ componentId: "e", label: "e", amount: 1040 }],
    }),
    line({
      employeeId: "harriet",
      currency: "USD",
      gross: 5800,
      net: 5800,
    }),
  ]

  it("keeps currencies apart", () => {
    const totals = runTotals(lines)
    expect(totals.map((t) => t.currency)).toEqual(["GHS", "USD"])
    expect(totals[0].employerCost).toBe(9040)
    expect(totals[1].net).toBe(5800)
  })

  it("compares against the run before, per currency", () => {
    const totals = runTotals(lines, [
      line({
        employeeId: "kofi",
        gross: 7000,
        net: 6000,
        deductions: [],
        employerContributions: [],
      }),
    ])
    expect(totals[0].delta?.net).toBe(500)
    expect(totals[0].delta?.headcount).toBe(0)
    // Nothing to compare the dollars with, so no delta is claimed.
    expect(totals[1].delta).toBeNull()
  })
})

describe("canApproveRun", () => {
  const run: PayrollRun = {
    id: "run-1",
    payGroupId: "pg-gh-monthly",
    kind: "regular",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    payDate: "2026-09-28",
    status: "pending_approval",
    preparedBy: "maame",
    submittedAt: "2026-09-17T10:00:00",
    decision: null,
    fxRates: [],
    events: [],
  }

  it("lets the approver sign off somebody else's run", () => {
    expect(
      canApproveRun({ employeeId: "fiifi", roles: ["hr_admin"] }, run).allowed
    ).toBe(true)
  })

  it("refuses the person who prepared it", () => {
    const check = canApproveRun(
      { employeeId: "maame", roles: ["hr_admin"] },
      run
    )
    expect(check.allowed).toBe(false)
    expect(check.reason).toContain("prepared")
  })

  it("refuses a role that is not the approver", () => {
    expect(
      canApproveRun({ employeeId: "maame", roles: ["payroll"] }, run).allowed
    ).toBe(false)
  })

  it("refuses a run that is not waiting on a decision", () => {
    expect(
      canApproveRun(
        { employeeId: "fiifi", roles: ["hr_admin"] },
        { ...run, status: "approved" }
      ).reason
    ).toContain("already been approved")
  })
})

describe("readiness", () => {
  const run: PayrollRun = {
    id: "run-1",
    payGroupId: "pg-gh-monthly",
    kind: "regular",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    payDate: "2026-09-28",
    status: "calculated",
    preparedBy: "maame",
    submittedAt: null,
    decision: null,
    fxRates: [],
    events: [],
  }

  const clean: ReadinessSource = {
    payPeriods: [
      {
        id: "pp-2026-09",
        start: "2026-09-01",
        end: "2026-09-30",
        status: "readyForPayroll",
      },
    ],
    openReconciliations: 0,
    pendingPaymentChanges: [],
    missingDestinations: [],
    missingCompensation: [],
    acknowledgements: [],
  }

  it("passes everything when the period is settled", () => {
    const checks = readiness(run, clean)
    expect(checks.every((c) => c.status === "pass")).toBe(true)
    expect(blockingChecks(checks)).toHaveLength(0)
  })

  it("blocks calculation while attendance is still open", () => {
    const checks = readiness(run, { ...clean, payPeriods: [] })
    expect(blockingChecks(checks).map((c) => c.id)).toEqual([
      "attendance-closed",
    ])
  })

  it("links at the period in question rather than the module", () => {
    const checks = readiness(run, clean)
    expect(checks.find((c) => c.id === "attendance-closed")?.link).toBe(
      "/timesheets?period=pp-2026-09"
    )
  })

  it("links at the one person with no account, when there is only one", () => {
    const checks = readiness(run, { ...clean, missingDestinations: ["efua"] })
    expect(checks.find((c) => c.id === "payment-details")?.link).toBe(
      "/employees/efua"
    )
  })

  it("warns rather than blocks on an unexplained day", () => {
    const checks = readiness(run, { ...clean, openReconciliations: 3 })
    const leave = checks.find((c) => c.id === "leave-reconciled")!
    expect(leave.status).toBe("fail")
    expect(leave.severity).toBe("warning")
    expect(blockingChecks(checks)).toHaveLength(0)
  })

  it("keeps an acknowledgement on the check rather than clearing it", () => {
    const checks = readiness(run, {
      ...clean,
      openReconciliations: 3,
      acknowledgements: [
        {
          checkId: "leave-reconciled",
          by: "maame",
          reason: "Two of them are already with the manager.",
          at: "2026-09-17T09:00:00",
        },
      ],
    })
    const leave = checks.find((c) => c.id === "leave-reconciled")!
    expect(leave.status).toBe("acknowledged")
    expect(leave.acknowledgement?.reason).toContain("manager")
  })
})

describe("validateExternalImport", () => {
  const expected = ["abena", "kwesi", "akos"]

  it("accepts a file that balances", () => {
    const { valid, errors } = validateExternalImport(
      [
        { employeeId: "abena", gross: 1000, deductions: 200, net: 800 },
        { employeeId: "kwesi", gross: 2000, deductions: 500, net: 1500 },
        { employeeId: "akos", gross: 900, deductions: 100, net: 800 },
      ],
      expected
    )
    expect(errors).toHaveLength(0)
    expect(valid).toHaveLength(3)
  })

  it("names the row and the problem for each refusal", () => {
    const { errors } = validateExternalImport(
      [
        { employeeId: "abena", gross: 1000, deductions: 200, net: 700 },
        { employeeId: "abena", gross: 1000, deductions: 200, net: 800 },
        { employeeId: "nobody", gross: 1, deductions: 0, net: 1 },
        { employeeId: "kwesi", gross: "x", deductions: 0, net: 0 },
      ],
      expected
    )
    expect(errors[0].problem).toContain("net says")
    expect(errors[1].problem).toContain("twice")
    expect(errors[2].problem).toContain("Not in this pay group")
    expect(errors[3].problem).toContain("numbers")
    // And the person who never appeared at all.
    expect(errors.some((e) => e.employeeId === "akos")).toBe(true)
  })
})
