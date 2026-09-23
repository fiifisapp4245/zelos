import { describe, expect, it } from "vitest"

import { getHomeForUser, getQuickActions } from "./get-home-for-user"
import { HOME_WIDGETS } from "./home-config"
import { resolveAudience } from "../nav/get-nav-for-user"
import type { SessionContext } from "../session"

function session(over: Partial<SessionContext> = {}): SessionContext {
  return {
    id: "kofi",
    first_name: "Kofi",
    last_name: "Mensah",
    email: "kofi.mensah@xanthan.com",
    job_title: "Software Engineer",
    department: "Engineering",
    roles: ["employee"],
    direct_report_count: 0,
    company: { name: "Xanthan Services Limited" },
    ...over,
  }
}

const HR = session({ roles: ["hr_admin", "employee"], direct_report_count: 2 })
const MANAGER = session({
  id: "adwoa",
  roles: ["line_manager", "employee"],
  direct_report_count: 6,
})
const EMPLOYEE = session()
const PAYROLL = session({ id: "maame", roles: ["payroll", "employee"] })

/** widget keys in order, which is what the page renders. */
const keys = (s: SessionContext) => {
  const l = getHomeForUser(s)
  return {
    header: l.header.map((w) => w.widget),
    main: l.main.map((w) => w.widget),
    rail: l.rail.map((w) => w.widget),
  }
}
const scopes = (s: SessionContext) => {
  const l = getHomeForUser(s)
  return Object.fromEntries(
    [...l.header, ...l.main, ...l.rail].map((w) => [w.widget, w.scope])
  )
}

describe("getHomeForUser — HR Admin", () => {
  it("leads with the approval queue, then attention, then the one metric", () => {
    expect(keys(HR)).toEqual({
      header: ["meStrip"],
      main: ["needsApproval", "needsAttention", "workforceSnapshot"],
      rail: ["upcoming", "today", "celebrations"],
    })
  })

  it("scopes the queue and the rail to the whole company", () => {
    const s = scopes(HR)
    expect(s.needsApproval).toBe("company")
    expect(s.today).toBe("company")
    expect(s.celebrations).toBe("company")
  })

  it("has no personal widgets in the main column", () => {
    expect(keys(HR).main).not.toContain("myDay")
    expect(keys(HR).main).not.toContain("leaveBalances")
  })
})

describe("getHomeForUser — Line Manager", () => {
  it("orders approvals, attention, team, then own requests", () => {
    expect(keys(MANAGER)).toEqual({
      header: ["meStrip"],
      main: ["needsApproval", "needsAttention", "teamToday", "myRequests"],
      rail: ["today", "celebrations"],
    })
  })

  it("scopes everything to the team, not the company", () => {
    const s = scopes(MANAGER)
    expect(s.needsApproval).toBe("team")
    expect(s.needsAttention).toBe("team")
    expect(s.today).toBe("team")
    expect(s.celebrations).toBe("team")
  })

  it("does not get the company metric or the statutory rail", () => {
    expect(keys(MANAGER).main).not.toContain("workforceSnapshot")
    expect(keys(MANAGER).rail).not.toContain("upcoming")
  })
})

describe("getHomeForUser — Employee", () => {
  it("leads with the day and shows only self-service widgets", () => {
    expect(keys(EMPLOYEE)).toEqual({
      header: [],
      main: ["myDay", "myRequests", "leaveBalances", "latestPayslip"],
      rail: ["today", "celebrations", "profileCompletion"],
    })
  })

  it("has nothing to approve, and no me-strip — the page is already theirs", () => {
    expect(keys(EMPLOYEE).main).not.toContain("needsApproval")
    expect(keys(EMPLOYEE).header).toEqual([])
  })

  it("scopes to self and team", () => {
    const s = scopes(EMPLOYEE)
    expect(s.myDay).toBe("self")
    expect(s.today).toBe("team")
  })
})

