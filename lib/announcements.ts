/**
 * Who an announcement is for, and who has read it.
 *
 * Audience is worked out from the person's current department and branch, so
 * someone who moves team starts seeing their new team's news and stops seeing
 * the old. Read and acknowledged are separate: reading is opening it, and
 * acknowledging is the signed-off "I have read and understood" a policy needs.
 */
import type { Announcement, AnnouncementRead, Employee } from "./types"
import { isOnStrength } from "./selectors"

export function inAudience(a: Pick<Announcement, "audience">, e: Employee) {
  if (a.audience.kind === "all") return true
  if (a.audience.kind === "department") return e.department === a.audience.value
  return e.branch === a.audience.value
}

export function audienceLabel(a: Pick<Announcement, "audience">) {
  return a.audience.kind === "all"
    ? "Everyone"
    : a.audience.kind === "department"
      ? `${a.audience.value} team`
      : `${a.audience.value} office`
}

export function audienceMembers(
  a: Pick<Announcement, "audience">,
  employees: Employee[]
) {
  return employees.filter((e) => isOnStrength(e) && inAudience(a, e))
}

/** What one person sees: pinned first, then newest first. Archived ones are gone. */
export function feedFor(all: Announcement[], e: Employee) {
  return all
    .filter((a) => !a.archived && inAudience(a, e))
    .sort(
      (x, y) =>
        Number(y.pinned) - Number(x.pinned) ||
        y.postedOn.localeCompare(x.postedOn)
    )
}

export type ReadState = "unread" | "read" | "acknowledged"

export function readStateOf(
  a: Pick<Announcement, "id">,
  reads: AnnouncementRead[],
  employeeId: string
): ReadState {
  const r = reads.find(
    (x) => x.announcementId === a.id && x.employeeId === employeeId
  )
  if (!r) return "unread"
  return r.acknowledgedOn ? "acknowledged" : "read"
}

/** Whether this still needs something from the person: opening it, or acknowledging it. */
export function needsAttention(a: Announcement, state: ReadState) {
  return a.requiresAck ? state !== "acknowledged" : state === "unread"
}

export interface Stats {
  total: number
  read: number
  acknowledged: number
  unread: Employee[]
  unacknowledged: Employee[]
}

export function statsFor(
  a: Announcement,
  employees: Employee[],
  reads: AnnouncementRead[]
): Stats {
  const people = audienceMembers(a, employees)
  const mine = reads.filter((r) => r.announcementId === a.id)
  const has = (e: Employee) => mine.find((r) => r.employeeId === e.id)
  return {
    total: people.length,
    read: people.filter((e) => has(e)).length,
    acknowledged: people.filter((e) => has(e)?.acknowledgedOn).length,
    unread: people.filter((e) => !has(e)),
    // For a policy, "has not acknowledged" is the list that matters.
    unacknowledged: people.filter((e) => !has(e)?.acknowledgedOn),
  }
}

export function validateAnnouncement(
  a: Pick<Announcement, "title" | "body" | "audience">,
  audienceExists: (kind: string, value: string) => boolean
) {
  const e: Record<string, string> = {}
  if (a.title.trim().length < 4) e.title = "Give it a title."
  if (a.body.trim().length < 10) e.body = "Write the announcement."
  if (
    a.audience.kind !== "all" &&
    !audienceExists(a.audience.kind, a.audience.value)
  )
    e.audience = "Choose who it is for."
  return e
}
