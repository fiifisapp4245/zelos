import { type Expr, num, parse, variable } from "./expression"
import type { PayRule, RuleParams } from "./types"

/**
 * Every template becomes the same expression tree.
 *
 * The templates exist so that nobody has to write a formula to say
 * "15% of basic, capped at 2,000". They are not a second engine: each
 * one compiles to the tree formula mode would have produced, so there
 * is one thing to test, one thing to explain, and no way for the two
 * paths to disagree about what a rule pays.
 */
export function compile(params: RuleParams): Expr {
  switch (params.template) {
    case "fixed":
      return num(params.amount)

    case "percent":
      return {
        kind: "binary",
        op: "/",
        left: {
          kind: "binary",
          op: "*",
          left: variable(params.of),
          right: num(params.percent),
        },
        right: num(100),
      }

    case "capped_percent": {
      let expression: Expr = {
        kind: "binary",
        op: "/",
        left: {
          kind: "binary",
          op: "*",
          left: variable(params.of),
          right: num(params.percent),
        },
        right: num(100),
      }
      // A ceiling first, then a floor: a rule with both pays at least
      // the minimum even where the cap would have cut it lower, which
      // is what "between X and Y" means to the person who wrote it.
      if (params.max !== null)
        expression = { kind: "call", fn: "min", args: [expression, num(params.max)] }
      if (params.min !== null)
        expression = { kind: "call", fn: "max", args: [expression, num(params.min)] }
      return expression
    }

    case "rate_x_quantity":
      return {
        kind: "binary",
        op: "*",
        left: {
          kind: "binary",
          op: "*",
          left: num(params.rate),
          right: num(params.multiplier),
        },
        right: variable(params.quantity),
      }

    case "tiered": {
      // Bands are read in order and the last one whose floor is reached
      // wins, expressed as nested ifs so the whole thing stays one tree.
      const sorted = [...params.bands].sort((a, b) => a.from - b.from)
      const valueOf = (band: (typeof sorted)[number]): Expr =>
        band.percent !== undefined
          ? {
              kind: "binary",
              op: "/",
              left: {
                kind: "binary",
                op: "*",
                left: variable(params.basis),
                right: num(band.percent),
              },
              right: num(100),
            }
          : num(band.amount ?? 0)

      let expression: Expr = num(0)
      for (const band of sorted)
        expression = {
          kind: "if",
          test: {
            kind: "binary",
            op: ">=",
            left: variable(params.of),
            right: num(band.from),
          },
          then: valueOf(band),
          otherwise: expression,
        }
      return expression
    }

    case "one_off":
      // Whether this is the right period is a targeting question, not
      // an arithmetic one; by the time it is evaluated it simply pays.
      return num(params.amount)

    case "formula":
      return parse(params.formula)
  }
}

/** The rule written out as a sentence, for review screens and the log. */
export function describe(rule: PayRule): string {
  const p = rule.params
  switch (p.template) {
    case "fixed":
      return `${rule.name}: a flat ${p.amount} each period`
    case "percent":
      return `${rule.name}: ${p.percent}% of ${readable(p.of)}`
    case "capped_percent": {
      const parts = [`${p.percent}% of ${readable(p.of)}`]
      if (p.max !== null) parts.push(`capped at ${p.max}`)
      if (p.min !== null) parts.push(`at least ${p.min}`)
      return `${rule.name}: ${parts.join(", ")}`
    }
    case "rate_x_quantity":
      return `${rule.name}: ${p.multiplier}× ${p.rate} for each ${readable(
        p.quantity
      )}`
    case "tiered":
      return `${rule.name}: by ${readable(p.of)}, in ${p.bands.length} bands`
    case "one_off":
      return `${rule.name}: ${p.amount}, once, in ${p.period}`
    case "formula":
      return `${rule.name}: ${p.formula}`
  }
}

function readable(name: string) {
  return name.replace(/_/g, " ")
}