describe("getHomeForUser — Payroll Officer", () => {
  it("gets pay-shaped approvals and attention, with the statutory rail", () => {
    expect(keys(PAYROLL)).toEqual({
      header: ["meStrip"],
      main: ["needsApproval", "needsAttention"],
      rail: ["upcoming", "today", "celebrations"],
    })
  })

  it("narrows the queue to pay details and attention to payroll readiness", () => {
    const s = scopes(PAYROLL)
    expect(s.needsApproval).toBe("payDetails")
    expect(s.needsAttention).toBe("payroll")
  })
})

describe("resolveAudience default branch", () => {
  it("falls back to employee for a session carrying no roles", () => {
    expect(resolveAudience(session({ roles: [] }))).toBe("employee")
  })

  it("falls back to employee for a role this build does not know", () => {
    const unknown = session({
      roles: ["auditor" as unknown as SessionContext["roles"][number]],
    })
    expect(resolveAudience(unknown)).toBe("employee")
    expect(getHomeForUser(unknown).main[0].widget).toBe("myDay")
  })

  it("gives the fallback session a usable home rather than an empty one", () => {
    const l = getHomeForUser(session({ roles: [] }))
    expect(l.main.length).toBeGreaterThan(0)
    expect(l.rail.length).toBeGreaterThan(0)
  })
})

describe("quick actions", () => {
  it("gives each persona at most four, all labelled as actions", () => {
    for (const s of [HR, MANAGER, EMPLOYEE, PAYROLL]) {
      const actions = getQuickActions(s)
      expect(actions.length).toBeGreaterThan(0)
      expect(actions.length).toBeLessThanOrEqual(4)
      expect(actions.every((a) => a.href || a.scrollTo)).toBe(true)
    }
  })

  it("sends the manager's approve action to the queue on this page", () => {
    const approve = getQuickActions(MANAGER).find(
      (a) => a.label === "Approve leave"
    )
    expect(approve?.scrollTo).toBe("needs-approval")
    expect(approve?.href).toBeUndefined()
  })
})

describe("home config integrity", () => {
  it("has unique ids", () => {
    const ids = HOME_WIDGETS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("never gives one audience the same widget twice in a column", () => {
    for (const s of [HR, MANAGER, EMPLOYEE, PAYROLL]) {
      const l = getHomeForUser(s)
      for (const col of [l.header, l.main, l.rail]) {
        const w = col.map((x) => x.widget)
        expect(new Set(w).size).toBe(w.length)
      }
    }
  })

  it("shows exactly one metric widget to anyone", () => {
    for (const s of [HR, MANAGER, EMPLOYEE, PAYROLL]) {
      const metrics = getHomeForUser(s).main.filter(
        (w) => w.widget === "workforceSnapshot"
      )
      expect(metrics.length).toBeLessThanOrEqual(1)
    }
  })

  it("never puts two yielding widgets in the same row", () => {
    // A row needs one side to set its height. Two yielders would collapse it.
    for (const s of [HR, MANAGER, EMPLOYEE, PAYROLL]) {
      const l = getHomeForUser(s)
      const rows = Math.max(l.main.length, l.rail.length)
      for (let i = 0; i < rows; i++) {
        expect(Boolean(l.main[i]?.yields && l.rail[i]?.yields)).toBe(false)
      }
    }
  })

  it("gives HR the pairing the layout was designed around", () => {
    const l = getHomeForUser(HR)
    expect(l.main.map((m, i) => [m.widget, l.rail[i]?.widget])).toEqual([
      ["needsApproval", "upcoming"],
      ["needsAttention", "today"],
      ["workforceSnapshot", "celebrations"],
    ])
  })

  it("reaches every configured widget from some audience", () => {
    const seen = new Set(
      [HR, MANAGER, EMPLOYEE, PAYROLL].flatMap((s) => {
        const l = getHomeForUser(s)
        return [...l.header, ...l.main, ...l.rail].map((w) => w.id)
      })
    )
    expect(HOME_WIDGETS.filter((w) => !seen.has(w.id))).toEqual([])
  })
})
