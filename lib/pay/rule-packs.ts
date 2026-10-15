import type {
  ComponentCategory,
  ComponentTreatment,
  CountryRulePack,
  PayGroup,
  Remittee,
} from "./types"

/**
 * Which rules were in force, and when.
 *
 * A country's rules are a series, not a single object. A run calculated
 * for March must use March's bands even if the bands changed in June, or
 * re-running a closed period would quietly produce a different answer
 * from the one people were paid — and the payslip would stop matching
 * the money that left the account.
 *
 * Packs are therefore chosen by country *and* date everywhere. Picking
 * the first pack that matches a country is the bug this module exists to
 * prevent.
 */

/** Every version for one country, newest first. */
export function versionsFor(
  packs: CountryRulePack[],
  country: string
): CountryRulePack[] {
  return packs
    .filter((p) => p.country === country)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
}

/**
 * The version in force on a date: the most recent one that had already
 * taken effect. Null when the country has no rules yet, or none that had
 * started by then — both of which mean "we cannot calculate this here".
 */
export function packFor(
  packs: CountryRulePack[],
  country: string,
  onIso: string
): CountryRulePack | null {
  return (
    versionsFor(packs, country).find((p) => p.effectiveFrom <= onIso) ?? null
  )
}

/** A band as a person reads it: from this much to that much. */
export interface BandThreshold {
  from: number
  /** Null on the open-ended top band. */
  to: number | null
  ratePercent: number
}

/**
 * Bands are stored as widths, because that is how the authority writes
 * them and how the tax is worked out. Nobody checking their own payslip
 * thinks in widths, so this turns them into the running thresholds each
 * band starts and stops at.
 */
export function bandThresholds(pack: CountryRulePack): BandThreshold[] {
  let floor = 0
  return pack.taxBands.map((band) => {
    const from = floor
    const to = band.upTo === null ? null : floor + band.upTo
    if (to !== null) floor = to
    return { from, to, ratePercent: band.ratePercent }
  })
}

/** The countries that have any rules at all. */
export function coveredCountries(packs: CountryRulePack[]): string[] {
  return [...new Set(packs.map((p) => p.country))].sort((a, b) =>
    a.localeCompare(b)
  )
}

/**
 * What changed between one version and the one before it — every field
 * that moved, not a summary of the ones somebody thought to mention. A
 * band that widens moves tax as surely as the tax-free amount does, and
 * a review that lists one without the other cannot be checked against
 * its own impact figure. Derived rather than written down, so it cannot
 * drift from the numbers it describes.
 */
export interface PackDifference {
  label: string
  before: string
  after: string
}

export function differences(
  previous: CountryRulePack,
  current: CountryRulePack,
  /** A component's display name; packs key treatments by internal id. */
  componentName: (id: string) => string
): PackDifference[] {
  const out: PackDifference[] = []
  const push = (label: string, before: unknown, after: unknown) => {
    const b = shown(before)
    const a = shown(after)
    if (a !== b) out.push({ label, before: b, after: a })
  }

  type Rated = { id: string; name: string; percentOfBase: number }
  const rated: [Rated[], Rated[]][] = [
    [previous.employeeContributionRules, current.employeeContributionRules],
    [previous.employerContributionRules, current.employerContributionRules],
    [previous.contributionAllocations, current.contributionAllocations],
  ]
  for (const [was, now] of rated)
    for (const id of idsOf(was, now)) {
      const b = was.find((r) => r.id === id)
      const a = now.find((r) => r.id === id)
      push(
        (a ?? b)!.name,
        b ? `${b.percentOfBase}%` : "none",
        a ? `${a.percentOfBase}%` : "none"
      )
    }

  // Bands by position: the first is the tax-free amount, the rest by the
  // rate they charge, which is how a payroll officer names them.
  const bandCount = Math.max(previous.taxBands.length, current.taxBands.length)
  for (let i = 0; i < bandCount; i += 1) {
    const b = previous.taxBands[i]
    const a = current.taxBands[i]
    const name =
      i === 0 && (a ?? b)?.ratePercent === 0
        ? "Tax-free amount"
        : `Width of the ${(a ?? b)!.ratePercent}% band`
    push(
      name,
      b ? (b.upTo ?? "the rest") : "none",
      a ? (a.upTo ?? "the rest") : "none"
    )
    if (a && b && a.ratePercent !== b.ratePercent)
      push(`Rate of band ${i + 1}`, `${b.ratePercent}%`, `${a.ratePercent}%`)
  }

  for (const id of idsOf(
    Object.keys(previous.componentTreatments).map((k) => ({ id: k })),
    Object.keys(current.componentTreatments).map((k) => ({ id: k }))
  )) {
    const b = previous.componentTreatments[id]
    const a = current.componentTreatments[id]
    const name = componentName(id)
    if (!a || !b) {
      push(`${name} treatment`, b ? "set" : "none", a ? "set" : "none")
      continue
    }
    push(`${name} cap`, b.cap ?? "none", a.cap ?? "none")
    push(`${name} taxable`, b.taxable ? "yes" : "no", a.taxable ? "yes" : "no")
    push(
      `${name} counts for social security`,
      b.socialSecurity ? "yes" : "no",
      a.socialSecurity ? "yes" : "no"
    )
    push(
      `${name} pre-tax limit`,
      b.preTax ? (b.preTax.upToPercentOfBase ?? "no limit") : "post-tax",
      a.preTax ? (a.preTax.upToPercentOfBase ?? "no limit") : "post-tax"
    )
  }

  for (const id of idsOf(previous.filingDeadlines, current.filingDeadlines)) {
    const b = previous.filingDeadlines.find((d) => d.id === id)
    const a = current.filingDeadlines.find((d) => d.id === id)
    push(`${(a ?? b)!.name} due`, b?.due ?? "none", a?.due ?? "none")
  }

  return out
}

