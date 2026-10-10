import { describe, expect, it } from "vitest"

import { compile, describe as describeRule } from "./compile"
import { evaluate } from "./expression"
import {
  apply,
  circularReferences,
  conflicts,
  inForce,
  rulesFor,
  targets,
  type TargetSubject,
} from "./evaluate"
import type { PayRule, RuleContext, RuleParams } from "./types"
import type { Employee } from "../types"

const context: RuleContext = {
  basic_salary: 10_000,
  gross_pay: 12_500,
  hourly_rate: 57.5,
  daily_rate: 460,
  days_worked: 31,
  days_in_period: 31,
  overtime_hours_weekday: 4,
  overtime_hours_weekend: 6,
  overtime_hours_holiday: 0,
  years_of_service: 7,
  age: 34,
}

function rule(params: RuleParams, over: Partial<PayRule> = {}): PayRule {
  return {
    id: "r1",
    componentId: "pc-housing",
    name: "Housing allowance",
    params,
    targets: { include: [], exclude: [] },
    prorate: false,
    priority: 10,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    version: 1,
    status: "active",
    approvedBy: "fiifi",
    reason: "Policy",
    ...over,
  }
}

const value = (params: RuleParams) => evaluate(compile(params), context)

describe("each template, with the numbers worked out", () => {
  it("fixed pays the same every period", () => {
    expect(value({ template: "fixed", amount: 300 })).toBe(300)
  })

  it("percent: 15% of a 10,000 basic is 1,500", () => {
    expect(
      value({ template: "percent", percent: 15, of: "basic_salary" })
    ).toBe(1_500)
  })

  it("capped percent pays the percentage when it is under the cap", () => {
    expect(
      value({
        template: "capped_percent",
        percent: 15,
        of: "basic_salary",
        max: 2_000,
        min: null,
      })
    ).toBe(1_500)
  })

  it("capped percent pays the cap when the percentage is over it", () => {
    // 25% of 10,000 is 2,500, so the GHS 2,000 ceiling bites.
    expect(
      value({
        template: "capped_percent",
        percent: 25,
        of: "basic_salary",
        max: 2_000,
        min: null,
      })
    ).toBe(2_000)
  })

  it("capped percent lifts a small result to the floor", () => {
    expect(
      value({
        template: "capped_percent",
        percent: 1,
        of: "basic_salary",
        max: null,
        min: 250,
      })
    ).toBe(250)
  })

  it("rate × quantity: double time on 6 weekend hours at 57.50", () => {
    expect(
      value({
        template: "rate_x_quantity",
        rate: 57.5,
        multiplier: 2,
        quantity: "overtime_hours_weekend",
      })
    ).toBe(690)
  })

  it("tiered pays the band the value falls in", () => {
    const longService: RuleParams = {
      template: "tiered",
      of: "years_of_service",
      basis: "basic_salary",
      bands: [
        { from: 0, percent: 0 },
        { from: 5, percent: 5 },
        { from: 10, percent: 10 },
      ],
    }
    // Seven years: the 5% band, so 500.
    expect(value(longService)).toBe(500)
  })

  it("tiered pays the top band once it is reached", () => {
    const veteran = { ...context, years_of_service: 12 }
    const params: RuleParams = {
      template: "tiered",
      of: "years_of_service",
      basis: "basic_salary",
      bands: [
        { from: 0, percent: 0 },
        { from: 5, percent: 5 },
        { from: 10, percent: 10 },
      ],
    }
    expect(evaluate(compile(params), veteran)).toBe(1_000)
  })

  it("tiered reads bands in order however they were written", () => {
    const params: RuleParams = {
      template: "tiered",
      of: "years_of_service",
      basis: "basic_salary",
      bands: [
        { from: 10, percent: 10 },
        { from: 0, percent: 0 },
        { from: 5, percent: 5 },
      ],
    }
    expect(evaluate(compile(params), context)).toBe(500)
  })

  it("tiered supports flat amounts as well as percentages", () => {
    const params: RuleParams = {
      template: "tiered",
      of: "years_of_service",
      basis: "basic_salary",
      bands: [
        { from: 0, amount: 0 },
        { from: 5, amount: 750 },
      ],
    }
    expect(evaluate(compile(params), context)).toBe(750)
  })

  it("one-off pays its amount", () => {
    expect(
      value({ template: "one_off", amount: 5_000, period: "2027-03" })
    ).toBe(5_000)
  })

  it("formula pays what the formula says", () => {
    expect(
      value({
        template: "formula",
        formula: "min(basic_salary * 0.15, 2000) + years_of_service * 50",
      })
    ).toBe(1_850)
  })
})

