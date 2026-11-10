import { describe, expect, it } from "vitest"

import {
  acceptsAnswers,
  autoMark,
  canStart,
  deadlineFor,
  formatClock,
  issuePaper,
  outcomeOf,
  remainingMs,
  runCases,
} from "./logic"
import type { AssessmentTest, Question } from "../types"

const q = (
  id: string,
  kind: Question["kind"],
  extra: Partial<Question> = {}
): Question => ({
  id,
  kind,
  prompt: id,
  skill: "js",
  level: "mid",
  marks: 4,
  ...extra,
})

const bank = [
  q("a", "mcq", { options: ["x", "y", "z"], correct: [1] }),
  q("b", "multi", { options: ["x", "y", "z"], correct: [0, 2] }),
  q("c", "short"),
  q("d", "code", {
    code: { language: "javascript", fn: "f", starter: "", tests: [] },
  }),
  q("e", "mcq", { options: ["x", "y"], correct: [0] }),
]

const test: AssessmentTest = {
  id: "t",
  name: "T",
  requisitionId: null,
  questionIds: ["a", "b", "c", "d", "e"],
  pickCount: null,
  shuffle: false,
  durationMin: 90,
  passMarkPct: 60,
  windowDays: 5,
  requiredForOffer: true,
  active: true,
}

// A small deterministic generator, so a "random" draw can be asserted.
const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

describe("issuing a paper", () => {
  it("gives the whole test in order when nothing is random", () => {
    expect(issuePaper(test, bank)).toEqual(["a", "b", "c", "d", "e"])
  })

  it("draws N from the pool, without repeats", () => {
    const paper = issuePaper({ ...test, pickCount: 3 }, bank, lcg(7))
    expect(paper).toHaveLength(3)
    expect(new Set(paper).size).toBe(3)
  })

  it("gives different candidates different papers", () => {
    const papers = new Set(
      [1, 2, 3, 4, 5, 6].map((s) =>
        issuePaper(
          { ...test, pickCount: 2, shuffle: true },
          bank,
          lcg(s)
        ).join()
      )
    )
    expect(papers.size).toBeGreaterThan(1)
  })

  it("ignores a question that has been deleted from the bank", () => {
    expect(issuePaper({ ...test, questionIds: ["a", "gone"] }, bank)).toEqual([
      "a",
    ])
  })
})

describe("marking", () => {
  it("marks multiple choice all or nothing", () => {
    expect(autoMark(bank[0], { choices: [1] })).toBe(4)
    expect(autoMark(bank[0], { choices: [0] })).toBe(0)
    expect(autoMark(bank[0], undefined)).toBe(0)
  })

  it("needs every right option, and no wrong one, for multiple answer", () => {
    expect(autoMark(bank[1], { choices: [2, 0] })).toBe(4)
    expect(autoMark(bank[1], { choices: [0] })).toBe(0)
    expect(autoMark(bank[1], { choices: [0, 1, 2] })).toBe(0)
  })

  it("scores code by the share of hidden tests passed", () => {
    expect(autoMark(bank[3], { passed: 3, total: 4 })).toBe(3)
    expect(autoMark(bank[3], { passed: 0, total: 4 })).toBe(0)
  })

  it("leaves written answers for a person", () => {
    expect(autoMark(bank[2], { text: "anything" })).toBeNull()
  })
})

describe("the outcome", () => {
  const inv = {
    questionIds: ["a", "b", "c"],
    autoMarks: { a: 4, b: 0 },
    reviewMarks: {} as Record<string, number>,
    reviewed: false,
  }

  it("will not call a pass while a written answer is unmarked", () => {
    const o = outcomeOf(inv, test, bank)
    expect(o.pending).toBe(1)
    expect(o.passed).toBeNull()
    expect(o.max).toBe(12)
  })

  it("calls it once the reviewer has marked", () => {
    const o = outcomeOf(
      { ...inv, reviewMarks: { c: 4 }, reviewed: true },
      test,
      bank
    )
    expect(o.score).toBe(8)
    expect(o.pct).toBeCloseTo(66.7, 1)
    expect(o.passed).toBe(true)
  })

  it("lets a reviewer's mark replace the automatic one", () => {
    const o = outcomeOf(
      { ...inv, reviewMarks: { a: 0, c: 0 }, reviewed: true },
      test,
      bank
    )
    expect(o.score).toBe(0)
    expect(o.passed).toBe(false)
  })
})

