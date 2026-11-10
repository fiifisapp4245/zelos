import { describe, expect, it } from "vitest"

import {
  STALE_AFTER_DAYS,
  ancestors,
  applyValues,
  canApproveGoal,
  canEditGoal,
  canViewGoal,
  creatableLevels,
  daysSinceCheckIn,
  elapsed,
  healthOf,
  isStale,
  krProgress,
  parentChoices,
  progressOf,
  startingStatus,
  summarise,
  validateCheckIn,
  validateGoal,
} from "./goals"
import { CHECK_INS, GOALS } from "./data/goals"
import { EMPLOYEES } from "./data/employees"
import type { Goal } from "./types"

const TODAY = "2026-09-18"
const g = (id: string) => GOALS.find((x) => x.id === id)!
const viewer = (
  id: string,
  ...roles: ("hr_admin" | "line_manager" | "head_of_department" | "employee")[]
) =>
  ({
    employeeId: id,
    roles: roles.length ? roles : (["employee"] as const),
  }) as {
    employeeId: string
    roles: ("hr_admin" | "line_manager" | "head_of_department" | "employee")[]
  }
const ctx = (v: ReturnType<typeof viewer>) => ({
  viewer: v,
  employees: EMPLOYEES,
})

describe("key result progress", () => {
  it("is how far between start and target, clamped to 0 and 1", () => {
    expect(krProgress({ start: 0, target: 120, current: 54 })).toBeCloseTo(0.45)
    expect(krProgress({ start: 0, target: 10, current: 15 })).toBe(1)
    expect(krProgress({ start: 0, target: 10, current: -3 })).toBe(0)
  })

  it("works for a number that should go down", () => {
    expect(krProgress({ start: 14, target: 3, current: 9 })).toBeCloseTo(5 / 11)
    expect(krProgress({ start: 30, target: 10, current: 18 })).toBeCloseTo(0.6)
  })

  it("treats yes/no as done or not", () => {
    expect(krProgress({ start: 0, target: 1, current: 0 })).toBe(0)
    expect(krProgress({ start: 0, target: 1, current: 1 })).toBe(1)
  })
})

describe("goal progress", () => {
  it("averages its key results", () => {
    const p = progressOf(g("g-kofi-1"), GOALS)
    expect(p).toBeCloseTo((4 / 6 + 4 / 6) / 2)
  })

  it("takes the average of what is aligned to it when it has no key results of its own", () => {
    const parent: Goal = { ...g("g-co-1"), keyResults: [] }
    const all = GOALS.map((x) => (x.id === "g-co-1" ? parent : x))
    const kids = all.filter((x) => x.parentId === "g-co-1")
    const expected =
      kids.reduce((s, k) => s + progressOf(k, all), 0) / kids.length
    expect(progressOf(parent, all)).toBeCloseTo(expected)
  })

  it("ignores cancelled and draft goals when rolling up, and survives a loop", () => {
    const a: Goal = { ...g("g-co-1"), id: "a", keyResults: [], parentId: "b" }
    const b: Goal = { ...g("g-co-1"), id: "b", keyResults: [], parentId: "a" }
    expect(progressOf(a, [a, b])).toBe(0)
  })
})

describe("how healthy a goal is", () => {
  it("believes a recent check-in", () => {
    expect(healthOf(g("g-co-1"), GOALS, CHECK_INS, TODAY)).toBe("at_risk")
    expect(healthOf(g("g-selorm-1"), GOALS, CHECK_INS, TODAY)).toBe("on_track")
  })

  it("judges by the clock once the last word is old", () => {
    // Kofi's design goal: one of four done, last said a month ago, 80% of the cycle gone.
    expect(isStale(g("g-kofi-2"), CHECK_INS, TODAY)).toBe(true)
    expect(daysSinceCheckIn(g("g-kofi-2"), CHECK_INS, TODAY)).toBeGreaterThan(
      STALE_AFTER_DAYS
    )
    expect(elapsed(g("g-kofi-2"), TODAY)).toBeGreaterThan(0.4)
    expect(["at_risk", "off_track"]).toContain(
      healthOf(g("g-kofi-2"), GOALS, CHECK_INS, TODAY)
    )
  })

  it("counts from the start date when nobody has ever checked in", () => {
    expect(daysSinceCheckIn(g("g-ama-1"), CHECK_INS, TODAY)).toBe(79)
  })

  it("only calls an active goal stale", () => {
    expect(isStale(g("g-ama-1"), CHECK_INS, TODAY)).toBe(false) // proposed
  })

  it("summarises a set of goals", () => {
    const s = summarise(GOALS, GOALS, CHECK_INS, TODAY)
    expect(s.count).toBe(GOALS.filter((x) => x.status === "active").length)
    expect(s.atRisk).toBeGreaterThan(0)
    expect(s.avgProgress).toBeGreaterThan(0)
    expect(s.avgProgress).toBeLessThan(1)
  })
})

