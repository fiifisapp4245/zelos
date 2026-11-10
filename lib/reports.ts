/**
 * The report engine.
 *
 * Every report is a pure function of the data and the viewer, returning a
 * table, so the same result drives the screen, the CSV and a saved report.
 * Nothing here reads the clock: "today" is passed in, so a report is the
 * same on every run.
 *
 * Privacy sits in one place. `floor` is the smallest group a figure may be
 * shown for; a smaller group is withheld rather than shown, because a "group"
 * of one is a person. HR and Payroll run operational reports at a floor of
 * one — they can already open every record — but ratings and demographics
 * are held to the floor for everyone, and so is every report for a manager.
 */
import type {
  CheckIn,
  Goal,
  AttendanceRecord,
  Candidate,
  DisciplinaryCase,
  Employee,
  EmployeeDocument,
  LeaveBalance,
  LeaveRequest,
  OffboardingCase,
  PerformanceReview,
  Requisition,
} from "./types"
import { MIN_AGGREGATION_GROUP, has, type Viewer } from "./rbac"
import {
  CASE_STATE_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  LEAVE_TYPE_LABEL,
  LIFECYCLE_LABEL,
  OFFBOARD_REASON_LABEL,
  REQ_STATUS_LABEL,
  formatDate,
  age,
  yearsOfService,
} from "./format"
import { isOnStrength } from "./selectors"
import { addDays, daysBetween } from "./time"
import { healthOf, isStale, progressOf } from "./goals"
import { ratingBuckets } from "./talent/performance"
import { accruedLeaveDays, dailyRate } from "./talent/offboarding"
import { SEVERITY_LABEL } from "./talent/disciplinary"

export interface ReportData {
  employees: Employee[]
  requisitions: Requisition[]
  candidates: Candidate[]
  reviews: PerformanceReview[]
  cases: DisciplinaryCase[]
  offboarding: OffboardingCase[]
  leaveRequests: LeaveRequest[]
  leaveBalances: LeaveBalance[]
  documents: EmployeeDocument[]
  attendance: AttendanceRecord[]
  goals: Goal[]
  checkIns: CheckIn[]
}

export interface ReportContext {
  viewer: Viewer
  today: string
}

export type CellFormat = "text" | "number" | "money" | "percent" | "date"

export interface Column {
  key: string
  label: string
  format?: CellFormat
}

export type Cell = string | number | null
export type Row = Record<string, Cell>

export interface ReportResult {
  columns: Column[]
  rows: Row[]
  summary: { label: string; value: string; hint?: string }[]
  /** Rows left out because their group was too small to show. */
  withheld: number
  notes: string[]
  /** Which column to draw as bars, and which labels them. */
  bar?: { label: string; value: string }
}

export interface ReportOption {
  key: string
  label: string
  choices: { value: string; label: string }[]
  default: string
}

export type ReportGroup =
  "Workforce" | "Hiring" | "Time & leave" | "Pay" | "Performance" | "Compliance"

export interface ReportDef {
  id: string
  title: string
  group: ReportGroup
  description: string
  options: ReportOption[]
  /** Who may run it. Anyone else never sees it listed. */
  allowed: (v: Viewer) => boolean
  run: (
    d: ReportData,
    ctx: ReportContext,
    o: Record<string, string>
  ) => ReportResult
}

const PERIODS: ReportOption = {
  key: "period",
  label: "Period",
  default: "12m",
  choices: [
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "12m", label: "Last 12 months" },
    { value: "ytd", label: "Year to date" },
  ],
}

export function periodStart(period: string, today: string) {
  if (period === "30d") return addDays(today, -30)
  if (period === "90d") return addDays(today, -90)
  if (period === "ytd") return `${today.slice(0, 4)}-01-01`
  return addDays(today, -365)
}

/** The smallest group a viewer may see a figure for. */
export function floorFor(v: Viewer, sensitive = false) {
  if (sensitive) return MIN_AGGREGATION_GROUP
  return has(v, "hr_admin") || has(v, "payroll") ? 1 : MIN_AGGREGATION_GROUP
}

/** Drops groups under the floor and reports how many were dropped. */
export function suppress<T>(
  rows: T[],
  size: (r: T) => number,
  floor: number
): { rows: T[]; withheld: number } {
  const kept = rows.filter((r) => size(r) >= floor)
  return { rows: kept, withheld: rows.length - kept.length }
}

