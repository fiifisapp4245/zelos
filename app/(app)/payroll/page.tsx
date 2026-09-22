"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, Lock, Play, Wallet } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { completeness, isOnStrength, visibleEmployees } from "@/lib/selectors"
import { formatDate, fullName, ghs, maskId } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Ghana statutory contribution rates for the launch jurisdiction. */
const SSNIT_EMPLOYEE_RATE = 0.055
const SSNIT_EMPLOYER_RATE = 0.13

export default function PayrollPage() {
  const store = useStore()
  const { viewer, employees } = store

  if (!has(viewer, "hr_admin") && !has(viewer, "payroll")) {
    return (
      <PageShell
        crumbs={[
          { label: "Workspace", href: "/overview" },
          { label: "Payroll" },
        ]}
      >
        <Panel>
          <EmptyState
            icon={Lock}
            title="Payroll is restricted"
            description="Only HR Admin and Payroll can open this. Line managers never see compensation — comp conversations route through HR."
          />
        </Panel>
      </PageShell>
    )
  }

  const scope = visibleEmployees(viewer, employees).filter(isOnStrength)
  const blocked = scope
    .map((e) => ({ employee: e, check: completeness(e) }))
    .filter((r) => r.check.missing.length > 0)

  const gross = scope.reduce((s, e) => s + e.compensation.grossMonthly, 0)
  const employeeSsnit = gross * SSNIT_EMPLOYEE_RATE
  const employerSsnit = gross * SSNIT_EMPLOYER_RATE
  const netish = gross - employeeSsnit

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Compliance" },
        { label: "Payroll" },
      ]}
    >
      <PageHeader
        title="Payroll"
        description="September 2026 run. Figures are indicative — PAYE bands are applied at disbursement."
        actions={
          <Button
            size="lg"
            disabled={blocked.length > 0}
            onClick={() => toast.success("Run queued for approval.")}
          >
            <Play className="size-4" />
            {blocked.length > 0
              ? `${blocked.length} records blocking`
              : "Start payroll run"}
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Gross payroll"
          value={ghs(gross, { compact: true })}
          hint={`${scope.length} people`}
        />
        <StatCard
          label="SSNIT — employee"
          value={ghs(employeeSsnit, { compact: true })}
          hint="5.5% of gross"
        />
        <StatCard
          label="SSNIT — employer"
          value={ghs(employerSsnit, { compact: true })}
          hint="13% of gross"
        />
        <StatCard
          label="Records blocking"
          value={blocked.length}
          hint="Missing a field the run needs"
        />
      </div>

      {blocked.length > 0 && (
        <Panel
          title="Blocking this run"
          description="A payroll run that discovers a missing field is a payroll run that has already failed. These surface before it starts."
          className="mb-5 border-destructive/30"
          bodyClassName="p-0"
        >
          <ul className="divide-y">
            {blocked.map(({ employee, check }) => (
              <li
                key={employee.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <AlertTriangle className="size-4 shrink-0 text-destructive" />
                <Initials person={employee} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/employees/${employee.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {fullName(employee)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Missing: {check.missing.join(", ")}
                  </p>
                </div>
                <Pill tone="danger">{check.percent}% complete</Pill>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/employees/${employee.id}`}>Fix record</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title="Payroll register"
        description="Statutory IDs stay masked. Revealing one is logged with a stated purpose on the employee's record."
        bodyClassName="p-0"
      >
        {scope.length === 0 ? (
          <EmptyState icon={Wallet} title="Nobody on payroll" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  {[
                    "Employee",
                    "Grade",
                    "SSNIT",
                    "TIN",
                    "Method",
                    "Gross",
                    "SSNIT 5.5%",
                    "Net (indicative)",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5 last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {scope.map((e) => {
                  const c = e.compensation
                  const deduction = c.grossMonthly * SSNIT_EMPLOYEE_RATE
                  return (
                    <tr
                      key={e.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="py-2.5 pl-5">
                        <Link
                          href={`/employees/${e.id}`}
                          className="flex items-center gap-2.5"
                        >
                          <Initials person={e} size="xs" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {fullName(e)}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {e.department}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3">{c.payGrade}</td>
                      <td className="px-3 font-mono text-xs text-muted-foreground">
                        {maskId(c.ssnitNumber)}
                      </td>
                      <td className="px-3 font-mono text-xs text-muted-foreground">
                        {maskId(c.tin)}
                      </td>
                      <td className="px-3">
                        <Pill tone="neutral">
                          {c.paymentMethod === "mobile_money"
                            ? c.momoProvider
                            : c.bankName || "Bank"}
                        </Pill>
                      </td>
                      <td className="tabular px-3">{ghs(c.grossMonthly)}</td>
                      <td className="tabular px-3 text-muted-foreground">
                        −{ghs(deduction)}
                      </td>
                      <td
                        className={cn(
                          "tabular py-2.5 pr-5 text-right font-medium"
                        )}
                      >
                        {ghs(c.grossMonthly - deduction)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40 font-medium">
                  <td className="py-3 pl-5" colSpan={5}>
                    Total · {scope.length} people
                  </td>
                  <td className="tabular px-3">{ghs(gross)}</td>
                  <td className="tabular px-3">−{ghs(employeeSsnit)}</td>
                  <td className="tabular py-3 pr-5 text-right">
                    {ghs(netish)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-4 text-xs text-muted-foreground">
        Pay date {formatDate("2026-09-28")} · Tier 2 contributions remitted to
        each employee&apos;s nominated provider · PAYE calculated on GRA bands
        at disbursement.
      </p>
    </PageShell>
  )
}
