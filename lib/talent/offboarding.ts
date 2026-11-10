import type {
  AssetReturn,
  Employee,
  LeaveBalance,
  OffboardingCase,
  OffboardingReason,
  SettlementBreakdown,
} from "../types"
import { TODAY_ISO } from "../format"
import { addDays } from "../time"

/** What every leaver is asked to hand back unless the issue record says otherwise. */
export const STANDARD_ASSETS: AssetReturn[] = [
  { item: "Laptop", returned: false },
  { item: "Access card", returned: false },
  { item: "Work phone / SIM", returned: false },
]

export const WORKING_DAYS_PER_YEAR = 260

export function dailyRate(grossMonthly: number) {
  return (grossMonthly * 12) / WORKING_DAYS_PER_YEAR
}

/** Mon–Fri days from the first of the month up to and including `iso`. */
export function weekdaysInMonthTo(iso: string) {
  const end = new Date(iso)
  let n = 0
  for (let d = 1; d <= end.getDate(); d++) {
    const day = new Date(end.getFullYear(), end.getMonth(), d).getDay()
    if (day !== 0 && day !== 6) n++
  }
  return n
}

/** Annual leave still owing, in days. Never negative. */
export function accruedLeaveDays(balance: LeaveBalance | undefined) {
  if (!balance) return 0
  return Math.max(
    0,
    balance.annualEntitlement + balance.carriedOver - balance.annualTaken
  )
}

export interface SettlementInputs {
  salaryDays: number
  leaveDays: number
  noticeInLieuDays: number
  deductions: number
  note: string
}

/** The figures the settlement form opens with, before anyone edits them. */
export function defaultSettlement(
  c: OffboardingCase,
  balance: LeaveBalance | undefined
): SettlementInputs {
  return {
    salaryDays: weekdaysInMonthTo(c.lastWorkingDay),
    leaveDays: accruedLeaveDays(balance),
    noticeInLieuDays: 0,
    deductions: 0,
    note: "",
  }
}

export interface SettlementLine {
  label: string
  days?: number
  amount: number
}

/**
 * Gross settlement. PAYE and SSNIT are applied when payroll runs it, so this
 * is the figure Finance reviews, not the figure that lands in the account.
 */
export function settlementLines(
  employee: Employee,
  s: SettlementBreakdown | SettlementInputs
): { lines: SettlementLine[]; total: number } {
  const rate = dailyRate(employee.compensation.grossMonthly)
  const lines: SettlementLine[] = [
    {
      label: "Salary for days worked",
      days: s.salaryDays,
      amount: round2(rate * s.salaryDays),
    },
    {
      label: "Accrued annual leave",
      days: s.leaveDays,
      amount: round2(rate * s.leaveDays),
    },
    {
      label: "Notice paid in lieu",
      days: s.noticeInLieuDays,
      amount: round2(rate * s.noticeInLieuDays),
    },
    { label: "Recoveries", amount: -round2(s.deductions) || 0 },
  ]
  return { lines, total: round2(lines.reduce((t, l) => t + l.amount, 0)) }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export type ExitStepKey =
  "assets" | "access" | "handover" | "exit_interview" | "settlement" | "payroll"

export interface ExitStep {
  key: ExitStepKey
  label: string
  detail: string
  done: boolean
  owner: "hr" | "manager" | "it" | "finance"
}

/** Every thing that has to be true before a person can leave the record. */
export function exitSteps(c: OffboardingCase): ExitStep[] {
  const out = c.clearance.assets.filter((a) => !a.returned && !a.lost).length
  return [
    {
      key: "assets",
      label: "Company assets returned",
      detail:
        c.clearance.assets.length === 0
          ? "Nothing was issued"
          : out === 0
            ? `All ${c.clearance.assets.length} accounted for`
            : `${out} of ${c.clearance.assets.length} still out`,
      done: out === 0,
      owner: "hr",
    },
    {
      key: "access",
      label: "System access revoked",
      detail: "Email, HR system, VPN and shared drives closed",
      done: c.clearance.access,
      owner: "it",
    },
    {
      key: "handover",
      label: "Handover completed",
      detail: c.handoverTo ? "Work passed on" : "Name who takes over",
      done: c.clearance.handover,
      owner: "manager",
    },
    {
      key: "exit_interview",
      label: "Exit interview held",
      detail: c.exitInterviewDone
        ? "On file"
        : "Why they are leaving, what would have kept them",
      done: c.exitInterviewDone,
      owner: "hr",
    },
    {
      key: "settlement",
      label: "Final settlement calculated",
      detail:
        c.finalSettlement !== null ? "Figure agreed" : "Salary, leave, notice",
      done: c.clearance.finance && c.finalSettlement !== null,
      owner: "finance",
    },
    {
      key: "payroll",
      label: "Sent to payroll",
      detail: c.sentToPayrollOn ? "With payroll" : "Payroll pays the final run",
      done: c.sentToPayrollOn !== null,
      owner: "finance",
    },
  ]
}

export function exitProgress(c: OffboardingCase) {
  const steps = exitSteps(c)
  const done = steps.filter((s) => s.done).length
  return {
    done,
    total: steps.length,
    percent: Math.round((done / steps.length) * 100),
  }
}

/** What is still in the way of closing the case. Empty means it can close. */
export function closeBlockers(c: OffboardingCase) {
  return exitSteps(c)
    .filter((s) => !s.done)
    .map((s) => s.label)
}

export function caseStage(c: OffboardingCase): OffboardingCase["state"] {
  if (c.closedOn) return "closed"
  if (c.sentToPayrollOn) return "settled"
  const any =
    c.clearance.assets.some((a) => a.returned) ||
    c.clearance.access ||
    c.clearance.handover ||
    c.exitInterviewDone ||
    c.finalSettlement !== null
  return any ? "clearing" : "notice"
}

/** The end state an exit lands in, which is what makes the record read right afterwards. */
export function endStateFor(reason: OffboardingReason) {
  if (reason === "retirement") return "retired" as const
  if (reason === "resignation" || reason === "mutual")
    return "resigned" as const
  return "terminated" as const
}

export function newCaseId(existing: OffboardingCase[]) {
  const year = TODAY_ISO.slice(0, 4)
  const n =
    existing
      .filter((c) => c.id.startsWith(`OFF-${year}-`))
      .map((c) => Number(c.id.split("-")[2]))
      .reduce((m, v) => Math.max(m, v), 0) + 1
  return `OFF-${year}-${String(n).padStart(2, "0")}`
}

export function defaultLastDay(e: Employee, noticeGivenOn: string) {
  return addDays(noticeGivenOn, e.noticePeriodDays)
}
