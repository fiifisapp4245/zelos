import type { Employee } from "../types"
import { compile } from "./compile"
import { RuleSyntaxError, evaluate, variablesUsed } from "./expression"
import type { PayRule, RuleContext, TargetClause } from "./types"

/**
 * Which rules reach which people, and what they pay.
 *
 * Resolution is deliberately boring and ordered: narrow to the rules in
 * force on the date, drop the ones this person is not in, settle
 * competing rules by priority, then work each one out. A rule that does
 * not apply never evaluates, so a formula that would have divided by
 * zero for somebody it was never meant to reach cannot fail the run.
 */

export interface TargetSubject {
  employee: Employee
  payGroupId: string | undefined
  grade: string
  /** Saved groups this person belongs to. */
  customGroupIds: string[]
}

/** Grades compare as text: L1 < L2 < … < L7, and A < B < C. */
function gradeAtLeast(grade: string, floor: string) {
  return grade.localeCompare(floor, undefined, { numeric: true }) >= 0
}

function clauseMatches(clause: TargetClause, subject: TargetSubject): boolean {
  // Every field set on a clause has to match. An empty clause matches
  // everybody, which is how "all staff" is written.
  if (clause.payGroupId && clause.payGroupId !== subject.payGroupId)
    return false
  if (clause.branch && clause.branch !== subject.employee.branch) return false
  if (clause.department && clause.department !== subject.employee.department)
    return false
  if (clause.grade && clause.grade !== subject.grade) return false
  if (clause.gradeFrom && !gradeAtLeast(subject.grade, clause.gradeFrom))
    return false
  if (
    clause.employmentType &&
    clause.employmentType !== subject.employee.employmentType
  )
    return false
  if (
    clause.customGroupId &&
    !subject.customGroupIds.includes(clause.customGroupId)
  )
    return false
  if (clause.employeeId && clause.employeeId !== subject.employee.id)
    return false
  return true
}

/** Whether a rule reaches this person at all. */
export function targets(rule: PayRule, subject: TargetSubject): boolean {
  const { include, exclude } = rule.targets
  // An exclusion always wins. "Everyone in Ghana monthly except interns"
  // has to mean the interns, whatever else says otherwise.
  if (exclude.some((clause) => clauseMatches(clause, subject))) return false
  if (include.length === 0) return true
  return include.some((clause) => clauseMatches(clause, subject))
}

/** Whether a rule was in force on a date. */
export function inForce(rule: PayRule, onIso: string): boolean {
  if (rule.status !== "active") return false
  if (rule.effectiveFrom > onIso) return false
  if (rule.effectiveTo !== null && rule.effectiveTo < onIso) return false
  return true
}

/**
 * The rules that apply to one person on one date, one per component.
 *
 * Where two active rules pay the same component, the higher priority
 * wins outright rather than both paying — two housing allowances is
 * never what anybody meant, and silently adding them would be a payroll
 * error nobody could see on the payslip.
 */
export function rulesFor(
  rules: PayRule[],
  subject: TargetSubject,
  onIso: string
): PayRule[] {
  const applicable = rules
    .filter((rule) => inForce(rule, onIso))
    .filter((rule) => targets(rule, subject))

  const best = new Map<string, PayRule>()
  for (const rule of applicable) {
    const held = best.get(rule.componentId)
    if (
      !held ||
      rule.priority > held.priority ||
      // Same priority: the one that started more recently is the one
      // somebody wrote last, and the newer intent wins.
      (rule.priority === held.priority &&
        rule.effectiveFrom > held.effectiveFrom)
    )
      best.set(rule.componentId, rule)
  }

  return [...best.values()].sort((a, b) =>
    a.componentId.localeCompare(b.componentId)
  )
}

/** Two rules that could both have paid the same component. */
export interface RuleConflict {
  componentId: string
  winner: PayRule
  losers: PayRule[]
}