describe("applying a rule", () => {
  it("rounds once, at the end", () => {
    const r = rule({ template: "percent", percent: 33.333, of: "basic_salary" })
    expect(apply(r, context).amount).toBe(3_333.3)
  })

  it("shows the arithmetic rather than only the answer", () => {
    const r = rule({ template: "percent", percent: 15, of: "basic_salary" })
    expect(apply(r, context).workings).toBe("15% of 10000 = 1500")
  })

  it("says when a cap bit", () => {
    const r = rule({
      template: "capped_percent",
      percent: 25,
      of: "basic_salary",
      max: 2_000,
      min: null,
    })
    expect(apply(r, context).workings).toContain("capped at 2000")
  })

  it("prorates a joiner: 16 of 31 days on a 1,500 allowance", () => {
    const r = rule(
      { template: "capped_percent", percent: 15, of: "basic_salary", max: 2_000, min: null },
      { prorate: true }
    )
    const result = apply(r, context, {
      proratedDays: { worked: 16, inPeriod: 31 },
    })
    // 1,500 × 16 / 31 = 774.19
    expect(result.amount).toBe(774.19)
    expect(result.workings).toContain("16 of 31 days")
  })

  it("does not prorate a full period", () => {
    const r = rule({ template: "fixed", amount: 300 }, { prorate: true })
    expect(
      apply(r, context, { proratedDays: { worked: 31, inPeriod: 31 } }).amount
    ).toBe(300)
  })

  it("leaves a rule alone when it is not marked prorate", () => {
    const r = rule({ template: "fixed", amount: 300 }, { prorate: false })
    expect(
      apply(r, context, { proratedDays: { worked: 16, inPeriod: 31 } }).amount
    ).toBe(300)
  })
})

/* ── Targeting ───────────────────────────────────────────────────────── */

const employee = (over: Partial<Employee> = {}) =>
  ({
    id: "kofi",
    department: "Engineering",
    branch: "Accra HQ",
    employmentType: "full_time",
    ...over,
  }) as Employee

const subject = (
  over: Partial<TargetSubject> = {},
  employeeOver: Partial<Employee> = {}
): TargetSubject => ({
  employee: employee(employeeOver),
  payGroupId: "pg-ghana",
  grade: "L5",
  customGroupIds: [],
  ...over,
})

describe("who a rule reaches", () => {
  it("reaches everybody when nothing is specified", () => {
    expect(targets(rule({ template: "fixed", amount: 1 }), subject())).toBe(
      true
    )
  })

  it("reaches one pay group", () => {
    const r = rule(
      { template: "fixed", amount: 1 },
      { targets: { include: [{ payGroupId: "pg-ghana" }], exclude: [] } }
    )
    expect(targets(r, subject())).toBe(true)
    expect(targets(r, subject({ payGroupId: "pg-nigeria" }))).toBe(false)
  })

  it("treats the fields in one clause as all having to match", () => {
    const r = rule(
      { template: "fixed", amount: 1 },
      {
        targets: {
          include: [{ payGroupId: "pg-ghana", department: "Finance" }],
          exclude: [],
        },
      }
    )
    // Right group, wrong department.
    expect(targets(r, subject())).toBe(false)
  })

  it("treats separate clauses as alternatives", () => {
    const r = rule(
      { template: "fixed", amount: 1 },
      {
        targets: {
          include: [{ department: "Finance" }, { department: "Engineering" }],
          exclude: [],
        },
      }
    )
    expect(targets(r, subject())).toBe(true)
  })

  it("reads grade B and above as including grade C", () => {
    const r = rule(
      { template: "fixed", amount: 1 },
      { targets: { include: [{ gradeFrom: "B" }], exclude: [] } }
    )
    expect(targets(r, subject({ grade: "C" }))).toBe(true)
    expect(targets(r, subject({ grade: "B" }))).toBe(true)
    expect(targets(r, subject({ grade: "A" }))).toBe(false)
  })

  it("reads L-grades in numeric order, so L10 is above L9", () => {
    const r = rule(
      { template: "fixed", amount: 1 },
      { targets: { include: [{ gradeFrom: "L9" }], exclude: [] } }
    )
    expect(targets(r, subject({ grade: "L10" }))).toBe(true)
    expect(targets(r, subject({ grade: "L2" }))).toBe(false)
  })

  it("lets an exclusion beat an inclusion", () => {
    // "Everyone in Ghana monthly except interns" has to mean the interns.
    const r = rule(
      { template: "fixed", amount: 1 },
      {
        targets: {
          include: [{ payGroupId: "pg-ghana" }],
          exclude: [{ employmentType: "intern" }],
        },
      }
    )
    expect(targets(r, subject())).toBe(true)
    expect(targets(r, subject({}, { employmentType: "intern" }))).toBe(false)
  })

  it("reaches a saved group", () => {
    const r = rule(
      { template: "fixed", amount: 1 },
      { targets: { include: [{ customGroupId: "rota-eng" }], exclude: [] } }
    )
    expect(targets(r, subject({ customGroupIds: ["rota-eng"] }))).toBe(true)
    expect(targets(r, subject({ customGroupIds: [] }))).toBe(false)
  })

  it("reaches one named person", () => {
    const r = rule(
      { template: "fixed", amount: 1 },
      { targets: { include: [{ employeeId: "kofi" }], exclude: [] } }
    )
    expect(targets(r, subject())).toBe(true)
    expect(targets(r, subject({}, { id: "ama" }))).toBe(false)
  })
})

