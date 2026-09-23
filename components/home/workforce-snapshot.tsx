"use client"

import Link from "next/link"

import { Widget } from "./widget"
import { useStore } from "@/lib/store"
import { isOnStrength } from "@/lib/selectors"
import { TODAY_ISO } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * The one metric widget on the page, and deliberately one row of numbers.
 * Anything that wants a chart belongs in Reports.
 */
export function WorkforceSnapshot() {
  const { employees } = useStore()
  const month = TODAY_ISO.slice(0, 7)

  const headcount = employees.filter(isOnStrength).length
  const joiners = employees.filter((e) => e.startDate.startsWith(month)).length
  const leavers = employees.filter(
    (e) =>
      ["resigned", "terminated", "retired"].includes(e.lifecycleState) &&
      (e.contractEndDate ?? "").startsWith(month)
  ).length
  const change = joiners - leavers

  return (
    <Widget
      title="Workforce"
      actions={
        <Link
          href="/reports"
          className="rounded text-sm font-medium text-primary transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View reports
        </Link>
      }
    >
      <dl className="grid grid-cols-3 gap-4">
        <Figure label="Headcount" value={headcount}>
          <span
            className={cn(
              "text-xs",
              change > 0
                ? "text-primary"
                : change < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}
          >
            {change > 0 ? "+" : ""}
            {change} this month
          </span>
        </Figure>
        <Figure label="Joiners" value={joiners}>
          <span className="text-xs text-muted-foreground">This month</span>
        </Figure>
        <Figure label="Leavers" value={leavers}>
          <span className="text-xs text-muted-foreground">This month</span>
        </Figure>
      </dl>
    </Widget>
  )
}

function Figure({
  label,
  value,
  children,
}: {
  label: string
  value: number
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd>
        <span className="tabular block text-2xl leading-tight font-semibold">
          {value}
        </span>
        {children}
      </dd>
    </div>
  )
}
