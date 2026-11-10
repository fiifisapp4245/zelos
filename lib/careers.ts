/**
 * The public careers page: which roles are shown, and whether an application is acceptable.
 * Pure, so the rules (an open role only, no duplicates, nothing blank) can be tested.
 */
import type { Candidate, Requisition } from "./types"

export interface ApplicationInput {
  name: string
  email: string
  phone: string
  cvName: string
  answers: Record<string, string>
  consent: boolean
}

export const CV_EXTENSIONS = ["pdf", "doc", "docx"]

/** A role is on the page only when it is open, published and not past its closing date. */
export function isListed(r: Requisition, today: string) {
  const c = r.careers
  if (!c?.published || r.status !== "open") return false
  return !c.closesOn || c.closesOn >= today
}

export function listedRoles(reqs: Requisition[], today: string) {
  return reqs.filter((r) => isListed(r, today))
}

export interface FieldErrors {
  name?: string
  email?: string
  phone?: string
  cv?: string
  consent?: string
  answers?: Record<string, string>
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateApplication(
  input: ApplicationInput,
  role: Requisition
): FieldErrors {
  const e: FieldErrors = {}
  if (input.name.trim().split(/\s+/).filter(Boolean).length < 2)
    e.name = "Enter your first and last name."
  if (!EMAIL.test(input.email.trim())) e.email = "Enter a valid email address."
  if (input.phone.trim() && input.phone.replace(/[^\d]/g, "").length < 9)
    e.phone = "That phone number looks too short."
  if (!input.cvName) e.cv = "Attach your CV."
  else {
    const ext = input.cvName.split(".").pop()?.toLowerCase() ?? ""
    if (!CV_EXTENSIONS.includes(ext))
      e.cv = "Your CV has to be a PDF or Word file."
  }
  if (!input.consent)
    e.consent =
      "We need your agreement to keep your details for this application."
  const missing: Record<string, string> = {}
  for (const q of role.careers?.questions ?? [])
    if (!(input.answers[q] ?? "").trim()) missing[q] = "Please answer this."
  if (Object.keys(missing).length) e.answers = missing
  return e
}

export function hasErrors(e: FieldErrors) {
  return Object.keys(e).length > 0
}

/** Whether this person already has an application for this role. */
export function alreadyApplied(
  candidates: Candidate[],
  requisitionId: string,
  email: string
) {
  const key = email.trim().toLowerCase()
  return candidates.some(
    (c) => c.requisitionId === requisitionId && c.email.toLowerCase() === key
  )
}

export function daysLeft(closesOn: string | null, today: string) {
  if (!closesOn) return null
  return Math.round(
    (new Date(`${closesOn}T00:00:00Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime()) /
      86_400_000
  )
}
