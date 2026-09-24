import { addDays, datesBetween, isoWeekday } from "../time"
import type {
  ChangeDefinition,
  CompensationChangeRequest,
  CompensationVersion,
  CountryRulePack,
  Currency,
  LegalEntity,
  PayComponent,
  PayFrequency,
  PayGroup,
  WorkerType,
} from "./types"

/**
 * Everything the pay screens know how to work out.
 *
 * Pure: versions in, answers out. No store, no router, no clock — the
 * date is always passed in, so a figure on screen can be reproduced in a
 * test by naming the day it was read.
 */

/* ── Versions ────────────────────────────────────────────────────────── */

/** Versions that have actually taken effect, or will: pending never counts. */
const LIVE = ["effective", "superseded", "scheduled"] as const

/**
 * What someone is on, on a given date.
 *
 * The latest version that had taken effect by then. A scheduled version
 * dated in the future is not what they are paid today, however certain
 * it is.
 */
export function currentVersion(
  versions: CompensationVersion[],
  employeeId: string,
  date: string
): CompensationVersion | null {
  const mine = versions
    .filter(
      (v) =>
        v.employeeId === employeeId &&
        v.effectiveFrom <= date &&
        (v.status === "effective" || v.status === "superseded")
    )
    .sort(
      (a, b) =>
        a.effectiveFrom.localeCompare(b.effectiveFrom) ||
        a.versionNumber - b.versionNumber
    )
  return mine[mine.length - 1] ?? null
}

/** Everything ever proposed for someone, newest first. */
export function history(
  versions: CompensationVersion[],
  employeeId: string
): CompensationVersion[] {
  return versions
    .filter((v) => v.employeeId === employeeId)
    .sort(
      (a, b) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom) ||
        b.versionNumber - a.versionNumber
    )
}

/** The next change already agreed but not yet in force. */
export function scheduledVersion(
  versions: CompensationVersion[],
  employeeId: string,
  date: string
): CompensationVersion | null {
  return (
    versions
      .filter(
        (v) =>
          v.employeeId === employeeId &&
          v.status === "scheduled" &&
          v.effectiveFrom > date
      )
      .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0] ?? null
  )
}

export function previousVersion(
  versions: CompensationVersion[],
  version: CompensationVersion
): CompensationVersion | null {
  if (!version.supersedesVersionId) return null
  return versions.find((v) => v.id === version.supersedesVersionId) ?? null
}

/* ── Pay groups ──────────────────────────────────────────────────────── */

export interface Blocked {
  blocked: string
  options: ("convert_to_contractor" | "register_entity")[]
}

export function isBlocked(result: PayGroup | Blocked): result is Blocked {
  return "blocked" in result
}

/**
 * Which pay group someone belongs in, or why they cannot be paid yet.
 *
 * Working somewhere the company has no entity is not an error to swallow:
 * it has exactly two honest answers, and the caller is given both rather
 * than a silent fallback to the home country.
 */
export function derivePayGroup(
  entityId: string | null,
  workCountry: string,
  workerType: WorkerType,
  source: {
    entities: LegalEntity[]
    payGroups: PayGroup[]
    rulePacks: CountryRulePack[]
  }
): PayGroup | Blocked {
  if (workerType === "contractor") {
    const group = source.payGroups.find((g) => g.contractorGroup)
    if (group) return group
    return {
      blocked: "There is no contractor pay group to put them in.",
      options: ["register_entity"],
    }
  }

  const entity =
    source.entities.find(
      (e) => e.id === entityId && e.country === workCountry
    ) ?? source.entities.find((e) => e.country === workCountry)

  if (!entity) {
    return {
      blocked: `The company has no legal entity in ${workCountry}, so nobody can be employed and paid there.`,
      options: ["convert_to_contractor", "register_entity"],
    }
  }

  const group = source.payGroups.find(
    (g) => g.entityId === entity.id && !g.contractorGroup
  )
  if (!group) {
    return {
      blocked: `${entity.name} has no pay group yet, so there is nothing to pay them from.`,
      options: ["convert_to_contractor", "register_entity"],
    }
  }
  return group
}

/**
 * How a group calculates, worked out rather than chosen. A country the
 * product holds rules for is calculated here; one it does not is
 * calculated by a local provider and uploaded.
 */
export function calculationModeFor(
  country: string,
  contractorGroup: boolean,
  rulePacks: CountryRulePack[]
): PayGroup["calculationMode"] {
  if (contractorGroup) return "contractor"
  return rulePacks.some((p) => p.country === country) ? "native" : "external"
}

