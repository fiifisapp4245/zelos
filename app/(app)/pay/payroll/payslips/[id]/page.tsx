"use client"

import * as React from "react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { ArrowUpRight, Download, Lock, Printer } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, Panel } from "@/components/common"
import { Button } from "@/components/ui/button"
import { downloadPayslip } from "@/components/payroll/my-pay"
import { usePayslips } from "@/components/payroll/use-payslips"
import { useStore } from "@/lib/store"
import { canSeePay } from "@/lib/pay/access"
import { money } from "@/lib/pay/money"
import { formatDate, fullName } from "@/lib/format"
import type { LineItem } from "@/lib/pay/types"

/**
 * A payslip, laid out to be read and printed rather than browsed.
 *
 * Employer contributions are shown apart from deductions and labelled
 * as what the employer paid on top — putting them in the same column
 * would make somebody think it came out of their pay.
 */
export default function PayslipPage() {
  const { id } = useParams<{ id: string }>()
  const store = useStore()

  // The id carries the run and the person: ps-{runId}-{employeeId}.
  const employeeId = id.split("-").at(-1) ?? ""
  const { payslips } = usePayslips(employeeId)
  const slip = payslips.find((p) => p.id === id)
  const employee = store.employeeById(employeeId)

  if (!slip || !employee) notFound()

  if (!canSeePay(store.viewer, employee, store.employees)) {
    return (
      <PageShell crumbs={[{ label: "Pay" }, { label: "Payslip" }]}>
        <Panel bodyClassName="p-0">
          <EmptyState
            icon={Lock}
            title="This payslip is not yours to open"
            description="A payslip is visible to the person it belongs to, their line manager, HR Admin and Payroll."
          />
        </Panel>
      </PageShell>
    )
  }

  const period = new Date(`${slip.period}-01T00:00:00`).toLocaleDateString(
    "en-GB",
    { month: "long", year: "numeric" }
  )

  return (
    <PageShell
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Pay" },
        { label: "Payroll", href: "/pay/payroll" },
        { label: period },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Payslip · {period}
          </h1>
          <p className="text-sm text-muted-foreground">
            Paid {formatDate(slip.payDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Print
          </Button>
          <Button
            size="sm"
            className="h-9"
            onClick={() => downloadPayslip(slip, store.company.tradingName)}
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </div>

      <article className="rounded-xl border bg-card p-6 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-base font-semibold">{store.company.legalName}</p>
            <p className="text-sm text-muted-foreground">
              {store.company.postalAddress}
            </p>
            <p className="text-sm text-muted-foreground">
              Employer SSNIT {store.company.ssnitEmployerNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold">{fullName(employee)}</p>
            <p className="text-sm text-muted-foreground">
              {employee.jobTitle} · {employee.department}
            </p>
            <p className="tabular text-sm text-muted-foreground">
              {employee.employeeId}
            </p>
          </div>
        </header>

        <dl className="grid gap-4 border-b py-4 sm:grid-cols-4">
          <Fact label="Period" value={period} />
          <Fact label="Pay date" value={formatDate(slip.payDate)} />
          <Fact
            label="Paid to"
            value={slip.destinationMasked ?? "No account on file"}
          />
          <Fact
            label="Take-home"
            value={money(slip.net, slip.currency)}
            strong
          />
        </dl>

        <div className="grid gap-6 py-4 sm:grid-cols-2">
          <Section
            title="Earnings"
            items={slip.earnings}
            currency={slip.currency}
            total={slip.gross}
            totalLabel="Gross pay"
          />
          <Section
            title="Deductions"
            items={slip.deductions}
            currency={slip.currency}
            total={slip.gross - slip.net}
            totalLabel="Total deductions"
          />
        </div>

        <div className="border-t pt-4">
          <p className="flex flex-wrap items-baseline justify-between gap-2 text-base font-semibold">
            <span>Net pay</span>
            <span className="tabular">{money(slip.net, slip.currency)}</span>
          </p>
        </div>

        {slip.employerContributions.length > 0 && (
          <div className="mt-4 rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">
              Paid by your employer on top of your pay
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              These are not deducted from what you receive.
            </p>
            <ul className="space-y-1 text-sm">
              {slip.employerContributions.map((c, i) => (
                <li
                  key={`${c.componentId}-${i}`}
                  className="flex justify-between gap-3"
                >
                  <span>{c.label}</span>
                  <span className="tabular">
                    {money(c.amount, slip.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-4">
          <Fact
            label="Year to date gross"
            value={money(slip.ytd.gross, slip.currency)}
          />
          <Fact
            label="Year to date deductions"
            value={money(slip.ytd.deductions, slip.currency)}
          />
          <Fact
            label="Year to date net"
            value={money(slip.ytd.net, slip.currency)}
          />
          <Fact
            label="Rules applied"
            value={
              slip.rulePackVersion
                ? `Ghana ${slip.rulePackVersion}`
                : "Calculated by the local provider"
            }
          />
        </div>
      </article>

      <p className="mt-3 text-sm text-muted-foreground print:hidden">
        Worked out from{" "}
        <Link
          href={`/employees/${employeeId}?tab=compensation`}
          className="text-primary underline-offset-2 hover:underline"
        >
          the compensation in force for this period
          <ArrowUpRight className="ml-0.5 inline size-3.5" />
        </Link>
        .
      </p>
    </PageShell>
  )
}

function Fact({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={strong ? "mt-0.5 font-semibold" : "mt-0.5 text-sm"}>
        {value}
      </dd>
    </div>
  )
}

function Section({
  title,
  items,
  currency,
  total,
  totalLabel,
}: {
  title: string
  items: LineItem[]
  currency: string
  total: number
  totalLabel: string
}) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <ul className="space-y-1.5 text-sm">
        {items.map((item, i) => (
          <li
            key={`${item.componentId}-${i}`}
            className="flex justify-between gap-3"
          >
            <span>{item.label}</span>
            <span className="tabular">{money(item.amount, currency)}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-muted-foreground">Nothing this period</li>
        )}
      </ul>
      <p className="mt-2 flex justify-between gap-3 border-t pt-2 text-sm font-medium">
        <span>{totalLabel}</span>
        <span className="tabular">{money(total, currency)}</span>
      </p>
    </section>
  )
}
