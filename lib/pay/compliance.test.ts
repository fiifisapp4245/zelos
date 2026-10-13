import { describe, expect, it } from "vitest"

import {
  complianceCalendar,
  packImpact,
  reportRows,
  statusOf,
  toCsv,
  upcomingVersions,
} from "./compliance"
import {
  COMPENSATION_VERSIONS,
  COUNTRY_RULE_PACKS,
  COUNTRY_SETUPS,
  FILING_RECORDS,
  PAY_COMPONENTS,
  PAY_GROUPS,
} from "../data/pay"
import { packFor } from "./rule-packs"
import type { FilingDeadline, PayrollLine } from "./types"

const TODAY = "2026-09-18"
const ghana = packFor(COUNTRY_RULE_PACKS, "Ghana", TODAY)!
const deadline = (id: string) =>
  ghana.filingDeadlines.find((d) => d.id === id)!

describe("versions published ahead of time", () => {
  it("finds Ghana 2027.1 as upcoming, and nothing for a country without rules", () => {
    expect(
      upcomingVersions(COUNTRY_RULE_PACKS, "Ghana", TODAY).map((p) => p.version)
    ).toEqual(["2027.1"])
    expect(upcomingVersions(COUNTRY_RULE_PACKS, "Nigeria", TODAY)).toEqual([])
  })

  it("is no longer upcoming once it is in force", () => {
    expect(upcomingVersions(COUNTRY_RULE_PACKS, "Ghana", "2027-01-01")).toEqual(
      []
    )
  })

  it("keeps the Tier 2 trustee in the company's setup, in no version of the rules", () => {
    for (const pack of COUNTRY_RULE_PACKS)
      expect(JSON.stringify(pack)).not.toContain("Petra")
    expect(
      COUNTRY_SETUPS.find((c) => c.country === "Ghana")?.providers.tier2
    ).toBe("Petra Trust")
  })
})

describe("what a new version does to pay", () => {
  const next = COUNTRY_RULE_PACKS.find((p) => p.version === "2027.1")!
  const [impact] = packImpact({
    next,
    packs: COUNTRY_RULE_PACKS,
    groups: PAY_GROUPS,
    versions: COMPENSATION_VERSIONS,
    components: PAY_COMPONENTS,
  })

  it("compares only the groups Zelos calculates in that country", () => {
    expect(impact.groupId).toBe("pg-gh-monthly")
    expect(impact.people).toBeGreaterThan(0)
  })

  it("lowers tax and raises net when the tax-free amount goes up", () => {
    expect(impact.after.tax).toBeLessThan(impact.before.tax)
    expect(impact.after.net).toBeGreaterThan(impact.before.net)
    expect(impact.affected).toBeGreaterThan(0)
  })

  it("leaves gross and employer cost alone when only the bands move", () => {
    expect(impact.after.gross).toBe(impact.before.gross)
    expect(impact.after.employerCost).toBe(impact.before.employerCost)
  })

  it("moves net by exactly what tax moved", () => {
    const tax = impact.before.tax - impact.after.tax
    const net = impact.after.net - impact.before.net
    expect(Math.round((net - tax) * 100)).toBe(0)
  })
})

describe("what a deadline's status is", () => {
  const ret = deadline("paye-return")
  const remit = deadline("ssnit-contributions")
  const filed = { on: "2026-09-10", ref: "x", by: "maame" }
  const record = (over = {}) => ({
    id: "r",
    country: "Ghana",
    deadlineId: "x",
    period: "2026-08",
    ...over,
  })

  it("calls a return done once filed", () => {
    expect(statusOf(ret, record({ filed }), "2026-09-15", TODAY)).toBe("filed")
  })

  it("calls a remittance done only once paid", () => {
    expect(
      statusOf(remit, record({ filed, paid: filed }), "2026-09-14", TODAY)
    ).toBe("paid")
  })

  it("calls a remittance overdue if it was filed but never paid", () => {
    expect(statusOf(remit, record({ filed }), "2026-09-14", TODAY)).toBe(
      "overdue"
    )
  })

  it("calls something not yet due, due — and not overdue on the day", () => {
    expect(statusOf(ret, null, "2026-10-15", TODAY)).toBe("due")
    expect(statusOf(ret, null, TODAY, TODAY)).toBe("due")
  })
})

describe("the compliance calendar", () => {
  const rows = complianceCalendar({
    pack: ghana,
    filings: FILING_RECORDS,
    todayIso: TODAY,
  })
  const row = (deadlineId: string, period: string) =>
    rows.find((r) => r.deadline.id === deadlineId && r.period === period)!

  it("has a row per monthly deadline for four months, and two annual ones", () => {
    expect(rows).toHaveLength(3 * 4 + 2)
  })

  it("dates a month's deadline in the month after it", () => {
    expect(row("paye-return", "2026-08").dueOn).toBe("2026-09-15")
    expect(row("annual-return", "2025").dueOn).toBe("2026-04-30")
  })

  it("shows August's PAYE filed and its SSNIT paid", () => {
    expect(row("paye-return", "2026-08").status).toBe("filed")
    expect(row("ssnit-contributions", "2026-08").status).toBe("paid")
  })

  it("escalates August's Tier 2 remittance, which nobody paid", () => {
    const tier2 = row("tier2-remittance", "2026-08")
    expect(tier2.status).toBe("overdue")
    expect(tier2.escalated).toBe(true)
  })

  it("reminds the owner three days ahead, and not before", () => {
    const sept = row("paye-return", "2026-09")
    expect(sept.remindOn).toBe("2026-10-12")
    expect(sept.reminded).toBe(false)
    const early = complianceCalendar({
      pack: ghana,
      filings: [],
      todayIso: "2026-10-12",
    }).find((r) => r.deadline.id === "paye-return" && r.period === "2026-09")!
    expect(early.reminded).toBe(true)
  })
})

describe("statutory report contents", () => {
  const line = {
    employeeId: "kofi",
    gross: 5000,
    currency: "GHS",
    deductions: [{ componentId: "pc-paye", label: "PAYE", amount: 612.5 }],
  } as unknown as PayrollLine
  const person = { name: "Kofi Mensah", tin: "P001", ssnitNumber: "S001" }
  const rowsFor = (d: FilingDeadline) =>
    reportRows(d, ghana, [{ line, base: 5000, person }])

  it("sends SSNIT its Tier 1 share and the trustee its Tier 2 share", () => {
    expect(rowsFor(deadline("ssnit-contributions"))[1]).toEqual([
      "Kofi Mensah",
      "S001",
      "5000.00",
      "675.00",
    ])
    expect(rowsFor(deadline("tier2-remittance"))[1][3]).toBe("250.00")
  })

  it("puts the income tax on the PAYE return", () => {
    expect(rowsFor(deadline("paye-return"))[1]).toEqual([
      "Kofi Mensah",
      "P001",
      "5000.00",
      "612.50",
    ])
  })

  it("quotes every cell, so a comma in a name stays in one", () => {
    expect(toCsv([["Mensah, Kofi", 'say "hi"']])).toBe(
      '"Mensah, Kofi","say ""hi"""'
    )
  })
})
