"use client"

import * as React from "react"
import Link from "next/link"
import { Download, FileText, Wallet } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Amount, RevealProvider, RevealToggle } from "@/components/pay/money"
import { usePayslips } from "./use-payslips"
import { RUN_STATUS_LABEL } from "./status"
import { useStore } from "@/lib/store"
import { formatDate } from "@/lib/format"
import type { Payslip } from "@/lib/pay/types"

/**
 * What an employee sees of payroll: their own pay, and nothing else.
 *
 * Same runs, same figures — a payslip states the line the run produced
 * rather than a second copy of it, so what they read here is what the
 * register says.
 */
export function MyPay({ employeeId }: { employeeId: string }) {
  const store = useStore()
  const { payslips } = usePayslips(employeeId)
  const [revealed, setRevealed] = React.useState(false)

  const latest = payslips[0]

  if (!latest) {
    return (
      <Panel bodyClassName="p-0">
        <EmptyState
          icon={Wallet}
          title="No payslip yet"
          description="Your first payslip appears here once the run covering your first period has been approved."
        />
      </Panel>
    )
  }

  return (
    <RevealProvider revealed={revealed}>
      <div className="space-y-4">
        <Panel
          title="Your last payslip"
          description={`Paid ${formatDate(latest.payDate)}`}
          actions={<RevealToggle revealed={revealed} onChange={setRevealed} />}
        >
          <dl className="grid gap-4 sm:grid-cols-4">
            <Figure
              label="Take-home"
              value={latest.net}
              currency={latest.currency}
              strong
            />
            <Figure
              label="Gross"
              value={latest.gross}
              currency={latest.currency}
            />
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Paid to
              </dt>
              <dd className="mt-0.5 text-sm">
                {latest.destinationMasked ?? "No account on file"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Year to date
              </dt>
              <dd className="mt-0.5 text-sm">
                <Amount value={latest.ytd.net} currency={latest.currency} /> net
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <Button size="sm" className="h-9" asChild>
              <Link href={`/pay/payroll/payslips/${latest.id}`}>
                <FileText className="size-4" />
                Open payslip
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-9" asChild>
              <Link href={`/employees/${employeeId}?tab=compensation`}>
                See my package
              </Link>
            </Button>
          </div>
        </Panel>

        <Panel
          title="Payslips"
          description="Every period you have been paid for."
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Your payslips, newest first.
              </caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {["Period", "Pay date", "Gross", "Net", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {payslips.map((slip) => {
                  const run = store.payrollRuns.find((r) => r.id === slip.runId)
                  return (
                    <tr
                      key={slip.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="py-2.5 pl-5">
                        <Link
                          href={`/pay/payroll/payslips/${slip.id}`}
                          className="font-medium hover:underline"
                        >
                          {new Date(
                            `${slip.period}-01T00:00:00`
                          ).toLocaleDateString("en-GB", {
                            month: "long",
                            year: "numeric",
                          })}
                        </Link>
                      </td>
                      <td className="tabular px-4 text-muted-foreground">
                        {formatDate(slip.payDate)}
                      </td>
                      <td className="px-4">
                        <Amount value={slip.gross} currency={slip.currency} />
                      </td>
                      <td className="px-4 font-medium">
                        <Amount value={slip.net} currency={slip.currency} />
                      </td>
                      <td className="px-4">
                        <Pill
                          tone={run?.status === "paid" ? "success" : "info"}
                        >
                          {run ? RUN_STATUS_LABEL[run.status] : "—"}
                        </Pill>
                      </td>
                      <td className="py-2.5 pr-5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() =>
                            downloadPayslip(slip, store.company.tradingName)
                          }
                        >
                          <Download className="size-3.5" />
                          Download
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </RevealProvider>
  )
}

function Figure({
  label,
  value,
  currency,
  strong,
}: {
  label: string
  value: number
  currency: string
  strong?: boolean
}) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={strong ? "mt-0.5 text-xl font-semibold" : "mt-0.5 text-sm"}
      >
        <Amount value={value} currency={currency} />
      </dd>
    </div>
  )
}

/** A payslip as a file, for a landlord or a visa application. */
export function downloadPayslip(slip: Payslip, company: string) {
  const rows = [
    `${company} — payslip`,
    `Period,${slip.period}`,
    `Pay date,${slip.payDate}`,
    "",
    "Earnings,Amount",
    ...slip.earnings.map((e) => `${e.label},${e.amount.toFixed(2)}`),
    "",
    "Deductions,Amount",
    ...slip.deductions.map((d) => `${d.label},${d.amount.toFixed(2)}`),
    "",
    `Gross,${slip.gross.toFixed(2)}`,
    `Net,${slip.net.toFixed(2)}`,
    `Currency,${slip.currency}`,
    `Paid to,${slip.destinationMasked ?? "—"}`,
    "",
    "Employer contributions (not deducted from your pay),Amount",
    ...slip.employerContributions.map(
      (c) => `${c.label},${c.amount.toFixed(2)}`
    ),
    "",
    `Year to date gross,${slip.ytd.gross.toFixed(2)}`,
    `Year to date net,${slip.ytd.net.toFixed(2)}`,
  ].join("\n")

  const blob = new Blob([rows], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `payslip-${slip.period}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success("Payslip downloaded")
}
