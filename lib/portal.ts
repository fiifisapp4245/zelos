/**
 * The pre-hire portal: what a new hire is asked for, whether it is acceptable,
 * and how an accepted set of answers becomes part of their employee record.
 *
 * The formats are the ones the new-employee form already enforces (Ghana Card,
 * SSNIT, mobile money), so a record filled in here and one typed in by HR are
 * held to the same standard.
 */
import type {
  Employee,
  EmployeeDocument,
  PortalData,
  PortalSection,
  PreHirePortal,
} from "./types"
import { nameMatches } from "./offers"

export const SECTIONS: { key: PortalSection; title: string; blurb: string }[] =
  [
    {
      key: "personal",
      title: "About you",
      blurb: "Your contact details and where you live.",
    },
    {
      key: "identity",
      title: "Identity",
      blurb: "Your Ghana Card, and a photo of it.",
    },
    {
      key: "statutory",
      title: "Tax and pension",
      blurb: "Your SSNIT and tax numbers, and your pension provider.",
    },
    {
      key: "pay",
      title: "How you get paid",
      blurb: "Mobile money or a bank account.",
    },
    {
      key: "emergency",
      title: "Emergency contact",
      blurb: "Someone we can call if we need to.",
    },
  ]

export const SECTION_TITLE = Object.fromEntries(
  SECTIONS.map((s) => [s.key, s.title])
) as Record<PortalSection, string>

export const TIER2_PROVIDERS = ["Petra Trust", "Enterprise Trustees"]
export const MOMO_PROVIDERS = ["MTN MoMo", "Telecel Cash", "AirtelTigo Money"]
export const BANKS = [
  "GCB Bank",
  "Ecobank Ghana",
  "Stanbic Bank",
  "Absa Bank Ghana",
  "Fidelity Bank",
  "Guaranty Trust Bank",
  "Zenith Bank",
  "CalBank",
  "Standard Chartered",
]
export const ID_EXTENSIONS = ["pdf", "png", "jpg", "jpeg"]

export const MIN_AGE = 16

export function emptyData(e: Employee): PortalData {
  return {
    dateOfBirth: e.dateOfBirth || "",
    gender: e.dateOfBirth ? e.gender : "",
    nationality: e.nationality || "Ghanaian",
    phone: e.phone || "",
    personalEmail: e.personalEmail || "",
    residentialAddress: e.residentialAddress || "",
    gpsAddress: e.gpsAddress || "",
    ghanaCard: e.ghanaCard || "",
    idDocuments: [],
    ssnitNumber: e.compensation.ssnitNumber || "",
    tin: e.compensation.tin || "",
    tier2Provider: e.compensation.tier2Provider || "",
    tier3Provider: e.compensation.tier3Provider ?? "",
    paymentMethod: "",
    momoProvider: "",
    momoNumber: "",
    bankName: "",
    bankAccount: "",
    accountName: "",
    emergencyName: e.emergencyContact.name || "",
    emergencyRelationship: e.emergencyContact.relationship || "",
    emergencyPhone: e.emergencyContact.phone || "",
    emergencyEmail: e.emergencyContact.email || "",
  }
}

const digits = (s: string) => s.replace(/[^\d]/g, "")
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** A Ghana mobile number: 0 or +233 and nine digits. */
export function validMomo(s: string) {
  const t = s.replace(/[\s-]/g, "")
  return /^(\+233|0)\d{9}$/.test(t)
}

export function ageOn(dob: string, today: string) {
  const d = new Date(`${dob}T00:00:00Z`)
  const t = new Date(`${today}T00:00:00Z`)
  let a = t.getUTCFullYear() - d.getUTCFullYear()
  if (
    t.getUTCMonth() < d.getUTCMonth() ||
    (t.getUTCMonth() === d.getUTCMonth() && t.getUTCDate() < d.getUTCDate())
  )
    a -= 1
  return a
}

export type Errors = Record<string, string>

export interface Ctx {
  today: string
  /** Ghana Cards already on other records. */
  takenCards: string[]
  /** The new hire's own name, which the account holder's name is checked against. */
  fullName: string
}

