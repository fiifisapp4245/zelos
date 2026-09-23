import { describe, expect, it } from "vitest"

import { APPROVAL_ITEMS } from "../data/approval-items"
import { APPROVAL_CHAINS } from "./approval-chains"
import { getApprovalsForUser, isOverdue } from "./selectors"
import { EMPLOYEES } from "../data/employees"
import type { ApprovalType } from "./types"
import type { SessionContext } from "../session"

const NOW = new Date("2026-09-18T09:00:00")

function sessionFor(
  id: string,
  roles: SessionContext["roles"],
  department: string
) {
  const e = EMPLOYEES.find((x) => x.id === id)!
  return {
    id,
    first_name: e.firstName,
    last_name: e.lastName,
    email: e.email,
    job_title: e.jobTitle,
    department,
    roles,
    direct_report_count: EMPLOYEES.filter((x) => x.managerId === id).length,
    company: { name: "Xanthan" },
  } satisfies SessionContext
}

const HR = sessionFor("fiifi", ["hr_admin", "employee"], "People")
const PAYROLL = sessionFor("maame", ["payroll", "employee"], "Finance")
const MANAGER = sessionFor("adwoa", ["line_manager", "employee"], "Engineering")

const waiting = (s: SessionContext) =>
  getApprovalsForUser(s, APPROVAL_ITEMS, { employees: EMPLOYEES, now: NOW })

describe("the seeded queue", () => {
  it("gives HR at least ten, of which three are overdue", () => {
    const q = waiting(HR)
    expect(q.length).toBeGreaterThanOrEqual(10)
    expect(q.filter((i) => isOverdue(i, NOW)).length).toBeGreaterThanOrEqual(3)
  })

  it("gives Payroll at least five", () => {
    expect(waiting(PAYROLL).length).toBeGreaterThanOrEqual(5)
  })

  it("gives the manager at least four, all from her own team", () => {
    const q = waiting(MANAGER)
    expect(q.length).toBeGreaterThanOrEqual(4)
    for (const i of q) {
      const subject = EMPLOYEES.find((e) => e.id === i.subject)!
      const own =
        subject.managerId === "adwoa" || subject.department === "Engineering"
      expect(own).toBe(true)
    }
  })

  it("has at least one pending item of every type", () => {
    const pending = new Set(
      APPROVAL_ITEMS.filter((i) => i.status === "pending").map((i) => i.type)
    )
    const missing = (Object.keys(APPROVAL_CHAINS) as ApprovalType[]).filter(
      (t) => !pending.has(t)
    )
    expect(missing).toEqual([])
  })

  it("fills In progress and Completed for the people who decided", () => {
    for (const s of [HR, MANAGER]) {
      const opts = { employees: EMPLOYEES, now: NOW }
      expect(
        getApprovalsForUser(s, APPROVAL_ITEMS, { ...opts, tab: "inProgress" })
          .length
      ).toBeGreaterThan(0)
      expect(
        getApprovalsForUser(s, APPROVAL_ITEMS, { ...opts, tab: "completed" })
          .length
      ).toBeGreaterThan(0)
    }
  })

  it("keeps every currentStepIndex inside its chain", () => {
    for (const i of APPROVAL_ITEMS) {
      expect(i.currentStepIndex).toBeLessThan(i.chain.length)
      expect(i.currentStepIndex).toBeGreaterThanOrEqual(0)
    }
  })

  it("never has more history than the chain has steps", () => {
    for (const i of APPROVAL_ITEMS) {
      expect(i.history.length).toBeLessThanOrEqual(i.chain.length)
    }
  })

  it("has unique ids", () => {
    const ids = APPROVAL_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