const pct = (n: number, d: number) =>
  d === 0 ? 0 : Math.round((n / d) * 1000) / 10
const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
const r1 = (n: number) => Math.round(n * 10) / 10

function countBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>()
  for (const i of items) {
    const k = key(i)
    m.set(k, [...(m.get(k) ?? []), i])
  }
  return [...m.entries()].map(([k, v]) => ({ key: k, items: v }))
}

function tenureBand(e: Employee, today: string) {
  const y = yearsOfService(e.startDate, new Date(`${today}T09:00:00`))
  if (y < 1) return "Under 1 year"
  if (y < 3) return "1–3 years"
  if (y < 5) return "3–5 years"
  return "5+ years"
}

function ageBand(e: Employee, today: string) {
  if (!e.dateOfBirth) return "Not recorded"
  const a = age(e.dateOfBirth, new Date(`${today}T09:00:00`))
  if (a < 30) return "Under 30"
  if (a < 40) return "30–39"
  if (a < 50) return "40–49"
  return "50 and over"
}

const isHrOrPayroll = (v: Viewer) => has(v, "hr_admin") || has(v, "payroll")
const anyone = () => true

/* ── Workforce ───────────────────────────────────────────────────────────── */

const workforce: ReportDef = {
  id: "workforce",
  title: "Workforce profile",
  group: "Workforce",
  description: "Who is on strength, split the way you choose.",
  options: [
    {
      key: "by",
      label: "Group by",
      default: "department",
      choices: [
        { value: "department", label: "Department" },
        { value: "branch", label: "Branch" },
        { value: "employment", label: "Employment type" },
        { value: "state", label: "Lifecycle state" },
        { value: "tenure", label: "Length of service" },
        { value: "gender", label: "Gender" },
        { value: "age", label: "Age band" },
      ],
    },
  ],
  allowed: anyone,
  run(d, ctx, o) {
    const by = o.by ?? "department"
    const people = d.employees.filter(isOnStrength)
    const key: Record<string, (e: Employee) => string> = {
      department: (e) => e.department,
      branch: (e) => e.branch,
      employment: (e) => EMPLOYMENT_TYPE_LABEL[e.employmentType],
      state: (e) => LIFECYCLE_LABEL[e.lifecycleState],
      tenure: (e) => tenureBand(e, ctx.today),
      gender: (e) => e.gender[0].toUpperCase() + e.gender.slice(1),
      age: (e) => ageBand(e, ctx.today),
    }
    // Who someone is — their gender or age — is the easiest thing to pick out
    // of a small group, so those splits keep the floor for every viewer.
    const sensitive = by === "gender" || by === "age"
    const floor = floorFor(ctx.viewer, sensitive)
    const grouped = countBy(people, key[by] ?? key.department)
      .map((g) => ({
        group: g.key,
        people: g.items.length,
        share: pct(g.items.length, people.length),
        tenure: r1(
          avg(
            g.items.map((e) =>
              yearsOfService(e.startDate, new Date(`${ctx.today}T09:00:00`))
            )
          )
        ),
      }))
      .sort((a, b) => b.people - a.people)
    const { rows, withheld } = suppress(grouped, (r) => r.people, floor)
    return {
      columns: [
        { key: "group", label: "Group" },
        { key: "people", label: "People", format: "number" },
        { key: "share", label: "Share", format: "percent" },
        { key: "tenure", label: "Avg. years of service", format: "number" },
      ],
      rows,
      withheld,
      summary: [
        { label: "On strength", value: String(people.length) },
        {
          label: "Average service",
          value: `${r1(avg(people.map((e) => yearsOfService(e.startDate, new Date(`${ctx.today}T09:00:00`)))))} yrs`,
        },
      ],
      notes: [],
      bar: { label: "group", value: "people" },
    }
  },
}

