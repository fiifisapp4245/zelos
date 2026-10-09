import type { CountryRulePack } from "./types"

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
  current: CountryRulePack
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
        label: `${id} cap`,
        before: was.cap === undefined ? "none" : String(was.cap),
        after: treatment.cap === undefined ? "none" : String(treatment.cap),
      })
  }

  return out
}
