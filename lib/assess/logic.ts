/**
 * Assessments: issuing a paper, marking it, and keeping time.
 *
 * Nothing here reads the clock or a random source on its own; both are passed
 * in, so a test can prove the rules (a paper is a fair random draw, an answer
 * after the deadline is refused) rather than hope for them.
 */
import type {
  AnswerValue,
  AssessmentTest,
  Question,
  TestInvitation,
} from "../types"

export const QUESTION_KIND_LABEL: Record<Question["kind"], string> = {
  mcq: "Multiple choice",
  multi: "Multiple answer",
  short: "Short answer",
  long: "Long answer",
  upload: "File upload",
  code: "Coding",
}

/** Written answers and uploads cannot be marked by a machine. */
export function needsReview(q: Question) {
  return q.kind === "short" || q.kind === "long" || q.kind === "upload"
}

/**
 * The paper one candidate is given: the whole test, or a random N from its
 * pool, in a fixed or shuffled order. `rng` returns [0, 1).
 */
export function issuePaper(
  test: AssessmentTest,
  bank: Question[],
  rng: () => number = Math.random
): string[] {
  let ids = test.questionIds.filter((id) => bank.some((q) => q.id === id))
  const shuffle = (xs: string[]) => {
    const a = [...xs]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  if (test.pickCount && test.pickCount < ids.length)
    ids = shuffle(ids).slice(0, test.pickCount)
  return test.shuffle ? shuffle(ids) : ids
}

const same = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i])

/** Marks a question a machine can mark, or returns null when a person has to. */
export function autoMark(
  q: Question,
  a: AnswerValue | undefined
): number | null {
  if (needsReview(q)) return null
  if (!a) return 0
  if (q.kind === "mcq" || q.kind === "multi") {
    if (!a.choices || a.choices.length === 0 || !q.correct) return 0
    return same(a.choices, q.correct) ? q.marks : 0
  }
  if (q.kind === "code") {
    if (!a.total) return 0
    return Math.round(((a.passed ?? 0) / a.total) * q.marks * 100) / 100
  }
  return null
}

export function autoMarks(
  paper: string[],
  bank: Question[],
  answers: Record<string, AnswerValue>
) {
  const out: Record<string, number> = {}
  for (const id of paper) {
    const q = bank.find((x) => x.id === id)
    if (!q) continue
    const m = autoMark(q, answers[id])
    if (m !== null) out[id] = m
  }
  return out
}

export interface Outcome {
  score: number
  max: number
  pct: number
  /** Written answers still waiting for a reviewer. */
  pending: number
  passed: boolean | null
}

export function outcomeOf(
  inv: Pick<
    TestInvitation,
    "questionIds" | "autoMarks" | "reviewMarks" | "reviewed"
  >,
  test: Pick<AssessmentTest, "passMarkPct">,
  bank: Question[]
): Outcome {
  let score = 0
  let max = 0
  let pending = 0
  for (const id of inv.questionIds) {
    const q = bank.find((x) => x.id === id)
    if (!q) continue
    max += q.marks
    if (id in inv.reviewMarks) score += inv.reviewMarks[id]
    else if (id in inv.autoMarks) score += inv.autoMarks[id]
    else if (needsReview(q)) pending += 1
  }
  const pct = max === 0 ? 0 : Math.round((score / max) * 1000) / 10
  // A pass is only called once nothing is left to mark, or a reviewer has signed off.
  const settled = pending === 0 || inv.reviewed
  return {
    score,
    max,
    pct,
    pending,
    passed: settled ? pct >= test.passMarkPct : null,
  }
}

/* ── The clock ───────────────────────────────────────────────────────────── */

const MIN = 60_000

/** The moment time runs out, fixed when the test is started. */
export function deadlineFor(
  startedAt: string,
  test: Pick<AssessmentTest, "durationMin">,
  extraMinutes = 0
) {
  return new Date(
    new Date(startedAt).getTime() + (test.durationMin + extraMinutes) * MIN
  ).toISOString()
}

export function remainingMs(deadline: string | null, now: number) {
  return deadline ? Math.max(0, new Date(deadline).getTime() - now) : 0
}

/** A little slack for a request in flight when the clock hits zero, and no more. */
export const GRACE_MS = 3000

export function acceptsAnswers(
  inv: Pick<TestInvitation, "status" | "deadline">,
  now: number
) {
  if (inv.status !== "started" || !inv.deadline) return false
  return now <= new Date(inv.deadline).getTime() + GRACE_MS
}

export function canStart(
  inv: Pick<TestInvitation, "status" | "windowEnd">,
  now: number
) {
  return inv.status === "invited" && now <= new Date(inv.windowEnd).getTime()
}

export function timeTakenMin(
  inv: Pick<TestInvitation, "startedAt" | "submittedAt">
) {
  if (!inv.startedAt || !inv.submittedAt) return null
  return Math.round(
    (new Date(inv.submittedAt).getTime() - new Date(inv.startedAt).getTime()) /
      MIN
  )
}

export function formatClock(ms: number) {
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/* ── Running code ────────────────────────────────────────────────────────── */

export interface CaseResult {
  passed: boolean
  hidden: boolean
  /** What was returned or thrown, shown only for visible cases. */
  got?: string
  expected?: string
}

/**
 * Runs a candidate's function against cases. Self-contained on purpose: it is
 * also stringified and run inside a Web Worker, where nothing else in this file
 * exists. Network and timer APIs are removed before the code is touched.
 */
export function runCases(
  source: string,
  fn: string,
  cases: { args: unknown[]; expected: unknown; hidden: boolean }[]
): CaseResult[] {
  const g = globalThis as unknown as Record<string, unknown>
  for (const k of [
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "importScripts",
    "EventSource",
  ]) {
    try {
      g[k] = undefined
    } catch {
      // Not every host lets these be reassigned.
    }
  }
  const show = (v: unknown) => {
    try {
      return JSON.stringify(v) ?? String(v)
    } catch {
      return String(v)
    }
  }
  let f: (...a: unknown[]) => unknown
  try {
    f = new Function(
      `${source}\n;return typeof ${fn} === "function" ? ${fn} : undefined`
    )() as (...a: unknown[]) => unknown
    if (typeof f !== "function")
      throw new Error(`Define a function called ${fn}.`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return cases.map((c) => ({
      passed: false,
      hidden: c.hidden,
      ...(c.hidden ? {} : { got: `Error: ${msg}`, expected: show(c.expected) }),
    }))
  }
  return cases.map((c) => {
    try {
      const out = f(...JSON.parse(JSON.stringify(c.args)))
      const ok = show(out) === show(c.expected)
      return {
        passed: ok,
        hidden: c.hidden,
        ...(c.hidden ? {} : { got: show(out), expected: show(c.expected) }),
      }
    } catch (e) {
      return {
        passed: false,
        hidden: c.hidden,
        ...(c.hidden
          ? {}
          : {
              got: `Error: ${e instanceof Error ? e.message : String(e)}`,
              expected: show(c.expected),
            }),
      }
    }
  })
}

export const RUN_TIMEOUT_MS = 3000
