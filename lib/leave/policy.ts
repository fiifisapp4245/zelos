/**
 * Leave entitlement: what the law guarantees, what the company grants, and
 * the figure an employee actually gets.
 *
 * The statutory floor comes from the country's rules (not from a number
 * typed into a form), the company's own types come from Settings, and the
 * balance an employee sees is the larger of the two. The sick leave type is
 * marked as such in Settings, so its entitlement is read from there too,
 * instead of being a constant in a seed.
 */
import type { LeaveBalance } from "../types"
import type { CountryRulePack, LeaveRules } from "../pay/types"
import { packFor } from "../pay/rule-packs"

export type { LeaveRules }

export const WORKING_DAYS_PER_WEEK = 5

export function leaveRulesFor(
  packs: CountryRulePack[],
  country: string,
  onIso: string
): LeaveRules | null {
  return packFor(packs, country, onIso)?.leave ?? null
}

export interface DaysRange {
  min: number
  max: number
}

/**
 * Reads how many working days a leave type grants from the way Settings
 * writes it: "12 days", "15–21 days by grade", "14 weeks", "5 days".
 * Null when there is no figure to read ("Up to 5 days" is a cap, not a grant).
 */
export function parseEntitlementDays(text: string): DaysRange | null {
  const t = text.trim().toLowerCase()
  if (!t || /^up to\b/.test(t)) return null
  const m = t.match(
    /(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*(day|week)/
  )
  if (!m) return null
  const unit = m[3] === "week" ? WORKING_DAYS_PER_WEEK : 1
  const lo = Number(m[1]) * unit
  const hi = (m[2] ? Number(m[2]) : Number(m[1])) * unit
  return { min: Math.min(lo, hi), max: Math.max(lo, hi) }
}

export type LeaveKind = "Annual" | "Sick" | "Parental" | "Other"

export interface LeaveTypeRow {
  id?: string
  name?: string
  kind?: string
  entitlement?: string
}

/**
 * Whether a leave type may be saved. Annual leave can never be set below the
 * statutory floor, and there is one annual and one sick type, so a balance
 * has exactly one place to read each from.
 */
export function validateLeaveRow(
  row: LeaveTypeRow,
  others: LeaveTypeRow[],
  rules: LeaveRules | null,
  country: string
): string | null {
  const days = parseEntitlementDays(String(row.entitlement ?? ""))
  if (row.kind === "Annual" || row.kind === "Sick") {
    const dup = others.find((o) => o.id !== row.id && o.kind === row.kind)
    if (dup)
      return `${dup.name} is already the ${row.kind.toLowerCase()} leave type. A person has one of each.`
    if (!days)
      return `Give the ${row.kind.toLowerCase()} entitlement as a number of days, e.g. “${row.kind === "Annual" ? "15–21 days by grade" : "12 days"}”.`
  }
  if (
    row.kind === "Annual" &&
    days &&
    rules &&
    days.min < rules.annualMinimumDays
  )
    return `${country}'s statutory minimum for annual leave is ${rules.annualMinimumDays} working days (${rules.source}). Entitlement cannot start lower.`
  return null
}

function sickDays(rows: LeaveTypeRow[]) {
  const r = rows.find((x) => x.kind === "Sick")
  return r
    ? (parseEntitlementDays(String(r.entitlement ?? ""))?.max ?? null)
    : null
}

/**
 * The balances as an employee should see them: annual entitlement never
 * under the statutory floor, and the sick entitlement read from the type
 * Settings marks as sick leave.
 */
export function applyLeavePolicy(
  balances: LeaveBalance[],
  rows: LeaveTypeRow[],
  rules: LeaveRules | null
): LeaveBalance[] {
  const sick = sickDays(rows)
  const floor = rules?.annualMinimumDays ?? 0
  return balances.map((b) => {
    const annual = Math.max(b.annualEntitlement, floor)
    const sickEnt = sick ?? b.sickEntitlement
    return {
      ...b,
      annualEntitlement: annual,
      sickEntitlement: sickEnt,
      byType: b.byType.map((t) =>
        t.type === "annual"
          ? { ...t, entitlement: Math.max(t.entitlement, floor) }
          : t.type === "sick"
            ? { ...t, entitlement: sickEnt }
            : t
      ),
    }
  })
}

/** The country leave is judged against: where the company's first legal entity pays. */
export function homeCountry(entities: { country: string }[]) {
  return entities[0]?.country ?? "Ghana"
}

/** What the leave types screen says about the floor, from the rules rather than from memory. */
export function floorSentence(rules: LeaveRules | null, country: string) {
  return rules
    ? `${country}'s ${rules.source} sets ${rules.annualMinimumDays} working days as the floor for annual leave.`
    : `Zelos does not hold ${country}'s leave rules, so no statutory floor is enforced here.`
}