export const CALCULATION_MODE_COPY: Record<
  PayGroup["calculationMode"],
  { label: string; explains: string }
> = {
  native: {
    label: "Calculated by Zelos",
    explains: "Zelos calculates tax and contributions for this country.",
  },
  external: {
    label: "Uploaded results",
    explains: "Upload results from your local provider.",
  },
  contractor: {
    label: "Contractor invoices",
    explains: "Contractors invoice; no tax is withheld here.",
  },
}

/* ── Periods ─────────────────────────────────────────────────────────── */

/** Bi-weekly needs an anchor, or "every two weeks" means nothing. */
const BI_WEEKLY_ANCHOR = "2026-01-05"

export const FREQUENCY_LABEL: Record<PayFrequency, string> = {
  monthly: "Monthly",
  semi_monthly: "Twice monthly",
  bi_weekly: "Every two weeks",
  weekly: "Weekly",
}

export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  monthly: 12,
  semi_monthly: 24,
  bi_weekly: 26,
  weekly: 52,
}

/** The first day of the next pay period after a date. */
export function nextPeriodStart(payGroup: PayGroup, date: string): string {
  const [y, m, d] = date.split("-").map(Number)

  if (payGroup.frequency === "monthly") {
    return m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`
  }

  if (payGroup.frequency === "semi_monthly") {
    if (d < 16) return `${y}-${String(m).padStart(2, "0")}-16`
    return m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`
  }

  if (payGroup.frequency === "weekly") {
    return addDays(date, 8 - isoWeekday(date))
  }

  let cursor = BI_WEEKLY_ANCHOR
  while (cursor <= date) cursor = addDays(cursor, 14)
  return cursor
}

/** The period a date falls in, for proration. */
export function periodFor(
  payGroup: PayGroup,
  date: string
): { start: string; end: string } {
  const start = previousPeriodStart(payGroup, date)
  return { start, end: addDays(nextPeriodStart(payGroup, date), -1) }
}

function previousPeriodStart(payGroup: PayGroup, date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  if (payGroup.frequency === "monthly")
    return `${y}-${String(m).padStart(2, "0")}-01`
  if (payGroup.frequency === "semi_monthly")
    return d < 16
      ? `${y}-${String(m).padStart(2, "0")}-01`
      : `${y}-${String(m).padStart(2, "0")}-16`
  if (payGroup.frequency === "weekly")
    return addDays(date, -(isoWeekday(date) - 1))
  let cursor = BI_WEEKLY_ANCHOR
  while (addDays(cursor, 14) <= date) cursor = addDays(cursor, 14)
  return cursor
}

export interface Proration {
  /** True where the change lands inside a period rather than on its first day. */
  midPeriod: boolean
  daysOnOld: number
  daysOnNew: number
  totalDays: number
  /** What the period actually pays, once both rates are counted. */
  amount: number
}

/**
 * A change dated mid-period pays both rates, by calendar day.
 *
 * Calendar days rather than working days: the pay period is a calendar
 * thing, and counting working days would make two people on the same
 * salary paid differently for the same change.
 */
export function prorate(
  oldAmount: number,
  newAmount: number,
  effectiveFrom: string,
  period: { start: string; end: string }
): Proration {
  const totalDays = datesBetween(period.start, period.end).length

  if (effectiveFrom <= period.start)
    return {
      midPeriod: false,
      daysOnOld: 0,
      daysOnNew: totalDays,
      totalDays,
      amount: newAmount,
    }

  if (effectiveFrom > period.end)
    return {
      midPeriod: false,
      daysOnOld: totalDays,
      daysOnNew: 0,
      totalDays,
      amount: oldAmount,
    }

  const daysOnOld = datesBetween(
    period.start,
    addDays(effectiveFrom, -1)
  ).length
  const daysOnNew = totalDays - daysOnOld
  const amount =
    (oldAmount * daysOnOld) / totalDays + (newAmount * daysOnNew) / totalDays

  return {
    midPeriod: true,
    daysOnOld,
    daysOnNew,
    totalDays,
    amount: Math.round(amount * 100) / 100,
  }
}

/* ── Cost ────────────────────────────────────────────────────────────── */

export interface CostLine {
  gross: number
  employerContributions: number
  total: number
}

export interface EmployerCost {
  currency: Currency
  monthly: CostLine
  annual: CostLine
}

