import { describe, expect, it } from "vitest"

import {
  batchesFor,
  bankFileFor,
  channelOf,
  csvFor,
  registerCsv,
  unpayable,
} from "./payments"
import {
  costByDepartment,
  nextFilingDates,
  payslipFor,
  payslipId,
  statutoryFor,
  trends,
  ytdTotals,
} from "./payslips"
import type {
  CountryRulePack,
  PayGroup,
  PayrollLine,
  PayrollRun,
} from "./types"
import type { Employee } from "../types"

const line = (over: Partial<PayrollLine> = {}): PayrollLine => ({
  runId: "run-gh-2026-08",
  employeeId: "kofi",
  earnings: [{ componentId: "pc-base", label: "Base pay", amount: 8000 }],
  deductions: [{ componentId: "pc-paye", label: "PAYE", amount: 1500 }],
  employerContributions: [
    { componentId: "ssnit", label: "SSNIT", amount: 1040 },
  ],
  adjustments: [],
  gross: 8000,
  net: 6500,
  previousNet: 6400,
  currency: "GHS",
  paymentChannel: "mobile_money",
  paymentDestinationMasked: "MTN MoMo · ••• 6652",
  flags: [],
  ...over,
})

const people = [
  {
    id: "kofi",
    firstName: "Kofi",
    lastName: "Mensah",
    employeeId: "ZEL-0055",
    department: "Engineering",
    branch: "Accra HQ",
    compensation: { momoProvider: "MTN MoMo" },
  },
  {
    id: "abla",
    firstName: "Abla",
    lastName: "Agbeko",
    employeeId: "ZEL-0300",
    department: "Marketing",
    branch: "Accra HQ",
    compensation: { momoProvider: "Telecel Cash" },
  },
  {
    id: "harriet",
    firstName: "Harriet",
    lastName: "Cole",
    employeeId: "ZEL-0400",
    department: "Product",
    branch: "London",
    compensation: {},
  },
] as unknown as Employee[]

const run: PayrollRun = {
  id: "run-gh-2026-08",
  payGroupId: "pg-gh-monthly",
  kind: "regular",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  payDate: "2026-08-28",
  status: "paid",
  preparedBy: "maame",
  submittedAt: "2026-08-25T10:00:00",
  decision: {
    by: "fiifi",
    at: "2026-08-26T10:00:00",
    outcome: "approved",
    reason: "",
  },
  fxRates: [],
  events: [],
}

const pack: CountryRulePack = {
  country: "Ghana",
  version: "2026.1",
  effectiveFrom: "2026-01-01",
  componentTreatments: {},
  employeeContributionRules: [],
  employerContributionRules: [],
  taxBands: [],
  statutoryReports: ["PAYE monthly return"],
  filingDeadlines: [
    { name: "PAYE", due: "15th of the following month", dueDayOfMonth: 15 },
    { name: "SSNIT", due: "14th of the following month", dueDayOfMonth: 14 },
    { name: "Annual return", due: "30 April", annualOn: "04-30" },
  ],
  updates: [],
}

describe("channels", () => {
  it("reads the provider off the employee's record", () => {
    expect(channelOf(line(), people[0])).toBe("mtn_momo")
    expect(channelOf(line({ employeeId: "abla" }), people[1])).toBe(
      "telecel_cash"
    )
  })

  it("sends a foreign bank account by international transfer", () => {
    expect(
      channelOf(
        line({ employeeId: "harriet", paymentChannel: "bank_transfer" }),
        people[2]
      )
    ).toBe("international_transfer")
  })

  it("refuses to pick a channel with nowhere to send it", () => {
    expect(channelOf(line({ paymentDestinationMasked: null }), people[0])).toBe(
      null
    )
  })
})

