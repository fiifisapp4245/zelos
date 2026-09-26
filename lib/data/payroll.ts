import { EMPLOYEES } from "./employees"
import {
  COMPENSATION_VERSIONS,
  COUNTRY_RULE_PACKS,
  PAY_COMPONENTS,
  PAY_GROUPS,
} from "./pay"
import { batchesFor } from "../pay/payments"
import { linesForRun, type RunSource } from "../pay/run-lines"
import type {
  ExternalResult,
  LineAdjustment,
  OneOffPayment,
  PaymentBatch,
  PayrollRun,
  ReadinessAcknowledgement,
} from "../pay/types"

/**
 * Payroll runs for the prototype, against TODAY = 2026-09-18.
 *
 * The lines themselves are never stored: they are recalculated from the
 * compensation versions, the country rules and the one-off payments
 * every time a run is opened. What is stored is what somebody decided —
 * the status, the adjustments they made by hand, and the trail.
 */

const PAID_EVENTS = (month: string, payDate: string) => [
  {
    at: `${month}-16T09:10:00`,
    by: "maame",
    action: "Inputs locked",
  },
  { at: `${month}-16T09:40:00`, by: "maame", action: "Calculated" },
  {
    at: `${month}-16T15:05:00`,
    by: "maame",
    action: "Submitted for approval",
  },
  {
    at: `${month}-17T11:20:00`,
    by: "fiifi",
    action: "Approved",
    note: "Checked against the variance list.",
  },
  { at: `${payDate}T08:00:00`, by: "maame", action: "Paid" },
]

function paidRun(
  id: string,
  payGroupId: string,
  month: string,
  end: string,
  payDate: string
): PayrollRun {
  return {
    id,
    payGroupId,
    kind: "regular",
    periodStart: `${month}-01`,
    periodEnd: `${month}-${end}`,
    payDate,
    status: "paid",
    preparedBy: "maame",
    submittedAt: `${month}-16T15:05:00`,
    decision: {
      by: "fiifi",
      at: `${month}-17T11:20:00`,
      outcome: "approved",
      reason: "Checked against the variance list.",
    },
    fxRates: [],
    events: PAID_EVENTS(month, payDate),
  }
}

export const PAYROLL_RUNS: PayrollRun[] = [
  /* Ghana — three months settled, this month waiting on HR, next month
     not yet open because attendance for it has not been closed. */
  paidRun("run-gh-2026-06", "pg-gh-monthly", "2026-06", "30", "2026-06-26"),
  paidRun("run-gh-2026-07", "pg-gh-monthly", "2026-07", "31", "2026-07-28"),
  paidRun("run-gh-2026-08", "pg-gh-monthly", "2026-08", "31", "2026-08-28"),
  {
    id: "run-gh-2026-09",
    payGroupId: "pg-gh-monthly",
    kind: "regular",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    payDate: "2026-09-28",
    status: "pending_approval",
    preparedBy: "maame",
    submittedAt: "2026-09-17T16:20:00",
    decision: null,
    fxRates: [],
    events: [
      { at: "2026-09-16T08:55:00", by: "maame", action: "Inputs locked" },
      { at: "2026-09-16T09:30:00", by: "maame", action: "Calculated" },
      {
        at: "2026-09-17T10:05:00",
        by: "maame",
        action: "Adjustment added",
        note: "Salary advance recovery for Kwabena Osei.",
      },
      { at: "2026-09-17T10:30:00", by: "maame", action: "Recalculated" },
      {
        at: "2026-09-17T16:20:00",
        by: "maame",
        action: "Submitted for approval",
        note: "Two lines flagged; both explained in the variance list.",
      },
    ],
  },
  {
    id: "run-gh-2026-10",
    payGroupId: "pg-gh-monthly",
    kind: "regular",
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    payDate: "2026-10-28",
    status: "upcoming",
    preparedBy: "maame",
    submittedAt: null,
    decision: null,
    fxRates: [],
    events: [],
  },

  /* Nigeria — results come from the local provider, so the run sits at
     inputs locked until the file arrives. */
  {
    id: "run-ng-2026-08",
    payGroupId: "pg-ng-monthly",
    kind: "regular",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    payDate: "2026-08-31",
    status: "paid",
    preparedBy: "maame",
    submittedAt: "2026-08-25T12:00:00",
    decision: {
      by: "fiifi",
      at: "2026-08-26T09:15:00",
      outcome: "approved",
      reason: "Matches the provider's schedule.",
    },
    fxRates: [
      {
        from: "NGN",
        to: "GHS",
        rate: 0.0079,
        capturedAt: "2026-08-26T09:15:00",
      },
    ],
    events: [
      { at: "2026-08-24T10:00:00", by: "maame", action: "Inputs locked" },
      {
        at: "2026-08-25T11:40:00",
        by: "maame",
        action: "Results uploaded",
        note: "PayHub Nigeria, August schedule.",
      },
      {
        at: "2026-08-25T12:00:00",
        by: "maame",
        action: "Submitted for approval",
      },
      { at: "2026-08-26T09:15:00", by: "fiifi", action: "Approved" },
      { at: "2026-08-31T08:00:00", by: "maame", action: "Paid" },
    ],
  },
  {
    id: "run-ng-2026-09",
    payGroupId: "pg-ng-monthly",
    kind: "regular",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    payDate: "2026-09-30",
    status: "inputs_locked",
    preparedBy: "maame",
    submittedAt: null,
    decision: null,
    fxRates: [],
    events: [
      { at: "2026-09-16T09:00:00", by: "maame", action: "Inputs locked" },
    ],
  },

  /* Contractors — invoiced, calculated, waiting to be submitted. */
  {
    id: "run-ct-2026-08",
    payGroupId: "pg-contractors",
    kind: "regular",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    payDate: "2026-09-05",
    status: "paid",
    preparedBy: "maame",
    submittedAt: "2026-09-01T09:00:00",
    decision: {
      by: "fiifi",
      at: "2026-09-02T10:00:00",
      outcome: "approved",
      reason: "Invoices checked against the engagements.",
    },
    fxRates: [
      {
        from: "USD",
        to: "GHS",
        rate: 12.42,
        capturedAt: "2026-09-02T10:00:00",
      },
    ],
    events: [
      { at: "2026-09-01T08:30:00", by: "maame", action: "Calculated" },
      {
        at: "2026-09-01T09:00:00",
        by: "maame",
        action: "Submitted for approval",
      },
      { at: "2026-09-02T10:00:00", by: "fiifi", action: "Approved" },
      { at: "2026-09-05T08:00:00", by: "maame", action: "Paid" },
    ],
  },
  {
    id: "run-ct-2026-09",
    payGroupId: "pg-contractors",
    kind: "regular",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    payDate: "2026-10-05",
    status: "calculated",
    preparedBy: "maame",
    submittedAt: null,
    decision: null,
    fxRates: [],
    events: [
      { at: "2026-09-17T14:00:00", by: "maame", action: "Inputs locked" },
      { at: "2026-09-17T14:10:00", by: "maame", action: "Calculated" },
    ],
  },
]