const turnover: ReportDef = {
  id: "turnover",
  title: "Turnover and exits",
  group: "Workforce",
  description: "Who left, why, and how fast people are leaving.",
  options: [PERIODS],
  allowed: isHrOrPayroll,
  run(d, ctx, o) {
    const from = periodStart(o.period ?? "12m", ctx.today)
    const days = Math.max(1, daysBetween(from, ctx.today))
    const leavers = d.offboarding.filter(
      (c) =>
        c.lastWorkingDay >= from && c.lastWorkingDay <= addDays(ctx.today, 90)
    )
    const left = leavers.filter((c) => c.lastWorkingDay <= ctx.today)
    const onStrength = d.employees.filter(isOnStrength).length
    // Annualised, so a 30-day window and a 12-month one can be compared.
    const rate = pct(left.length, onStrength + left.length) * (365 / days)
    const byReason = countBy(leavers, (c) => OFFBOARD_REASON_LABEL[c.reason])
      .map((g) => ({
        reason: g.key,
        exits: g.items.length,
        share: pct(g.items.length, leavers.length),
        service: r1(
          avg(
            g.items.map((c) => {
              const e = d.employees.find((x) => x.id === c.employeeId)
              return e
                ? Math.max(
                    0,
                    daysBetween(e.startDate, c.lastWorkingDay) / 365.25
                  )
                : 0
            })
          )
        ),
      }))
      .sort((a, b) => b.exits - a.exits)
    return {
      columns: [
        { key: "reason", label: "Reason" },
        { key: "exits", label: "Exits", format: "number" },
        { key: "share", label: "Share", format: "percent" },
        { key: "service", label: "Avg. years of service", format: "number" },
      ],
      rows: byReason,
      withheld: 0,
      summary: [
        {
          label: "Exits",
          value: String(leavers.length),
          hint: `${left.length} left, ${leavers.length - left.length} still to go`,
        },
        {
          label: "Turnover, annualised",
          value: `${r1(rate)}%`,
          hint: "Exits against headcount plus leavers",
        },
        {
          label: "Open exit cases",
          value: String(d.offboarding.filter((c) => !c.closedOn).length),
        },
      ],
      notes: ["Exits are counted from offboarding cases, by last working day."],
      bar: { label: "reason", value: "exits" },
    }
  },
}

/* ── Hiring ──────────────────────────────────────────────────────────────── */

const hiring: ReportDef = {
  id: "hiring",
  title: "Hiring pipeline",
  group: "Hiring",
  description:
    "Each requisition: how many applied, how far they got, and how long it has been open.",
  options: [],
  allowed: (v) =>
    has(v, "hr_admin") ||
    has(v, "line_manager") ||
    has(v, "head_of_department"),
  run(d, ctx) {
    const rows = d.requisitions.map((r) => {
      const pool = d.candidates.filter((c) => c.requisitionId === r.id)
      const hired = pool.filter((c) => c.stage === "hired").length
      return {
        requisition: `${r.title} (${r.id})`,
        status: REQ_STATUS_LABEL[r.status],
        applicants: pool.length,
        interviewed: pool.filter((c) => c.interviews.length > 0).length,
        offers: pool.filter((c) => c.offer !== null).length,
        hired,
        days: Math.max(0, daysBetween(r.openedOn, ctx.today)),
      }
    })
    const allHired = d.candidates.filter((c) => c.stage === "hired")
    const offered = d.candidates.filter(
      (c) => c.offer && c.offer.status !== "draft"
    )
    const accepted = offered.filter((c) => c.offer?.status === "accepted")
    return {
      columns: [
        { key: "requisition", label: "Requisition" },
        { key: "status", label: "Status" },
        { key: "applicants", label: "Applicants", format: "number" },
        { key: "interviewed", label: "Interviewed", format: "number" },
        { key: "offers", label: "Offers", format: "number" },
        { key: "hired", label: "Hired", format: "number" },
        { key: "days", label: "Days open", format: "number" },
      ],
      rows,
      withheld: 0,
      summary: [
        { label: "Applicants", value: String(d.candidates.length) },
        { label: "Hired", value: String(allHired.length) },
        {
          label: "Offer acceptance",
          value: offered.length
            ? `${pct(accepted.length, offered.length)}%`
            : "—",
          hint: `${accepted.length} of ${offered.length} offers`,
        },
      ],
      notes: [],
      bar: { label: "requisition", value: "applicants" },
    }
  },
}

const sources: ReportDef = {
  id: "sources",
  title: "Where candidates come from",
  group: "Hiring",
  description: "Which sources produce applicants, and which produce hires.",
  options: [],
  allowed: (v) => has(v, "hr_admin"),
  run(d) {
    const rows = countBy(d.candidates, (c) => c.source)
      .map((g) => ({
        source: g.key,
        applicants: g.items.length,
        hired: g.items.filter((c) => c.stage === "hired").length,
        rate: pct(
          g.items.filter((c) => c.stage === "hired").length,
          g.items.length
        ),
      }))
      .sort((a, b) => b.applicants - a.applicants)
    return {
      columns: [
        { key: "source", label: "Source" },
        { key: "applicants", label: "Applicants", format: "number" },
        { key: "hired", label: "Hired", format: "number" },
        { key: "rate", label: "Hire rate", format: "percent" },
      ],
      rows,
      withheld: 0,
      summary: [{ label: "Sources in use", value: String(rows.length) }],
      notes: [
        "Small numbers swing the rate: read it alongside the applicant count.",
      ],
      bar: { label: "source", value: "applicants" },
    }
  },
}