describe("batches", () => {
  const lines = [
    line(),
    line({ employeeId: "abla", net: 5900 }),
    line({ employeeId: "efua", net: 1800, paymentDestinationMasked: null }),
  ]

  it("splits a run by channel and totals each one", () => {
    const batches = batchesFor(run, lines, people)
    expect(batches.map((b) => b.channel).sort()).toEqual([
      "mtn_momo",
      "telecel_cash",
    ])
    const momo = batches.find((b) => b.channel === "mtn_momo")!
    expect(momo.count).toBe(1)
    expect(momo.totalsPerCurrency).toEqual([{ currency: "GHS", amount: 6500 }])
  })

  it("leaves out anybody with nowhere to be paid, and says who", () => {
    const batches = batchesFor(run, lines, people)
    expect(
      batches.flatMap((b) => b.items).map((i) => i.employeeId)
    ).not.toContain("efua")
    expect(unpayable(lines).map((l) => l.employeeId)).toEqual(["efua"])
  })

  it("writes a bank file a bank could actually take", () => {
    const batch = batchesFor(run, [line()], people)[0]
    const file = bankFileFor(batch, people, run)
    expect(file.split("\n")[0]).toBe(
      "staff_id,name,destination,amount,currency,narration"
    )
    expect(file).toContain("ZEL-0055,Kofi Mensah")
    expect(file).toContain("6500.00,GHS,Salary 2026-08")
  })

  it("writes a reconciliation file with the failure reason on it", () => {
    const batch = batchesFor(run, [line()], people)[0]
    batch.items[0] = {
      ...batch.items[0],
      status: "failed",
      failureReason: "Number not registered in that name",
    }
    expect(csvFor(batch, people)).toContain(
      "Number not registered in that name"
    )
  })

  it("writes the register with every column the finance team asks for", () => {
    expect(registerCsv([line()], people)).toContain(
      "ZEL-0055,Kofi Mensah,Engineering,8000.00,1500.00,1040.00,6500.00,GHS"
    )
  })
})

describe("payslips", () => {
  it("states the run's line, and totals the year to date", () => {
    const slip = payslipFor(
      run,
      line(),
      [line({ net: 6400 }), line()],
      pack,
      "cv-1"
    )
    expect(slip.id).toBe(payslipId(run.id, "kofi"))
    expect(slip.period).toBe("2026-08")
    expect(slip.net).toBe(6500)
    expect(slip.ytd.net).toBe(12900)
    expect(slip.rulePackVersion).toBe("2026.1")
    expect(slip.compensationVersionId).toBe("cv-1")
  })

  it("keeps employer contributions separate from what came off the pay", () => {
    const slip = payslipFor(run, line(), [line()], pack, null)
    expect(slip.deductions.map((d) => d.label)).toEqual(["PAYE"])
    expect(slip.employerContributions.map((c) => c.label)).toEqual(["SSNIT"])
    expect(slip.gross - slip.net).toBe(1500)
  })

  it("adds nothing up that has not been stated", () => {
    expect(ytdTotals([])).toEqual({
      gross: 0,
      deductions: 0,
      employerContributions: 0,
      net: 0,
    })
  })
})

describe("reporting", () => {
  it("builds a trend per month per currency, ignoring unstated runs", () => {
    const points = trends([
      { run, lines: [line(), line({ employeeId: "abla" })] },
      {
        run: { ...run, id: "r2", status: "calculated" },
        lines: [line()],
      },
    ])
    expect(points).toHaveLength(1)
    expect(points[0].headcount).toBe(2)
    expect(points[0].net).toBe(13000)
  })

  it("keeps currencies on their own line", () => {
    const points = trends([
      {
        run,
        lines: [
          line(),
          line({ employeeId: "harriet", currency: "USD", net: 5800 }),
        ],
      },
    ])
    expect(points.map((p) => p.currency)).toEqual(["GHS", "USD"])
  })

  it("costs each department, biggest first", () => {
    const rows = costByDepartment(
      [line(), line({ employeeId: "abla", gross: 12000 })],
      (id) => people.find((p) => p.id === id)?.department ?? "—"
    )
    expect(rows[0].department).toBe("Marketing")
    expect(rows[0].total).toBe(13040)
  })
})

describe("filing dates", () => {
  it("puts the soonest first and works out when each one lands", () => {
    const dates = nextFilingDates(pack, "2026-09-18")
    expect(dates.map((d) => d.name)).toEqual(["SSNIT", "PAYE", "Annual return"])
    expect(dates[0].nextDue).toBe("2026-10-14")
    expect(dates[2].nextDue).toBe("2027-04-30")
  })

  it("keeps a date this month when it has not passed yet", () => {
    expect(nextFilingDates(pack, "2026-09-10")[0].nextDue).toBe("2026-09-14")
  })

  it("says who files for a group Zelos does not calculate", () => {
    const external = statutoryFor(
      { calculationMode: "external" } as PayGroup,
      pack
    )
    expect(external.external).toBe(true)
    expect(external.reports).toEqual([])
    expect(
      statutoryFor({ calculationMode: "native" } as PayGroup, pack).reports
    ).toEqual(["PAYE monthly return"])
  })
})