/** What the builder warns about: a component more than one rule claims. */
export function conflicts(
  rules: PayRule[],
  subject: TargetSubject,
  onIso: string
): RuleConflict[] {
  const applicable = rules
    .filter((rule) => inForce(rule, onIso))
    .filter((rule) => targets(rule, subject))

  const byComponent = new Map<string, PayRule[]>()
  for (const rule of applicable)
    byComponent.set(rule.componentId, [
      ...(byComponent.get(rule.componentId) ?? []),
      rule,
    ])

  const winners = new Map(
    rulesFor(rules, subject, onIso).map((r) => [r.componentId, r])
  )

  return [...byComponent.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([componentId, list]) => {
      const winner = winners.get(componentId)!
      return {
        componentId,
        winner,
        losers: list.filter((r) => r.id !== winner.id),
      }
    })
}

/* ── Circular references ─────────────────────────────────────────────── */

/**
 * A deduction rule may read gross_pay, and gross_pay is the sum of the
 * earning rules. So an earning rule that reads gross_pay would be
 * defining itself, and the run would never settle. This finds that
 * before anybody saves it, and names the rules involved rather than
 * reporting a loop in the abstract.
 */
export function circularReferences(
  rules: PayRule[],
  /** Whether a component is taken off pay rather than added to it. */
  isDeduction: (componentId: string) => boolean
): string[] {
  const problems: string[] = []

  for (const rule of rules) {
    let used: ReturnType<typeof variablesUsed>
    try {
      used = variablesUsed(compile(rule.params))
    } catch {
      // A rule that will not compile is reported by validation, not here.
      continue
    }

    if (used.includes("gross_pay") && !isDeduction(rule.componentId))
      problems.push(
        `"${rule.name}" is paid into gross pay and also reads gross pay, so its own value would change the number it is worked out from. Only deduction rules may read gross pay.`
      )
  }

  return problems
}

/* ── Working a rule out ──────────────────────────────────────────────── */

export interface RuleResult {
  rule: PayRule
  componentId: string
  amount: number
  /** The arithmetic, in words, for the payslip and the preview. */
  workings: string
}

/**
 * One rule, worked out for one person, rounded once at the end.
 *
 * Rounding happens here and nowhere inside the tree: a percentage of a
 * percentage rounded at each step loses a pesewa twice and the payslip
 * stops adding up.
 */
export function apply(
  rule: PayRule,
  context: RuleContext,
  options: { proratedDays?: { worked: number; inPeriod: number } } = {}
): RuleResult {
  const expression = compile(rule.params)
  let amount = evaluate(expression, context)

  let workings = describeWorkings(rule, context, amount)

  if (rule.prorate && options.proratedDays) {
    const { worked, inPeriod } = options.proratedDays
    if (inPeriod <= 0)
      throw new RuleSyntaxError("A period with no days in it cannot be paid.")
    if (worked < inPeriod) {
      const full = amount
      amount = (amount * worked) / inPeriod
      workings += ` · ${worked} of ${inPeriod} days: ${round(full)} → ${round(amount)}`
    }
  }

  return {
    rule,
    componentId: rule.componentId,
    amount: round(amount),
    workings,
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

function describeWorkings(
  rule: PayRule,
  context: RuleContext,
  amount: number
): string {
  const p = rule.params
  switch (p.template) {
    case "percent":
      return `${p.percent}% of ${context[p.of]} = ${round(amount)}`
    case "capped_percent": {
      const raw = (context[p.of] * p.percent) / 100
      const capped = p.max !== null && raw > p.max
      return capped
        ? `${p.percent}% of ${context[p.of]} = ${round(raw)}, capped at ${p.max}`
        : `${p.percent}% of ${context[p.of]} = ${round(amount)}`
    }
    case "rate_x_quantity":
      return `${p.multiplier} × ${p.rate} × ${context[p.quantity]} = ${round(amount)}`
    case "fixed":
    case "one_off":
      return `${round(amount)}`
    case "tiered":
      return `${readableValue(context[p.of])} by ${p.of.replace(/_/g, " ")} = ${round(amount)}`
    case "formula":
      return `${p.formula} = ${round(amount)}`
  }
}

function readableValue(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}
