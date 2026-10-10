import { describe, expect, it } from "vitest"

import {
  applyWithFloor,
  dueIn,
  floorFor,
  isSettled,
  outstandingOf,
  type DeductionRequest,
} from "./deduct"
import type { Loan, LoanScheme } from "./types"

const scheme = (over: Partial<LoanScheme> = {}): LoanScheme => ({
  id: "s1",
  name: "Staff loan",
  type: "staff_loan",
  interestMethod: "none",
  annualRatePercent: 0,
  maxAmount: null,
  maxMultipleOfBasic: 3,
  maxTermMonths: 12,
  minimumServiceMonths: 6,
  eligibility: { include: [], exclude: [] },
  maxDeductionPercentOfNet: 100,
  requiresApproval: true,
  approverRole: "hr_admin",
  ...over,
})

const loan = (over: Partial<Loan> = {}): Loan => ({
  id: "l1",
  employeeId: "kofi",
  schemeId: "s1",
  principal: 6_000,
  interest: 0,
  totalRepayable: 6_000,
  currency: "GHS",
  disbursedOn: "2026-09-01",
  disbursementMethod: "bank_transfer",
  firstRepaymentPeriod: "2026-10",
  installmentCount: 6,
  status: "repaying",
  carriedForward: 0,
  events: [],
  reason: "School fees",
  ...over,
})

describe("the floor", () => {
  it("is the flat amount when only that is set", () => {
    expect(
      floorFor({ minimumNet: 800, minimumPercentOfGross: null }, 5_000)
    ).toBe(800)
  })

  it("is the percentage when only that is set", () => {
    expect(
      floorFor({ minimumNet: null, minimumPercentOfGross: 40 }, 5_000)
    ).toBe(2_000)
  })

  it("takes the more protective of the two", () => {
    // Both were written as protections, so the higher one was meant.
    expect(
      floorFor({ minimumNet: 800, minimumPercentOfGross: 40 }, 5_000)
    ).toBe(2_000)
    expect(
      floorFor({ minimumNet: 3_000, minimumPercentOfGross: 40 }, 5_000)
    ).toBe(3_000)
  })

  it("is nothing when neither is set", () => {
    expect(
      floorFor({ minimumNet: null, minimumPercentOfGross: null }, 5_000)
    ).toBe(0)
  })
})

describe("what a loan asks for in a period", () => {
  it("asks for the installment due that month", () => {
    expect(dueIn(loan(), scheme(), "2026-10")).toBe(1_000)
  })

  it("asks for nothing in a month with no installment", () => {
    expect(dueIn(loan(), scheme(), "2026-09")).toBe(0)
  })

  it("asks for nothing while paused", () => {
    expect(dueIn(loan({ status: "paused" }), scheme(), "2026-10")).toBe(0)
  })

  it("asks for nothing once settled", () => {
    expect(dueIn(loan({ status: "settled" }), scheme(), "2026-10")).toBe(0)
  })

  it("asks for nothing once written off", () => {
    expect(dueIn(loan({ status: "written_off" }), scheme(), "2026-10")).toBe(0)
  })

  it("asks for nothing before it is disbursed", () => {
    expect(dueIn(loan({ status: "approved" }), scheme(), "2026-10")).toBe(0)
  })

  it("adds what a previous period could not take", () => {
    expect(dueIn(loan({ carriedForward: 250 }), scheme(), "2026-10")).toBe(
      1_250
    )
  })
})

/* ── The floor in a run ──────────────────────────────────────────────── */

const request = (over: Partial<DeductionRequest> = {}): DeductionRequest => ({
  loan: loan(),
  scheme: scheme(),
  priority: 1,
  outstanding: 6_000,
  period: "2026-10",
  ...over,
})

