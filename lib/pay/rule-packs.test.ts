import { describe, expect, it } from "vitest"

import {
  bandThresholds,
  coveredCountries,
  differences,
  packFor,
  versionsFor,
} from "./rule-packs"
import { COUNTRY_RULE_PACKS } from "../data/pay"
import type { CountryRulePack } from "./types"

const base: CountryRulePack = {
  country: "Testland",
  version: "1",
  effectiveFrom: "2024-01-01",
  componentTreatments: {},
  employeeContributionRules: [],
  employerContributionRules: [],
  voluntarySchemes: [],
  taxBands: [],
  statutoryReports: [],
  filingDeadlines: [],
  updates: [],
}

const v = (version: string, effectiveFrom: string): CountryRulePack => ({
  ...base,
  version,
  effectiveFrom,
})

describe("choosing the rules in force", () => {
  const packs = [
    v("2024.1", "2024-01-01"),
    v("2026.1", "2026-01-01"),
    v("2025.1", "2025-01-01"),
  ]

  it("picks the latest version that had already started", () => {
    expect(packFor(packs, "Testland", "2025-06-30")?.version).toBe("2025.1")
  })

  it("picks the version in force on its own first day", () => {
    expect(packFor(packs, "Testland", "2026-01-01")?.version).toBe("2026.1")
  })

  it("does not reach forward to rules that had not started", () => {
    // The day before the 2026 pack begins still pays 2025's rules.
    expect(packFor(packs, "Testland", "2025-12-31")?.version).toBe("2025.1")
  })

  it("has nothing to offer before the first version", () => {
    expect(packFor(packs, "Testland", "2023-12-31")).toBeNull()
  })

  it("has nothing to offer for a country it does not cover", () => {
    expect(packFor(packs, "Nigeria", "2026-01-01")).toBeNull()
  })

  it("lists versions newest first, whatever order they were written in", () => {
    expect(versionsFor(packs, "Testland").map((p) => p.version)).toEqual([
      "2026.1",
      "2025.1",
      "2024.1",
    ])
  })

  it("names only countries that have rules", () => {
    expect(coveredCountries(packs)).toEqual(["Testland"])
  })
})

describe("the Ghana pack as shipped", () => {
  it("pays a September 2026 period under the 2026 rules", () => {
    expect(packFor(COUNTRY_RULE_PACKS, "Ghana", "2026-09-30")?.version).toBe(
      "2026.1"
    )
  })

  it("still pays a 2025 period under the 2025 rules", () => {
    // The point of keeping the old version: re-running a closed period
    // must reproduce what people were actually paid.
    expect(packFor(COUNTRY_RULE_PACKS, "Ghana", "2025-08-31")?.version).toBe(
      "2025.1"
    )
  })

  it("has no rules for Nigeria, whose results are uploaded", () => {
    expect(packFor(COUNTRY_RULE_PACKS, "Nigeria", "2026-09-30")).toBeNull()
  })
})

describe("reading bands as thresholds", () => {
  const pack: CountryRulePack = {
    ...base,
    // Widths of 500, 1,500 and the rest.
    taxBands: [
      { upTo: 500, ratePercent: 0 },
      { upTo: 1500, ratePercent: 10 },
      { upTo: null, ratePercent: 25 },
    ],
  }

  it("turns widths into the amounts each band runs between", () => {
    expect(bandThresholds(pack)).toEqual([
      { from: 0, to: 500, ratePercent: 0 },
      { from: 500, to: 2000, ratePercent: 10 },
      { from: 2000, to: null, ratePercent: 25 },
    ])
  })

  it("leaves the top band open-ended", () => {
    expect(bandThresholds(pack).at(-1)!.to).toBeNull()
  })

  it("reads the real Ghana bands as starting free up to 490", () => {
    const ghana = packFor(COUNTRY_RULE_PACKS, "Ghana", "2026-09-30")!
    const bands = bandThresholds(ghana)
    expect(bands[0]).toEqual({ from: 0, to: 490, ratePercent: 0 })
    expect(bands[1].from).toBe(490)
    expect(bands[1].to).toBe(600)
  })
})

describe("what changed between versions", () => {
  const ghana2026 = packFor(COUNTRY_RULE_PACKS, "Ghana", "2026-09-30")!
  const ghana2025 = packFor(COUNTRY_RULE_PACKS, "Ghana", "2025-08-31")!

  it("reports the tax-free amount moving from 402 to 490", () => {
    const moved = differences(ghana2025, ghana2026)
    expect(moved).toContainEqual({
      label: "Tax-free amount",
      before: "402",
      after: "490",
    })
  })

  it("reports the transport cap moving", () => {
    const moved = differences(ghana2025, ghana2026)
    expect(moved.some((m) => m.label.includes("pc-transport"))).toBe(true)
  })

  it("says nothing changed when nothing did", () => {
    expect(differences(ghana2026, ghana2026)).toEqual([])
  })

  it("reports a contribution rate moving", () => {
    const before: CountryRulePack = {
      ...base,
      employeeContributionRules: [
        {
          id: "ss",
          name: "Social security",
          percentOfBase: 5,
          remittedTo: "The fund",
          note: "",
        },
      ],
    }
    const after: CountryRulePack = {
      ...before,
      employeeContributionRules: [
        { ...before.employeeContributionRules[0], percentOfBase: 5.5 },
      ],
    }
    expect(differences(before, after)).toEqual([
      { label: "Social security", before: "5%", after: "5.5%" },
    ])
  })
})
