import { describe, expect, it } from "vitest"

import {
  addMonths,
  annuityPayment,
  ceilingFor,
  eligibilityProblems,
  interestFor,
  scheduleFor,
  termsFor,
} from "./schedule"
import type { LoanScheme } from "./types"

const sum = (ns: number[]) => Math.round(ns.reduce((a, b) => a + b, 0) * 100) / 100

describe("counting months", () => {
  it("moves within a year", () => {
    expect(addMonths("2026-01", 3)).toBe("2026-04")
  })

  it("rolls over a year end", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02")
  })

  it("stays put for zero", () => {
    expect(addMonths("2026-09", 0)).toBe("2026-09")
  })

  it("rolls over several years", () => {
    expect(addMonths("2026-06", 30)).toBe("2028-12")
  })
})

describe("interest-free loans", () => {
  // GHS 6,000 over 6 months.
  const loan = {
    principal: 6_000,
    interest: 0,
    totalRepayable: 6_000,
    installmentCount: 6,
    firstRepaymentPeriod: "2026-10",
  }

  it("charges nothing", () => {
    expect(interestFor(6_000, "none", 0, 6)).toBe(0)
  })

  it("splits evenly into 1,000 a month", () => {
    const schedule = scheduleFor(loan, "none", 0)
    expect(schedule).toHaveLength(6)
    expect(schedule.every((i) => i.total === 1_000)).toBe(true)
  })

  it("runs from the first repayment period", () => {
    const schedule = scheduleFor(loan, "none", 0)
    expect(schedule[0].period).toBe("2026-10")
    expect(schedule.at(-1)!.period).toBe("2027-03")
  })

  it("closes the balance exactly", () => {
    const schedule = scheduleFor(loan, "none", 0)
    expect(schedule.at(-1)!.balanceAfter).toBe(0)
    expect(sum(schedule.map((i) => i.total))).toBe(6_000)
  })

  it("lets the last installment absorb the rounding", () => {
    // 1,000 over 3 months divides as 333.33, 333.33, 333.34.
    const awkward = scheduleFor(
      {
        principal: 1_000,
        interest: 0,
        totalRepayable: 1_000,
        installmentCount: 3,
        firstRepaymentPeriod: "2026-10",
      },
      "none",
      0
    )
    expect(awkward.map((i) => i.total)).toEqual([333.33, 333.33, 333.34])
    expect(sum(awkward.map((i) => i.total))).toBe(1_000)
    expect(awkward.at(-1)!.balanceAfter).toBe(0)
  })

  it("is a salary advance when it is one installment", () => {
    const advance = scheduleFor(
      {
        principal: 1_500,
        interest: 0,
        totalRepayable: 1_500,
        installmentCount: 1,
        firstRepaymentPeriod: "2026-10",
      },
      "none",
      0
    )
    expect(advance).toHaveLength(1)
    expect(advance[0].total).toBe(1_500)
    expect(advance[0].balanceAfter).toBe(0)
  })
})

describe("flat interest", () => {
  // GHS 12,000 at 10% a year for 12 months: interest 1,200.
  it("charges on the whole principal for the whole term", () => {
    expect(interestFor(12_000, "flat", 10, 12)).toBe(1_200)
  })

  it("halves for half the term", () => {
    expect(interestFor(12_000, "flat", 10, 6)).toBe(600)
  })

  it("adds the interest to what must be repaid", () => {
    const terms = termsFor(
      12_000,
      { interestMethod: "flat", annualRatePercent: 10 },
      12
    )
    expect(terms).toEqual({ interest: 1_200, totalRepayable: 13_200 })
  })

  it("spreads 13,200 over 12 months as 1,100 each", () => {
    const schedule = scheduleFor(
      {
        principal: 12_000,
        interest: 1_200,
        totalRepayable: 13_200,
        installmentCount: 12,
        firstRepaymentPeriod: "2026-10",
      },
      "flat",
      10
    )
    expect(schedule.every((i) => i.total === 1_100)).toBe(true)
    expect(schedule.every((i) => i.interest === 100)).toBe(true)
    expect(schedule.every((i) => i.principal === 1_000)).toBe(true)
    expect(sum(schedule.map((i) => i.total))).toBe(13_200)
  })

  it("charges nothing when the rate is zero, whatever the method", () => {
    expect(interestFor(12_000, "flat", 0, 12)).toBe(0)
  })
})

