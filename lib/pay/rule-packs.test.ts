import { describe, expect, it } from "vitest"

import {
  bandThresholds,
  coveredCountries,
  differences,
  packFor,
  paidCountries,
  taxTreatmentText,
  treatmentFor,
  versionsFor,
} from "./rule-packs"
import { COUNTRY_RULE_PACKS, PAY_COMPONENTS } from "../data/pay"
import type { CountryRulePack, PayGroup } from "./types"

const base: CountryRulePack = {
  country: "Testland",
  version: "1",
  effectiveFrom: "2024-01-01",
  componentTreatments: {},
  employeeContributionRules: [],
  employerContributionRules: [],
  contributionAllocations: [],
  voluntarySchemes: [],
  payees: [],
  registrations: [],
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
  const name = (id: string) =>
    PAY_COMPONENTS.find((c) => c.id === id)?.name ?? id
  const ghana2026 = packFor(COUNTRY_RULE_PACKS, "Ghana", "2026-09-30")!
  const ghana2025 = packFor(COUNTRY_RULE_PACKS, "Ghana", "2025-08-31")!

  it("reports the tax-free amount moving from 402 to 490", () => {
    const moved = differences(ghana2025, ghana2026, name)
    expect(moved).toContainEqual({
      label: "Tax-free amount",
      before: "402",
      after: "490",
    })
  })

  it("reports the transport cap moving", () => {
    const moved = differences(ghana2025, ghana2026, name)
    expect(moved).toContainEqual({
      label: "Transport allowance cap",
      before: "250",
      after: "300",
    })
  })

  it("names components as people know them, never by internal id", () => {
    const moved = differences(ghana2025, ghana2026, name)
    expect(moved.map((m) => m.label)).toContain("Fuel card cap")
    expect(moved.some((m) => m.label.includes("pc-"))).toBe(false)
  })

  it("says nothing changed when nothing did", () => {
    expect(differences(ghana2026, ghana2026, name)).toEqual([])
  })

  it("reports a contribution rate moving", () => {
    const before: CountryRulePack = {
      ...base,
      employeeContributionRules: [
        {
          id: "ss",
          name: "Social security",
          percentOfBase: 5,
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
    expect(differences(before, after, name)).toEqual([
      { label: "Social security", before: "5%", after: "5.5%" },
    ])
  })
})

describe("how a component's tax treatment is worded", () => {
  const ghs = (n: number) => `GHS ${n}`

  it("words a cap as exempt up to it and taxed above, with currency", () => {
    expect(
      taxTreatmentText(
        { taxable: true, socialSecurity: false, cap: 300 },
        "allowance",
        ghs
      ).label
    ).toBe("Exempt up to GHS 300 per period, taxable above")
  })

  it("words a deduction by when it comes off, not whether it is taxed", () => {
    expect(
      taxTreatmentText(
        { taxable: false, socialSecurity: false },
        "deduction",
        ghs
      )
    ).toEqual({ label: "Post-tax" })
    expect(
      taxTreatmentText(
        {
          taxable: false,
          socialSecurity: false,
          preTax: { upToPercentOfBase: 16.5 },
        },
        "deduction",
        ghs
      )
    ).toEqual({
      label: "Pre-tax",
      detail: "Up to 16.5% of base; post-tax above",
    })
  })
})

describe("Ghana's component treatments", () => {
  const ghana = packFor(COUNTRY_RULE_PACKS, "Ghana", "2026-09-30")!

  it("never caps something it does not tax, which would mean nothing", () => {
    for (const pack of COUNTRY_RULE_PACKS)
      for (const [id, t] of Object.entries(pack.componentTreatments))
        expect({ id, capOnUntaxed: t.cap !== undefined && !t.taxable }).toEqual(
          { id, capOnUntaxed: false }
        )
  })

  it("names only components the library holds", () => {
    const library = new Set(PAY_COMPONENTS.map((c) => c.id))
    for (const id of Object.keys(ghana.componentTreatments))
      if (id !== "pc-base") expect(library).toContain(id)
  })

  it("keeps statutory contributions out of the component library", () => {
    // They are the pack's to state and the engine's to work out. A
    // component beside them is a second, editable answer to the same
    // question — the thing F10 removed from settings.
    for (const c of PAY_COMPONENTS)
      expect(c.name).not.toMatch(/SSNIT|Tier [12]\b/)
  })

  it("relieves Tier 3 from tax up to a limit, and says to check it", () => {
    const tier3 = ghana.componentTreatments["pc-tier3"]
    expect(tier3.preTax?.upToPercentOfBase).toBe(16.5)
    expect(tier3.toVerify).toBeTruthy()
  })

  it("marks mobile data's treatment for checking", () => {
    expect(ghana.componentTreatments["pc-mobile-data"].toVerify).toBeTruthy()
  })
})

describe("switching country on Pay components", () => {
  // A second country with rules of its own, which the seed data does not
  // have yet: the switch has to read it, not fall back to Ghana.
  const testland: CountryRulePack = {
    ...base,
    country: "Testland",
    componentTreatments: {
      "pc-transport": { taxable: true, socialSecurity: true },
    },
  }
  const packs = [...COUNTRY_RULE_PACKS, testland]
  const group = (id: string, country: string): PayGroup => ({
    id,
    name: id,
    entityId: "ent",
    country,
    currency: "GHS",
    frequency: "monthly",
    payDayRule: "",
    paymentChannels: [],
    varianceThresholdPercent: 10,
    prorationMethod: "thirtieths",
      calculationMode: "native",
  })

  it("offers each country somebody is paid in, once, and no contractors", () => {
    expect(
      paidCountries([
        group("a", "Testland"),
        group("b", "Ghana"),
        group("c", "Ghana"),
        group("d", "—"),
      ])
    ).toEqual(["Ghana", "Testland"])
  })

  it("shows the chosen country's treatment, not the first pack's", () => {
    const inGhana = treatmentFor(packs, "Ghana", "pc-transport", "2026-09-30")
    const inTestland = treatmentFor(
      packs,
      "Testland",
      "pc-transport",
      "2026-09-30"
    )
    expect(inGhana?.cap).toBe(300)
    expect(inTestland).toEqual({ taxable: true, socialSecurity: true })
  })

  it("has nothing to show for a component the country does not name", () => {
    expect(
      treatmentFor(packs, "Testland", "pc-fuel-card", "2026-09-30")
    ).toBeNull()
  })

  it("has nothing to show for a country with no rules", () => {
    expect(
      treatmentFor(packs, "Nigeria", "pc-transport", "2026-09-30")
    ).toBeNull()
  })
})
