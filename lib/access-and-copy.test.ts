import { describe, expect, it } from "vitest"

import { asClause } from "./format"
import { canOpenCompanySettings } from "./rbac"
import { periodLabel } from "./pay/compliance"

describe("who can open Company settings", () => {
  it("lets HR Admin in, and nobody else — Payroll Officer included", () => {
    expect(
      canOpenCompanySettings({ employeeId: "fiifi", roles: ["hr_admin"] })
    ).toBe(true)
    for (const role of [
      "payroll",
      "line_manager",
      "head_of_department",
      "employee",
    ] as const)
      expect(canOpenCompanySettings({ employeeId: "x", roles: [role] })).toBe(
        false
      )
  })
})

describe("an audit action read after a name", () => {
  it("keeps country names and acronyms as written", () => {
    expect(asClause("Acknowledged Ghana rule pack 2027.1")).toBe(
      "acknowledged Ghana rule pack 2027.1"
    )
    expect(asClause("PAYE return filed")).toBe("PAYE return filed")
  })
})

describe("a filing period, as people read it", () => {
  it("names the month or the year", () => {
    expect(periodLabel("2026-08")).toBe("Aug 2026")
    expect(periodLabel("2025")).toBe("Year 2025")
  })
})
