import { describe, expect, it } from "vitest"

import {
  applyChange,
  calculationModeFor,
  canApprove,
  currentVersion,
  derivePayGroup,
  employerCost,
  history,
  isBlocked,
  nextPeriodStart,
  periodFor,
  prorate,
  scheduledVersion,
} from "./derive"
import { canProposeFor, payRoleOf, payScope } from "./access"
import { money, totalPerCurrency } from "./money"
import type { Employee } from "../types"
import type {
  CompensationChangeRequest,
  CompensationVersion,
  CountryRulePack,
  LegalEntity,
  PayComponent,
  PayGroup,
} from "./types"

const GHANA: LegalEntity = {
  id: "ent-gh",
  name: "Xanthan Services Limited",
  country: "Ghana",
  currency: "GHS",
}
const NIGERIA: LegalEntity = {
  id: "ent-ng",
  name: "Xanthan Nigeria Limited",
  country: "Nigeria",
  currency: "NGN",
}

const GH_GROUP: PayGroup = {
  id: "pg-gh",
  name: "Ghana monthly",
  entityId: "ent-gh",
  country: "Ghana",
  currency: "GHS",
  frequency: "monthly",
  payDayRule: "28th",
  paymentChannels: ["bank_transfer"],
  varianceThresholdPercent: 10,
  calculationMode: "native",
}
const NG_GROUP: PayGroup = {
  ...GH_GROUP,
  id: "pg-ng",
  name: "Nigeria monthly",
  entityId: "ent-ng",
  country: "Nigeria",
  currency: "NGN",
  calculationMode: "external",
}
const CONTRACTORS: PayGroup = {
  ...GH_GROUP,
  id: "pg-contract",
  name: "International contractors",
  country: "—",
  currency: "USD",
  calculationMode: "contractor",
  contractorGroup: true,
}

const RULE_PACK: CountryRulePack = {
  country: "Ghana",
  version: "2026.1",
  effectiveFrom: "2026-01-01",
  componentTreatments: {
    "pc-transport": { taxable: false, socialSecurity: false, cap: 300 },
  },
  employerContributionRules: [
    { id: "ssnit", name: "SSNIT employer", percentOfBase: 13, note: "" },
  ],
  employeeContributionRules: [
    {
      id: "ssnit-employee",
      name: "SSNIT employee",
      percentOfBase: 5.5,
      note: "",
    },
  ],
  taxBands: [
    { upTo: 490, ratePercent: 0 },
    { upTo: null, ratePercent: 25 },
  ],
  statutoryReports: [],
  filingDeadlines: [],
  updates: [],
}

const COMPONENTS: PayComponent[] = [
  {
    id: "pc-transport",
    name: "Transport allowance",
    category: "allowance",
    calculation: "fixed",
    recurrence: "recurring",
  },
  {
    id: "pc-loan",
    name: "Staff loan repayment",
    category: "deduction",
    calculation: "fixed",
    recurrence: "recurring",
  },
]

const version = (
  over: Partial<CompensationVersion> = {}
): CompensationVersion => ({
  id: "cv-1",
  employeeId: "kofi",
  versionNumber: 1,
  effectiveFrom: "2026-01-01",
  entityId: "ent-gh",
  workCountry: "Ghana",
  taxResidency: "Ghana",
  workerType: "employee",
  payGroupId: "pg-gh",
  payBasis: "salaried",
  baseAmount: 8000,
  currency: "GHS",
  frequency: "monthly",
  components: [],
  reason: "Annual review",
  proposedBy: "fiifi",
  proposedAt: "2025-12-01T09:00:00",
  approvedBy: "esi",
  approvedAt: "2025-12-05T09:00:00",
  status: "effective",
  supersedesVersionId: null,
  changeRequestId: null,
  ...over,
})

const request = (
  over: Partial<CompensationChangeRequest> = {}
): CompensationChangeRequest => ({
  id: "cr-1",
  kind: "individual",
  employeeIds: ["kofi"],
  definition: { type: "percent", value: 10 },
  effectiveFrom: "2026-10-01",
  reason: "Market adjustment",
  proposedBy: "fiifi",
  status: "pending",
  decision: null,
  events: [],
  ...over,
})

describe("versions", () => {
  const versions = [
    version({
      id: "a",
      versionNumber: 1,
      effectiveFrom: "2025-01-01",
      status: "superseded",
      baseAmount: 6000,
    }),
    version({
      id: "b",
      versionNumber: 2,
      effectiveFrom: "2026-01-01",
      status: "effective",
      baseAmount: 8000,
    }),
    version({
      id: "c",
      versionNumber: 3,
      effectiveFrom: "2026-11-01",
      status: "scheduled",
      baseAmount: 9000,
    }),
  ]

  it("reads the version in force on a date, not the latest one written", () => {
    expect(currentVersion(versions, "kofi", "2025-06-30")?.id).toBe("a")
    expect(currentVersion(versions, "kofi", "2026-09-18")?.id).toBe("b")
  })

  it("does not treat a scheduled raise as what someone is paid today", () => {
    expect(currentVersion(versions, "kofi", "2026-09-18")?.baseAmount).toBe(
      8000
    )
    expect(scheduledVersion(versions, "kofi", "2026-09-18")?.id).toBe("c")
  })

  it("returns nothing where there is nothing on file yet", () => {
    expect(currentVersion(versions, "ama", "2026-09-18")).toBeNull()
  })

  it("reads history newest first", () => {
    expect(history(versions, "kofi").map((v) => v.id)).toEqual(["c", "b", "a"])
  })
})

