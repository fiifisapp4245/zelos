/**
 * Offer letters: filling a template, and the rules for signing it.
 *
 * A letter is rendered once, when it is sent, and stored as text with its
 * SHA-256. The candidate signs that exact text; changing a template later, or
 * the candidate's record, cannot alter what was signed, and a changed letter
 * no longer matches its hash.
 */
import type {
  Candidate,
  Employee,
  OfferSignature,
  OfferTemplate,
  Requisition,
} from "./types"
import { EMPLOYMENT_TYPE_LABEL, formatDate, fullName, ghs } from "./format"

export const PLACEHOLDERS = [
  "candidate_name",
  "job_title",
  "department",
  "branch",
  "employment_type",
  "salary",
  "start_date",
  "manager",
  "company",
  "date",
  "expires_on",
] as const

export type Placeholder = (typeof PLACEHOLDERS)[number]

export const DEFAULT_OFFER_TEMPLATE = `{{date}}

Dear {{candidate_name}},

Offer of employment: {{job_title}}

We are delighted to offer you the position of {{job_title}} in the {{department}} team at {{company}}, based at our {{branch}} office, on a {{employment_type}} basis.

Start date: {{start_date}}
Reporting to: {{manager}}
Gross monthly salary: {{salary}}

This offer is subject to satisfactory references and verification of your identity and right to work. Your employment will begin with a probationary period, and the full terms will be set out in your contract of employment.

To accept, please sign this letter electronically by {{expires_on}}. If we have not heard from you by then, the offer lapses.

We look forward to welcoming you.

Yours sincerely,
{{company}}`

/** Placeholders written in a template that Zelos does not know how to fill. */
export function unknownPlaceholders(body: string) {
  const found = [...body.matchAll(/\{\{\s*([\w]+)\s*\}\}/g)].map((m) => m[1])
  return [
    ...new Set(
      found.filter((f) => !(PLACEHOLDERS as readonly string[]).includes(f))
    ),
  ]
}

export interface OfferContext {
  candidate: Candidate
  req: Requisition
  manager: Employee | undefined
  company: string
  salaryMonthly: number
  startDate: string
  /** Today and the signing deadline, as yyyy-mm-dd. */
  today: string
  expiresOn: string
}

export function renderLetter(
  template: OfferTemplate | string,
  c: OfferContext
) {
  const body = typeof template === "string" ? template : template.body
  const values: Record<Placeholder, string> = {
    candidate_name: c.candidate.name,
    job_title: c.req.title,
    department: c.req.department,
    branch: c.req.branch,
    employment_type: EMPLOYMENT_TYPE_LABEL[c.req.employmentType].toLowerCase(),
    salary: ghs(c.salaryMonthly),
    start_date: formatDate(c.startDate),
    manager: c.manager ? fullName(c.manager) : "your line manager",
    company: c.company,
    date: formatDate(c.today),
    expires_on: formatDate(c.expiresOn),
  }
  return body.replace(/\{\{\s*([\w]+)\s*\}\}/g, (m, k: string) =>
    k in values ? values[k as Placeholder] : m
  )
}

/** Why an offer cannot be sent yet, or null when it can. */
export function offerProblem(c: OfferContext, template: string): string | null {
  const unknown = unknownPlaceholders(template)
  if (unknown.length)
    return `The template uses {{${unknown[0]}}}, which Zelos cannot fill.`
  if (!(c.salaryMonthly > 0)) return "Set a salary on the offer first."
  if (!c.startDate) return "Set a start date on the offer first."
  if (c.startDate < c.today) return "The start date is in the past."
  return null
}

export async function sha256Hex(text: string) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** True when the stored letter still matches the hash taken when it was sent. */
export async function letterIntact(
  s: Pick<OfferSignature, "letter" | "letterHash">
) {
  return (await sha256Hex(s.letter)) === s.letterHash
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)

/**
 * A typed signature has to be the candidate's own name: the same first and last
 * name, in any order, ignoring case and accents. Middle names may be added.
 */
export function nameMatches(typed: string, expected: string) {
  const t = norm(typed)
  const e = norm(expected)
  if (t.length < 2 || e.length < 2) return false
  const first = e[0]
  const last = e[e.length - 1]
  return t.includes(first) && t.includes(last)
}

export type SignProblem =
  "not_found" | "withdrawn" | "signed" | "declined" | "expired"

/** Whether a signing link can still be acted on, and if not why. */
export function signingState(
  s: Pick<OfferSignature, "status" | "expiresOn"> | undefined,
  now: Date
): SignProblem | null {
  if (!s) return "not_found"
  if (s.status === "withdrawn") return "withdrawn"
  if (s.status === "signed") return "signed"
  if (s.status === "declined") return "declined"
  if (s.status === "expired" || new Date(s.expiresOn).getTime() < now.getTime())
    return "expired"
  return null
}

export const SIGN_PROBLEM_TEXT: Record<
  SignProblem,
  { title: string; body: string }
> = {
  not_found: {
    title: "This link cannot be used",
    body: "This signing link is not valid.",
  },
  withdrawn: {
    title: "This offer was withdrawn",
    body: "The company has withdrawn this letter. Please contact them if you expected to receive one.",
  },
  signed: { title: "Already signed", body: "This offer has been signed." },
  declined: { title: "Offer declined", body: "This offer was declined." },
  expired: {
    title: "This offer has expired",
    body: "The time to sign this letter has passed. Please contact the recruiter to ask for a new one.",
  },
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/**
 * A self-contained, printable copy of a signed letter, with the signing record
 * on the same page. Everything that goes in is escaped: the letter is text a
 * recruiter typed, and the typed name is whatever the candidate entered.
 */
export function signedCopyHtml(
  s: OfferSignature,
  p: { candidateName: string; company: string }
) {
  const sig = s.signatureImage?.startsWith("data:image/png;base64,")
    ? `<img src="${esc(s.signatureImage)}" alt="Drawn signature" style="max-height:80px"/>`
    : ""
  const rows = s.trail
    .map(
      (t) =>
        `<tr><td>${esc(t.at.replace("T", " ").slice(0, 19))} UTC</td><td>${esc(t.text)}</td></tr>`
    )
    .join("")
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Signed offer: ${esc(p.candidateName)}</title>
<style>body{font:14px/1.6 Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111}
pre{white-space:pre-wrap;font:inherit}h2{font:600 13px/1 system-ui;letter-spacing:.06em;text-transform:uppercase;color:#555;margin:36px 0 10px}
table{border-collapse:collapse;width:100%;font:12px system-ui}td{border-top:1px solid #ddd;padding:6px 8px;vertical-align:top}
.sig{border-top:1px solid #111;display:inline-block;padding-top:6px;margin-top:8px;min-width:260px}.mono{font-family:ui-monospace,monospace;font-size:11px;word-break:break-all}
@media print{body{margin:0}}</style></head><body>
<pre>${esc(s.letter)}</pre>
<h2>Signature</h2>
${sig}<div class="sig"><div style="font:italic 22px Georgia">${esc(s.signedName ?? "")}</div>
<div style="font:12px system-ui;color:#555">${esc(p.candidateName)} · ${esc(p.company)}<br>Signed ${esc((s.signedOn ?? "").replace("T", " ").slice(0, 19))} UTC</div></div>
<h2>Signing record</h2>
<table>${rows}</table>
<p class="mono">SHA-256 of the letter: ${esc(s.letterHash)}</p>
</body></html>`
}