/* ── Time & leave ────────────────────────────────────────────────────────── */

const leave: ReportDef = {
  id: "leave",
  title: "Leave taken and owed",
  group: "Time & leave",
  description: "Annual leave used and still owed, by department.",
  options: [],
  allowed: anyone,
  run(d, ctx) {
    const people = d.employees.filter(isOnStrength)
    const floor = floorFor(ctx.viewer)
    const rows = countBy(people, (e) => e.department)
      .map((g) => {
        const bal = g.items
          .map((e) => d.leaveBalances.find((b) => b.employeeId === e.id))
          .filter((b): b is LeaveBalance => !!b)
        return {
          department: g.key,
          people: g.items.length,
          taken: bal.reduce((s, b) => s + b.annualTaken, 0),
          owed: bal.reduce((s, b) => s + accruedLeaveDays(b), 0),
        }
      })
      .sort((a, b) => b.owed - a.owed)
    const { rows: kept, withheld } = suppress(rows, (r) => r.people, floor)
    const byType = countBy(
      d.leaveRequests.filter(
        (r) =>
          r.status === "approved" && people.some((p) => p.id === r.employeeId)
      ),
      (r) => LEAVE_TYPE_LABEL[r.type]
    )
    return {
      columns: [
        { key: "department", label: "Department" },
        { key: "people", label: "People", format: "number" },
        { key: "taken", label: "Days taken", format: "number" },
        { key: "owed", label: "Days still owed", format: "number" },
      ],
      rows: kept,
      withheld,
      summary: [
        {
          label: "Annual days taken",
          value: String(rows.reduce((s, r) => s + r.taken, 0)),
        },
        {
          label: "Annual days owed",
          value: String(rows.reduce((s, r) => s + r.owed, 0)),
        },
        {
          label: "Approved requests",
          value: String(byType.reduce((s, g) => s + g.items.length, 0)),
        },
      ],
      notes: ["Days owed is entitlement plus carry-over, less days taken."],
      bar: { label: "department", value: "owed" },
    }
  },
}

const attendance: ReportDef = {
  id: "attendance",
  title: "Attendance",
  group: "Time & leave",
  description: "Presence, lateness and days with no record, by department.",
  options: [],
  allowed: anyone,
  run(d, ctx) {
    const floor = floorFor(ctx.viewer)
    const workdays = d.attendance.filter(
      (a) => !["weekend", "holiday", "on_leave"].includes(a.status)
    )
    const rows = countBy(
      workdays,
      (a) => d.employees.find((e) => e.id === a.employeeId)?.department ?? "—"
    )
      .map((g) => {
        const people = new Set(g.items.map((a) => a.employeeId)).size
        const late = g.items.filter((a) => a.status === "late").length
        const none = g.items.filter((a) => a.status === "no_record").length
        return {
          department: g.key,
          people,
          days: g.items.length,
          late: pct(late, g.items.length),
          none: pct(none, g.items.length),
        }
      })
      .sort((a, b) => b.late - a.late)
    const { rows: kept, withheld } = suppress(rows, (r) => r.people, floor)
    const late = workdays.filter((a) => a.status === "late").length
    return {
      columns: [
        { key: "department", label: "Department" },
        { key: "people", label: "People", format: "number" },
        { key: "days", label: "Working days logged", format: "number" },
        { key: "late", label: "Late", format: "percent" },
        { key: "none", label: "No record", format: "percent" },
      ],
      rows: kept,
      withheld,
      summary: [
        { label: "Working days logged", value: String(workdays.length) },
        { label: "Late", value: `${pct(late, workdays.length)}%` },
      ],
      notes: [
        "A day with no record is a gap in the data, not a finding about the person.",
      ],
      bar: { label: "department", value: "late" },
    }
  },
}

/* ── Pay ─────────────────────────────────────────────────────────────────── */

export const EMPLOYER_SSNIT = 0.13

