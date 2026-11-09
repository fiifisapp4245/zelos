import type { PerformanceReview, ReviewStatus } from "../types"
import type { Viewer } from "../rbac"
import { has } from "../rbac"

export const COMPETENCIES = [
  {
    id: "delivery",
    label: "Delivery",
    hint: "Gets the agreed work done, to the standard, on time.",
  },
  {
    id: "collaboration",
    label: "Collaboration",
    hint: "Works well across the team; shares what others need.",
  },
  {
    id: "ownership",
    label: "Ownership",
    hint: "Takes responsibility, raises problems early, follows through.",
  },
  {
    id: "growth",
    label: "Growth",
    hint: "Learns, takes feedback, and widens what they can do.",
  },
] as const

export const RATING_LABEL: Record<number, string> = {
  1: "Needs significant improvement",
  2: "Below expectations",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Outstanding",
}

/** The order a review moves through. Each step has one owner. */
export const REVIEW_FLOW: ReviewStatus[] = [
  "not_started",
  "self_review",
  "manager_review",
  "calibration",
  "shared",
  "complete",
]

export type ReviewOwner = "hr" | "employee" | "manager"

export const OWNER_LABEL: Record<ReviewOwner, string> = {
  hr: "HR",
  employee: "Employee",
  manager: "Manager",
}

/** Who has to act for the review to move on from this status. */
export function ownerOf(status: ReviewStatus): ReviewOwner | null {
  switch (status) {
    case "not_started":
      return "hr"
    case "self_review":
      return "employee"
    case "manager_review":
      return "manager"
    case "calibration":
      return "hr"
    case "shared":
      return "employee"
    case "complete":
      return null
  }
}

/** What that owner is being asked to do, in the words of the button. */
export const STEP_ACTION: Record<ReviewStatus, string> = {
  not_started: "Start review",
  self_review: "Write self review",
  manager_review: "Complete review",
  calibration: "Calibrate and share",
  shared: "Acknowledge",
  complete: "View",
}

/** Whether this viewer is the one the review is waiting on. */
export function isWaitingOn(viewer: Viewer, r: PerformanceReview) {
  const owner = ownerOf(r.status)
  if (owner === "hr") return has(viewer, "hr_admin")
  if (owner === "employee") return viewer.employeeId === r.employeeId
  if (owner === "manager") return viewer.employeeId === r.managerId
  return false
}

export function averageScore(scores: Record<string, number> | null) {
  if (!scores) return null
  const v = COMPETENCIES.map((c) => scores[c.id]).filter(
    (n): n is number => typeof n === "number"
  )
  return v.length === COMPETENCIES.length
    ? v.reduce((a, b) => a + b, 0) / v.length
    : null
}

/** Nearest half point, which is how ratings are recorded. */
export function toHalf(n: number) {
  return Math.round(n * 2) / 2
}

export function isOverdue(r: PerformanceReview, today: string) {
  return r.status !== "complete" && r.dueOn < today
}

export function ratingBuckets(reviews: PerformanceReview[]) {
  const out = [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: 0 }))
  for (const r of reviews) {
    if (r.rating === null) continue
    const b = out[Math.min(5, Math.max(1, Math.round(r.rating))) - 1]
    b.count++
  }
  return out
}

export function blankReview(
  id: string,
  employeeId: string,
  managerId: string,
  cycle: string,
  dueOn: string
): PerformanceReview {
  return {
    id,
    employeeId,
    managerId,
    cycle,
    dueOn,
    status: "self_review",
    rating: null,
    sharedOn: null,
    reviewerComments: null,
    selfSummary: null,
    selfDevelopment: null,
    selfRating: null,
    selfSubmittedOn: null,
    scores: null,
    calibrationNote: null,
    employeeComment: null,
    acknowledgedOn: null,
  }
}