function idsOf(
  a: readonly { id: string }[],
  b: readonly { id: string }[]
): string[] {
  return [...new Set([...a.map((x) => x.id), ...b.map((x) => x.id)])]
}

function shown(v: unknown): string {
  if (typeof v === "number") return String(Math.round(v * 100) / 100)
  return String(v)
}

/**
 * Who receives an allocation, in the country's terms. A company's own
 * choice is described by its role — the country's rules never name a
 * company's provider; the company records its own in its country setup.
 */
export function remitteeName(remittee: Remittee): string {
  if (remittee.kind === "authority") return remittee.name
  return `the company's chosen ${remittee.role}`
}

/**
 * The points between who pays and where it goes. Zero when the pack is
 * consistent; anything else means money is collected that nobody is
 * sent, or sent that nobody paid.
 */
export function allocationGap(pack: CountryRulePack): number {
  if (pack.contributionAllocations.length === 0) return 0
  const paid = [
    ...pack.employeeContributionRules,
    ...pack.employerContributionRules,
  ].reduce((n, r) => n + r.percentOfBase, 0)
  const sent = pack.contributionAllocations.reduce(
    (n, a) => n + a.percentOfBase,
    0
  )
  return Math.round((paid - sent) * 1000) / 1000
}

/** The countries somebody is paid in, read from the pay groups. */
export function paidCountries(groups: PayGroup[]): string[] {
  return [
    ...new Set(groups.map((g) => g.country).filter((c) => c !== "—")),
  ].sort((a, b) => a.localeCompare(b))
}

/**
 * How a component is treated in a country on a date. Null where the
 * country has no rules then, or its rules do not name the component.
 */
export function treatmentFor(
  packs: CountryRulePack[],
  country: string,
  componentId: string,
  onIso: string
): ComponentTreatment | null {
  return (
    packFor(packs, country, onIso)?.componentTreatments[componentId] ?? null
  )
}

/**
 * How a component is taxed, in the words both Pay components and Country
 * rules use — one function, so the two pages cannot describe the same
 * rule differently. A deduction is described by when it comes off; any
 * other component by whether it is taxed.
 */
export function taxTreatmentText(
  treatment: ComponentTreatment,
  category: ComponentCategory,
  money: (amount: number) => string
): { label: string; detail?: string } {
  if (category === "deduction") {
    if (!treatment.preTax) return { label: "Post-tax" }
    const limit = treatment.preTax.upToPercentOfBase
    return {
      label: "Pre-tax",
      detail:
        limit === undefined
          ? undefined
          : `Up to ${limit}% of base; post-tax above`,
    }
  }
  if (!treatment.taxable) return { label: "Not taxable" }
  if (treatment.cap !== undefined)
    return {
      label: `Exempt up to ${money(treatment.cap)} per period, taxable above`,
    }
  return { label: "Taxable" }
}
