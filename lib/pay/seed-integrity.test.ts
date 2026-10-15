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
import { fullName } from "../format"
import { calculateLine, lineActivity } from "./payroll"
import { packFor } from "./rule-packs"
import { linesForRun, type RunSource } from "./run-lines"
import type {
  CompensationVersion,
  LineAdjustment,
  OneOffPayment,
} from "./types"

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

describe("a run line carries only its own person's items", () => {
  it("holds for every line of every seeded run", () => {
    for (const run of PAYROLL_RUNS)
      for (const line of linesForRun(run, source).lines)
        for (const a of line.adjustments)
          expect({ line: line.employeeId, adjustment: a.employeeId }).toEqual({
            line: line.employeeId,
            adjustment: line.employeeId,
          })
  })

  it("refuses another person's adjustment or one-off, whoever passes it in", () => {
    const kofi = COMPENSATION_VERSIONS.find(
      (v) => v.employeeId === "kofi" && v.status === "effective"
    ) as CompensationVersion
    const theirs: LineAdjustment = {
      ...LINE_ADJUSTMENTS[0],
      employeeId: "kwabena",
    }
    const theirOneOff: OneOffPayment = {
      ...ONE_OFF_PAYMENTS[0],
      employeeId: "kwabena",
    }
    const period = { start: "2026-09-01", end: "2026-09-30" }
    const context = {
      runId: "run-gh-2026-09",
      components: PAY_COMPONENTS,
      previousNet: null,
      paymentChannel: "bank_transfer" as const,
      paymentDestinationMasked: null,
    }
    const pack = packFor(COUNTRY_RULE_PACKS, "Ghana", "2026-09-30")
    const own = calculateLine(kofi, pack, [], [], period, context)
    const offered = calculateLine(
      kofi,
      pack,
      [theirOneOff],
      [theirs],
      period,
      context
    )
    expect(offered.adjustments).toEqual([])
    expect(offered).toEqual(own)
  })

  it("never shows one person's line another person's activity", () => {
    for (const run of PAYROLL_RUNS)
      for (const employee of EMPLOYEES) {
        const others = EMPLOYEES.filter((e) => e.id !== employee.id).map(
          fullName
        )
        for (const e of lineActivity(run, employee.id)) {
          expect([undefined, employee.id]).toContain(e.employeeId)
          for (const name of others) expect(e.note ?? "").not.toContain(name)
        }
      }
  })

  it("keeps Kwabena's salary advance off Kofi's line", () => {
    const run = PAYROLL_RUNS.find((r) => r.id === "run-gh-2026-09")!
    const kofi = lineActivity(run, "kofi")
    expect(kofi.some((e) => (e.note ?? "").includes("Kwabena"))).toBe(false)
    expect(
      lineActivity(run, "kwabena").some((e) =>
        (e.note ?? "").includes("Salary advance")
      )
    ).toBe(true)
  })
})

describe("a one-off is filed under the component it describes", () => {
  // Words that name a component specifically. A note using one of them
  // and sitting under a different component was filed wrongly — and the
  // component decides the tax, so filing is not cosmetic.
  const NAMED_BY: Record<string, string[]> = {
    "pc-on-call": ["on-call", "on call", "call-out"],
    "pc-long-service": ["service award", "long service", "years' service"],
    "pc-transport": ["transport"],
    "pc-housing": ["housing", "rent"],
    "pc-fuel-card": ["fuel"],
    "pc-mobile-data": ["mobile data", "airtime"],
    "pc-responsibility": ["responsibility"],
  }

  it("holds for every seeded one-off", () => {
    for (const o of ONE_OFF_PAYMENTS) {
      const note = (o.note ?? "").toLowerCase()
      for (const [componentId, words] of Object.entries(NAMED_BY))
        if (words.some((w) => note.includes(w)))
          expect({ id: o.id, componentId: o.componentId }).toEqual({
            id: o.id,
            componentId,
          })
    }
  })

  it("names only components the library holds", () => {
    const library = new Set(PAY_COMPONENTS.map((c) => c.id))
    for (const o of ONE_OFF_PAYMENTS) expect(library).toContain(o.componentId)
  })

  it("taxes an on-call payment in full, without transport's exemption", () => {
    const ghana = packFor(COUNTRY_RULE_PACKS, "Ghana", "2026-09-30")!
    const selorm = COMPENSATION_VERSIONS.find(
      (v) => v.employeeId === "selorm" && v.status === "effective"
    ) as CompensationVersion
    const paye = (componentId: string) =>
      calculateLine(
        { ...selorm, currency: "GHS" },
        ghana,
        [
          {
            ...ONE_OFF_PAYMENTS.find((o) => o.id === "oo-003")!,
            componentId,
            amount: 300,
            payFromDate: "2026-09-01",
            basis: "gross",
            status: "included",
          },
        ],
        [],
        { start: "2026-09-01", end: "2026-09-30" },
        {
          runId: "t",
          components: PAY_COMPONENTS,
          previousNet: null,
          paymentChannel: "bank_transfer",
          paymentDestinationMasked: null,
        }
      ).deductions.find((d) => d.componentId === "pc-paye")!.amount
    expect(paye("pc-on-call")).toBeGreaterThan(paye("pc-transport"))
  })
})
