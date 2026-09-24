import type { Employee } from "../types"
import { totalDeductions, totalEmployerContributions } from "./payroll"
import { totalPerCurrency } from "./money"
import type {
  PaymentBatch,
  PaymentChannelKey,
  PaymentItem,
  PayrollLine,
  PayrollRun,
} from "./types"

/**
 * Getting the money out.
 *
 * Pay leaves in batches, one per channel, because that is how the banks
 * and the mobile money providers take it. A batch is the unit that
 * succeeds or fails, and an item inside it can fail on its own — which
 * is the case that matters, since one bounced number should not hold up
 * eighteen other people.
 */

export const CHANNEL_LABEL: Record<PaymentChannelKey, string> = {
  bank_file: "Bank file",
  mtn_momo: "MTN MoMo",
  telecel_cash: "Telecel Cash",
  airteltigo_money: "AirtelTigo Money",
  international_transfer: "International transfer",
}

/** Which channel a line goes out on, from the account it is paid to. */
export function channelOf(
  line: PayrollLine,
  employee: Employee | undefined
): PaymentChannelKey | null {
  if (!line.paymentDestinationMasked) return null
  if (line.paymentChannel === "international_transfer")
    return "international_transfer"
  if (line.paymentChannel === "bank_transfer")
    return employee && employee.branch === "London"
      ? "international_transfer"
      : "bank_file"

  const provider = (employee?.compensation.momoProvider ?? "").toLowerCase()
  if (provider.includes("telecel")) return "telecel_cash"
  if (provider.includes("airteltigo")) return "airteltigo_money"
  return "mtn_momo"
}

/**
 * The batches a run would go out in.
 *
 * Anyone with nowhere to be paid is left out rather than put in a batch
 * that would bounce; the Payments screen lists them separately so they
 * are visibly unpaid rather than quietly missing.
 */
export function batchesFor(
  run: PayrollRun,
  lines: PayrollLine[],
  employees: Employee[]
): PaymentBatch[] {
  const byChannel = new Map<PaymentChannelKey, PayrollLine[]>()

  for (const line of lines) {
    const channel = channelOf(
      line,
      employees.find((e) => e.id === line.employeeId)
    )
    if (!channel) continue
    const list = byChannel.get(channel)
    if (list) list.push(line)
    else byChannel.set(channel, [line])
  }

  return [...byChannel.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([channel, group]) => ({
      id: `pb-${run.id}-${channel}`,
      runId: run.id,
      channel,
      count: group.length,
      totalsPerCurrency: totalPerCurrency(
        group.map((l) => ({ amount: l.net, currency: l.currency }))
      ),
      status: "initiated" as const,
      items: group.map<PaymentItem>((l) => ({
        employeeId: l.employeeId,
        amount: l.net,
        currency: l.currency,
        destinationMasked: l.paymentDestinationMasked!,
        status: "pending",
      })),
      events: [],
    }))
}

/** Lines that cannot go into any batch, and why. */
export function unpayable(lines: PayrollLine[]) {
  return lines.filter((l) => !l.paymentDestinationMasked)
}

export const BATCH_STEPS: PaymentBatch["status"][] = [
  "initiated",
  "sent",
  "confirmed",
]

export const BATCH_LABEL: Record<PaymentBatch["status"], string> = {
  initiated: "Initiated",
  sent: "Sent",
  confirmed: "Confirmed",
  failed: "Failed",
}

export function batchProgress(batch: PaymentBatch) {
  return {
    confirmed: batch.items.filter((i) => i.status === "confirmed").length,
    failed: batch.items.filter((i) => i.status === "failed").length,
    total: batch.items.length,
  }
}

/* ── Files ───────────────────────────────────────────────────────────── */

/**
 * The file a bank takes. Deliberately plain: a payroll file that needs
 * explaining is a file somebody will get wrong at four o'clock on a
 * Friday.
 */
export function bankFileFor(
  batch: PaymentBatch,
  employees: Employee[],
  run: PayrollRun
) {
  const rows = batch.items.map((item) => {
    const e = employees.find((x) => x.id === item.employeeId)
    return [
      e?.employeeId ?? item.employeeId,
      `${e?.firstName ?? ""} ${e?.lastName ?? ""}`.trim(),
      item.destinationMasked,
      item.amount.toFixed(2),
      item.currency,
      `Salary ${run.periodStart.slice(0, 7)}`,
    ].join(",")
  })
  return ["staff_id,name,destination,amount,currency,narration", ...rows].join(
    "\n"
  )
}

/** The same batch as a spreadsheet, for reconciling by hand. */
export function csvFor(batch: PaymentBatch, employees: Employee[]) {
  const rows = batch.items.map((item) => {
    const e = employees.find((x) => x.id === item.employeeId)
    return [
      e?.employeeId ?? item.employeeId,
      `${e?.firstName ?? ""} ${e?.lastName ?? ""}`.trim(),
      CHANNEL_LABEL[batch.channel],
      item.destinationMasked,
      item.amount.toFixed(2),
      item.currency,
      item.status,
      item.failureReason ?? "",
    ].join(",")
  })
  return [
    "staff_id,name,channel,destination,amount,currency,status,failure_reason",
    ...rows,
  ].join("\n")
}

/** A run's register, as a file. */
export function registerCsv(lines: PayrollLine[], employees: Employee[]) {
  const rows = lines.map((l) => {
    const e = employees.find((x) => x.id === l.employeeId)
    return [
      e?.employeeId ?? l.employeeId,
      `${e?.firstName ?? ""} ${e?.lastName ?? ""}`.trim(),
      e?.department ?? "",
      l.gross.toFixed(2),
      totalDeductions(l).toFixed(2),
      totalEmployerContributions(l).toFixed(2),
      l.net.toFixed(2),
      l.currency,
    ].join(",")
  })
  return [
    "staff_id,name,department,gross,deductions,employer_contributions,net,currency",
    ...rows,
  ].join("\n")
}
