import { describe, expect, it } from "vitest"

import {
  dueReports,
  isDue,
  nextDue,
  parseRecipients,
  reportEmail,
} from "./report-schedule"
import { buildReportData } from "./report-data"
import { runReport, toCsv } from "./reports"
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
import type { SavedReport } from "./types"

const rep = (over: Partial<SavedReport> = {}): SavedReport => ({
  id: "r1",
  reportId: "workforce",
  options: {},
  name: "Weekly headcount",
  createdBy: "fiifi",
  createdOn: "2026-09-01",
  schedule: "weekly",
  lastRunOn: null,
  recipients: ["hr@example.com"],
  createdRoles: ["hr_admin", "employee"],
  ...over,
})

describe("when a report is due", () => {
  it("counts a week or a month from the last run, or from saving", () => {
    expect(nextDue(rep())).toBe("2026-09-08")
    expect(nextDue(rep({ lastRunOn: "2026-09-10" }))).toBe("2026-09-17")
    expect(nextDue(rep({ schedule: "monthly" }))).toBe("2026-10-01")
    expect(nextDue(rep({ schedule: "none" }))).toBeNull()
  })

  it("is due on the day and after, never before", () => {
    expect(isDue(rep(), "2026-09-07")).toBe(false)
    expect(isDue(rep(), "2026-09-08")).toBe(true)
    expect(isDue(rep(), "2026-09-18")).toBe(true)
  })

  it("is not due again the day it was sent", () => {
    expect(isDue(rep({ lastRunOn: "2026-09-18" }), "2026-09-18")).toBe(false)
  })

  it("is never due without anyone to send it to, or when it does not repeat", () => {
    expect(isDue(rep({ recipients: [] }), "2026-09-18")).toBe(false)
    expect(isDue(rep({ schedule: "none" }), "2026-09-18")).toBe(false)
  })

  it("picks out the due ones from a list", () => {
    const list = [
      rep(),
      rep({ id: "r2", lastRunOn: "2026-09-18" }),
      rep({ id: "r3", schedule: "none" }),
    ]
    expect(dueReports(list, "2026-09-18").map((r) => r.id)).toEqual(["r1"])
  })
})

describe("who it is sent to", () => {
  it("splits addresses on commas, semicolons and spaces, lower-cases, and drops repeats", () => {
    expect(parseRecipients("A@x.com, b@y.org; a@x.com  c@z.io").ok).toEqual([
      "a@x.com",
      "b@y.org",
      "c@z.io",
    ])
  })

  it("reports what was not an address", () => {
    expect(parseRecipients("a@x.com, nope, b@").bad).toEqual(["nope", "b@"])
  })
})

describe("the email", () => {
  it("carries the CSV as an attachment with a dated file name", () => {
    const m = reportEmail({
      report: rep(),
      title: "Workforce profile",
      csv: "a,b",
      to: "hr@example.com",
      today: "2026-09-18",
      company: "Xanthan",
      sendAt: "2026-09-18T09:00:00Z",
      rows: 1,
    })
    expect(m.attachment).toEqual({
      name: "weekly-headcount-2026-09-18.csv",
      type: "text/csv",
      content: "a,b",
    })
    expect(m.subject).toBe("Xanthan: Weekly headcount, 2026-09-18")
    expect(m.body).toContain("1 row.")
  })
})

describe("what a scheduled file contains", () => {
  const src = {
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

  it("has only the saver's own team when they are a manager", () => {
    const mgr = {
      employeeId: "adwoa",
      roles: ["line_manager" as const, "employee" as const],
    }
    const data = buildReportData(mgr, src)
    expect(data.employees.length).toBeLessThan(EMPLOYEES.length)
    expect(
      data.employees.every(
        (e) =>
          e.id === "adwoa" ||
          e.managerId === "adwoa" ||
          EMPLOYEES.some((x) => x.id === e.managerId)
      )
    ).toBe(true)
  })

  it("does not run a report the saver cannot see, so it is never emailed", () => {
    const mgr = {
      employeeId: "adwoa",
      roles: ["line_manager" as const, "employee" as const],
    }
    expect(
      runReport("payroll_cost", buildReportData(mgr, src), {
        viewer: mgr,
        today: "2026-09-18",
      })
    ).toBeNull()
  })

  it("produces the same CSV the screen would export", () => {
    const hr = {
      employeeId: "fiifi",
      roles: ["hr_admin" as const, "employee" as const],
    }
    const r = runReport("workforce", buildReportData(hr, src), {
      viewer: hr,
      today: "2026-09-18",
    })!
    expect(toCsv(r, "Workforce profile", "2026-09-18")).toContain(
      "Group,People,Share,Avg. years of service"
    )
  })
})