/**
 * Changes somebody made to a line by hand. Each one carries its author
 * and its reason, and the line shows the figure before it alongside.
 */
export const LINE_ADJUSTMENTS: LineAdjustment[] = [
  {
    id: "adj-run-1",
    runId: "run-gh-2026-09",
    employeeId: "kwabena",
    componentId: "pc-loan",
    amount: 12000,
    direction: "deduct",
    note: "Full recovery of the July salary advance, agreed in writing before he transfers.",
    by: "maame",
    at: "2026-09-17T10:05:00",
  },
  {
    id: "adj-run-2",
    runId: "run-gh-2026-09",
    employeeId: "mensa",
    componentId: "pc-bonus",
    amount: 420,
    direction: "add",
    note: "Two Sunday call-outs during the stock count.",
    by: "maame",
    at: "2026-09-16T16:40:00",
  },
]

/**
 * Where pay was sent on past runs. Adjoa changed her number in
 * September, so August has to keep showing the account it went to.
 */
export const RUN_DESTINATION_OVERRIDES: Record<
  string,
  Record<string, string>
> = {
  "run-gh-2026-08": { adjoa: "MTN MoMo · ••• 4417" },
  "run-gh-2026-07": { adjoa: "MTN MoMo · ••• 4417" },
  "run-gh-2026-06": { adjoa: "MTN MoMo · ••• 4417" },
}

/** Uploaded from the provider for the Nigeria group. */
export const EXTERNAL_RESULTS: ExternalResult[] = [
  {
    runId: "run-ng-2026-08",
    employeeId: "abena",
    gross: 1_150_000,
    deductions: 287_500,
    net: 862_500,
  },
  {
    runId: "run-ng-2026-08",
    employeeId: "kwesi",
    gross: 2_400_000,
    deductions: 648_000,
    net: 1_752_000,
  },
  {
    runId: "run-ng-2026-08",
    employeeId: "akos",
    gross: 980_000,
    deductions: 225_400,
    net: 754_600,
  },
]

