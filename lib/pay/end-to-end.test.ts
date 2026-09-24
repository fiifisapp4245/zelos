import { describe, expect, it } from "vitest"

import { EMPLOYEES } from "../data/employees"
import {
  COMPENSATION_VERSIONS,
  COUNTRY_RULE_PACKS,
  PAY_COMPONENTS,
  PAY_GROUPS,
} from "../data/pay"
import {
  EXTERNAL_RESULTS,
  LINE_ADJUSTMENTS,
  ONE_OFF_PAYMENTS,
  PAYROLL_RUNS,
  RUN_DESTINATION_OVERRIDES,
} from "../data/payroll"
import { applyChange, canApprove, currentVersion } from "./derive"
import { canApproveRun, runTotals } from "./payroll"
import { batchesFor, channelOf } from "./payments"
import { payslipFor } from "./payslips"
import { linesForRun, type RunSource } from "./run-lines"
import type { CompensationVersion } from "./types"

/**
 * The whole way through, on the real fixtures: a raise is proposed and
 * approved, the next run picks it up, the run is approved and paid, and
 * the payslip states what the register says.
 *
 * It is one test because the point is that the seams hold. Each step
 * uses exactly the function the screen behind it uses.
 */
describe("a raise, a run, a payment and a payslip", () => {
  const source: RunSource = {
    employees: EMPLOYEES,
    versions: COMPENSATION_VERSIONS,
    payGroups: PAY_GROUPS,
    rulePacks: COUNTRY_RULE_PACKS,
    components: PAY_COMPONENTS,
    oneOffs: ONE_OFF_PAYMENTS,
    adjustments: LINE_ADJUSTMENTS,
    externalResults: EXTERNAL_RESULTS,
    destinationOverrides: RUN_DESTINATION_OVERRIDES,
    runs: PAYROLL_RUNS,
  }

  const hr = { employeeId: "fiifi", roles: ["hr_admin"] }
  const payroll = { employeeId: "maame", roles: ["payroll"] }

  const bulk = {
    id: "cr-eng-uplift",
    kind: "bulk" as const,
    employeeIds: ["kofi", "selorm", "afia"],
    definition: { type: "percent" as const, value: 10 },
    effectiveFrom: "2026-10-01",
    reason: "Market adjustment",
    proposedBy: "adwoa",
    status: "pending" as const,
    decision: null,
    events: [],
  }

  it("refuses the proposer and lets the approver decide", () => {
    expect(
      canApprove({ employeeId: "adwoa", roles: ["hr_admin"] }, bulk).allowed
    ).toBe(false)
    expect(canApprove(hr, bulk).allowed).toBe(true)

    // What approving would write, per person.
    const rows = applyChange(
      bulk.definition,
      bulk.employeeIds,
      COMPENSATION_VERSIONS,
      "2026-09-18"
    )
    expect(rows.find((r) => r.employeeId === "kofi")?.newAmount).toBe(8360)
  })

  it("pays the new figure on the run that follows the effective date", () => {
    const kofiNow = currentVersion(COMPENSATION_VERSIONS, "kofi", "2026-09-18")!
    const raised: CompensationVersion = {
      ...kofiNow,
      id: "cv-kofi-4",
      versionNumber: 4,
      effectiveFrom: "2026-10-01",
      baseAmount: 8360,
      status: "effective",
      supersedesVersionId: kofiNow.id,
      changeRequestId: "cr-eng-uplift",
    }

    const after: RunSource = {
      ...source,
      versions: [
        ...COMPENSATION_VERSIONS.map((v) =>
          v.id === kofiNow.id ? { ...v, status: "superseded" as const } : v
        ),
        raised,
      ],
    }

    const october = PAYROLL_RUNS.find((r) => r.id === "run-gh-2026-10")!
    const line = linesForRun(october, after).lines.find(
      (l) => l.employeeId === "kofi"
    )!

    expect(line.earnings[0].amount).toBe(8360)
    // September's line is what it is compared against.
    expect(line.previousNet).toBeGreaterThan(0)
    expect(line.net).toBeLessThan(line.gross)
  })

  it("only lets somebody other than the preparer approve the run", () => {
    const run = PAYROLL_RUNS.find((r) => r.id === "run-gh-2026-09")!
    expect(canApproveRun(payroll, run).allowed).toBe(false)
    expect(canApproveRun(hr, run).allowed).toBe(true)
  })

  it("batches an approved run by the channel each person is paid on", () => {
    const run = PAYROLL_RUNS.find((r) => r.id === "run-gh-2026-08")!
    const { lines } = linesForRun(run, source)
    const batches = batchesFor(run, lines, EMPLOYEES)

    // Everybody in a batch has somewhere for the money to go.
    for (const batch of batches)
      for (const item of batch.items)
        expect(item.destinationMasked).toBeTruthy()

    // And the one person without an account is in no batch at all.
    const paid = batches.flatMap((b) => b.items.map((i) => i.employeeId))
    expect(paid).not.toContain("efua")
    expect(
      channelOf(
        lines.find((l) => l.employeeId === "efua")!,
        EMPLOYEES.find((e) => e.id === "efua")
      )
    ).toBeNull()
  })

  it("states on the payslip exactly what the register says", () => {
    const run = PAYROLL_RUNS.find((r) => r.id === "run-gh-2026-08")!
    const { lines } = linesForRun(run, source)
    const line = lines.find((l) => l.employeeId === "kofi")!

    const earlier = ["run-gh-2026-06", "run-gh-2026-07"]
      .map((id) => PAYROLL_RUNS.find((r) => r.id === id)!)
      .map((r) =>
        linesForRun(r, source).lines.find((l) => l.employeeId === "kofi")!
      )

    const slip = payslipFor(
      run,
      line,
      [...earlier, line],
      COUNTRY_RULE_PACKS[0],
      currentVersion(COMPENSATION_VERSIONS, "kofi", run.periodEnd)?.id ?? null
    )

    expect(slip.net).toBe(line.net)
    expect(slip.gross).toBe(line.gross)
    expect(slip.ytd.net).toBe(
      Math.round((earlier.reduce((n, l) => n + l.net, 0) + line.net) * 100) /
        100
    )
    expect(slip.rulePackVersion).toBe("2026.1")
    expect(slip.compensationVersionId).toBeTruthy()
  })

  it("keeps every total inside its own currency, all the way through", () => {
    const contractors = PAYROLL_RUNS.find((r) => r.id === "run-ct-2026-09")!
    const { lines } = linesForRun(contractors, source)
    const totals = runTotals(lines)
    expect(totals).toHaveLength(1)
    expect(totals[0].currency).toBe("USD")
    // Contractors invoice: nothing is withheld and nothing is added.
    expect(totals[0].deductions).toBe(0)
    expect(totals[0].employerContributions).toBe(0)
    expect(totals[0].net).toBe(totals[0].gross)
  })
})
