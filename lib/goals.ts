/**
 * Goals and OKRs: how progress is worked out, whether a goal is healthy, who
 * may see and change one, and how goals line up under the company's.
 *
 * Pure. "Today" is an argument, so a goal is at risk on the same days
 * however often the page is opened.
 */
import type { CheckIn, Confidence, Employee, Goal, KeyResult } from "./types"
import { has, isInChain, type Viewer } from "./rbac"
import { daysBetween } from "./time"

export const STALE_AFTER_DAYS = 14

/** How far a key result has come between where it started and where it is meant to end, 0 to 1. */
export function krProgress(
  kr: Pick<KeyResult, "start" | "target" | "current">
) {
  const span = kr.target - kr.start
  if (span === 0) return kr.current === kr.target ? 1 : 0
  return Math.min(1, Math.max(0, (kr.current - kr.start) / span))
}

/**
 * A goal's progress: the average of its key results. A goal with none (a
 * company or team goal that exists to group others) takes the average of the
 * goals aligned to it, so progress rolls up without anyone retyping it.
 */
export function progressOf(
  goal: Goal,
  all: Goal[],
  seen: Set<string> = new Set()
): number {
  if (seen.has(goal.id)) return 0
  seen.add(goal.id)
  if (goal.keyResults.length > 0)
    return (
      goal.keyResults.reduce((s, k) => s + krProgress(k), 0) /
      goal.keyResults.length
    )
  const kids = all.filter(
    (g) =>
      g.parentId === goal.id && g.status !== "cancelled" && g.status !== "draft"
  )
  if (kids.length === 0) return 0
  return kids.reduce((s, k) => s + progressOf(k, all, seen), 0) / kids.length
}

export const pct = (n: number) => Math.round(n * 100)

export function latestCheckIn(goalId: string, checkIns: CheckIn[]) {
  return checkIns
    .filter((c) => c.goalId === goalId)
    .sort((a, b) => b.at.localeCompare(a.at))[0]
}

/** Days since someone last said how it is going, from the first day if they never have. */
export function daysSinceCheckIn(
  goal: Goal,
  checkIns: CheckIn[],
  today: string
) {
  const last = latestCheckIn(goal.id, checkIns)
  return daysBetween((last?.at ?? goal.startOn).slice(0, 10), today)
}

export function isStale(goal: Goal, checkIns: CheckIn[], today: string) {
  return (
    goal.status === "active" &&
    daysSinceCheckIn(goal, checkIns, today) > STALE_AFTER_DAYS
  )
}

/** How much of the goal's time has gone, 0 to 1. */
export function elapsed(goal: Pick<Goal, "startOn" | "dueOn">, today: string) {
  const total = daysBetween(goal.startOn, goal.dueOn)
  if (total <= 0) return 1
  return Math.min(1, Math.max(0, daysBetween(goal.startOn, today) / total))
}

/**
 * Whether it is going well. A person's own word (the latest check-in) wins, as long as it is recent; with no
 * recent word, it is judged against the clock: well behind where time says it should be is at risk.
 */
export function healthOf(
  goal: Goal,
  all: Goal[],
  checkIns: CheckIn[],
  today: string
): Confidence {
  const last = latestCheckIn(goal.id, checkIns)
  if (last && daysBetween(last.at.slice(0, 10), today) <= STALE_AFTER_DAYS)
    return last.confidence
  const gap = elapsed(goal, today) - progressOf(goal, all)
  if (gap > 0.35) return "off_track"
  if (gap > 0.15) return "at_risk"
  return "on_track"
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
}

export const LEVEL_LABEL = {
  company: "Company",
  team: "Team",
  individual: "Individual",
} as const

/* ── Who may do what ─────────────────────────────────────────────────────── */

export interface Ctx {
  viewer: Viewer
  employees: Employee[]
}

const emp = (c: Ctx, id: string | null) => c.employees.find((e) => e.id === id)

/** A department head runs their team's goals. */
function leadsTeam(c: Ctx, team: string | null) {
  if (!team) return false
  const me = emp(c, c.viewer.employeeId)
  return !!me && me.department === team && has(c.viewer, "head_of_department")
}

/** Company and team goals are open to everyone, which is the point of them. An individual goal is its owner's, their managers' and HR's. */
export function canViewGoal(g: Goal, c: Ctx) {
  if (g.level !== "individual") return true
  if (has(c.viewer, "hr_admin")) return true
  if (g.ownerId === c.viewer.employeeId) return true
  const owner = emp(c, g.ownerId)
  return !!owner && isInChain(c.viewer, owner, c.employees)
}

export function canEditGoal(g: Goal, c: Ctx) {
  if (has(c.viewer, "hr_admin")) return true
  if (g.level === "company") return false
  if (g.level === "team") return leadsTeam(c, g.team)
  if (g.ownerId === c.viewer.employeeId)
    return g.status !== "done" && g.status !== "cancelled"
  const owner = emp(c, g.ownerId)
  return !!owner && isInChain(c.viewer, owner, c.employees)
}

/** Whoever approves a proposed goal: the owner's manager, or HR. Never the owner. */
export function canApproveGoal(g: Goal, c: Ctx) {
  if (g.level !== "individual" || g.status !== "proposed") return false
  if (g.ownerId === c.viewer.employeeId && !has(c.viewer, "hr_admin"))
    return false
  if (has(c.viewer, "hr_admin")) return true
  const owner = emp(c, g.ownerId)
  return !!owner && isInChain(c.viewer, owner, c.employees)
}