/* ── Versions and priority ───────────────────────────────────────────── */

describe("which version is in force", () => {
  const r = rule(
    { template: "fixed", amount: 1 },
    { effectiveFrom: "2026-04-01", effectiveTo: "2026-06-30" }
  )

  it("is not in force before it starts", () => {
    expect(inForce(r, "2026-03-31")).toBe(false)
  })

  it("is in force on its first day", () => {
    expect(inForce(r, "2026-04-01")).toBe(true)
  })

  it("is in force on its last day", () => {
    expect(inForce(r, "2026-06-30")).toBe(true)
  })

  it("is not in force after it ends", () => {
    expect(inForce(r, "2026-07-01")).toBe(false)
  })

  it("is never in force as a draft", () => {
    expect(inForce({ ...r, status: "draft" }, "2026-05-01")).toBe(false)
  })

  it("is never in force once retired", () => {
    expect(inForce({ ...r, status: "retired" }, "2026-05-01")).toBe(false)
  })

  it("switches version on the effective date", () => {
    const v1 = rule(
      { template: "fixed", amount: 300 },
      { id: "v1", effectiveFrom: "2026-01-01", effectiveTo: "2026-10-31" }
    )
    const v2 = rule(
      { template: "fixed", amount: 450 },
      { id: "v2", effectiveFrom: "2026-11-01", version: 2 }
    )
    const october = rulesFor([v1, v2], subject(), "2026-10-15")
    const november = rulesFor([v1, v2], subject(), "2026-11-15")
    expect(apply(october[0], context).amount).toBe(300)
    expect(apply(november[0], context).amount).toBe(450)
  })
})

describe("two rules on one component", () => {
  const low = rule(
    { template: "fixed", amount: 300 },
    { id: "low", priority: 1 }
  )
  const high = rule(
    { template: "fixed", amount: 900 },
    { id: "high", priority: 50 }
  )

  it("pays the higher priority, not both", () => {
    const applied = rulesFor([low, high], subject(), "2026-09-18")
    expect(applied).toHaveLength(1)
    expect(applied[0].id).toBe("high")
  })

  it("reports the clash so the builder can warn", () => {
    const found = conflicts([low, high], subject(), "2026-09-18")
    expect(found).toHaveLength(1)
    expect(found[0].componentId).toBe("pc-housing")
    expect(found[0].winner.id).toBe("high")
    expect(found[0].losers.map((r) => r.id)).toEqual(["low"])
  })

  it("reports nothing when the components differ", () => {
    const other = rule(
      { template: "fixed", amount: 100 },
      { id: "other", componentId: "pc-transport" }
    )
    expect(conflicts([low, other], subject(), "2026-09-18")).toEqual([])
  })

  it("breaks a priority tie with the more recent rule", () => {
    const older = rule(
      { template: "fixed", amount: 100 },
      { id: "older", priority: 5, effectiveFrom: "2026-01-01" }
    )
    const newer = rule(
      { template: "fixed", amount: 200 },
      { id: "newer", priority: 5, effectiveFrom: "2026-06-01" }
    )
    expect(rulesFor([older, newer], subject(), "2026-09-18")[0].id).toBe(
      "newer"
    )
  })
})

/* ── Circularity ─────────────────────────────────────────────────────── */

describe("rules that would define themselves", () => {
  const isDeduction = (id: string) => id === "pc-union-dues"

  it("refuses an earning that reads gross pay", () => {
    const r = rule(
      { template: "formula", formula: "gross_pay * 0.05" },
      { componentId: "pc-housing", name: "Housing allowance" }
    )
    const found = circularReferences([r], isDeduction)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain("Housing allowance")
    expect(found[0]).toContain("gross pay")
  })

  it("allows a deduction to read gross pay", () => {
    const r = rule(
      { template: "formula", formula: "gross_pay * 0.01" },
      { componentId: "pc-union-dues" }
    )
    expect(circularReferences([r], isDeduction)).toEqual([])
  })

  it("says nothing about a rule that reads only basic", () => {
    const r = rule({ template: "percent", percent: 15, of: "basic_salary" })
    expect(circularReferences([r], isDeduction)).toEqual([])
  })
})

describe("reading a rule back as a sentence", () => {
  it("writes a capped percent the way it was described", () => {
    const r = rule({
      template: "capped_percent",
      percent: 15,
      of: "basic_salary",
      max: 2_000,
      min: null,
    })
    expect(describeRule(r)).toBe(
      "Housing allowance: 15% of basic salary, capped at 2000"
    )
  })

  it("writes a rate times quantity", () => {
    const r = rule({
      template: "rate_x_quantity",
      rate: 57.5,
      multiplier: 2,
      quantity: "overtime_hours_weekend",
    })
    expect(describeRule(r)).toContain("2× 57.5 for each overtime hours weekend")
  })
})