export const ONE_OFF_PAYMENTS: OneOffPayment[] = [
  {
    id: "oo-001",
    employeeId: "kofi",
    componentId: "pc-bonus",
    amount: 2500,
    basis: "gross",
    payFromDate: "2026-09-01",
    recurrence: "once",
    status: "included",
    includedInRunId: "run-gh-2026-09",
    note: "Delivery of the clock-in migration ahead of schedule.",
    events: [
      { at: "2026-09-08T10:00:00", by: "adwoa", action: "Added" },
      {
        at: "2026-09-16T09:30:00",
        by: "maame",
        action: "Included in the September run",
      },
    ],
  },
  {
    // Net basis: she is promised 1,000 in hand, so the run grosses it up.
    id: "oo-002",
    employeeId: "ama",
    componentId: "pc-bonus",
    amount: 1000,
    basis: "net",
    payFromDate: "2026-09-01",
    recurrence: "once",
    status: "included",
    includedInRunId: "run-gh-2026-09",
    note: "Design sprint award, agreed as a take-home figure.",
    events: [
      { at: "2026-09-09T14:20:00", by: "kwesi", action: "Added" },
      {
        at: "2026-09-16T09:30:00",
        by: "maame",
        action: "Included in the September run",
      },
    ],
  },
  {
    id: "oo-003",
    employeeId: "selorm",
    componentId: "pc-transport",
    amount: 800,
    basis: "gross",
    payFromDate: "2026-09-01",
    recurrence: "monthly_for_n",
    months: 3,
    status: "included",
    includedInRunId: "run-gh-2026-09",
    note: "On-call allowance while he is covering the Lagos migration.",
    events: [{ at: "2026-09-02T08:15:00", by: "adwoa", action: "Added" }],
  },
  {
    id: "oo-004",
    employeeId: "adjoa",
    componentId: "pc-bonus",
    amount: 1500,
    basis: "gross",
    payFromDate: "2026-10-01",
    recurrence: "once",
    status: "upcoming",
    includedInRunId: null,
    note: "Five years' service award.",
    events: [{ at: "2026-09-15T11:00:00", by: "akwasi", action: "Added" }],
  },
  {
    id: "oo-005",
    employeeId: "mensa",
    componentId: "pc-bonus",
    amount: 640,
    basis: "gross",
    payFromDate: "2026-08-01",
    recurrence: "once",
    status: "paid",
    includedInRunId: "run-gh-2026-08",
    note: "Overtime settlement from the July stock count.",
    events: [
      { at: "2026-08-10T09:00:00", by: "akwasi", action: "Added" },
      {
        at: "2026-08-28T08:00:00",
        by: "maame",
        action: "Paid in the August run",
      },
    ],
  },
  {
    id: "oo-006",
    employeeId: "kwabena",
    componentId: "pc-bonus",
    amount: 3000,
    basis: "gross",
    payFromDate: "2026-09-01",
    recurrence: "once",
    status: "cancelled",
    includedInRunId: null,
    note: "Relocation support for the Kigali move.",
    events: [
      { at: "2026-09-05T10:00:00", by: "yaw", action: "Added" },
      {
        at: "2026-09-14T15:30:00",
        by: "fiifi",
        action: "Cancelled",
        note: "The move is blocked until there is an entity in Rwanda.",
      },
    ],
  },
]

/** Warnings somebody has already decided to proceed past. */
export const READINESS_ACKNOWLEDGEMENTS: ReadinessAcknowledgement[] = []

/* ── Payments ────────────────────────────────────────────────────────── */

/**
 * The batches that carried the money out on the runs that have been
 * paid, built from the same lines the register shows.
 *
 * One item on the August mobile money batch came back: the number is
 * registered in somebody else's name. It is left failed rather than
 * quietly retried, because somebody has to look at it.
 */
export const PAYMENT_BATCHES: PaymentBatch[] = (() => {
  const source: RunSource = {
    employees: EMPLOYEES,
    versions: COMPENSATION_VERSIONS,
    payGroups: PAY_GROUPS,
    rulePacks: COUNTRY_RULE_PACKS,
    components: PAY_COMPONENTS,
    oneOffs: ONE_OFF_PAYMENTS,
    adjustments: LINE_ADJUSTMENTS,
    externalResults: EXTERNAL_RESULTS,
    destinationOverrides: RUN_DESTINATION_OVERRIDES,
    runs: PAYROLL_RUNS,
  }

  return PAYROLL_RUNS.filter((r) => r.status === "paid").flatMap((run) => {
    const { lines } = linesForRun(run, source)
    const group = PAY_GROUPS.find((g) => g.id === run.payGroupId)
    return batchesFor(run, lines, EMPLOYEES, group).map((batch) => {
      const failed = batch.id === "pb-run-gh-2026-08-mtn_momo" ? "mensa" : null

      const items = batch.items.map((item) =>
        item.employeeId === failed
          ? {
              ...item,
              status: "failed" as const,
              failureReason:
                "The mobile money account is registered in another name.",
            }
          : { ...item, status: "confirmed" as const }
      )

      const sentAt = `${run.payDate}T08:05:00`
      return {
        ...batch,
        items,
        status: failed ? ("failed" as const) : ("confirmed" as const),
        events: [
          { at: `${run.payDate}T08:00:00`, by: "maame", action: "Initiated" },
          { at: sentAt, by: "maame", action: "Sent to the provider" },
          failed
            ? {
                at: `${run.payDate}T09:40:00`,
                by: "maame",
                action: "Failed",
                note: "One item came back; the rest settled.",
              }
            : {
                at: `${run.payDate}T09:20:00`,
                by: "maame",
                action: "Confirmed",
              },
        ],
      }
    })
  })
})()