describe("derivePayGroup", () => {
  const source = {
    entities: [GHANA, NIGERIA],
    payGroups: [GH_GROUP, NG_GROUP, CONTRACTORS],
    rulePacks: [RULE_PACK],
  }

  it("puts an employee in their entity's group", () => {
    const result = derivePayGroup("ent-ng", "Nigeria", "employee", source)
    expect(isBlocked(result)).toBe(false)
    expect((result as PayGroup).id).toBe("pg-ng")
  })

  it("puts any contractor in the contractor group, wherever they are", () => {
    const result = derivePayGroup(null, "Kenya", "contractor", source)
    expect((result as PayGroup).id).toBe("pg-contract")
  })

  it("blocks a country with no entity, and says what the two ways out are", () => {
    const result = derivePayGroup(null, "Rwanda", "employee", source)
    expect(isBlocked(result)).toBe(true)
    if (isBlocked(result)) {
      expect(result.blocked).toContain("Rwanda")
      expect(result.options).toEqual([
        "convert_to_contractor",
        "register_entity",
      ])
    }
  })

  it("derives the calculation mode from whether rules exist", () => {
    expect(calculationModeFor("Ghana", false, [RULE_PACK])).toBe("native")
    expect(calculationModeFor("Nigeria", false, [RULE_PACK])).toBe("external")
    expect(calculationModeFor("Ghana", true, [RULE_PACK])).toBe("contractor")
  })
})

describe("periods", () => {
  it("finds the next monthly start, over a year end", () => {
    expect(nextPeriodStart(GH_GROUP, "2026-09-18")).toBe("2026-10-01")
    expect(nextPeriodStart(GH_GROUP, "2026-12-31")).toBe("2027-01-01")
  })

  it("splits a twice-monthly month at the 16th", () => {
    const g = { ...GH_GROUP, frequency: "semi_monthly" as const }
    expect(nextPeriodStart(g, "2026-09-03")).toBe("2026-09-16")
    expect(nextPeriodStart(g, "2026-09-18")).toBe("2026-10-01")
  })

  it("moves weekly to the next Monday", () => {
    expect(
      nextPeriodStart({ ...GH_GROUP, frequency: "weekly" }, "2026-09-18")
    ).toBe("2026-09-21")
  })

  it("keeps bi-weekly on its anchor", () => {
    const g = { ...GH_GROUP, frequency: "bi_weekly" as const }
    expect(nextPeriodStart(g, "2026-09-18")).toBe("2026-09-28")
  })

  it("gives the period a date falls in", () => {
    expect(periodFor(GH_GROUP, "2026-09-18")).toEqual({
      start: "2026-09-01",
      end: "2026-09-30",
    })
  })
})

describe("prorate", () => {
  const period = { start: "2026-09-01", end: "2026-09-30" }

  it("pays the new rate in full when the change lands on the first day", () => {
    const p = prorate(8000, 9000, "2026-09-01", period)
    expect(p.midPeriod).toBe(false)
    expect(p.amount).toBe(9000)
  })

  it("pays both rates when the change lands mid-period", () => {
    const p = prorate(8000, 9000, "2026-09-16", period)
    expect(p.midPeriod).toBe(true)
    expect(p.daysOnOld).toBe(15)
    expect(p.daysOnNew).toBe(15)
    expect(p.amount).toBe(8500)
  })

  it("leaves the period alone when the change is after it", () => {
    const p = prorate(8000, 9000, "2026-10-01", period)
    expect(p.amount).toBe(8000)
    expect(p.daysOnNew).toBe(0)
  })
})

describe("employerCost", () => {
  it("counts allowances as pay and contributions on top", () => {
    const c = employerCost(
      version({ components: [{ componentId: "pc-transport", amount: 300 }] }),
      RULE_PACK,
      COMPONENTS
    )
    expect(c.monthly.gross).toBe(8300)
    expect(c.monthly.employerContributions).toBe(1040)
    expect(c.monthly.total).toBe(9340)
    expect(c.annual.total).toBe(112080)
  })

  it("leaves the employee's own deductions out of the cost", () => {
    const c = employerCost(
      version({ components: [{ componentId: "pc-loan", amount: 500 }] }),
      RULE_PACK,
      COMPONENTS
    )
    expect(c.monthly.gross).toBe(8000)
  })

  it("adds nothing on top of a contractor's invoice", () => {
    const c = employerCost(
      version({ workerType: "contractor", currency: "USD" }),
      null,
      COMPONENTS
    )
    expect(c.monthly.employerContributions).toBe(0)
    expect(c.monthly.total).toBe(8000)
  })

  it("annualises a weekly figure by its own frequency", () => {
    const c = employerCost(
      version({ frequency: "weekly", baseAmount: 1000 }),
      null,
      []
    )
    expect(c.annual.gross).toBe(52000)
  })
})