const payroll: ReportDef = {
  id: "payroll_cost",
  title: "Payroll cost",
  group: "Pay",
  description:
    "Gross monthly pay and the employer's SSNIT on top, by department.",
  options: [],
  allowed: isHrOrPayroll,
  run(d) {
    const people = d.employees.filter(isOnStrength)
    const rows = countBy(people, (e) => e.department)
      .map((g) => {
        const gross = g.items.reduce(
          (s, e) => s + e.compensation.grossMonthly,
          0
        )
        return {
          department: g.key,
          people: g.items.length,
          gross,
          employer: Math.round(gross * EMPLOYER_SSNIT),
          total: Math.round(gross * (1 + EMPLOYER_SSNIT)),
        }
      })
      .sort((a, b) => b.total - a.total)
    const gross = rows.reduce((s, r) => s + r.gross, 0)
    return {
      columns: [
        { key: "department", label: "Department" },
        { key: "people", label: "People", format: "number" },
        { key: "gross", label: "Gross / month", format: "money" },
        { key: "employer", label: "Employer SSNIT (13%)", format: "money" },
        { key: "total", label: "Total cost / month", format: "money" },
      ],
      rows,
      withheld: 0,
      summary: [
        {
          label: "Gross / month",
          value: `GHS ${gross.toLocaleString("en-GH")}`,
        },
        {
          label: "Total cost / month",
          value: `GHS ${Math.round(gross * (1 + EMPLOYER_SSNIT)).toLocaleString("en-GH")}`,
          hint: "Includes employer SSNIT",
        },
        {
          label: "Average gross",
          value: people.length
            ? `GHS ${Math.round(gross / people.length).toLocaleString("en-GH")}`
            : "—",
        },
      ],
      notes: [
        "Salary data is restricted to HR and Payroll. Averages are shown for departments, never for an individual.",
      ],
      bar: { label: "department", value: "total" },
    }
  },
}

const liability: ReportDef = {
  id: "leave_liability",
  title: "Leave liability",
  group: "Pay",
  description:
    "What the company would pay out today for annual leave still owed.",
  options: [],
  allowed: isHrOrPayroll,
  run(d) {
    const people = d.employees.filter(isOnStrength)
    const rows = countBy(people, (e) => e.department)
      .map((g) => {
        let days = 0
        let value = 0
        for (const e of g.items) {
          const owed = accruedLeaveDays(
            d.leaveBalances.find((b) => b.employeeId === e.id)
          )
          days += owed
          value += owed * dailyRate(e.compensation.grossMonthly)
        }
        return {
          department: g.key,
          people: g.items.length,
          days,
          value: Math.round(value),
        }
      })
      .sort((a, b) => b.value - a.value)
    const total = rows.reduce((s, r) => s + r.value, 0)
    return {
      columns: [
        { key: "department", label: "Department" },
        { key: "people", label: "People", format: "number" },
        { key: "days", label: "Days owed", format: "number" },
        { key: "value", label: "Value", format: "money" },
      ],
      rows,
      withheld: 0,
      summary: [
        {
          label: "Total liability",
          value: `GHS ${total.toLocaleString("en-GH")}`,
        },
        {
          label: "Days owed",
          value: String(rows.reduce((s, r) => s + r.days, 0)),
        },
      ],
      notes: ["Valued at each person's daily rate: monthly gross × 12 ÷ 260."],
      bar: { label: "department", value: "value" },
    }
  },
}

/* ── Performance ─────────────────────────────────────────────────────────── */

