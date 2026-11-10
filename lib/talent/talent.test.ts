import { describe, expect, it } from "vitest"

import { CANDIDATES, CASES, OFFBOARDING, REVIEWS } from "../data/records"
import { EMPLOYEES } from "../data/employees"
import {
  closeBlockers,
  exitProgress,
  settlementLines,
  weekdaysInMonthTo,
} from "./offboarding"
import { advanceBlocker } from "./recruitment"
import { advanceBlockers, appealDeadline, caseSteps } from "./disciplinary"
import { averageScore, ownerOf, toHalf } from "./performance"

const by = <T extends { id: string }>(xs: T[], id: string) =>
  xs.find((x) => x.id === id)!

describe("offboarding", () => {
  it("cannot close while anything is outstanding", () => {
    const open = by(OFFBOARDING, "OFF-2026-04")
    expect(closeBlockers(open).length).toBeGreaterThan(0)
    expect(closeBlockers(by(OFFBOARDING, "OFF-2025-11"))).toEqual([])
  })

  it("counts a laptop still out as an open step, not a done one", () => {
    const p = exitProgress(by(OFFBOARDING, "OFF-2026-04"))
    expect(p.done).toBeLessThan(p.total)
  })

  it("adds up a settlement from days, leave and recoveries", () => {
    const e = EMPLOYEES[0]
    const { lines, total } = settlementLines(e, {
      salaryDays: 10,
      leaveDays: 5,
      noticeInLieuDays: 0,
      deductions: 100,
      note: "",
    })
    const rate = (e.compensation.grossMonthly * 12) / 260
    expect(lines[0].amount).toBeCloseTo(rate * 10, 1)
    expect(total).toBeCloseTo(rate * 15 - 100, 1)
  })

  it("counts weekdays only, up to the last working day", () => {
    // September 2026 starts on a Tuesday; by the 30th that is 22 weekdays.
    expect(weekdaysInMonthTo("2026-09-30")).toBe(22)
  })
})

describe("recruitment", () => {
  it("will not move a candidate to assessment without interview feedback", () => {
    const c = {
      ...by(CANDIDATES, "c-1"),
      stage: "interview" as const,
      interviews: [],
    }
    expect(advanceBlocker(c)).toMatch(/feedback/i)
  })

  it("will not hire until the offer is accepted", () => {
    const sent = by(CANDIDATES, "c-5") // at offer, offer sent
    expect(sent.offer?.status).toBe("sent")
    expect(advanceBlocker(sent)).toMatch(/accepted/i)
    expect(
      advanceBlocker({ ...sent, offer: { ...sent.offer!, status: "accepted" } })
    ).toBeNull()
  })
})

describe("the assessment gate before an offer", () => {
  const base = {
    ...by(CANDIDATES, "c-2"), // at assessment, interview scored
    stage: "assessment" as const,
  }
  const test = {
    id: "t1",
    name: "Backend screen",
    requisitionId: null,
    questionIds: [],
    pickCount: null,
    shuffle: false,
    durationMin: 60,
    passMarkPct: 60,
    windowDays: 5,
    requiredForOffer: true,
    active: true,
  }
  const inv = (over: Record<string, unknown>) => ({
    id: "i1",
    token: "t",
    candidateId: base.id,
    testId: "t1",
    status: "invited" as const,
    invitedOn: "",
    windowEnd: "",
    startedAt: null,
    deadline: null,
    extraMinutes: 0,
    extraNote: null,
    submittedAt: null,
    questionIds: [],
    answers: {},
    flags: [],
    autoMarks: {},
    reviewMarks: {},
    reviewed: false,
    reviewNote: null,
    reviewerId: null,
    ...over,
  })

  it("does not stand in the way when no test was sent", () => {
    expect(advanceBlocker(base, { tests: [test], invitations: [] })).toBeNull()
  })

  it("waits for a test that was sent but not taken", () => {
    expect(
      advanceBlocker(base, { tests: [test], invitations: [inv({})] })
    ).toMatch(/Waiting for them/)
  })

  it("waits for a submitted test to be reviewed", () => {
    expect(
      advanceBlocker(base, {
        tests: [test],
        invitations: [inv({ status: "submitted" })],
      })
    ).toMatch(/Review/)
  })

  it("lets them through once it is reviewed", () => {
    expect(
      advanceBlocker(base, {
        tests: [test],
        invitations: [inv({ status: "submitted", reviewed: true })],
      })
    ).toBeNull()
  })

  it("ignores a test that is not marked as needed for an offer", () => {
    expect(
      advanceBlocker(base, {
        tests: [{ ...test, requiredForOffer: false }],
        invitations: [inv({})],
      })
    ).toBeNull()
  })
})

describe("disciplinary due process", () => {
  it("reads steps off the case rather than storing ticks", () => {
    const c = by(CASES, "DC-2026-03") // investigation, evidence uploaded
    const steps = caseSteps(c)
    expect(steps.find((s) => s.key === "evidence")?.done).toBe(true)
    expect(steps.find((s) => s.key === "report")?.done).toBe(false)
  })

  it("holds a case at investigation until the report and statement exist", () => {
    const blockers = advanceBlockers(by(CASES, "DC-2026-03")).map((b) => b.key)
    expect(blockers).toEqual(expect.arrayContaining(["statement", "report"]))
  })

  it("requires the notice period before a hearing counts as noticed", () => {
    const c = by(CASES, "DC-2026-02")
    const ok = caseSteps(c).find((s) => s.key === "notice")!
    expect(ok.done).toBe(true)
    const short = {
      ...c,
      hearing: { ...c.hearing!, noticeGivenOn: c.hearing!.scheduledFor },
    }
    expect(caseSteps(short).find((s) => s.key === "notice")!.done).toBe(false)
  })

  it("opens a seven-day appeal window from the day it closed", () => {
    expect(appealDeadline(by(CASES, "DC-2026-01"))).toBe("2026-05-17")
    expect(appealDeadline(by(CASES, "DC-2026-03"))).toBeNull()
  })
})

describe("performance", () => {
  it("passes each step to a single owner", () => {
    expect(ownerOf("self_review")).toBe("employee")
    expect(ownerOf("manager_review")).toBe("manager")
    expect(ownerOf("calibration")).toBe("hr")
    expect(ownerOf("complete")).toBeNull()
  })

  it("only averages once every competency is scored", () => {
    expect(averageScore({ delivery: 4 })).toBeNull()
    expect(
      averageScore({ delivery: 4, collaboration: 3, ownership: 4, growth: 5 })
    ).toBe(4)
  })

  it("rounds to the nearest half point", () => {
    expect(toHalf(3.74)).toBe(3.5)
    expect(toHalf(3.76)).toBe(4)
  })

  it("seeds a completed review with the steps that came before it", () => {
    const done = by(REVIEWS, "pr-3")
    expect(done.selfSummary).not.toBeNull()
    expect(done.scores).not.toBeNull()
    expect(done.acknowledgedOn).not.toBeNull()
  })
})
