import { describe, expect, it } from "vitest"

import { BRANCHES, DEPARTMENTS } from "./data/records"
import { EMPLOYEES } from "./data/employees"
import { DEFAULT_ALERT_SETTINGS, isDue, validLead } from "./alerts"
import {
  employeeFromRow,
  parseCsv,
  templateCsv,
  validateImport,
} from "./employees-import"

const ctx = {
  departments: DEPARTMENTS,
  branches: BRANCHES,
  existing: EMPLOYEES,
}
const HEAD =
  "First name,Last name,Job title,Department,Branch,Employment type,Start date,Work email,Phone"

describe("CSV reading", () => {
  it("handles quoted commas, doubled quotes and line breaks in a field", () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n"x\ny",z')).toEqual([
      ["a", "b, c", 'd "e"'],
      ["x\ny", "z"],
    ])
  })

  it("skips blank lines and a leading byte-order mark", () => {
    expect(parseCsv("﻿a,b\n\n\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })
})

describe("employee import", () => {
  const dept = DEPARTMENTS[0].name
  const branch = BRANCHES[0].name

  it("accepts its own template", () => {
    const r = validateImport(templateCsv(), {
      ...ctx,
      departments: DEPARTMENTS.map((d) => ({ ...d, name: d.name })),
    })
    expect(r.fileError).toBeNull()
    expect(r.rows).toHaveLength(1)
  })

  it("rejects a file with the wrong header, naming what is missing", () => {
    const r = validateImport("Name,Email\r\nA,b@c.d", ctx)
    expect(r.fileError).toMatch(/Missing columns/)
  })

  it("reports each problem against its row and still passes the good ones", () => {
    const csv = [
      HEAD,
      `Efe,Baidoo,Accountant,${dept},${branch},Full-time,2026-11-02,efe@x.com,`,
      `Bad,Row,,Nowhere,${branch},Wizard,02/11/2026,nope,`,
    ].join("\r\n")
    const r = validateImport(csv, ctx)
    expect(r.rows[0].errors).toEqual([])
    expect(r.rows[1].errors.length).toBeGreaterThanOrEqual(5)
    expect(r.rows[1].line).toBe(3)
  })

  it("refuses an email already used, including twice in one file", () => {
    const taken = EMPLOYEES[0].email
    const csv = [
      HEAD,
      `A,B,T,${dept},${branch},Full-time,2026-11-02,${taken},`,
      `C,D,T,${dept},${branch},Full-time,2026-11-02,new@x.com,`,
      `E,F,T,${dept},${branch},Full-time,2026-11-02,new@x.com,`,
    ].join("\r\n")
    const r = validateImport(csv, ctx)
    expect(r.rows[0].errors.join()).toMatch(/already in use/)
    expect(r.rows[1].errors).toEqual([])
    expect(r.rows[2].errors.join()).toMatch(/already in use/)
  })

  it("builds a pre-hire with a unique id and no pay until HR sets it", () => {
    const row = validateImport(
      [
        HEAD,
        `Ama,Mensah,T,${dept},${branch},Contractor,2026-11-02,a@x.com,`,
      ].join("\r\n"),
      ctx
    ).rows[0]
    const taken = new Set(["ama-mensah"])
    const e = employeeFromRow(row, taken)
    expect(e.id).toBe("ama-mensah-2")
    expect(e.lifecycleState).toBe("pre_hire")
    expect(e.employmentType).toBe("contractor")
    expect(e.compensation.grossMonthly).toBe(0)
  })
})

describe("alert lead times", () => {
  const alert = (
    dueOn: string,
    kind: "document_expiry" | "contract_expiry"
  ) => ({
    id: "x",
    kind,
    employeeId: "kofi",
    thresholdDays: 30,
    dueOn,
    acknowledged: false,
    ref: "1",
  })

  it("shows an alert once it is inside its lead time, and not before", () => {
    // Today is 2026-09-18, so 2026-10-18 is 30 days out.
    expect(
      isDue(alert("2026-10-18", "contract_expiry"), DEFAULT_ALERT_SETTINGS)
    ).toBe(true)
    expect(
      isDue(alert("2026-10-19", "contract_expiry"), DEFAULT_ALERT_SETTINGS)
    ).toBe(false)
  })

  it("keeps showing one that is already past due", () => {
    expect(
      isDue(alert("2026-09-01", "document_expiry"), DEFAULT_ALERT_SETTINGS)
    ).toBe(true)
  })

  it("only accepts whole days in range", () => {
    expect(validLead(30)).toBe(true)
    for (const bad of [0, -1, 366, 1.5, NaN]) expect(validLead(bad)).toBe(false)
  })
})