describe("who can see and change a goal", () => {
  it("shows company and team goals to everyone, but an individual goal only to its owner, managers and HR", () => {
    const stranger = ctx(viewer("ama"))
    expect(canViewGoal(g("g-co-1"), stranger)).toBe(true)
    expect(canViewGoal(g("g-eng-1"), stranger)).toBe(true)
    expect(canViewGoal(g("g-kofi-1"), stranger)).toBe(false)
    expect(canViewGoal(g("g-kofi-1"), ctx(viewer("kofi")))).toBe(true)
    expect(
      canViewGoal(
        g("g-kofi-1"),
        ctx(viewer("adwoa", "line_manager", "employee"))
      )
    ).toBe(true)
    expect(
      canViewGoal(g("g-kofi-1"), ctx(viewer("fiifi", "hr_admin", "employee")))
    ).toBe(true)
  })

  it("lets an owner edit their own goal, their manager edit it, and only HR touch the company's", () => {
    expect(canEditGoal(g("g-kofi-1"), ctx(viewer("kofi")))).toBe(true)
    expect(
      canEditGoal(
        g("g-kofi-1"),
        ctx(viewer("adwoa", "line_manager", "employee"))
      )
    ).toBe(true)
    expect(canEditGoal(g("g-kofi-1"), ctx(viewer("ama")))).toBe(false)
    expect(
      canEditGoal(
        g("g-co-1"),
        ctx(viewer("adwoa", "head_of_department", "employee"))
      )
    ).toBe(false)
    expect(
      canEditGoal(g("g-co-1"), ctx(viewer("fiifi", "hr_admin", "employee")))
    ).toBe(true)
  })

  it("lets a department head, and nobody else outside HR, run their team's goal", () => {
    expect(
      canEditGoal(
        g("g-eng-1"),
        ctx(viewer("adwoa", "head_of_department", "line_manager", "employee"))
      )
    ).toBe(true)
    expect(
      canEditGoal(
        g("g-eng-1"),
        ctx(viewer("kwesi", "head_of_department", "line_manager", "employee"))
      )
    ).toBe(false)
    expect(canEditGoal(g("g-eng-1"), ctx(viewer("kofi")))).toBe(false)
  })

  it("stops an owner closing the work they have finished", () => {
    expect(
      canEditGoal({ ...g("g-kofi-1"), status: "done" }, ctx(viewer("kofi")))
    ).toBe(false)
  })

  it("lets a manager, not the owner, approve a proposed goal", () => {
    expect(
      canApproveGoal(
        g("g-ama-1"),
        ctx(viewer("kwesi", "line_manager", "employee"))
      )
    ).toBe(true)
    expect(canApproveGoal(g("g-ama-1"), ctx(viewer("ama")))).toBe(false)
    expect(
      canApproveGoal(
        g("g-kofi-1"),
        ctx(viewer("adwoa", "line_manager", "employee"))
      )
    ).toBe(false) // already active
  })

  it("starts a goal you set for yourself as proposed, and one set for you as active", () => {
    expect(startingStatus("kofi", "individual", ctx(viewer("kofi")))).toBe(
      "proposed"
    )
    expect(
      startingStatus(
        "kofi",
        "individual",
        ctx(viewer("adwoa", "line_manager", "employee"))
      )
    ).toBe("active")
    expect(
      startingStatus(
        null,
        "team",
        ctx(viewer("adwoa", "head_of_department", "employee"))
      )
    ).toBe("active")
  })

  it("offers each role the levels it can create", () => {
    expect(creatableLevels(ctx(viewer("kofi")))).toEqual(["individual"])
    expect(
      creatableLevels(ctx(viewer("adwoa", "head_of_department", "employee")))
    ).toEqual(["individual", "team"])
    expect(
      creatableLevels(ctx(viewer("fiifi", "hr_admin", "employee")))
    ).toEqual(["individual", "team", "company"])
  })
})

