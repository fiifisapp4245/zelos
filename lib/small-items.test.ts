import { describe, expect, it } from "vitest"

import {
  audienceMembers,
  feedFor,
  inAudience,
  needsAttention,
  readStateOf,
  statsFor,
  validateAnnouncement,
} from "./announcements"
import {
  assign,
  assetsOf,
  exitItemsFor,
  giveBack,
  markLost,
  nextTag,
  retire,
  validateAsset,
} from "./assets"
import { canRespond, enps, isOpen, resultsFor, validateSurvey } from "./surveys"
import { EMPLOYEES } from "./data/employees"
import {
  ANNOUNCEMENTS,
  ANNOUNCEMENT_READS,
  ASSETS,
  SURVEYS,
  SURVEY_PARTICIPATION,
  SURVEY_RESPONSES,
} from "./data/hiring-extra"

const emp = (id: string) => EMPLOYEES.find((e) => e.id === id)!
const ann = (id: string) => ANNOUNCEMENTS.find((a) => a.id === id)!

describe("announcement audiences", () => {
  it("reaches everyone, a department, or an office", () => {
    expect(inAudience(ann("an-conduct"), emp("kofi"))).toBe(true)
    expect(inAudience(ann("an-eng"), emp("kofi"))).toBe(true) // Engineering
    expect(inAudience(ann("an-eng"), emp("ama"))).toBe(false) // Product
    expect(inAudience(ann("an-holiday"), emp("kofi"))).toBe(
      inAudience(
        { audience: { kind: "branch", value: "Accra HQ" } },
        emp("kofi")
      )
    )
  })

  it("lists only people on strength", () => {
    const people = audienceMembers(ann("an-conduct"), EMPLOYEES)
    expect(
      people.every(
        (e) =>
          !["retired", "resigned", "terminated", "pre_hire"].includes(
            e.lifecycleState
          )
      )
    ).toBe(true)
  })

  it("shows pinned first, then newest, and never an archived one", () => {
    const feed = feedFor(
      [...ANNOUNCEMENTS, { ...ann("an-eng"), id: "gone", archived: true }],
      emp("kofi")
    )
    expect(feed[0].id).toBe("an-conduct")
    expect(feed.map((a) => a.id)).not.toContain("gone")
    expect(feed.slice(1).map((a) => a.postedOn)).toEqual(
      [...feed.slice(1).map((a) => a.postedOn)].sort().reverse()
    )
  })
})

describe("read tracking", () => {
  it("tells unread, read and acknowledged apart", () => {
    expect(readStateOf(ann("an-conduct"), ANNOUNCEMENT_READS, "kofi")).toBe(
      "acknowledged"
    )
    expect(readStateOf(ann("an-conduct"), ANNOUNCEMENT_READS, "selorm")).toBe(
      "read"
    )
    expect(readStateOf(ann("an-conduct"), ANNOUNCEMENT_READS, "yaw")).toBe(
      "unread"
    )
  })

  it("needs a policy acknowledged, not just opened", () => {
    expect(needsAttention(ann("an-conduct"), "read")).toBe(true)
    expect(needsAttention(ann("an-conduct"), "acknowledged")).toBe(false)
    expect(needsAttention(ann("an-holiday"), "read")).toBe(false)
    expect(needsAttention(ann("an-holiday"), "unread")).toBe(true)
  })

  it("counts who has read and acknowledged, and lists who has not", () => {
    const s = statsFor(ann("an-conduct"), EMPLOYEES, ANNOUNCEMENT_READS)
    expect(s.read).toBe(4)
    expect(s.acknowledged).toBe(3)
    expect(s.unread.map((e) => e.id)).not.toContain("kofi")
    expect(s.unacknowledged.map((e) => e.id)).toContain("selorm")
    expect(s.unacknowledged).toHaveLength(s.total - 3)
  })

  it("needs a title, a body and a real audience", () => {
    expect(
      validateAnnouncement(
        { title: "x", body: "y", audience: { kind: "all", value: "" } },
        () => true
      )
    ).toHaveProperty("title")
    expect(
      validateAnnouncement(
        {
          title: "Hello team",
          body: "A proper body.",
          audience: { kind: "department", value: "Nope" },
        },
        () => false
      )
    ).toHaveProperty("audience")
    expect(
      validateAnnouncement(
        {
          title: "Hello team",
          body: "A proper body.",
          audience: { kind: "all", value: "" },
        },
        () => false
      )
    ).toEqual({})
  })
})

