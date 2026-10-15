import { addDays } from "../time"
import { currentVersion } from "./derive"
import { previewLine } from "./calculator"
import { remittancesFor } from "./payroll"
import { packFor, versionsFor } from "./rule-packs"
import type {
  CompensationVersion,
  CountryRulePack,
  Currency,
  FilingDeadline,
  FilingRecord,
  PackAcknowledgement,
  PayComponent,
  PayGroup,
  PayrollLine,
} from "./types"

/**
 * What a company does about a country's rules, as opposed to the rules
 * themselves: noticing a new version before it bites, seeing what it
 * will cost, and meeting the deadlines the rules set.
 *
 * Nothing here changes a rate. Everything here is derived from the packs
 * and from what the company has recorded doing.
 */

/* ── Updates ─────────────────────────────────────────────────────────── */

/** Versions published but not yet in force, soonest first. */
export function upcomingVersions(
  packs: CountryRulePack[],
  country: string,
  todayIso: string
): CountryRulePack[] {
  return versionsFor(packs, country)
    .filter((p) => p.effectiveFrom > todayIso)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
}

export function acknowledgementOf(
  acks: PackAcknowledgement[],
  country: string,
  version: string
): PackAcknowledgement | null {
  return (
    acks.find((a) => a.country === country && a.version === version) ?? null
  )
}

/** One pay group's totals for a period, under one version of the rules. */
export interface ImpactTotals {
  gross: number
  tax: number
  net: number
  employerCost: number
}

export interface GroupImpact {
  groupId: string
  groupName: string
  currency: Currency
  /** People the group would pay on the day the new version starts. */
  people: number
  /** Of those, whose net pay the new version changes. */
  affected: number
  before: ImpactTotals
  after: ImpactTotals
}

/**
 * What a new version does to each pay group in its country, worked out
 * by the same engine a run uses: everybody the group would pay on the
 * day it starts, calculated under the version before it and under it.
 *
 * Only the regular package is compared — one-off payments and manual
 * adjustments are the period's business, not the rules'. So the figure
 * is the rules' effect alone, for one ordinary period.
 */
export function packImpact(input: {
  next: CountryRulePack
  packs: CountryRulePack[]
  groups: PayGroup[]
  versions: CompensationVersion[]
  components: PayComponent[]
}): GroupImpact[] {
  const { next, packs, groups, versions, components } = input
  const previous = packFor(packs, next.country, addDays(next.effectiveFrom, -1))
  const on = next.effectiveFrom

  return groups
    .filter((g) => g.country === next.country && g.calculationMode === "native")
    .map((group) => {
      const people = [...new Set(versions.map((v) => v.employeeId))]
        .map((id) => currentVersion(versions, id, on))
        .filter(
          (v): v is CompensationVersion =>
            v !== null && v.payGroupId === group.id
        )

      // The calculator's own entry point, so this preview and Test a
      // calculation are the same arithmetic by construction.
      const line = (v: CompensationVersion, pack: CountryRulePack | null) =>
        previewLine(v, pack, components)

      const before = emptyTotals()
      const after = emptyTotals()
      let affected = 0
      for (const v of people) {
        const was = line(v, previous)
        const will = line(v, next)
        add(before, was)
        add(after, will)
        if (was.net !== will.net) affected += 1
      }

      return {
        groupId: group.id,
        groupName: group.name,
        currency: group.currency,
        people: people.length,
        affected,
        before: rounded(before),
        after: rounded(after),
      }
    })
}

function emptyTotals(): ImpactTotals {
  return { gross: 0, tax: 0, net: 0, employerCost: 0 }
}

function add(t: ImpactTotals, line: PayrollLine) {
  t.gross += line.gross
  t.tax += line.deductions
    .filter((d) => d.componentId === "pc-paye")
    .reduce((n, d) => n + d.amount, 0)
  t.net += line.net
  t.employerCost +=
    line.gross + line.employerContributions.reduce((n, c) => n + c.amount, 0)
}

function rounded(t: ImpactTotals): ImpactTotals {
  const r = (n: number) => Math.round(n * 100) / 100
  return {
    gross: r(t.gross),
    tax: r(t.tax),
    net: r(t.net),
    employerCost: r(t.employerCost),
  }
}

/* ── Compliance calendar ─────────────────────────────────────────────── */

export type FilingStatus = "due" | "filed" | "paid" | "overdue"

export interface CalendarRow {
  key: string
  deadline: FilingDeadline
  period: string
  dueOn: string
  status: FilingStatus
  /** Done in the sense the deadline means: filed for a return, paid for a remittance. */
  done: boolean
  record: FilingRecord | null
  /** When the filing owner is reminded. */
  remindOn: string
  reminded: boolean
  /** Overdue, so it has gone to the HR Admin as well as the owner. */
  escalated: boolean
}