describe("taking repayments against the floor", () => {
  const noFloor = { minimumNet: null, minimumPercentOfGross: null }

  it("takes the whole installment when there is room", () => {
    const result = applyWithFloor([request()], 4_000, 5_000, noFloor)
    expect(result.deductions[0].taken).toBe(1_000)
    expect(result.deductions[0].shortfall).toBe(0)
    expect(result.net).toBe(3_000)
    expect(result.reduced).toBe(false)
  })

  it("takes only down to the floor, and carries the rest forward", () => {
    // Net before loans 1,200, floor 800: only 400 can be taken of 1,000.
    const result = applyWithFloor([request()], 1_200, 5_000, {
      minimumNet: 800,
      minimumPercentOfGross: null,
    })
    expect(result.deductions[0].scheduled).toBe(1_000)
    expect(result.deductions[0].taken).toBe(400)
    expect(result.deductions[0].shortfall).toBe(600)
    expect(result.net).toBe(800)
    expect(result.reduced).toBe(true)
  })

  it("takes nothing at all rather than going below the floor", () => {
    const result = applyWithFloor([request()], 800, 5_000, {
      minimumNet: 800,
      minimumPercentOfGross: null,
    })
    expect(result.deductions[0].taken).toBe(0)
    expect(result.deductions[0].shortfall).toBe(1_000)
    expect(result.net).toBe(800)
  })

  it("never produces a negative net", () => {
    const big = request({
      loan: loan({
        principal: 50_000,
        totalRepayable: 50_000,
        installmentCount: 1,
      }),
      outstanding: 50_000,
    })
    const result = applyWithFloor([big], 900, 1_200, noFloor)
    expect(result.net).toBeGreaterThanOrEqual(0)
    expect(result.deductions[0].taken).toBe(900)
    expect(result.deductions[0].shortfall).toBe(49_100)
  })

  it("honours a scheme that caps its own share of net pay", () => {
    // 30% of 4,000 is 1,200, which is above the 1,000 asked for.
    const generous = applyWithFloor(
      [request({ scheme: scheme({ maxDeductionPercentOfNet: 30 }) })],
      4_000,
      5_000,
      noFloor
    )
    expect(generous.deductions[0].taken).toBe(1_000)

    // 10% of 4,000 is 400, so the scheme's own limit bites first.
    const tight = applyWithFloor(
      [request({ scheme: scheme({ maxDeductionPercentOfNet: 10 }) })],
      4_000,
      5_000,
      noFloor
    )
    expect(tight.deductions[0].taken).toBe(400)
    expect(tight.deductions[0].shortfall).toBe(600)
  })

  it("never takes more than is still owed", () => {
    const nearlyDone = request({ outstanding: 150 })
    const result = applyWithFloor([nearlyDone], 4_000, 5_000, noFloor)
    expect(result.deductions[0].taken).toBe(150)
    expect(result.deductions[0].balanceAfter).toBe(0)
  })
})

describe("when several loans compete", () => {
  const floor = { minimumNet: 1_000, minimumPercentOfGross: null }

  it("pays them in priority order until the floor stops it", () => {
    const first = request({
      loan: loan({ id: "first" }),
      priority: 1,
      outstanding: 6_000,
    })
    const second = request({
      loan: loan({ id: "second" }),
      priority: 2,
      outstanding: 6_000,
    })
    // Net 2,500, floor 1,000: 1,500 available for two 1,000 installments.
    const result = applyWithFloor([first, second], 2_500, 5_000, floor)

    expect(result.deductions[0].loanId).toBe("first")
    expect(result.deductions[0].taken).toBe(1_000)
    expect(result.deductions[1].loanId).toBe("second")
    expect(result.deductions[1].taken).toBe(500)
    expect(result.deductions[1].shortfall).toBe(500)
    expect(result.net).toBe(1_000)
    expect(result.reduced).toBe(true)
  })

  it("orders by priority however they were handed over", () => {
    const low = request({ loan: loan({ id: "low" }), priority: 9 })
    const high = request({ loan: loan({ id: "high" }), priority: 1 })
    const result = applyWithFloor([low, high], 2_500, 5_000, floor)
    expect(result.deductions.map((d) => d.loanId)).toEqual(["high", "low"])
  })

  it("leaves a paused loan out entirely", () => {
    const paused = request({ loan: loan({ id: "paused", status: "paused" }) })
    const active = request({ loan: loan({ id: "active" }), priority: 2 })
    const result = applyWithFloor([paused, active], 4_000, 5_000, floor)
    expect(result.deductions.map((d) => d.loanId)).toEqual(["active"])
  })
})

describe("closing a loan", () => {
  it("is settled once nothing is outstanding", () => {
    expect(isSettled(loan(), 6_000)).toBe(true)
  })

  it("is not settled a pesewa short", () => {
    expect(isSettled(loan(), 5_999.99)).toBe(false)
  })

  it("never reports a negative balance", () => {
    expect(outstandingOf(loan(), 7_000)).toBe(0)
  })
})