describe("the asset register", () => {
  const stock = ASSETS.find((a) => a.status === "in_stock")!
  const held = ASSETS.find((a) => a.status === "assigned")!

  it("hands out only what is in stock, and records it", () => {
    const a = assign(stock, "ama", "Ama Asante", "2026-09-18")
    expect(a).toMatchObject({
      status: "assigned",
      assignedTo: "ama",
      assignedOn: "2026-09-18",
    })
    expect(a.history.at(-1)?.text).toBe("Assigned to Ama Asante.")
    expect(() => assign(held, "ama", "Ama Asante", "2026-09-18")).toThrow(
      /not in stock/
    )
  })

  it("takes something back into stock, or into repair, and clears the holder", () => {
    expect(giveBack(held, "X", "2026-09-18")).toMatchObject({
      status: "in_stock",
      assignedTo: null,
    })
    expect(giveBack(held, "X", "2026-09-18", "repair").status).toBe("repair")
    expect(giveBack(stock, "X", "2026-09-18")).toBe(stock)
  })

  it("marks lost and retires, but will not retire what someone holds", () => {
    expect(markLost(held, "2026-09-18", "Stolen").status).toBe("lost")
    expect(retire(stock, "2026-09-18", "End of life").status).toBe("retired")
    expect(retire(held, "2026-09-18", "x")).toBe(held)
  })

  it("keeps tags unique and names real", () => {
    expect(
      validateAsset({ tag: stock.tag, name: "Another" }, ASSETS)
    ).toHaveProperty("tag")
    expect(
      validateAsset({ tag: stock.tag, name: "Same one" }, ASSETS, stock.id)
    ).toEqual({})
    expect(validateAsset({ tag: "", name: "x" }, ASSETS)).toEqual({
      tag: "Give it a tag.",
      name: "Name the asset.",
    })
  })

  it("builds a leaver's checklist from what they actually hold", () => {
    const items = exitItemsFor(ASSETS, "kojo")
    expect(items.map((i) => i.assetId)).toEqual(["as-3"])
    expect(assetsOf(ASSETS, "kofi")).toHaveLength(2)
    expect(exitItemsFor(ASSETS, "nobody")).toEqual([])
  })

  it("numbers the next tag after the highest", () => {
    expect(nextTag(ASSETS, "ZEL-LT-")).toBe("ZEL-LT-0252")
  })
})

describe("surveys and anonymity", () => {
  const s = SURVEYS[0]

  it("scores eNPS as promoters minus detractors", () => {
    expect(enps([10, 9, 9, 8, 7, 3])).toBe(Math.round(((3 - 1) / 6) * 100))
    expect(enps([])).toBeNull()
    expect(enps([8, 8])).toBe(0)
  })

  it("shows results once enough people have answered", () => {
    const r = resultsFor(s, SURVEY_RESPONSES, 22)
    expect(r.shown).toBe(true)
    expect(r.responses).toBe(7)
    expect(r.questions.find((q) => q.kind === "enps")?.value).toBe(
      enps([9, 8, 10, 6, 9, 7, 9])
    )
    expect(r.questions.find((q) => q.kind === "text")?.comments).toHaveLength(4)
  })

  it("withholds everything while the group is under the floor", () => {
    const r = resultsFor(s, SURVEY_RESPONSES.slice(0, 4), 22)
    expect(r.shown).toBe(false)
    expect(r.questions.every((q) => q.value === null && !q.comments)).toBe(true)
    expect(r.departments).toEqual([])
  })

  it("shows a team only when it is big enough, and says how many were held back", () => {
    const r = resultsFor(s, SURVEY_RESPONSES, 22)
    // Seven answers across six teams: none reaches five on its own.
    expect(r.departments).toEqual([])
    expect(r.withheldDepartments).toBeGreaterThan(0)
    const big = Array.from({ length: 6 }, (_, i) => ({
      ...SURVEY_RESPONSES[0],
      id: `b${i}`,
      department: "Engineering",
    }))
    const r2 = resultsFor(s, [...SURVEY_RESPONSES, ...big], 22)
    expect(r2.departments.map((d) => d.department)).toEqual(["Engineering"])
  })

  it("keeps no name on an answer", () => {
    for (const r of SURVEY_RESPONSES)
      expect(Object.keys(r).sort()).toEqual([
        "answers",
        "department",
        "id",
        "on",
        "surveyId",
      ])
  })

  it("lets someone answer once, while it is open and they are invited", () => {
    expect(isOpen(s, "2026-09-18")).toBe(true)
    expect(isOpen(s, "2026-10-01")).toBe(false)
    expect(canRespond(s, emp("kofi"), SURVEY_PARTICIPATION, "2026-09-18")).toBe(
      "yes"
    )
    expect(canRespond(s, emp("ama"), SURVEY_PARTICIPATION, "2026-09-18")).toBe(
      "done"
    )
    expect(canRespond(s, emp("kofi"), SURVEY_PARTICIPATION, "2026-10-01")).toBe(
      "closed"
    )
    expect(
      canRespond(
        { ...s, audience: { kind: "department", value: "Finance" } },
        emp("kofi"),
        [],
        "2026-09-18"
      )
    ).toBe("not_invited")
  })

  it("needs a title, questions with wording, and a real audience", () => {
    expect(
      validateSurvey(
        { title: "Q", questions: [], audience: { kind: "all", value: "" } },
        () => true
      )
    ).toEqual({
      title: "Give the survey a title.",
      questions: "Add at least one question.",
    })
    expect(
      validateSurvey(
        {
          title: "Q4 pulse",
          questions: [{ prompt: "How are you today?" }],
          audience: { kind: "all", value: "" },
        },
        () => true
      )
    ).toEqual({})
  })
})