const performance: ReportDef = {
  id: "performance",
  title: "Performance cycle",
  group: "Performance",
  description: "How far each cycle has got, and how ratings fall once shared.",
  options: [],
  allowed: (v) => has(v, "hr_admin"),
  run(d, ctx) {
    const floor = floorFor(ctx.viewer, true)
    const rows = countBy(d.reviews, (r) => r.cycle).map((g) => {
      const done = g.items.filter((r) => r.status === "complete").length
      const shared = g.items.filter(
        (r) => r.rating !== null && ["shared", "complete"].includes(r.status)
      )
      const late = g.items.filter(
        (r) => r.status !== "complete" && r.dueOn < ctx.today
      ).length
      const showAvg = shared.length >= floor
      return {
        cycle: g.key,
        reviews: g.items.length,
        complete: pct(done, g.items.length),
        overdue: late,
        rating: showAvg ? r1(avg(shared.map((r) => r.rating ?? 0))) : null,
      }
    })
    const all = d.reviews.filter(
      (r) => r.rating !== null && ["shared", "complete"].includes(r.status)
    )
    const dist = ratingBuckets(all)
    return {
      columns: [
        { key: "cycle", label: "Cycle" },
        { key: "reviews", label: "Reviews", format: "number" },
        { key: "complete", label: "Complete", format: "percent" },
        { key: "overdue", label: "Overdue", format: "number" },
        { key: "rating", label: "Average rating", format: "number" },
      ],
      rows,
      withheld: rows.filter((r) => r.rating === null).length,
      summary: [
        { label: "Reviews", value: String(d.reviews.length) },
        {
          label: "Complete",
          value: `${pct(d.reviews.filter((r) => r.status === "complete").length, d.reviews.length)}%`,
        },
        {
          label: "Rating spread",
          value:
            all.length >= floor
              ? dist.map((b) => `${b.rating}:${b.count}`).join("  ")
              : "Withheld",
          hint:
            all.length >= floor
              ? "Rating : reviews"
              : `Needs ${floor}+ shared reviews`,
        },
      ],
      notes: [
        `An average is shown only once ${floor} reviews are shared, so no one rating can be picked out.`,
      ],
      bar: { label: "cycle", value: "reviews" },
    }
  },
}

/* ── Goals ───────────────────────────────────────────────────────────────── */

const goalsReport: ReportDef = {
  id: "goals",
  title: "Goals and OKRs",
  group: "Performance",
  description:
    "Progress on company and team goals, and how individual goals are going by department.",
  options: [],
  allowed: (v) => has(v, "hr_admin"),
  run(d, ctx) {
    const floor = floorFor(ctx.viewer, true)
    const live = d.goals.filter((g) => g.status === "active")
    const health = (g: Goal) => healthOf(g, d.goals, d.checkIns, ctx.today)
    const summarise = (items: Goal[]) => ({
      goals: items.length,
      progress: Math.round(avg(items.map((g) => progressOf(g, d.goals))) * 100),
      atRisk: items.filter((g) => health(g) !== "on_track").length,
      stale: items.filter((g) => isStale(g, d.checkIns, ctx.today)).length,
    })
    const shared = live.filter((g) => g.level !== "individual")
    const rows: Row[] = shared.map((g) => ({
      scope:
        g.level === "company" ? `Company: ${g.title}` : `${g.team}: ${g.title}`,
      ...summarise([g]),
    }))
    const empOf = (id: string | null) => d.employees.find((e) => e.id === id)
    const people = countBy(
      live.filter((g) => g.level === "individual"),
      (g) => empOf(g.ownerId)?.department ?? "Unknown"
    )
    const shown = people.filter((p) => p.items.length >= floor)
    for (const p of shown)
      rows.push({ scope: `${p.key} (individual goals)`, ...summarise(p.items) })
    return {
      columns: [
        { key: "scope", label: "Goal or group" },
        { key: "goals", label: "Goals", format: "number" },
        { key: "progress", label: "Progress", format: "percent" },
        { key: "atRisk", label: "At risk", format: "number" },
        { key: "stale", label: "No recent check-in", format: "number" },
      ],
      rows,
      withheld: people.length - shown.length,
      summary: [
        { label: "Live goals", value: String(live.length) },
        {
          label: "Average progress",
          value: `${summarise(live).progress}%`,
        },
        { label: "At risk", value: String(summarise(live).atRisk) },
      ],
      notes: [
        `Individual goals are grouped by department, and a group is shown only at ${floor}+ goals, so no one person's goal can be picked out.`,
      ],
      bar: { label: "scope", value: "progress" },
    }
  },
}

/* ── Compliance ──────────────────────────────────────────────────────────── */