describe("reducing balance", () => {
  // GHS 10,000 at 12% a year over 12 months. Monthly rate 1%.
  const principal = 10_000
  const rate = 12

  it("works out the level payment", () => {
    // 10,000 × 0.01 / (1 − 1.01^−12) = 888.49
    expect(annuityPayment(principal, 0.01, 12)).toBeCloseTo(888.49, 2)
  })

  it("costs less than flat interest at the same rate", () => {
    const reducing = interestFor(principal, "reducing_balance", rate, 12)
    const flat = interestFor(principal, "flat", rate, 12)
    expect(reducing).toBeLessThan(flat)
    // Roughly 661.85 against 1,200.
    expect(reducing).toBeCloseTo(661.85, 1)
  })

  it("charges falling interest as the balance comes down", () => {
    const { interest, totalRepayable } = termsFor(
      principal,
      { interestMethod: "reducing_balance", annualRatePercent: rate },
      12
    )
    const schedule = scheduleFor(
      {
        principal,
        interest,
        totalRepayable,
        installmentCount: 12,
        firstRepaymentPeriod: "2026-10",
      },
      "reducing_balance",
      rate
    )
    // First month's interest is 1% of the full 10,000.
    expect(schedule[0].interest).toBe(100)
    expect(schedule[0].interest).toBeGreaterThan(schedule[5].interest)
    expect(schedule[5].interest).toBeGreaterThan(schedule[11].interest)
  })

  it("clears the balance to zero on the final payment", () => {
    const { interest, totalRepayable } = termsFor(
      principal,
      { interestMethod: "reducing_balance", annualRatePercent: rate },
      12
    )
    const schedule = scheduleFor(
      {
        principal,
        interest,
        totalRepayable,
        installmentCount: 12,
        firstRepaymentPeriod: "2026-10",
      },
      "reducing_balance",
      rate
    )
    expect(schedule.at(-1)!.balanceAfter).toBe(0)
    expect(sum(schedule.map((i) => i.principal))).toBe(principal)
  })

  it("behaves like no interest when the rate is zero", () => {
    const schedule = scheduleFor(
      {
        principal: 6_000,
        interest: 0,
        totalRepayable: 6_000,
        installmentCount: 6,
        firstRepaymentPeriod: "2026-10",
      },
      "reducing_balance",
      0
    )
    expect(schedule.every((i) => i.total === 1_000)).toBe(true)
  })
})

describe("what a scheme will lend", () => {
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
    maxDeductionPercentOfNet: 30,
    requiresApproval: true,
    approverRole: "hr_admin",
    ...over,
  })

  it("lends three months of basic", () => {
    expect(ceilingFor(scheme(), 4_000)).toBe(12_000)
  })

  it("takes the tighter limit when both are set", () => {
    expect(ceilingFor(scheme({ maxAmount: 10_000 }), 4_000)).toBe(10_000)
  })

  it("has no ceiling when neither is set", () => {
    expect(
      ceilingFor(scheme({ maxAmount: null, maxMultipleOfBasic: null }), 4_000)
    ).toBeNull()
  })

  it("accepts a request within every limit", () => {
    expect(
      eligibilityProblems(
        scheme(),
        { amount: 10_000, months: 10, serviceMonths: 24 },
        4_000
      )
    ).toEqual([])
  })

  it("says what the ceiling is when the amount is too high", () => {
    const problems = eligibilityProblems(
      scheme(),
      { amount: 20_000, months: 10, serviceMonths: 24 },
      4_000
    )
    expect(problems).toHaveLength(1)
    expect(problems[0].field).toBe("amount")
    expect(problems[0].message).toContain("12000")
  })

  it("says what the term limit is", () => {
    const problems = eligibilityProblems(
      scheme(),
      { amount: 5_000, months: 24, serviceMonths: 24 },
      4_000
    )
    expect(problems[0].field).toBe("term")
    expect(problems[0].message).toContain("12 months")
  })

  it("says how much service is needed and how much there is", () => {
    const problems = eligibilityProblems(
      scheme(),
      { amount: 5_000, months: 6, serviceMonths: 2 },
      4_000
    )
    expect(problems[0].field).toBe("service")
    expect(problems[0].message).toContain("6 months of service")
    expect(problems[0].message).toContain("has 2")
  })

  it("reports every problem at once rather than one at a time", () => {
    const problems = eligibilityProblems(
      scheme(),
      { amount: 99_000, months: 99, serviceMonths: 0 },
      4_000
    )
    expect(problems.map((p) => p.field)).toEqual(["amount", "term", "service"])
  })
})
