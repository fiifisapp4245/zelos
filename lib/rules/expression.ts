import { RULE_VARIABLES, type RuleContext, type RuleVariable } from "./types"

/**
 * A tiny expression language, parsed by hand.
 *
 * Every template compiles to one of these trees, and formula mode
 * parses straight into the same shape, so the engine evaluates exactly
 * one thing however a rule was written.
 *
 * It never calls eval or Function. A pay rule is configuration typed by
 * an administrator, and configuration that can run arbitrary code is a
 * way into the system rather than a feature. The grammar below is the
 * whole of what a rule may say.
 */

export type Expr =
  | { kind: "number"; value: number }
  | { kind: "variable"; name: RuleVariable }
  | { kind: "binary"; op: BinaryOp; left: Expr; right: Expr }
  | { kind: "call"; fn: FunctionName; args: Expr[] }
  | { kind: "if"; test: Expr; then: Expr; otherwise: Expr }

export type BinaryOp =
  | "+"
  | "-"
  | "*"
  | "/"
  | "<"
  | "<="
  | ">"
  | ">="
  | "=="
  | "!="

export type FunctionName = "min" | "max" | "round" | "floor" | "ceil" | "abs"

const FUNCTIONS: Record<FunctionName, { arity: number | "any" }> = {
  min: { arity: "any" },
  max: { arity: "any" },
  round: { arity: 1 },
  floor: { arity: 1 },
  ceil: { arity: 1 },
  abs: { arity: 1 },
}

/** Raised with a sentence an administrator can act on, not a stack trace. */
export class RuleSyntaxError extends Error {}

/* ── Tokens ──────────────────────────────────────────────────────────── */

type Token =
  | { type: "number"; value: number }
  | { type: "name"; value: string }
  | { type: "op"; value: string }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma" }

const TWO_CHAR_OPS = ["<=", ">=", "==", "!="]
const ONE_CHAR_OPS = ["+", "-", "*", "/", "<", ">"]

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < source.length) {
    const char = source[i]

    if (/\s/.test(char)) {
      i++
      continue
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char })
      i++
      continue
    }

    if (char === ",") {
      tokens.push({ type: "comma" })
      i++
      continue
    }

    const two = source.slice(i, i + 2)
    if (TWO_CHAR_OPS.includes(two)) {
      tokens.push({ type: "op", value: two })
      i += 2
      continue
    }

    if (ONE_CHAR_OPS.includes(char)) {
      tokens.push({ type: "op", value: char })
      i++
      continue
    }

    if (/[0-9.]/.test(char)) {
      const match = /^[0-9]*\.?[0-9]+/.exec(source.slice(i))
      if (!match)
        throw new RuleSyntaxError(
          `"${source.slice(i, i + 8)}" is not a number anyone can read.`
        )
      tokens.push({ type: "number", value: Number(match[0]) })
      i += match[0].length
      continue
    }

    if (/[a-zA-Z_]/.test(char)) {
      const match = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(source.slice(i))!
      tokens.push({ type: "name", value: match[0] })
      i += match[0].length
      continue
    }

    throw new RuleSyntaxError(
      `"${char}" cannot appear in a pay rule. Rules use numbers, the named variables, + - * /, comparisons, and min, max, round, floor, ceil, abs and if.`
    )
  }

  return tokens
}

/* ── Parser ──────────────────────────────────────────────────────────── */

/**
 * Precedence climbing: comparisons bind loosest, then + and -, then
 * * and /, then a value. Unary minus is handled where a value is
 * expected, so "-basic_salary * 2" reads the way it looks.
 */
