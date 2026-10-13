import { describe, expect, it } from "vitest"

import { TABLE_ROWS, TABLE_SPECS } from "./settings-tables"
import { COUNTRY_RULE_PACKS } from "./pay"

/**
 * Settings tables are company policy, and nothing else.
 *
 * A statutory rate belongs to one place — the country rule pack — because
 * the moment it can also be typed into a settings table there are two
 * answers to "what is the employee contribution", and payroll will pick
 * the wrong one on the month it matters. These tests fail when somebody
 * adds a second source of truth, which is easier to do than it sounds.
 */

/**
 * Named schemes and authorities, not categories.
 *
 * A column headed "Social security" is fine — it asks whether the
 * country's scheme applies, which is a company's own answer per
 * employment type. A column headed "SSNIT" or "PAYE" has stopped asking
 * and started asserting, and it only reads correctly in one country.
 */
const STATUTORY_TERMS = [
  "ssnit",
  "paye",
  "gra",
  "tax band",
  "chargeable income",
  "tier 1",
  "tier 2",
  "tier 3",
]

/** Whole words only — "GRA" is an authority, "Grade" is a pay band. */
function mentionsStatute(text: string) {
  const lower = text.toLowerCase()
  return STATUTORY_TERMS.filter((term) =>
    new RegExp(`\\b${term}\\b`).test(lower)
  )
}

describe("settings tables hold no statutory rules", () => {
  it("has retired the editable SSNIT and PAYE tables", () => {
    for (const id of ["ssnit-tiers", "paye-bands", "allowances", "deductions"])
      expect(TABLE_SPECS[id], `${id} is still a settings table`).toBeUndefined()
  })

  it("names no statutory scheme in a column label", () => {
    const offenders: string[] = []
    for (const spec of Object.values(TABLE_SPECS))
      for (const column of spec.columns) {
        const hits = mentionsStatute(column.label)
        if (hits.length > 0)
          offenders.push(`${spec.id}.${column.key} — "${column.label}"`)
      }
    expect(offenders).toEqual([])
  })

  it("holds no percentage or money amount in a row value", () => {
    const offenders: string[] = []
    for (const [tableId, rows] of Object.entries(TABLE_ROWS))
      for (const row of rows)
        for (const [key, value] of Object.entries(row)) {
          if (typeof value !== "string") continue
          // A multiplier like "1.5×" is a company decision; a percentage
          // or a cedi figure in a rate column is the law being retyped.
          if (/\d\s*%/.test(value) && mentionsStatute(value).length > 0)
            offenders.push(`${tableId}.${key} — "${value}"`)
        }
    expect(offenders).toEqual([])
  })

  it("keeps the overtime multipliers, which are a company's own choice", () => {
    // Layer 2, and HR should be able to change it. Retiring the statutory
    // tables must not take the legitimately configurable ones with it.
    expect(TABLE_SPECS["overtime-rates"]).toBeDefined()
    expect(TABLE_ROWS["overtime-rates"].length).toBeGreaterThan(0)
  })
})

describe("the rule pack carries what the tables used to show", () => {
  const ghana = COUNTRY_RULE_PACKS.find((p) => p.country === "Ghana")!

  it("states the employee contribution the SSNIT table stated", () => {
    const employee = ghana.employeeContributionRules[0]
    expect(employee.percentOfBase).toBe(5.5)
  })

  it("charges the employer 13% in all, not 13% plus Tier 2", () => {
    const employer = ghana.employerContributionRules.reduce(
      (n, r) => n + r.percentOfBase,
      0
    )
    expect(employer).toBe(13)
  })

  it("sends the 18.5% to SSNIT and the Tier 2 trustee, 13.5 and 5", () => {
    const byId = Object.fromEntries(
      ghana.contributionAllocations.map((a) => [a.id, a])
    )
    expect(byId["tier1"].percentOfBase).toBe(13.5)
    expect(byId["tier1"].remittedTo).toEqual({
      kind: "authority",
      name: "SSNIT",
    })
    expect(byId["tier2"].percentOfBase).toBe(5)
  })

  it("leaves the Tier 2 trustee to the company, not the country", () => {
    const tier2 = ghana.contributionAllocations.find((a) => a.id === "tier2")!
    expect(tier2.remittedTo.kind).toBe("company_choice")
    // A trustee is one company's appointment; naming it in the country's
    // rules would hand it to every company paying in Ghana.
    expect(JSON.stringify(ghana)).not.toContain("Petra")
  })

  it("keeps Tier 3 as a scheme without a rate, because it is voluntary", () => {
    const tier3 = ghana.voluntarySchemes.find((s) => s.id === "tier3")
    expect(tier3).toBeDefined()
    // It must not sit among the mandatory rules, or everyone would be
    // deducted for a scheme they never joined.
    expect(
      ghana.employeeContributionRules.some((r) => r.id === "tier3")
    ).toBe(false)
  })

  it("carries the same seven PAYE bands the table listed", () => {
    expect(ghana.taxBands.map((b) => b.ratePercent)).toEqual([
      0, 5, 10, 17.5, 25, 30, 35,
    ])
    expect(ghana.taxBands[0].upTo).toBe(490)
    // The top band is open-ended, which a typed table could not say.
    expect(ghana.taxBands.at(-1)!.upTo).toBeNull()
  })
})
