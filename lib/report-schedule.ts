/**
 * When a saved report is due, and the email that carries it.
 *
 * Pure: "today" comes in, so a report is due on the same day however often the
 * page is opened, and sending it moves its last-run date so it is not sent twice.
 */
import type { EmailMessage, SavedReport } from "./types"
import { addDays } from "./time"

export const SCHEDULE_DAYS = { weekly: 7, monthly: 30 } as const

/** The day a repeating report next goes out, counted from the last time it did. */
export function nextDue(
  r: Pick<SavedReport, "schedule" | "lastRunOn" | "createdOn">
) {
  if (r.schedule === "none") return null
  return addDays(r.lastRunOn ?? r.createdOn, SCHEDULE_DAYS[r.schedule])
}

export function isDue(
  r: Pick<SavedReport, "schedule" | "lastRunOn" | "createdOn" | "recipients">,
  today: string
) {
  const due = nextDue(r)
  return due !== null && due <= today && r.recipients.length > 0
}

export function dueReports<T extends SavedReport>(list: T[], today: string) {
  return list.filter((r) => isDue(r, today))
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Splits "a@x.com, b@y.com; c@z.com" into addresses, and says which were not addresses. */
export function parseRecipients(text: string) {
  const parts = text
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const ok = [
    ...new Set(parts.filter((p) => EMAIL.test(p)).map((p) => p.toLowerCase())),
  ]
  const bad = parts.filter((p) => !EMAIL.test(p))
  return { ok, bad }
}

export function reportEmail(p: {
  report: SavedReport
  title: string
  csv: string
  to: string
  today: string
  company: string
  sendAt: string
  rows: number
}): Omit<EmailMessage, "id" | "createdAt" | "status"> {
  const file = `${p.report.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${p.today}.csv`
  return {
    kind: "report",
    to: p.to,
    toName: p.to,
    subject: `${p.company}: ${p.report.name}, ${p.today}`,
    body: `Your ${p.report.schedule === "none" ? "" : `${p.report.schedule} `}report “${p.report.name}” (${p.title}) is attached as a CSV file with ${p.rows} row${p.rows === 1 ? "" : "s"}. It was prepared on ${p.today} with the access of the person who saved it.`,
    attachment: { name: file, type: "text/csv", content: p.csv },
    sendAt: p.sendAt,
    relatedId: p.report.id,
  }
}