export function parse(source: string): Expr {
  const tokens = tokenize(source)
  let position = 0

  const peek = () => tokens[position]
  const next = () => tokens[position++]

  function expect(predicate: (t: Token | undefined) => boolean, what: string) {
    if (!predicate(peek()))
      throw new RuleSyntaxError(`Expected ${what} in the rule.`)
    return next()
  }

  function parseValue(): Expr {
    const token = peek()
    if (!token) throw new RuleSyntaxError("The rule stops before it finishes.")

    if (token.type === "op" && token.value === "-") {
      next()
      // Negation is zero minus the value, so there is one less node kind.
      return { kind: "binary", op: "-", left: num(0), right: parseValue() }
    }

    if (token.type === "number") {
      next()
      return { kind: "number", value: token.value }
    }

    if (token.type === "paren" && token.value === "(") {
      next()
      const inner = parseComparison()
      expect(
        (t) => t?.type === "paren" && t.value === ")",
        "a closing bracket"
      )
      return inner
    }

    if (token.type === "name") {
      next()
      const name = token.value

      // A function call, or a bare variable.
      if (peek()?.type === "paren" && (peek() as { value: string }).value === "(") {
        next()
        const args: Expr[] = []
        if (!(peek()?.type === "paren")) {
          args.push(parseComparison())
          while (peek()?.type === "comma") {
            next()
            args.push(parseComparison())
          }
        }
        expect(
          (t) => t?.type === "paren" && t.value === ")",
          `a closing bracket after ${name}(`
        )

        if (name === "if") {
          if (args.length !== 3)
            throw new RuleSyntaxError(
              "if takes three parts: a test, the value when it is true, and the value when it is not."
            )
          return { kind: "if", test: args[0], then: args[1], otherwise: args[2] }
        }

        const fn = FUNCTIONS[name as FunctionName]
        if (!fn)
          throw new RuleSyntaxError(
            `There is no function called ${name}. Rules may use min, max, round, floor, ceil, abs and if.`
          )
        if (fn.arity !== "any" && args.length !== fn.arity)
          throw new RuleSyntaxError(
            `${name} takes ${fn.arity} value${fn.arity === 1 ? "" : "s"}, not ${args.length}.`
          )
        if (args.length === 0)
          throw new RuleSyntaxError(`${name} needs something to work on.`)
        return { kind: "call", fn: name as FunctionName, args }
      }

      if (!RULE_VARIABLES.includes(name as RuleVariable))
        throw new RuleSyntaxError(
          `There is no variable called ${name}. The ones a rule may use are: ${RULE_VARIABLES.join(", ")}.`
        )
      return { kind: "variable", name: name as RuleVariable }
    }

    throw new RuleSyntaxError("The rule has a value missing.")
  }

  function parseProduct(): Expr {
    let left = parseValue()
    while (
      peek()?.type === "op" &&
      ["*", "/"].includes((peek() as { value: string }).value)
    ) {
      const op = (next() as { value: string }).value as BinaryOp
      left = { kind: "binary", op, left, right: parseValue() }
    }
    return left
  }

  function parseSum(): Expr {
    let left = parseProduct()
    while (
      peek()?.type === "op" &&
      ["+", "-"].includes((peek() as { value: string }).value)
    ) {
      const op = (next() as { value: string }).value as BinaryOp
      left = { kind: "binary", op, left, right: parseProduct() }
    }
    return left
  }

  function parseComparison(): Expr {
    let left = parseSum()
    while (
      peek()?.type === "op" &&
      ["<", "<=", ">", ">=", "==", "!="].includes(
        (peek() as { value: string }).value
      )
    ) {
      const op = (next() as { value: string }).value as BinaryOp
      left = { kind: "binary", op, left, right: parseSum() }
    }
    return left
  }

  const expression = parseComparison()
  if (position < tokens.length)
    throw new RuleSyntaxError(
      "There is something left over at the end of the rule."
    )
  return expression
}

/* ── Evaluation ──────────────────────────────────────────────────────── */

export const num = (value: number): Expr => ({ kind: "number", value })
export const variable = (name: RuleVariable): Expr => ({
  kind: "variable",
  name,
})

/**
 * Works the tree out against one person's numbers.
 *
 * Comparisons return 1 or 0 so that a comparison can be multiplied,
 * which is how the tiered template expresses "only the part above the
 * threshold" without a branch per band.
 */
export function evaluate(expression: Expr, context: RuleContext): number {
  switch (expression.kind) {
    case "number":
      return expression.value

    case "variable": {
      const value = context[expression.name]
      if (value === undefined || Number.isNaN(value))
        throw new RuleSyntaxError(
          `${expression.name} is not known for this person in this period, so the rule cannot be worked out.`
        )
      return value
    }

    case "binary": {
      const left = evaluate(expression.left, context)
      const right = evaluate(expression.right, context)
      switch (expression.op) {
        case "+":
          return left + right
        case "-":
          return left - right
        case "*":
          return left * right
        case "/":
          // Division by zero would otherwise reach a payslip as
          // Infinity, which nobody can be paid.
          if (right === 0)
            throw new RuleSyntaxError(
              "The rule divides by zero. Check the variable on the bottom of the division."
            )
          return left / right
        case "<":
          return left < right ? 1 : 0
        case "<=":
          return left <= right ? 1 : 0
        case ">":
          return left > right ? 1 : 0
        case ">=":
          return left >= right ? 1 : 0
        case "==":
          return left === right ? 1 : 0
        case "!=":
          return left !== right ? 1 : 0
      }
      break
    }

    case "call": {
      const args = expression.args.map((a) => evaluate(a, context))
      switch (expression.fn) {
        case "min":
          return Math.min(...args)
        case "max":
          return Math.max(...args)
        case "round":
          return Math.round(args[0] * 100) / 100
        case "floor":
          return Math.floor(args[0])
        case "ceil":
          return Math.ceil(args[0])
        case "abs":
          return Math.abs(args[0])
      }
      break
    }

    case "if":
      return evaluate(expression.test, context) !== 0
        ? evaluate(expression.then, context)
        : evaluate(expression.otherwise, context)
  }

  throw new RuleSyntaxError("The rule could not be worked out.")
}

/** Every variable a tree reads, for circularity and validation checks. */
export function variablesUsed(expression: Expr): RuleVariable[] {
  const found = new Set<RuleVariable>()
  const walk = (e: Expr) => {
    if (e.kind === "variable") found.add(e.name)
    else if (e.kind === "binary") {
      walk(e.left)
      walk(e.right)
    } else if (e.kind === "call") e.args.forEach(walk)
    else if (e.kind === "if") {
      walk(e.test)
      walk(e.then)
      walk(e.otherwise)
    }
  }
  walk(expression)
  return [...found]
}