export function validateSection(
  section: PortalSection,
  d: PortalData,
  ctx: Ctx
): Errors {
  const e: Errors = {}
  if (section === "personal") {
    if (!d.dateOfBirth) e.dateOfBirth = "Enter your date of birth."
    else if (
      Number.isNaN(new Date(d.dateOfBirth).getTime()) ||
      d.dateOfBirth > ctx.today
    )
      e.dateOfBirth = "That date is not valid."
    else if (ageOn(d.dateOfBirth, ctx.today) < MIN_AGE)
      e.dateOfBirth = `You must be at least ${MIN_AGE} to be employed.`
    if (!d.gender) e.gender = "Choose one."
    if (!d.nationality.trim()) e.nationality = "Enter your nationality."
    if (digits(d.phone).length < 9)
      e.phone = "Enter a phone number we can reach you on."
    if (!EMAIL.test(d.personalEmail.trim()))
      e.personalEmail = "Enter a valid email address."
    if (d.residentialAddress.trim().length < 5)
      e.residentialAddress = "Enter your address."
    if (
      d.gpsAddress.trim() &&
      !/^[A-Za-z]{2}-\d{3}-\d{4}$/.test(d.gpsAddress.trim())
    )
      e.gpsAddress = "A GhanaPost GPS address looks like GA-123-4567."
  }
  if (section === "identity") {
    const card = d.ghanaCard.trim()
    if (!card) e.ghanaCard = "Enter your Ghana Card number."
    else if (!/^GHA-\d{9}-\d$/.test(card))
      e.ghanaCard = "It should look like GHA-123456789-0."
    else if (ctx.takenCards.includes(card))
      e.ghanaCard =
        "That Ghana Card is already on another record. Please check it, or contact HR."
    if (d.idDocuments.length === 0)
      e.idDocuments = "Attach a photo or scan of your Ghana Card."
  }
  if (section === "statutory") {
    if (!/^C\d{10}$/.test(d.ssnitNumber.trim()))
      e.ssnitNumber = "SSNIT is a C followed by 10 digits."
    if (!/^[A-Za-z]\d{9,10}$/.test(d.tin.trim()))
      e.tin = "Your TIN is a letter followed by 9 or 10 digits."
    if (!d.tier2Provider) e.tier2Provider = "Choose your Tier 2 provider."
  }
  if (section === "pay") {
    if (!d.paymentMethod) e.paymentMethod = "Choose how you want to be paid."
    if (d.paymentMethod === "mobile_money") {
      if (!d.momoProvider) e.momoProvider = "Choose your network."
      if (!validMomo(d.momoNumber))
        e.momoNumber = "A Ghana mobile number, like 024 123 4567."
    }
    if (d.paymentMethod === "bank") {
      if (!d.bankName) e.bankName = "Choose your bank."
      const n = digits(d.bankAccount)
      if (n.length < 10 || n.length > 16)
        e.bankAccount = "An account number has 10 to 16 digits."
      if (!d.accountName.trim())
        e.accountName = "Enter the name on the account."
      else if (!nameMatches(d.accountName, ctx.fullName))
        e.accountName = "The account has to be in your own name."
    }
  }
  if (section === "emergency") {
    if (d.emergencyName.trim().split(/\s+/).filter(Boolean).length < 2)
      e.emergencyName = "Enter their first and last name."
    if (!d.emergencyRelationship.trim())
      e.emergencyRelationship = "How are they related to you?"
    if (digits(d.emergencyPhone).length < 9)
      e.emergencyPhone = "Enter a phone number."
    if (d.emergencyEmail.trim() && !EMAIL.test(d.emergencyEmail.trim()))
      e.emergencyEmail = "That email is not valid."
  }
  return e
}

export function validateAll(d: PortalData, ctx: Ctx) {
  return Object.fromEntries(
    SECTIONS.map((s) => [s.key, validateSection(s.key, d, ctx)])
  ) as Record<PortalSection, Errors>
}

export function sectionDone(section: PortalSection, d: PortalData, ctx: Ctx) {
  return Object.keys(validateSection(section, d, ctx)).length === 0
}

export function completion(d: PortalData, ctx: Ctx) {
  const done = SECTIONS.filter((s) => sectionDone(s.key, d, ctx)).length
  return {
    done,
    total: SECTIONS.length,
    percent: Math.round((done / SECTIONS.length) * 100),
  }
}

/** The sections HR asked to have corrected, with what they said. */
export function changesRequested(p: Pick<PreHirePortal, "review">) {
  return (
    Object.entries(p.review) as [
      PortalSection,
      { status: string; note: string },
    ][]
  )
    .filter(([, r]) => r.status === "changes")
    .map(([k, r]) => ({ section: k, note: r.note }))
}

export function maskTail(s: string, keep = 4) {
  const t = s.replace(/\s/g, "")
  return t.length <= keep
    ? t
    : `${"•".repeat(Math.max(4, t.length - keep))}${t.slice(-keep)}`
}

/** The personal fields an accepted set of answers changes on the employee record. */
export function recordPatch(d: PortalData): Partial<Employee> {
  return {
    dateOfBirth: d.dateOfBirth,
    gender: d.gender === "" ? "other" : d.gender,
    nationality: d.nationality.trim(),
    phone: d.phone.trim(),
    personalEmail: d.personalEmail.trim(),
    residentialAddress: d.residentialAddress.trim(),
    gpsAddress: d.gpsAddress.trim(),
    ghanaCard: d.ghanaCard.trim(),
    emergencyContact: {
      name: d.emergencyName.trim(),
      relationship: d.emergencyRelationship.trim(),
      phone: d.emergencyPhone.trim(),
      email: d.emergencyEmail.trim(),
    },
  }
}

/** Statutory and payment details, merged into compensation so salary and grade are untouched. */
export function mergeCompensation(
  current: Employee["compensation"],
  d: PortalData
): Employee["compensation"] {
  const base = {
    ...current,
    ssnitNumber: d.ssnitNumber.trim(),
    tin: d.tin.trim().toUpperCase(),
    tier2Provider: d.tier2Provider,
    tier3Provider: d.tier3Provider || null,
  }
  return d.paymentMethod === "mobile_money"
    ? {
        ...base,
        paymentMethod: "mobile_money",
        momoProvider: d.momoProvider,
        momoNumber: d.momoNumber.trim(),
        bankName: "",
        bankAccount: "",
      }
    : {
        ...base,
        paymentMethod: "bank",
        bankName: d.bankName,
        bankAccount: d.bankAccount.trim(),
        momoProvider: "",
        momoNumber: "",
      }
}

/** Documents that follow from an accepted submission, waiting for HR to verify them. */
export function documentsFor(
  p: Pick<PreHirePortal, "employeeId" | "data">,
  at: string
): EmployeeDocument[] {
  return p.data.idDocuments.map((u) => ({
    id: u.id,
    employeeId: p.employeeId,
    name: u.name,
    category: "identity" as const,
    status: "pending" as const,
    uploadedAt: at,
    uploadedBy: p.employeeId,
    expiresOn: null,
    sizeKb: u.sizeKb,
    confidential: false,
  }))
}
