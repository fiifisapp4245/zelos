import type {
  CaseDocumentCategory,
  CaseState,
  DisciplinaryCase,
  SanctionKind,
} from "../types"
import { daysBetween } from "../time"

/** Company policy: an employee gets at least this long to prepare for a hearing. */
export const MIN_HEARING_NOTICE_DAYS = 2
/** How long someone has to appeal once an outcome is issued. */
export const APPEAL_WINDOW_DAYS = 7

export const SANCTION_LABEL: Record<SanctionKind, string> = {
  no_action: "No further action",
  verbal_warning: "Verbal warning",
  written_warning: "Written warning",
  final_warning: "Final written warning",
  suspension: "Suspension without pay",
  demotion: "Demotion",
  dismissal: "Dismissal",
}

export const SANCTIONS_BY_SEVERITY: Record<
  DisciplinaryCase["severity"],
  SanctionKind[]
> = {
  minor: ["no_action", "verbal_warning", "written_warning"],
  serious: [
    "no_action",
    "written_warning",
    "final_warning",
    "suspension",
    "demotion",
  ],
  gross: ["final_warning", "suspension", "demotion", "dismissal"],
}

export const DOC_CATEGORY_LABEL: Record<CaseDocumentCategory, string> = {
  allegation: "Allegation letter",
  evidence: "Evidence",
  statement: "Statement",
  report: "Investigation report",
  hearing_notice: "Hearing notice",
  minutes: "Hearing minutes",
  outcome: "Outcome letter",
  appeal: "Appeal",
  other: "Other",
}

export const SEVERITY_LABEL = {
  minor: "Minor misconduct",
  serious: "Serious misconduct",
  gross: "Gross misconduct",
} as const

export interface CaseStep {
  key: string
  stage: CaseState
  label: string
  /** Why the step exists, in the terms due process uses. */
  why: string
  done: boolean
}

const has = (c: DisciplinaryCase, cat: CaseDocumentCategory) =>
  c.documents.some((d) => d.category === cat)

/**
 * The due-process checklist, read straight off the case. Nothing here is
 * stored as a tick: a step is done because the thing it asks for exists,
 * so the list cannot say one thing while the file says another.
 */
export function caseSteps(c: DisciplinaryCase): CaseStep[] {
  const h = c.hearing
  const noticeDays = h ? daysBetween(h.noticeGivenOn, h.scheduledFor) : 0
  return [
    {
      key: "allegation",
      stage: "open",
      label: "Allegation recorded",
      why: "What is alleged, and when it is said to have happened.",
      done: c.description.trim().length > 0,
    },
    {
      key: "notified",
      stage: "open",
      label: "Employee told in writing",
      why: "They must know what they are accused of before anything else happens.",
      done: c.notifiedOn !== null,
    },
    {
      key: "investigator",
      stage: "open",
      label: "Investigator assigned",
      why: "Someone independent of the person who raised it.",
      done: c.investigatorId !== null,
    },
    {
      key: "evidence",
      stage: "investigation",
      label: "Evidence gathered",
      why: "Upload what the case rests on.",
      done: has(c, "evidence"),
    },
    {
      key: "statement",
      stage: "investigation",
      label: "Employee's statement taken",
      why: "They get to give their side before any decision.",
      done: has(c, "statement"),
    },
    {
      key: "report",
      stage: "investigation",
      label: "Investigation report filed",
      why: "Findings and a recommendation for the hearing panel.",
      done: has(c, "report"),
    },
    {
      key: "notice",
      stage: "hearing",
      label: `Hearing notice given (${MIN_HEARING_NOTICE_DAYS}+ days)`,
      why: "Time to prepare, and to bring someone with them.",
      done: !!h && noticeDays >= MIN_HEARING_NOTICE_DAYS,
    },
    {
      key: "held",
      stage: "hearing",
      label: "Hearing held",
      why: "The employee heard, with the panel present.",
      done: !!h?.held,
    },
    {
      key: "minutes",
      stage: "hearing",
      label: "Minutes recorded",
      why: "A written record of what was said and decided.",
      done: !!h && h.minutes.trim().length > 0,
    },
    {
      key: "outcome",
      stage: "finalised",
      label: "Outcome decided",
      why: "A sanction, or no action, with reasons.",
      done: c.sanction !== null,
    },
    {
      key: "letter",
      stage: "finalised",
      label: "Outcome letter issued",
      why: "The employee is told in writing, including how to appeal.",
      done: has(c, "outcome"),
    },
  ]
}

const STAGE_ORDER: CaseState[] = [
  "open",
  "investigation",
  "hearing",
  "finalised",
]

export function nextCaseState(state: CaseState): CaseState | null {
  const i = STAGE_ORDER.indexOf(state)
  return i >= 0 ? (STAGE_ORDER[i + 1] ?? null) : null
}

/** Steps of the current stage that are not yet done. Empty means it can move on. */
export function advanceBlockers(c: DisciplinaryCase) {
  // The outcome stage is closed by deciding it, not by moving on from it.
  if (c.state === "finalised" || c.state === "dismissed") return []
  return caseSteps(c).filter((s) => s.stage === c.state && !s.done)
}

export function isClosed(c: DisciplinaryCase) {
  return c.state === "finalised" || c.state === "dismissed"
}

/** The last day an appeal can be lodged, or null before an outcome exists. */
export function appealDeadline(c: DisciplinaryCase) {
  if (!c.closedOn) return null
  const d = new Date(`${c.closedOn}T00:00:00`)
  d.setDate(d.getDate() + APPEAL_WINDOW_DAYS)
  return d.toISOString().slice(0, 10)
}

export function newCaseId(existing: DisciplinaryCase[], year: string) {
  const n = existing
    .filter((c) => c.id.startsWith(`DC-${year}-`))
    .map((c) => Number(c.id.split("-")[2]))
    .reduce((m, v) => Math.max(m, v), 0)
  return `DC-${year}-${String(n + 1).padStart(2, "0")}`
}
