"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Download,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Amount, RevealProvider, RevealToggle } from "@/components/pay/money"
import { usePayroll } from "./use-payroll"
import { useStore } from "@/lib/store"
import {
  BATCH_LABEL,
  BATCH_STEPS,
  CHANNEL_LABEL,
  bankFileFor,
  batchProgress,
  batchesFor,
  csvFor,
  unpayable,
} from "@/lib/pay/payments"
import type {
  PaymentBatch,
  PaymentChannelKey,
  PayrollRun,
} from "@/lib/pay/types"
import { formatDate, formatDateTime, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

function download(name: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Getting the money out, and knowing that it arrived.
 *
 * A batch is the unit a provider accepts, so the tracker is per batch —
 * but an item inside one can come back on its own, and that is the case
 * worth building for. One bounced number does not hold up the other
 * eighteen, and it is not quietly retried either: somebody decides.
 */
export function PaymentsTab({ canPay }: { canPay: boolean }) {
  const { runs, groupFor, linesFor } = usePayroll()
  const [revealed, setRevealed] = React.useState(false)

  const payable = runs
    .filter(
      (r) =>
        r.status === "approved" || r.status === "paying" || r.status === "paid"
    )
    .sort((a, b) => b.payDate.localeCompare(a.payDate))

  if (payable.length === 0) {
    return (
      <Panel bodyClassName="p-0">
        <EmptyState
          icon={Send}
          title="No payment batch is open"
          description="Once a run is approved, its lines are batched by channel and sent, with each batch tracked until every line has settled."
        />
      </Panel>
    )
  }

  return (
    <RevealProvider revealed={revealed}>
      <div className="space-y-4">
        <div className="flex justify-end">
          <RevealToggle revealed={revealed} onChange={setRevealed} />
        </div>
        {payable.map((run) => (
          <RunPayments
            key={run.id}
            run={run}
            groupName={groupFor(run.payGroupId)?.name ?? run.payGroupId}
            lines={linesFor(run).lines}
            canPay={canPay}
          />
        ))}
      </div>
    </RevealProvider>
  )
}

function RunPayments({
  run,
  groupName,
  lines,
  canPay,
}: {
  run: PayrollRun
  groupName: string
  lines: ReturnType<ReturnType<typeof usePayroll>["linesFor"]>["lines"]
  canPay: boolean
}) {
  const store = useStore()
  const batches = store.paymentBatches.filter((b) => b.runId === run.id)
  const stranded = unpayable(lines)

  return (
    <Panel
      title={`${groupName} · ${formatDate(run.periodStart).slice(0, -5)}`}
      description={`Paid ${formatDate(run.payDate)} · ${lines.length} lines`}
      bodyClassName="p-0"
      actions={
        batches.length === 0 &&
        canPay && (
          <Button
            size="sm"
            className="h-9"
            onClick={() => {
              store.createPaymentBatches(
                run.id,
                batchesFor(run, lines, store.employees)
              )
              toast.success("Batches created, one per channel")
            }}
          >
            <Send className="size-4" />
            Create payment batches
          </Button>
        )
      }
    >
      {batches.length === 0 ? (
        <div className="px-5 py-4 text-sm text-muted-foreground">
          This run has been approved but nothing has been sent yet.
        </div>
      ) : (
        <ul className="divide-y">
          {batches.map((batch) => (
            <li key={batch.id} className="px-5 py-4">
              <BatchCard batch={batch} run={run} canPay={canPay} />
            </li>
          ))}
        </ul>
      )}

      {stranded.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t bg-warning-muted px-5 py-3">
          <AlertTriangle
            className="size-4 shrink-0 text-warning-foreground"
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-sm text-warning-foreground">
            <strong className="font-medium">
              {stranded.length}{" "}
              {stranded.length === 1 ? "person is" : "people are"} not in any
              batch
            </strong>{" "}
            — there is no account on file to send their pay to:{" "}
            {stranded
              .map((l) => fullName(store.employeeById(l.employeeId)))
              .join(", ")}
            .
          </p>
          <Button variant="outline" size="sm" className="h-8 bg-card" asChild>
            <Link href={`/employees/${stranded[0].employeeId}`}>
              Add their details
            </Link>
          </Button>
        </div>
      )}
    </Panel>
  )
}

function BatchCard({
  batch,
  run,
  canPay,
}: {
  batch: PaymentBatch
  run: PayrollRun
  canPay: boolean
}) {
  const store = useStore()
  const progress = batchProgress(batch)
  const failedItems = batch.items.filter((i) => i.status === "failed")
  const at = BATCH_STEPS.indexOf(
    batch.status === "failed" ? "sent" : batch.status
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {CHANNEL_LABEL[batch.channel]}
            <Pill
              tone={
                batch.status === "failed"
                  ? "danger"
                  : batch.status === "confirmed"
                    ? "success"
                    : "info"
              }
            >
              {BATCH_LABEL[batch.status]}
            </Pill>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {batch.count} {batch.count === 1 ? "payment" : "payments"} ·{" "}
            {batch.totalsPerCurrency
              .map((t) => `${t.currency} ${t.amount.toLocaleString()}`)
              .join(" · ")}{" "}
            · {progress.confirmed} confirmed
            {progress.failed > 0 && `, ${progress.failed} failed`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              download(
                `${batch.id}.csv`,
                batch.channel === "bank_file"
                  ? bankFileFor(batch, store.employees, run)
                  : csvFor(batch, store.employees)
              )
              toast.success("File downloaded")
            }}
          >
            <Download className="size-3.5" />
            {batch.channel === "bank_file" ? "Bank file" : "CSV"}
          </Button>

          {canPay && batch.status === "initiated" && (
            <Button
              size="sm"
              className="h-8"
              onClick={() => {
                store.advanceBatch(batch.id, "sent")
                toast.success("Batch sent to the provider")
              }}
            >
              Send batch
            </Button>
          )}
          {canPay && batch.status === "sent" && (
            <Button
              size="sm"
              className="h-8"
              onClick={() => {
                store.advanceBatch(batch.id, "confirmed")
                toast.success("Batch confirmed")
              }}
            >
              Confirm settlement
            </Button>
          )}
        </div>
      </div>

      <ol
        className="flex flex-wrap items-center gap-1"
        aria-label={`Batch status: ${BATCH_LABEL[batch.status]}`}
      >
        {BATCH_STEPS.map((step, i) => {
          const done = i < at || batch.status === "confirmed"
          const current = i === at && batch.status !== "confirmed"
          return (
            <li key={step} className="flex items-center gap-1">
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs",
                  current && "bg-success-muted font-medium text-primary",
                  done && "text-muted-foreground",
                  !done && !current && "text-muted-foreground/60"
                )}
                aria-current={current ? "step" : undefined}
              >
                {done && <Check className="size-3 text-primary" aria-hidden />}
                {BATCH_LABEL[step]}
              </span>
              {i < BATCH_STEPS.length - 1 && (
                <span className="text-muted-foreground/40" aria-hidden>
                  ›
                </span>
              )}
            </li>
          )
        })}
        {batch.status === "failed" && (
          <li>
            <Pill tone="danger">
              <AlertTriangle className="size-3" aria-hidden />
              {BATCH_LABEL.failed}
            </Pill>
          </li>
        )}
      </ol>

      {failedItems.length > 0 && (
        <ul className="divide-y rounded-xl border border-destructive/40">
          {failedItems.map((item) => {
            const person = store.employeeById(item.employeeId)
            const pendingChange = store.approvals.some(
              (a) =>
                a.type === "bankDetailsChange" &&
                a.status === "pending" &&
                a.requester === item.employeeId
            )
            return (
              <li
                key={item.employeeId}
                className="flex flex-wrap items-center gap-3 px-3 py-2.5"
              >
                {person && <Initials person={person} size="xs" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {fullName(person)}
                  </span>
                  <span className="block text-xs text-destructive">
                    {item.failureReason}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.destinationMasked} ·{" "}
                    <Amount value={item.amount} currency={item.currency} />
                  </span>
                </span>

                {canPay && (
                  <span className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        store.retryPaymentItem(batch.id, item.employeeId)
                        toast.success("Sent again; the first attempt is kept")
                      }}
                    >
                      <RefreshCw className="size-3.5" />
                      Retry
                    </Button>

                    {pendingChange ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        asChild
                      >
                        <Link href="/approvals?type=bankDetailsChange">
                          Approve their new details
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            Pay another way
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            Approved destinations
                          </DropdownMenuLabel>
                          {(
                            [
                              "bank_file",
                              "mtn_momo",
                              "telecel_cash",
                              "airteltigo_money",
                            ] as PaymentChannelKey[]
                          )
                            .filter((c) => c !== batch.channel)
                            .map((c) => (
                              <DropdownMenuItem
                                key={c}
                                onSelect={() => {
                                  store.payItemByChannel(
                                    batch.id,
                                    item.employeeId,
                                    c
                                  )
                                  toast.success(
                                    `Sent by ${CHANNEL_LABEL[c]} instead`
                                  )
                                }}
                              >
                                {CHANNEL_LABEL[c]}
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {batch.events.length > 0 && (
        <ol className="space-y-0.5 border-l pl-3 text-xs text-muted-foreground">
          {batch.events.map((e, i) => (
            <li key={i}>
              <span className="font-medium text-foreground">{e.action}</span> ·{" "}
              {fullName(store.employeeById(e.by))} · {formatDateTime(e.at)}
              {e.note && ` · ${e.note}`}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export { Wallet }