const compliance: ReportDef = {
  id: "compliance",
  title: "Compliance watch",
  group: "Compliance",
  description:
    "Documents, contracts and probations that need attention before they lapse.",
  options: [
    {
      key: "window",
      label: "Look ahead",
      default: "60",
      choices: [
        { value: "30", label: "30 days" },
        { value: "60", label: "60 days" },
        { value: "90", label: "90 days" },
      ],
    },
  ],
  allowed: (v) => has(v, "hr_admin"),
  run(d, ctx, o) {
    const win = Number(o.window ?? 60)
    const horizon = addDays(ctx.today, win)
    const active = d.employees.filter(isOnStrength)
    const docsDue = d.documents.filter(
      (x) =>
        x.expiresOn &&
        x.expiresOn <= horizon &&
        active.some((e) => e.id === x.employeeId)
    )
    const contracts = active.filter(
      (e) => e.contractEndDate && e.contractEndDate <= horizon
    )
    const probation = active.filter(
      (e) =>
        e.lifecycleState === "probation" &&
        e.probationEndDate &&
        e.probationEndDate <= horizon
    )
    const missing = d.documents.filter((x) => x.status === "missing")
    const openCases = d.cases.filter(
      (c) => !["finalised", "dismissed"].includes(c.state)
    )
    const first = (xs: (string | null | undefined)[]) =>
      xs.filter((x): x is string => !!x).sort()[0] ?? null
    const rows: Row[] = [
      {
        item: "Documents expiring or expired",
        count: docsDue.length,
        soonest: first(docsDue.map((x) => x.expiresOn)),
      },
      {
        item: "Required documents missing",
        count: missing.length,
        soonest: null,
      },
      {
        item: "Fixed-term contracts ending",
        count: contracts.length,
        soonest: first(contracts.map((e) => e.contractEndDate)),
      },
      {
        item: "Probations ending",
        count: probation.length,
        soonest: first(probation.map((e) => e.probationEndDate)),
      },
      ...(["minor", "serious", "gross"] as const).map((s) => ({
        item: `Open disciplinary cases — ${SEVERITY_LABEL[s].toLowerCase()}`,
        count: openCases.filter((c) => c.severity === s).length,
        soonest: null,
      })),
    ]
    return {
      columns: [
        { key: "item", label: "Item" },
        { key: "count", label: "Count", format: "number" },
        { key: "soonest", label: "Soonest", format: "date" },
      ],
      rows,
      withheld: 0,
      summary: [
        {
          label: "Needing action",
          value: String(
            docsDue.length +
              missing.length +
              contracts.length +
              probation.length
          ),
        },
        {
          label: "Open cases",
          value: String(openCases.length),
          hint:
            openCases.map((c) => CASE_STATE_LABEL[c.state]).join(", ") ||
            undefined,
        },
      ],
      notes: ["Disciplinary cases are shown as counts only, never by name."],
      bar: { label: "item", value: "count" },
    }
  },
}

export const REPORTS: ReportDef[] = [
  workforce,
  turnover,
  hiring,
  sources,
  leave,
  attendance,
  payroll,
  liability,
  performance,
  goalsReport,
  compliance,
]

export const REPORT_GROUPS: ReportGroup[] = [
  "Workforce",
  "Hiring",
  "Time & leave",
  "Pay",
  "Performance",
  "Compliance",
]

export function reportsFor(v: Viewer) {
  return REPORTS.filter((r) => r.allowed(v))
}

export function defaultOptions(def: ReportDef) {
  return Object.fromEntries(def.options.map((o) => [o.key, o.default]))
}

export function runReport(
  id: string,
  data: ReportData,
  ctx: ReportContext,
  options: Record<string, string> = {}
): ReportResult | null {
  const def = REPORTS.find((r) => r.id === id)
  if (!def || !def.allowed(ctx.viewer)) return null
  return def.run(data, ctx, { ...defaultOptions(def), ...options })
}

/** Plain-text cell, the way the screen shows it. */
export function displayCell(v: Cell, format: CellFormat = "text") {
  if (v === null || v === undefined || v === "") return "—"
  if (format === "money") return `GHS ${Number(v).toLocaleString("en-GH")}`
  if (format === "percent") return `${v}%`
  if (format === "date") return formatDate(String(v))
  return String(v)
}

/** RFC 4180 quoting, and a guard against a cell a spreadsheet would run as a formula. */
export function csvCell(v: Cell) {
  let s = v === null || v === undefined ? "" : String(v)
  if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(result: ReportResult, title: string, today: string) {
  const head = result.columns.map((c) => csvCell(c.label)).join(",")
  const body = result.rows.map((r) =>
    result.columns.map((c) => csvCell(r[c.key] ?? null)).join(",")
  )
  const foot =
    result.withheld > 0
      ? [
          `${csvCell(`${result.withheld} group(s) withheld: fewer than ${MIN_AGGREGATION_GROUP} people`)}`,
        ]
      : []
  return [
    csvCell(title),
    csvCell(`Generated ${today}`),
    "",
    head,
    ...body,
    ...foot,
  ].join("\r\n")
}
