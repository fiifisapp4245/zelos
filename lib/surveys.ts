/**
 * Pulse surveys, with anonymity as a rule rather than a promise.
 *
 * An answer carries no name, only the team it came from. Anything shown has to
 * come from a group of at least MIN_GROUP people: below that a figure points at
 * someone, so it is withheld (an overall number needs the same floor, or a
 * survey of four people reveals each of them).
 */
import type {
  Audience,
  Employee,
  Survey,
  SurveyParticipation,
  SurveyResponse,
} from "./types"
import { MIN_AGGREGATION_GROUP } from "./rbac"
import { inAudience } from "./announcements"
import { isOnStrength } from "./selectors"

export const MIN_GROUP = MIN_AGGREGATION_GROUP

/** Net promoter style score: % promoters (9-10) minus % detractors (0-6). Passives (7-8) count in the base only. */
export function enps(scores: number[]) {
  if (scores.length === 0) return null
  const pro = scores.filter((s) => s >= 9).length
  const det = scores.filter((s) => s <= 6).length
  return Math.round(((pro - det) / scores.length) * 100)
}

export function average(xs: number[]) {
  return xs.length
    ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10
    : null
}

export function isOpen(s: Pick<Survey, "status" | "closesOn">, today: string) {
  return s.status === "open" && (!s.closesOn || s.closesOn >= today)
}

export function invited(s: Pick<Survey, "audience">, employees: Employee[]) {
  return employees.filter(
    (e) =>
      isOnStrength(e) &&
      inAudience({ audience: s.audience } as { audience: Audience }, e)
  )
}

export function hasResponded(
  p: SurveyParticipation[],
  surveyId: string,
  employeeId: string
) {
  return p.some((x) => x.surveyId === surveyId && x.employeeId === employeeId)
}

/** Whether this person can answer now: open, in the audience, and not already done. */
export function canRespond(
  s: Survey,
  e: Employee,
  p: SurveyParticipation[],
  today: string
): "yes" | "closed" | "not_invited" | "done" {
  if (!isOpen(s, today)) return "closed"
  if (
    !inAudience({ audience: s.audience } as { audience: Audience }, e) ||
    !isOnStrength(e)
  )
    return "not_invited"
  if (hasResponded(p, s.id, e.id)) return "done"
  return "yes"
}

export interface QuestionResult {
  id: string
  kind: "enps" | "scale" | "text"
  prompt: string
  /** null = withheld. */
  value: number | null
  n: number
  comments?: string[]
}

export interface DepartmentResult {
  department: string
  n: number
  enps: number | null
  /** Overall average of the scale questions. */
  score: number | null
}

export interface Results {
  responses: number
  invited: number
  /** Whether enough people answered to show anything at all. */
  shown: boolean
  questions: QuestionResult[]
  departments: DepartmentResult[]
  /** Departments left out for being too small. */
  withheldDepartments: number
}

export function resultsFor(
  s: Survey,
  responses: SurveyResponse[],
  invitedCount: number,
  floor = MIN_GROUP
): Results {
  const mine = responses.filter((r) => r.surveyId === s.id)
  const shown = mine.length >= floor
  const nums = (qid: string, rs: SurveyResponse[]) =>
    rs
      .map((r) => r.answers[qid])
      .filter((v): v is number => typeof v === "number")

  const questions: QuestionResult[] = s.questions.map((q) => {
    if (!shown)
      return {
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        value: null,
        n: mine.length,
      }
    if (q.kind === "text") {
      const comments = mine
        .map((r) => r.answers[q.id])
        .filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        )
      // Shuffled order would be needed against line-by-line matching; newest-first by id is stable and
      // carries no team, which is the part that could identify someone.
      return {
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        value: null,
        n: comments.length,
        comments,
      }
    }
    const v = nums(q.id, mine)
    return {
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      value: q.kind === "enps" ? enps(v) : average(v),
      n: v.length,
    }
  })

  const byDept = new Map<string, SurveyResponse[]>()
  for (const r of mine)
    byDept.set(r.department, [...(byDept.get(r.department) ?? []), r])
  const scaleIds = s.questions
    .filter((q) => q.kind === "scale")
    .map((q) => q.id)
  const enpsId = s.questions.find((q) => q.kind === "enps")?.id
  const all = [...byDept.entries()].map(
    ([department, rs]): DepartmentResult => ({
      department,
      n: rs.length,
      enps: enpsId ? enps(nums(enpsId, rs)) : null,
      score: average(scaleIds.flatMap((id) => nums(id, rs))),
    })
  )
  const departments = shown
    ? all.filter((d) => d.n >= floor).sort((a, b) => b.n - a.n)
    : []
  return {
    responses: mine.length,
    invited: invitedCount,
    shown,
    questions,
    departments,
    withheldDepartments: shown ? all.length - departments.length : all.length,
  }
}

export function validateSurvey(
  d: { title: string; questions: { prompt: string }[]; audience: Audience },
  audienceExists: (kind: string, v: string) => boolean
) {
  const e: Record<string, string> = {}
  if (d.title.trim().length < 3) e.title = "Give the survey a title."
  if (d.questions.length === 0) e.questions = "Add at least one question."
  else if (d.questions.some((q) => q.prompt.trim().length < 5))
    e.questions = "Every question needs its wording."
  if (
    d.audience.kind !== "all" &&
    !audienceExists(d.audience.kind, d.audience.value)
  )
    e.audience = "Choose who it is for."
  return e
}