/**
 * What someone costs, not what they take home.
 *
 * Gross is the base plus everything paid on top of it; employer
 * contributions are what the country makes the employer pay as well.
 * Deductions are the employee's own money and are not in either figure.
 *
 * `components` is optional so a caller with only a version and a rule
 * pack still gets the base and the contributions right; passing the
 * library adds the allowances on top.
 */
export function employerCost(
  version: CompensationVersion,
  rulePack: CountryRulePack | null,
  components: PayComponent[] = []
): EmployerCost {
  const perYear = PERIODS_PER_YEAR[version.frequency]
  const base = version.baseAmount

  let addToGross = 0
  for (const value of version.components) {
    const definition = components.find((c) => c.id === value.componentId)
    // Unknown to the library: counted as pay on top, which is the safe
    // direction for a cost figure.
    const category = definition?.category ?? "allowance"
    if (category === "deduction" || category === "employer_contribution")
      continue
    addToGross +=
      value.amount ?? (value.rate !== undefined ? (base * value.rate) / 100 : 0)
  }

  const gross = base + addToGross

  // Contractors are invoiced; nobody contributes on top of an invoice.
  const contributions =
    version.workerType === "contractor" || !rulePack
      ? 0
      : rulePack.employerContributionRules.reduce(
          (n, rule) => n + (base * rule.percentOfBase) / 100,
          0
        )

  const perPeriod: CostLine = {
    gross: round(gross),
    employerContributions: round(contributions),
    total: round(gross + contributions),
  }

  const factor = perYear / 12
  return {
    currency: version.currency,
    monthly: {
      gross: round(perPeriod.gross * factor),
      employerContributions: round(perPeriod.employerContributions * factor),
      total: round(perPeriod.total * factor),
    },
    annual: {
      gross: round(perPeriod.gross * perYear),
      employerContributions: round(perPeriod.employerContributions * perYear),
      total: round(perPeriod.total * perYear),
    },
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

/* ── Approval ────────────────────────────────────────────────────────── */

export interface ApprovalCheck {
  allowed: boolean
  reason: string
}

/**
 * Whether this person may decide this request.
 *
 * Two refusals matter more than the role: you cannot approve what you
 * proposed, and you cannot approve a change to your own pay. Both are
 * separation of duties, and neither is negotiable by permission.
 */
export function canApprove(
  user: { employeeId: string; roles: string[] },
  request: CompensationChangeRequest
): ApprovalCheck {
  if (request.status !== "pending")
    return {
      allowed: false,
      reason: `This request has already been ${request.status}.`,
    }

  if (!user.roles.includes("hr_admin"))
    return {
      allowed: false,
      reason: "Only the compensation approver can decide a pay change.",
    }

  if (request.proposedBy === user.employeeId)
    return {
      allowed: false,
      reason: "You proposed this change, so somebody else has to approve it.",
    }

  if (request.employeeIds.includes(user.employeeId))
    return {
      allowed: false,
      reason: "This change affects your own pay, so you cannot approve it.",
    }

  return { allowed: true, reason: "" }
}

/* ── Applying a change ───────────────────────────────────────────────── */

export interface ProposedChange {
  employeeId: string
  current: CompensationVersion | null
  /** Null where the person has no current version to change. */
  currency: Currency | null
  currentAmount: number
  newAmount: number
  delta: number
  deltaPercent: number
  blocked?: string
}

/**
 * What a definition would do to each person, before anything is written.
 *
 * Nothing here creates a version — this is the arithmetic the review step
 * shows, so that what is approved is what was seen.
 */
export function applyChange(
  definition: ChangeDefinition,
  employeeIds: string[],
  versions: CompensationVersion[],
  date: string
): ProposedChange[] {
  return employeeIds.map((employeeId) => {
    const current = currentVersion(versions, employeeId, date)
    if (!current)
      return {
        employeeId,
        current: null,
        currency: null,
        currentAmount: 0,
        newAmount: 0,
        delta: 0,
        deltaPercent: 0,
        blocked: "No compensation on file to change.",
      }

    const currentAmount = current.baseAmount
    const newAmount = round(
      definition.type === "percent"
        ? currentAmount * (1 + definition.value / 100)
        : definition.type === "fixed_increase"
          ? currentAmount + definition.value
          : definition.value
    )
    const delta = round(newAmount - currentAmount)

    return {
      employeeId,
      current,
      currency: current.currency,
      currentAmount,
      newAmount,
      delta,
      deltaPercent:
        currentAmount === 0 ? 0 : round((delta / currentAmount) * 100),
    }
  })
}

/** LIVE is exported for callers that filter version lists the same way. */
export const LIVE_STATUSES = LIVE
