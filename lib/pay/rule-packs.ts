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
 * What changed between one version and the one before it, in the terms a
 * payroll officer would ask: did the bands move, did a rate move, did a
 * cap move. Derived rather than written down, so it cannot drift from
 * the numbers it describes.
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

  for (const rule of current.employeeContributionRules) {
    const was = previous.employeeContributionRules.find(
      (r) => r.id === rule.id
    )
    if (was && was.percentOfBase !== rule.percentOfBase)
      out.push({
        label: rule.name,
        before: `${was.percentOfBase}%`,
        after: `${rule.percentOfBase}%`,
      })
  }

  for (const rule of current.employerContributionRules) {
    const was = previous.employerContributionRules.find(
      (r) => r.id === rule.id
    )
    if (was && was.percentOfBase !== rule.percentOfBase)
      out.push({
        label: rule.name,
        before: `${was.percentOfBase}%`,
        after: `${rule.percentOfBase}%`,
      })
  }

  for (const allocation of current.contributionAllocations) {
    const was = previous.contributionAllocations.find(
      (a) => a.id === allocation.id
    )
    if (was && was.percentOfBase !== allocation.percentOfBase)
      out.push({
        label: allocation.name,
        before: `${was.percentOfBase}%`,
        after: `${allocation.percentOfBase}%`,
      })
  }

  const freeBefore = previous.taxBands.find((b) => b.ratePercent === 0)?.upTo
  const freeAfter = current.taxBands.find((b) => b.ratePercent === 0)?.upTo
  if (freeBefore !== freeAfter && freeBefore != null && freeAfter != null)
    out.push({
      label: "Tax-free amount",
      before: String(freeBefore),
      after: String(freeAfter),
    })

  for (const [id, treatment] of Object.entries(current.componentTreatments)) {
    const was = previous.componentTreatments[id]
    if (was && was.cap !== treatment.cap)
      out.push({
        label: `${componentName(id)} cap`,
        before: was.cap === undefined ? "none" : String(was.cap),
        after: treatment.cap === undefined ? "none" : String(treatment.cap),
      })
  }

  return out
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
  return [...new Set(groups.map((g) => g.country).filter((c) => c !== "—"))]
    .sort((a, b) => a.localeCompare(b))
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
  return packFor(packs, country, onIso)?.componentTreatments[componentId] ?? null
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
