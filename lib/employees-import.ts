import type { Department, Branch, Employee, EmploymentType } from "./types"
import { EMPLOYMENT_TYPE_LABEL, TODAY_ISO } from "./format"
import { csvCell } from "./reports"

export const TEMPLATE_COLUMNS = [
  "First name",
  "Last name",
  "Job title",
  "Department",
  "Branch",
  "Employment type",
  "Start date",
  "Work email",
  "Phone",
] as const

export const TEMPLATE_EXAMPLE = [
  "Ama",
  "Mensah",
  "Accountant",
  "Finance",
  "Accra HQ",
  "Full-time",
  "2026-11-02",
  "ama.mensah@company.com",
  "+233 24 000 0000",
]

export function templateCsv() {
  return [
    TEMPLATE_COLUMNS.join(","),
    TEMPLATE_EXAMPLE.map(csvCell).join(","),
  ].join("\r\n")
}

/** RFC 4180 reader: quoted fields, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "")
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      row.push(cell)
      cell = ""
      if (row.some((c) => c.trim() !== "")) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== "")) rows.push(row)
  return rows
}

const TYPE_BY_LABEL = new Map<string, EmploymentType>(
  (Object.entries(EMPLOYMENT_TYPE_LABEL) as [EmploymentType, string][]).flatMap(
    ([k, v]) => [
      [v.toLowerCase(), k],
      [k.toLowerCase(), k],
      [k.replace("_", "-").toLowerCase(), k],
    ]
  )
)

export interface ImportRow {
  line: number
  values: Record<(typeof TEMPLATE_COLUMNS)[number], string>
  errors: string[]
}

export interface ImportResult {
  rows: ImportRow[]
  /** Set when the file itself is unusable, e.g. the header is wrong. */
  fileError: string | null
}

export function validateImport(
  text: string,
  ctx: {
    departments: Department[]
    branches: Branch[]
    existing: Employee[]
  }
): ImportResult {
  const table = parseCsv(text)
  if (table.length === 0) return { rows: [], fileError: "The file is empty." }
  const header = table[0].map((h) => h.trim().toLowerCase())
  const missing = TEMPLATE_COLUMNS.filter(
    (c) => c !== "Phone" && !header.includes(c.toLowerCase())
  )
  if (missing.length)
    return {
      rows: [],
      fileError: `Missing column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Use the template.`,
    }
  if (table.length === 1)
    return { rows: [], fileError: "There are no people under the header." }

  const idx = (c: string) => header.indexOf(c.toLowerCase())
  const depts = new Set(
    ctx.departments.filter((d) => !d.archived).map((d) => d.name.toLowerCase())
  )
  const brs = new Set(
    ctx.branches.filter((b) => !b.archived).map((b) => b.name.toLowerCase())
  )
  const seenEmails = new Set(ctx.existing.map((e) => e.email.toLowerCase()))

  const rows = table.slice(1).map((cells, i): ImportRow => {
    const values = Object.fromEntries(
      TEMPLATE_COLUMNS.map((c) => [c, (cells[idx(c)] ?? "").trim()])
    ) as ImportRow["values"]
    const errors: string[] = []
    if (!values["First name"]) errors.push("First name is required.")
    if (!values["Last name"]) errors.push("Last name is required.")
    if (!values["Job title"]) errors.push("Job title is required.")
    if (!depts.has(values.Department.toLowerCase()))
      errors.push(`Department “${values.Department || "—"}” does not exist.`)
    if (!brs.has(values.Branch.toLowerCase()))
      errors.push(`Branch “${values.Branch || "—"}” does not exist.`)
    if (!TYPE_BY_LABEL.has(values["Employment type"].toLowerCase()))
      errors.push(
        "Employment type must be Full-time, Part-time, Contractor, Intern or NSP."
      )
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(values["Start date"]) ||
      Number.isNaN(new Date(values["Start date"]).getTime())
    )
      errors.push("Start date must be yyyy-mm-dd.")
    const email = values["Work email"].toLowerCase()
    if (!/.+@.+\..+/.test(email)) errors.push("Work email is not valid.")
    else if (seenEmails.has(email))
      errors.push("That work email is already in use.")
    else seenEmails.add(email)
    return { line: i + 2, values, errors }
  })
  return { rows, fileError: null }
}

/** A pre-hire record from an imported row. The rest is for the person to complete. */
export function employeeFromRow(row: ImportRow, taken: Set<string>): Employee {
  const v = row.values
  const base = `${v["First name"]}-${v["Last name"]}`
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
  let id = base
  let n = 2
  while (taken.has(id)) id = `${base}-${n++}`
  taken.add(id)
  const type =
    TYPE_BY_LABEL.get(v["Employment type"].toLowerCase()) ?? "full_time"
  return {
    id,
    employeeId: `ZEL-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    firstName: v["First name"],
    lastName: v["Last name"],
    jobTitle: v["Job title"],
    department: v.Department,
    branch: v.Branch,
    employmentType: type,
    contractType: type === "contractor" ? "fixed_term" : "probationary",
    workArrangement: "onsite",
    lifecycleState: "pre_hire",
    managerId: null,
    dottedLineManagerId: null,
    email: v["Work email"],
    personalEmail: "",
    phone: v.Phone,
    dateOfBirth: "",
    gender: "other",
    nationality: "Ghanaian",
    ghanaCard: "",
    gpsAddress: "",
    residentialAddress: "",
    startDate: v["Start date"] || TODAY_ISO,
    probationEndDate: null,
    contractEndDate: null,
    noticePeriodDays: 30,
    workingHoursPerWeek: 40,
    emergencyContact: { name: "", relationship: "", phone: "", email: "" },
    compensation: {
      grossMonthly: 0,
      currency: "GHS",
      payFrequency: "monthly",
      payGrade: "",
      effectiveFrom: v["Start date"] || TODAY_ISO,
      ssnitNumber: "",
      tin: "",
      tier2Provider: "",
      tier3Provider: null,
      paymentMethod: "mobile_money",
    },
    avatarTone: "bg-emerald-600",
  }
}
