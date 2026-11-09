import { describe, expect, it } from "vitest"

import {
  ATTENDANCE,
  CANDIDATES,
  CASES,
  DOCUMENTS,
  LEAVE_BALANCES,
  LEAVE_REQUESTS,
  OFFBOARDING,
  REQUISITIONS,
  REVIEWS,
} from "./data/records"
import { EMPLOYEES } from "./data/employees"
import {
  REPORTS,
  csvCell,
  floorFor,
  reportsFor,
  runReport,
  suppress,
  toCsv,
  type ReportData,
} from "./reports"
import type { Viewer } from "./rbac"

const data: ReportData = {
  employees: EMPLOYEES,
  requisitions: REQUISITIONS,
  candidates: CANDIDATES,
  reviews: REVIEWS,
  cases: CASES,
  offboarding: OFFBOARDING,
  leaveRequests: LEAVE_REQUESTS,
  leaveBalances: LEAVE_BALANCES,
  documents: DOCUMENTS,
  attendance: ATTENDANCE,
}
const today = "2026-09-18"
const hr: Viewer = { employeeId: "fiifi", roles: ["hr_admin", "employee"] }
const manager: Viewer = {
  employeeId: "adwoa",
  roles: ["line_manager", "employee"],
}
const employee: Viewer = { employeeId: "kofi", roles: ["employee"] }

describe("who can run what", () => {
  it("keeps pay, exits and performance away from a manager", () => {
    const ids = reportsFor(manager).map((r) => r.id)
    for (const hidden of [
      "payroll_cost",
      "turnover",
      "performance",
      "leave_liability",
    ])
      expect(ids).not.toContain(hidden)
    expect(
      runReport("payroll_cost", data, { viewer: manager, today })
    ).toBeNull()
  })

  it("gives an employee only the reports open to everyone", () => {
    expect(
      reportsFor(employee)
        .map((r) => r.id)
        .sort()
    ).toEqual(["attendance", "leave", "workforce"].sort())
  })

  it("gives HR every report", () => {
    expect(reportsFor(hr)).toHaveLength(REPORTS.length)
  })
})

describe("the aggregation floor", () => {
  it("drops groups under the floor and counts them", () => {
    const out = suppress(
      [{ n: 1 }, { n: 4 }, { n: 5 }, { n: 9 }],
      (r) => r.n,
      5
    )
    expect(out.rows.map((r) => r.n)).toEqual([5, 9])
    expect(out.withheld).toBe(2)
  })

  it("holds demographic splits to the floor even for HR", () => {
    expect(floorFor(hr)).toBe(1)
    expect(floorFor(hr, true)).toBeGreaterThan(1)
    const r = runReport(
      "workforce",
      data,
      { viewer: hr, today },
      { by: "gender" }
    )!
    for (const row of r.rows)
      expect(Number(row.people)).toBeGreaterThanOrEqual(5)
  })

  it("holds a manager's department figures to the floor", () => {
    const team = EMPLOYEES.filter((e) => e.managerId === "adwoa")
    const r = runReport(
      "workforce",
      { ...data, employees: team },
      { viewer: manager, today },
      { by: "department" }
    )!
    for (const row of r.rows)
      expect(Number(row.people)).toBeGreaterThanOrEqual(5)
    expect(r.rows.length + r.withheld).toBeGreaterThan(0)
  })
})

describe("the numbers", () => {
  it("counts headcount that adds up to the people on strength", () => {
    const r = runReport("workforce", data, { viewer: hr, today })!
    const total = r.rows.reduce((s, row) => s + Number(row.people), 0)
    expect(String(total)).toBe(r.summary[0].value)
  })

  it("costs employer SSNIT at 13% on top of gross", () => {
    const r = runReport("payroll_cost", data, { viewer: hr, today })!
    for (const row of r.rows)
      expect(Number(row.total)).toBe(Math.round(Number(row.gross) * 1.13))
  })

  it("never lets a rating average out of a group under the floor", () => {
    const r = runReport("performance", data, { viewer: hr, today })!
    for (const row of r.rows) {
      const shared = REVIEWS.filter(
        (x) =>
          x.cycle === row.cycle &&
          x.rating !== null &&
          ["shared", "complete"].includes(x.status)
      ).length
      if (shared < 5) expect(row.rating).toBeNull()
    }
  })

  it("lists every requisition in the hiring report", () => {
    const r = runReport("hiring", data, { viewer: hr, today })!
    expect(r.rows).toHaveLength(REQUISITIONS.length)
  })

  it("shows disciplinary cases as counts, not names", () => {
    const r = runReport("compliance", data, { viewer: hr, today })!
    const text = JSON.stringify(r)
    for (const c of CASES) expect(text).not.toContain(c.title)
  })
})

describe("CSV export", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""')
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"')
  })

  it("defuses a cell a spreadsheet would run as a formula", () => {
    expect(csvCell('=HYPERLINK("x")')).toMatch(/^"?'=/)
    expect(csvCell(-5)).toBe("-5")
  })

  it("writes a header, the rows, and a note when groups were withheld", () => {
    const r = runReport(
      "workforce",
      data,
      { viewer: hr, today },
      { by: "gender" }
    )!
    const csv = toCsv({ ...r, withheld: 2 }, "Workforce", today)
    const lines = csv.split("\r\n")
    expect(lines[0]).toBe("Workforce")
    expect(lines[3]).toBe("Group,People,Share,Avg. years of service")
    expect(lines.at(-1)).toMatch(/withheld/)
  })
})