describe("the clock", () => {
  const start = "2026-11-10T09:00:00.000Z"

  it("fixes the deadline at the start, and adds recorded extra time", () => {
    expect(deadlineFor(start, test)).toBe("2026-11-10T10:30:00.000Z")
    expect(deadlineFor(start, test, 30)).toBe("2026-11-10T11:00:00.000Z")
  })

  it("counts down from the deadline, never below zero", () => {
    const d = deadlineFor(start, test)
    expect(remainingMs(d, new Date("2026-11-10T10:00:00Z").getTime())).toBe(
      30 * 60_000
    )
    expect(remainingMs(d, new Date("2026-11-10T12:00:00Z").getTime())).toBe(0)
  })

  it("refuses answers after the deadline, allowing only a moment's slack", () => {
    const inv = {
      status: "started" as const,
      deadline: deadlineFor(start, test),
    }
    expect(
      acceptsAnswers(inv, new Date("2026-11-10T10:29:59Z").getTime())
    ).toBe(true)
    expect(
      acceptsAnswers(inv, new Date("2026-11-10T10:30:02Z").getTime())
    ).toBe(true)
    expect(
      acceptsAnswers(inv, new Date("2026-11-10T10:30:05Z").getTime())
    ).toBe(false)
  })

  it("refuses answers to a test that was never started or already handed in", () => {
    expect(acceptsAnswers({ status: "invited", deadline: null }, 0)).toBe(false)
    expect(
      acceptsAnswers(
        { status: "submitted", deadline: "2999-01-01T00:00:00Z" },
        0
      )
    ).toBe(false)
  })

  it("only lets a test be started inside its window, once", () => {
    const inv = {
      status: "invited" as const,
      windowEnd: "2026-11-14T17:00:00Z",
    }
    expect(canStart(inv, new Date("2026-11-14T16:59:00Z").getTime())).toBe(true)
    expect(canStart(inv, new Date("2026-11-14T17:01:00Z").getTime())).toBe(
      false
    )
    expect(canStart({ ...inv, status: "started" }, 0)).toBe(false)
  })

  it("shows the countdown as a clock", () => {
    expect(formatClock(90 * 60_000)).toBe("1:30:00")
    expect(formatClock(65_000)).toBe("01:05")
  })
})

describe("running a candidate's code", () => {
  const cases = [
    { args: [2, 3], expected: 5, hidden: false },
    { args: [-1, 1], expected: 0, hidden: true },
  ]

  it("passes correct code and hides what the hidden cases returned", () => {
    const r = runCases("function add(a, b) { return a + b }", "add", cases)
    expect(r.map((x) => x.passed)).toEqual([true, true])
    expect(r[1].got).toBeUndefined()
    expect(r[0].got).toBe("5")
  })

  it("fails wrong code and shows what a visible case got", () => {
    const r = runCases("function add(a, b) { return a - b }", "add", cases)
    expect(r[0]).toMatchObject({ passed: false, got: "-1", expected: "5" })
  })

  it("reports a thrown error instead of crashing", () => {
    const r = runCases(
      "function add() { throw new Error('boom') }",
      "add",
      cases
    )
    expect(r[0].got).toBe("Error: boom")
    expect(r.every((x) => !x.passed)).toBe(true)
  })

  it("says so when the function is not defined", () => {
    const r = runCases("const x = 1", "add", cases)
    expect(r[0].got).toMatch(/Define a function called add/)
  })

  it("reports a syntax error against every case", () => {
    const r = runCases("function add(a, b {", "add", cases)
    expect(r.every((x) => !x.passed)).toBe(true)
  })

  it("compares objects and arrays by value", () => {
    const r = runCases("function f() { return { a: [1, 2] } }", "f", [
      { args: [], expected: { a: [1, 2] }, hidden: false },
    ])
    expect(r[0].passed).toBe(true)
  })

  it("takes away the network before running anything", () => {
    const r = runCases("function f() { return typeof fetch }", "f", [
      { args: [], expected: "undefined", hidden: false },
    ])
    expect(r[0].passed).toBe(true)
  })
})