/** What a person can create, and for whom. */
export function creatableLevels(c: Ctx): Goal["level"][] {
  const levels: Goal["level"][] = ["individual"]
  if (has(c.viewer, "head_of_department") || has(c.viewer, "hr_admin"))
    levels.push("team")
  if (has(c.viewer, "hr_admin")) levels.push("company")
  return levels
}

/** Someone's goal starts active if their manager or HR set it, and proposed if they set it themselves. */
export function startingStatus(
  ownerId: string | null,
  level: Goal["level"],
  c: Ctx
): Goal["status"] {
  if (level !== "individual") return "active"
  if (ownerId !== c.viewer.employeeId || has(c.viewer, "hr_admin"))
    return "active"
  return "proposed"
}

/* ── Shape and checks ────────────────────────────────────────────────────── */

export function ancestors(g: Goal, all: Goal[]) {
  const out: Goal[] = []
  let cur = all.find((x) => x.id === g.parentId)
  const seen = new Set<string>([g.id])
  while (cur && !seen.has(cur.id)) {
    out.push(cur)
    seen.add(cur.id)
    cur = all.find((x) => x.id === cur!.parentId)
  }
  return out
}

/** Goals a new goal may support: higher up than it, and not itself or anything beneath it. */
export function parentChoices(
  level: Goal["level"],
  selfId: string | undefined,
  all: Goal[]
) {
  const rank = { company: 0, team: 1, individual: 2 } as const
  const below = new Set<string>()
  const walk = (id: string) =>
    all
      .filter((g) => g.parentId === id)
      .forEach((g) => {
        if (!below.has(g.id)) {
          below.add(g.id)
          walk(g.id)
        }
      })
  if (selfId) walk(selfId)
  return all.filter(
    (g) =>
      g.id !== selfId &&
      !below.has(g.id) &&
      rank[g.level] < rank[level] &&
      (g.status === "active" || g.status === "done")
  )
}

export function validateGoal(
  d: Pick<
    Goal,
    "title" | "startOn" | "dueOn" | "keyResults" | "level" | "ownerId" | "team"
  >
) {
  const e: Record<string, string> = {}
  if (d.title.trim().length < 5) e.title = "Say what the goal is."
  if (!d.startOn || !d.dueOn) e.dates = "Set when it starts and when it is due."
  else if (d.dueOn <= d.startOn) e.dates = "It has to be due after it starts."
  if (d.keyResults.length === 0)
    e.keyResults = "Add at least one key result: how you will know it worked."
  else {
    const bad = d.keyResults.find((k) => k.title.trim().length < 3)
    if (bad) e.keyResults = "Every key result needs a title."
    else if (d.keyResults.some((k) => k.start === k.target))
      e.keyResults = "A key result's target has to differ from where it starts."
    else if (
      d.keyResults.some(
        (k) =>
          k.kind === "percent" &&
          (k.start < 0 || k.target > 100 || k.start > 100 || k.target < 0)
      )
    )
      e.keyResults = "A percentage is between 0 and 100."
  }
  if (d.level === "individual" && !d.ownerId)
    e.owner = "Choose whose goal it is."
  if (d.level === "team" && !d.team) e.team = "Choose the team."
  return e
}

export function cyclesOf(goals: Goal[], reviewCycles: string[]) {
  // Cycles goals already use come first, so a new goal defaults to the live one.
  const used = [...new Set(goals.map((g) => g.cycle))].sort().reverse()
  return [
    ...used,
    ...[...new Set(reviewCycles)].filter((c) => !used.includes(c)),
  ]
}

export interface GoalSummary {
  count: number
  avgProgress: number
  atRisk: number
  stale: number
}

export function summarise(
  goals: Goal[],
  all: Goal[],
  checkIns: CheckIn[],
  today: string
): GoalSummary {
  const live = goals.filter((g) => g.status === "active")
  const health = live.map((g) => healthOf(g, all, checkIns, today))
  return {
    count: live.length,
    avgProgress: live.length
      ? live.reduce((s, g) => s + progressOf(g, all), 0) / live.length
      : 0,
    atRisk: health.filter((h) => h !== "on_track").length,
    stale: live.filter((g) => isStale(g, checkIns, today)).length,
  }
}

/** What a check-in does to the goal: moves each key result to its new value. */
export function applyValues(g: Goal, values: Record<string, number>): Goal {
  return {
    ...g,
    keyResults: g.keyResults.map((k) =>
      k.id in values ? { ...k, current: values[k.id] } : k
    ),
  }
}

export function validateCheckIn(
  g: Goal,
  values: Record<string, number>,
  note: string,
  confidence: Confidence | ""
) {
  const e: Record<string, string> = {}
  for (const k of g.keyResults) {
    const v = values[k.id]
    if (v === undefined || Number.isNaN(v))
      e[k.id] = "Enter where it stands now."
    else if (k.kind === "yes_no" && v !== 0 && v !== 1) e[k.id] = "Yes or no."
    else if (k.kind === "percent" && (v < 0 || v > 100))
      e[k.id] = "Between 0 and 100."
  }
  if (!confidence) e.confidence = "How confident are you?"
  const unchanged = g.keyResults.every((k) => values[k.id] === k.current)
  if (note.trim().length < 5 && unchanged)
    e.note = "Nothing has changed, so say a little about how it is going."
  if (confidence && confidence !== "on_track" && note.trim().length < 5)
    e.note = "Say what is getting in the way."
  return e
}
