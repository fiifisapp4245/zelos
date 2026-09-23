import { describe, expect, it } from "vitest"

import { getNavForUser, resolveAudience } from "./get-nav-for-user"
import { NAV_ITEMS } from "./nav-config"
import type { SessionContext } from "../session"

function session(over: Partial<SessionContext> = {}): SessionContext {
  return {
    id: "emp-1",
    first_name: "Ama",
    last_name: "Mensah",
    email: "ama.mensah@xanthan.com",
    job_title: "Software Engineer",
    department: "Engineering",
    roles: ["employee"],
    direct_report_count: 0,
    company: { name: "Xanthan Services Limited" },
    ...over,
  }
}

/** Section id → item labels, which is what the sidebar actually renders. */
function shape(s: SessionContext) {
  return getNavForUser(s).map((sec) => [sec.id, sec.items.map((i) => i.label)])
}

describe("resolveAudience", () => {
  it("gives HR Admin its own sidebar even when they manage people", () => {
    expect(
      resolveAudience(
        session({ roles: ["hr_admin", "employee"], direct_report_count: 4 })
      )
    ).toBe("hr_admin")
  })

  it("reads manager status from the report count, not a stored flag", () => {
    expect(
      resolveAudience(session({ roles: ["employee"], direct_report_count: 1 }))
    ).toBe("manager")
    expect(
      resolveAudience(session({ roles: ["employee"], direct_report_count: 0 }))
    ).toBe("employee")
  })

  it("treats a head of department with reports as a manager", () => {
    expect(
      resolveAudience(
        session({
          roles: ["head_of_department", "line_manager", "employee"],
          direct_report_count: 6,
        })
      )
    ).toBe("manager")
  })

  it("keeps the payroll officer's own sidebar", () => {
    expect(resolveAudience(session({ roles: ["payroll", "employee"] }))).toBe(
      "payroll"
    )
  })
})

describe("getNavForUser — HR Admin", () => {
  const nav = shape(
    session({ roles: ["hr_admin", "employee"], direct_report_count: 3 })
  )

  it("matches the end-state HR Admin sidebar", () => {
    expect(nav).toEqual([
      ["primary", ["Home", "Approvals"]],
      [
        "people",
        [
          "Directory",
          "Org chart",
          "Lifecycle events",
          "Onboarding",
          "Offboarding",
        ],
      ],
      ["time", ["Attendance", "Timesheets", "Schedules", "Leave"]],
      ["pay", ["Compensation", "Payroll"]],
      ["talent", ["Recruitment", "Performance"]],
      ["relations", ["Disciplinary", "Documents"]],
      ["pinned", ["Reports", "Settings"]],
    ])
  })

  it("does not show the personal or team sections", () => {
    const ids = nav.map(([id]) => id)
    expect(ids).not.toContain("me")
    expect(ids).not.toContain("team")
  })
})

describe("getNavForUser — Line Manager / HoD", () => {
  const nav = shape(
    session({
      roles: ["line_manager", "employee"],
      direct_report_count: 5,
    })
  )

  it("matches the end-state manager sidebar", () => {
    expect(nav).toEqual([
      ["primary", ["Home", "Approvals"]],
      [
        "team",
        [
          "Team members",
          "Team attendance",
          "Team schedules",
          "Team leave",
          "Team performance",
        ],
      ],
      ["people", ["Directory", "Org chart"]],
      [
        "me",
        [
          "My profile",
          "My timesheet",
          "My schedule",
          "My leave",
          "My pay",
          "My performance",
          "My documents",
        ],
      ],
    ])
  })

  it("opens on the team rather than the organisation", () => {
    expect(nav[1][0]).toBe("team")
  })

  it("withholds the organisation-wide areas", () => {
    const labels = nav.flatMap(([, items]) => items)
    expect(labels).not.toContain("Payroll")
    expect(labels).not.toContain("Disciplinary")
    expect(labels).not.toContain("Settings")
  })
})

describe("getNavForUser — Employee", () => {
  const nav = shape(session())

  it("matches the end-state employee sidebar", () => {
    expect(nav).toEqual([
      ["primary", ["Home"]],
      [
        "me",
        [
          "My profile",
          "My timesheet",
          "My schedule",
          "My leave",
          "My pay",
          "My performance",
          "My documents",
        ],
      ],
      ["people", ["Directory", "Org chart"]],
    ])
  })

  it("has nothing to approve", () => {
    expect(nav.flatMap(([, items]) => items)).not.toContain("Approvals")
  })
})

describe("nav config integrity", () => {
  it("has unique ids", () => {
    const ids = NAV_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("reaches every item from at least one audience", () => {
    const seen = new Set(
      (
        [
          session({ roles: ["hr_admin"] }),
          session({ roles: ["employee"], direct_report_count: 2 }),
          session(),
          session({ roles: ["payroll"] }),
        ] as SessionContext[]
      ).flatMap((s) =>
        getNavForUser(s).flatMap((sec) => sec.items.map((i) => i.id))
      )
    )
    expect(
      [...NAV_ITEMS.map((i) => i.id)].filter((id) => !seen.has(id))
    ).toEqual([])
  })

  it("points every item at an absolute route", () => {
    expect(NAV_ITEMS.filter((i) => !i.href.startsWith("/"))).toEqual([])
  })
})