describe("alignment", () => {
  it("traces a goal up to the company's", () => {
    expect(ancestors(g("g-kofi-1"), GOALS).map((x) => x.id)).toEqual([
      "g-eng-1",
      "g-co-1",
    ])
    expect(ancestors(g("g-co-1"), GOALS)).toEqual([])
  })

  it("offers only higher-level, live goals to align to, never itself or its own descendants", () => {
    const forIndividual = parentChoices("individual", undefined, GOALS).map(
      (x) => x.id
    )
    expect(forIndividual).toEqual(expect.arrayContaining(["g-co-1", "g-eng-1"]))
    expect(forIndividual).not.toContain("g-kofi-1")
    const forTeam = parentChoices("team", "g-eng-1", GOALS).map((x) => x.id)
    expect(forTeam).toEqual(expect.arrayContaining(["g-co-1", "g-co-2"]))
    expect(forTeam).not.toContain("g-eng-1")
    expect(parentChoices("company", undefined, GOALS)).toEqual([])
  })
})

describe("writing a goal", () => {
  const ok = {
    title: "Cut the pager load",
    startOn: "2026-07-01",
    dueOn: "2026-12-31",
    level: "individual" as const,
    ownerId: "kofi",
    team: null,
    keyResults: [
      {
        id: "k",
        title: "Alerts per week",
        kind: "number" as const,
        start: 30,
        target: 10,
        current: 30,
        unit: "",
      },
    ],
  }

  it("accepts a complete goal", () => {
    expect(validateGoal(ok)).toEqual({})
  })

  it("wants a title, sensible dates and a key result that can move", () => {
    expect(validateGoal({ ...ok, title: "x" })).toHaveProperty("title")
    expect(validateGoal({ ...ok, dueOn: "2026-06-01" })).toHaveProperty("dates")
    expect(validateGoal({ ...ok, keyResults: [] })).toHaveProperty("keyResults")
    expect(
      validateGoal({ ...ok, keyResults: [{ ...ok.keyResults[0], target: 30 }] })
        .keyResults
    ).toMatch(/differ/)
    expect(
      validateGoal({
        ...ok,
        keyResults: [{ ...ok.keyResults[0], kind: "percent", target: 140 }],
      }).keyResults
    ).toMatch(/0 and 100/)
  })

  it("wants an owner for a personal goal and a team for a team goal", () => {
    expect(validateGoal({ ...ok, ownerId: null })).toHaveProperty("owner")
    expect(
      validateGoal({ ...ok, level: "team", ownerId: null, team: null })
    ).toHaveProperty("team")
  })
})

describe("checking in", () => {
  const goal = g("g-kofi-1")

  it("moves each key result to where it now stands", () => {
    const next = applyValues(goal, { k1: 5 })
    expect(next.keyResults.find((k) => k.id === "k1")?.current).toBe(5)
    expect(next.keyResults.find((k) => k.id === "k2")?.current).toBe(4)
  })

  it("accepts a real update", () => {
    expect(
      validateCheckIn(
        goal,
        { k1: 5, k2: 4 },
        "Ledger service done.",
        "on_track"
      )
    ).toEqual({})
  })

  it("needs a number for every key result and a confidence", () => {
    const e = validateCheckIn(goal, { k1: 5 }, "Ledger service done.", "")
    expect(e).toHaveProperty("k2")
    expect(e).toHaveProperty("confidence")
  })

  it("wants words when nothing moved, or when it is not on track", () => {
    expect(
      validateCheckIn(goal, { k1: 4, k2: 4 }, "", "on_track")
    ).toHaveProperty("note")
    expect(validateCheckIn(goal, { k1: 5, k2: 4 }, "", "at_risk").note).toMatch(
      /getting in the way/
    )
  })

  it("keeps a percentage between 0 and 100 and a yes/no to 0 or 1", () => {
    const pct = {
      ...goal,
      keyResults: [{ ...goal.keyResults[0], kind: "percent" as const }],
    }
    expect(validateCheckIn(pct, { k1: 120 }, "Up.", "on_track")).toHaveProperty(
      "k1"
    )
    const yn = {
      ...goal,
      keyResults: [{ ...goal.keyResults[0], kind: "yes_no" as const }],
    }
    expect(validateCheckIn(yn, { k1: 2 }, "Done.", "on_track")).toHaveProperty(
      "k1"
    )
  })
})
