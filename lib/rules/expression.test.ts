import { describe, expect, it } from "vitest"

import {
  RuleSyntaxError,
  evaluate,
  parse,
  variablesUsed,
} from "./expression"
import type { RuleContext } from "./types"

const context: RuleContext = {
  basic_salary: 10_000,
  gross_pay: 12_500,
  hourly_rate: 57.5,
  daily_rate: 460,
  days_worked: 16,
  days_in_period: 31,
  overtime_hours_weekday: 4,
  overtime_hours_weekend: 6,
  overtime_hours_holiday: 0,
  years_of_service: 7,
  age: 34,
}

const run = (source: string) => evaluate(parse(source), context)

describe("arithmetic", () => {
  it("multiplies before it adds", () => {
    expect(run("2 + 3 * 4")).toBe(14)
  })

  it("respects brackets", () => {
    expect(run("(2 + 3) * 4")).toBe(20)
  })

  it("reads a variable", () => {
    expect(run("basic_salary")).toBe(10_000)
  })

  it("works out 15% of basic as 1,500", () => {
    expect(run("basic_salary * 0.15")).toBe(1_500)
  })

  it("handles unary minus", () => {
    expect(run("-basic_salary + 10500")).toBe(500)
  })

  it("divides", () => {
    expect(run("basic_salary / days_in_period")).toBeCloseTo(322.58, 2)
  })
})

describe("functions", () => {
  it("caps with min: 15% of 10,000 capped at 2,000 pays 1,500", () => {
    expect(run("min(basic_salary * 0.15, 2000)")).toBe(1_500)
  })

  it("caps with min: 25% of 10,000 capped at 2,000 pays 2,000", () => {
    expect(run("min(basic_salary * 0.25, 2000)")).toBe(2_000)
  })

  it("floors with max", () => {
    expect(run("max(basic_salary * 0.01, 250)")).toBe(250)
  })

  it("takes more than two arguments", () => {
    expect(run("max(1, 9, 4)")).toBe(9)
  })

  it("rounds to the minor unit", () => {
    expect(run("round(10 / 3)")).toBe(3.33)
  })

  it("has floor, ceil and abs", () => {
    expect(run("floor(3.9)")).toBe(3)
    expect(run("ceil(3.1)")).toBe(4)
    expect(run("abs(0 - 5)")).toBe(5)
  })
})

describe("comparisons and if", () => {
  it("returns 1 for true and 0 for false, so it can be multiplied", () => {
    expect(run("years_of_service >= 5")).toBe(1)
    expect(run("years_of_service >= 50")).toBe(0)
  })

  it("chooses with if", () => {
    expect(run("if(years_of_service >= 5, 500, 0)")).toBe(500)
    expect(run("if(years_of_service >= 50, 500, 0)")).toBe(0)
  })

  it("nests, so a long-service ladder is one expression", () => {
    const ladder =
      "if(years_of_service >= 10, basic_salary * 0.10, if(years_of_service >= 5, basic_salary * 0.05, 0))"
    // Seven years of service: the middle rung, 5% of 10,000.
    expect(run(ladder)).toBe(500)
  })

  it("handles the worked example from the specification", () => {
    // min(basic × 0.15, 2000) + years_of_service × 50
    //   = min(1,500, 2,000) + 350 = 1,850
    expect(run("min(basic_salary * 0.15, 2000) + years_of_service * 50")).toBe(
      1_850
    )
  })
})

describe("refusing what a rule may not say", () => {
  it("will not run arbitrary code", () => {
    expect(() => parse("process.exit(1)")).toThrow(RuleSyntaxError)
  })

  it("rejects a function nobody defined", () => {
    expect(() => parse("sqrt(4)")).toThrow(/no function called sqrt/i)
  })

  it("rejects a variable nobody defined", () => {
    expect(() => parse("bonus_pot * 2")).toThrow(/no variable called bonus_pot/i)
  })

  it("names the allowed variables when it rejects one", () => {
    expect(() => parse("nonsense")).toThrow(/basic_salary/)
  })

  it("rejects an unclosed bracket", () => {
    expect(() => parse("min(basic_salary, 2000")).toThrow(RuleSyntaxError)
  })

  it("rejects something left over at the end", () => {
    expect(() => parse("2 + 2 4")).toThrow(/left over/i)
  })

  it("rejects a character that has no meaning in a rule", () => {
    expect(() => parse("basic_salary & 2")).toThrow(RuleSyntaxError)
  })

  it("insists if has all three parts", () => {
    expect(() => parse("if(1, 2)")).toThrow(/three parts/i)
  })

  it("insists round takes one value", () => {
    expect(() => parse("round(1, 2)")).toThrow(/takes 1 value/i)
  })

  it("refuses to divide by zero rather than paying Infinity", () => {
    expect(() => run("basic_salary / 0")).toThrow(/divides by zero/i)
  })

  it("says which variable is missing rather than paying nothing", () => {
    const partial = { ...context, days_worked: Number.NaN }
    expect(() => evaluate(parse("days_worked * 10"), partial)).toThrow(
      /days_worked is not known/i
    )
  })
})

describe("reading a rule back", () => {
  it("lists the variables used", () => {
    expect(
      variablesUsed(parse("min(basic_salary * 0.15, 2000) + days_worked"))
    ).toEqual(expect.arrayContaining(["basic_salary", "days_worked"]))
  })

  it("finds variables inside an if", () => {
    expect(variablesUsed(parse("if(age > 50, gross_pay, 0)"))).toEqual(
      expect.arrayContaining(["age", "gross_pay"])
    )
  })
})