/** Days before a deadline that the filing owner hears about it. */
export const REMIND_DAYS_BEFORE = 3

/**
 * One row per deadline per period, for the months either side of today:
 * the last few closed ones, so anything missed stays in view, and the
 * one now running, whose returns fall due next month.
 */
export function complianceCalendar(input: {
  pack: CountryRulePack
  filings: FilingRecord[]
  todayIso: string
  monthsBack?: number
}): CalendarRow[] {
  const { pack, filings, todayIso, monthsBack = 3 } = input
  const rows: CalendarRow[] = []
  const thisMonth = todayIso.slice(0, 7)
  const year = Number(todayIso.slice(0, 4))

  for (const deadline of pack.filingDeadlines) {
    if (deadline.dueDayOfMonth !== undefined) {
      for (let back = monthsBack; back >= 0; back -= 1) {
        const period = shiftMonth(thisMonth, -back)
        const dueOn = `${shiftMonth(period, 1)}-${String(deadline.dueDayOfMonth).padStart(2, "0")}`
        rows.push(row(deadline, period, dueOn))
      }
    } else if (deadline.annualOn) {
      // Last year's return, due this year, and this year's, due next.
      for (const y of [year - 1, year])
        rows.push(row(deadline, String(y), `${y + 1}-${deadline.annualOn}`))
    }
  }

  return rows.sort(
    (a, b) =>
      a.dueOn.localeCompare(b.dueOn) ||
      a.deadline.name.localeCompare(b.deadline.name)
  )

  function row(
    deadline: FilingDeadline,
    period: string,
    dueOn: string
  ): CalendarRow {
    const record =
      filings.find(
        (f) =>
          f.country === pack.country &&
          f.deadlineId === deadline.id &&
          f.period === period
      ) ?? null
    const status = statusOf(deadline, record, dueOn, todayIso)
    const done =
      deadline.kind === "return"
        ? Boolean(record?.filed)
        : Boolean(record?.paid)
    const remindOn = addDays(dueOn, -REMIND_DAYS_BEFORE)
    return {
      key: `${deadline.id}:${period}`,
      deadline,
      period,
      dueOn,
      status,
      done,
      record,
      remindOn,
      reminded: !done && todayIso >= remindOn,
      escalated: status === "overdue",
    }
  }
}

/**
 * A return is finished when filed and a remittance when paid. Anything
 * unfinished after its due date is overdue, whatever else was done —
 * a schedule filed but not paid still leaves the money owed.
 */
export function statusOf(
  deadline: FilingDeadline,
  record: FilingRecord | null,
  dueOn: string,
  todayIso: string
): FilingStatus {
  if (deadline.kind === "remittance" && record?.paid) return "paid"
  if (deadline.kind === "return" && record?.filed) return "filed"
  if (todayIso > dueOn) return "overdue"
  if (record?.filed) return "filed"
  return "due"
}

/** "Aug 2026" for a monthly period, "Year 2025" for an annual one. */
export function periodLabel(period: string) {
  if (period.length === 4) return `Year ${period}`
  const [y, m] = period.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

function shiftMonth(yyyyMm: string, by: number) {
  const [y, m] = yyyyMm.split("-").map(Number)
  const index = y * 12 + (m - 1) + by
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`
}

/* ── Statutory report contents ───────────────────────────────────────── */

export interface ReportPerson {
  name: string
  tin: string
  ssnitNumber: string
}

/**
 * The rows of the report a deadline needs, from the lines of the runs in
 * its period. A remittance is worked from the allocation it pays over, so
 * the schedule sent to SSNIT and the one sent to the trustee add up to
 * what was collected; a return carries the income tax.
 */
export function reportRows(
  deadline: FilingDeadline,
  pack: CountryRulePack,
  lines: { line: PayrollLine; base: number; person: ReportPerson }[]
): string[][] {
  if (deadline.allocationId) {
    const header = ["Employee", "SSNIT number", "Basic", "Amount"]
    const body = lines.map(({ base, person }) => {
      const share = remittancesFor(base, pack).find(
        (r) => r.allocationId === deadline.allocationId
      )
      return [
        person.name,
        person.ssnitNumber,
        base.toFixed(2),
        (share?.amount ?? 0).toFixed(2),
      ]
    })
    return [header, ...body]
  }

  const header = ["Employee", "TIN", "Gross", "Income tax"]
  const body = lines.map(({ line, person }) => [
    person.name,
    person.tin,
    line.gross.toFixed(2),
    line.deductions
      .filter((d) => d.componentId === "pc-paye")
      .reduce((n, d) => n + d.amount, 0)
      .toFixed(2),
  ])
  return [header, ...body]
}

/** Quoted CSV, so a name with a comma stays one cell. */
export function toCsv(rows: string[][]): string {
  return rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n")
}
