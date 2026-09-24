"use client"

import Link from "next/link"
import { ArrowRight, CircleDollarSign, Wallet } from "lucide-react"

import { Widget, ViewAll, WidgetEmpty } from "./widget"
import { Pill } from "@/components/common"
import { useStore } from "@/lib/store"
import { canApprove } from "@/lib/pay/derive"
import { canApproveRun } from "@/lib/pay/payroll"
import { formatDate, fullName } from "@/lib/format"

/**
 * The two pay decisions that hold other people up.
 *
 * A run waiting on a signature stops everybody being paid, and a pay
 * change waiting on one stops one person being paid correctly. Both
 * belong on the first screen of the day rather than two clicks into a
 * module.
 */
export function PayActions() {
  const store = useStore()
  const user = {
    employeeId: store.viewer.employeeId,
    roles: store.viewer.roles,
  }

  const runs = store.payrollRuns.filter((r) => canApproveRun(user, r).allowed)
  const changes = store.changeRequests.filter(
    (r) => canApprove(user, r).allowed
  )
  const total = runs.length + changes.length

  return (
    <Widget
      title="Pay decisions"
      count={total}
      description="Waiting on your signature"
      bodyClassName="p-0"
      footer={total > 0 && <ViewAll href="/pay/payroll" label="Open payroll" />}
    >
      {total === 0 ? (
        <WidgetEmpty>
          Nothing waiting on you. Runs and pay changes that need your sign-off
          appear here.
        </WidgetEmpty>
      ) : (
        <ul className="divide-y">
          {runs.map((run) => {
            const group = store.payGroups.find((g) => g.id === run.payGroupId)
            return (
              <li key={run.id}>
                <Link
                  href={`/pay/payroll/runs/${run.id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success-muted text-primary">
                    <Wallet className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {group?.name} payroll
                      <Pill tone="warning">Run awaiting approval</Pill>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Pays {formatDate(run.payDate)} · prepared by{" "}
                      {fullName(store.employeeById(run.preparedBy))}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            )
          })}

          {changes.map((request) => (
            <li key={request.id}>
              <Link
                href="/pay/compensation?tab=changes"
                className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-info-muted text-info">
                  <CircleDollarSign className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {request.employeeIds.length === 1
                      ? fullName(store.employeeById(request.employeeIds[0]))
                      : `${request.employeeIds.length} people`}
                    <Pill tone="info">Pay change awaiting approval</Pill>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    From {formatDate(request.effectiveFrom)} · {request.reason}
                  </span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  )
}