describe("canApprove", () => {
  const hr = { employeeId: "serwa", roles: ["hr_admin"] }

  it("lets a second HR Admin approve", () => {
    expect(canApprove(hr, request()).allowed).toBe(true)
  })

  it("refuses the person who proposed it", () => {
    const check = canApprove(
      { employeeId: "fiifi", roles: ["hr_admin"] },
      request()
    )
    expect(check.allowed).toBe(false)
    expect(check.reason).toContain("proposed")
  })

  it("refuses a change to the approver's own pay", () => {
    const check = canApprove(hr, request({ employeeIds: ["kofi", "serwa"] }))
    expect(check.allowed).toBe(false)
    expect(check.reason).toContain("your own pay")
  })

  it("refuses a role that is not the compensation approver", () => {
    expect(
      canApprove({ employeeId: "maame", roles: ["payroll"] }, request()).allowed
    ).toBe(false)
  })

  it("refuses a request that has already been decided", () => {
    expect(canApprove(hr, request({ status: "approved" })).allowed).toBe(false)
  })
})

describe("applyChange", () => {
  const versions = [
    version({ id: "a", employeeId: "kofi", baseAmount: 8000 }),
    version({ id: "b", employeeId: "ama", baseAmount: 12000 }),
  ]

  it("works out a percentage per person", () => {
    const rows = applyChange(
      { type: "percent", value: 10 },
      ["kofi", "ama"],
      versions,
      "2026-09-18"
    )
    expect(rows[0].newAmount).toBe(8800)
    expect(rows[1].newAmount).toBe(13200)
    expect(rows[1].delta).toBe(1200)
  })

  it("works out a flat increase and a replacement amount", () => {
    expect(
      applyChange(
        { type: "fixed_increase", value: 500 },
        ["kofi"],
        versions,
        "2026-09-18"
      )[0].newAmount
    ).toBe(8500)
    expect(
      applyChange(
        { type: "new_amount", value: 10000 },
        ["kofi"],
        versions,
        "2026-09-18"
      )[0].deltaPercent
    ).toBe(25)
  })

  it("says so rather than guessing when there is nothing to change", () => {
    const row = applyChange(
      { type: "percent", value: 5 },
      ["nana"],
      versions,
      "2026-09-18"
    )[0]
    expect(row.blocked).toBeTruthy()
    expect(row.newAmount).toBe(0)
  })
})

describe("money", () => {
  it("always says which currency", () => {
    expect(money(8000, "GHS")).toBe("GHS 8,000.00")
    expect(money(450000, "NGN")).toBe("NGN 450,000.00")
  })

  it("keeps totals apart by currency rather than summing them", () => {
    const totals = totalPerCurrency([
      { amount: 100, currency: "GHS" },
      { amount: 50, currency: "GHS" },
      { amount: 20, currency: "USD" },
    ])
    expect(totals).toEqual([
      { currency: "GHS", amount: 150 },
      { currency: "USD", amount: 20 },
    ])
  })
})

describe("who may see pay", () => {
  const people = [
    { id: "kofi", managerId: "adwoa", dottedLineManagerId: null },
    { id: "afia", managerId: "adwoa", dottedLineManagerId: null },
    { id: "ama", managerId: "kwesi", dottedLineManagerId: null },
    { id: "adwoa", managerId: "esi", dottedLineManagerId: null },
  ] as unknown as Employee[]

  const manager = { employeeId: "adwoa", roles: ["line_manager" as const] }
  const payroll = { employeeId: "maame", roles: ["payroll" as const] }
  const hr = { employeeId: "fiifi", roles: ["hr_admin" as const] }
  const employee = { employeeId: "kofi", roles: ["employee" as const] }

  it("gives a manager their own reports and nobody else", () => {
    expect(
      payScope(manager, people)
        .map((e) => e.id)
        .sort()
    ).toEqual(["adwoa", "afia", "kofi"])
  })

  it("gives payroll everyone, and lets them change nothing", () => {
    expect(payScope(payroll, people)).toHaveLength(4)
    expect(payRoleOf(payroll)).toBe("reader")
    expect(canProposeFor(payroll, people[0], people)).toBe(false)
  })

  it("gives an employee only themselves", () => {
    expect(payScope(employee, people).map((e) => e.id)).toEqual(["kofi"])
  })

  it("lets a manager propose for a report but never for themselves", () => {
    expect(canProposeFor(manager, people[0], people)).toBe(true)
    expect(canProposeFor(manager, people[3], people)).toBe(false)
  })

  it("lets HR propose for anyone but themselves", () => {
    expect(canProposeFor(hr, people[2], people)).toBe(true)
  })
})
