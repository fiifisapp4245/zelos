"use client"

import * as React from "react"
import Link from "next/link"

import { Initials } from "@/components/common"
import { Widget, WidgetEmpty } from "./widget"
import { useStore } from "@/lib/store"
import { teamOf } from "@/lib/home/home-data"
import { TODAY_ISO, fullName } from "@/lib/format"
import type { Employee } from "@/lib/types"
import { cn } from "@/lib/utils"

type Bucket = "in" | "out" | "late" | "notClocked"

const LABEL: Record<Bucket, string> = {
  in: "In",
  out: "Out",
  late: "Late",
  notClocked: "Not clocked in",
}

/** Attendance for the people who report to you. Source: Chronos (mock). */
export function TeamToday() {
  const store = useStore()
  const team = teamOf(store.employees, store.session.id)
  const [filter, setFilter] = React.useState<Bucket | null>(null)

  const today = store.attendance.filter((a) => a.date === TODAY_ISO)
  const statusOf = (e: Employee): Bucket => {
    const record = today.find((a) => a.employeeId === e.id)
    if (!record) return "notClocked"
    if (record.status === "on_leave" || record.status === "absent") return "out"
    if (record.status === "late") return "late"
    if (record.clockIn && !record.clockOut) return "in"
    if (record.clockIn && record.clockOut) return "out"
    return "notClocked"
  }

  const buckets = (["in", "out", "late", "notClocked"] as Bucket[]).map(
    (b) => ({
      id: b,
      people: team.filter((e) => statusOf(e) === b),
    })
  )
  const shown = filter
    ? (buckets.find((b) => b.id === filter)?.people ?? [])
    : team

  return (
    <Widget
      title="Team today"
      description="Live from Chronos."
      actions={
        filter && (
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="rounded text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Show everyone
          </button>
        )
      }
    >
      {team.length === 0 ? (
        <WidgetEmpty>Nobody reports to you yet.</WidgetEmpty>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {buckets.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setFilter((f) => (f === b.id ? null : b.id))}
                aria-pressed={filter === b.id}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  filter === b.id
                    ? "border-primary bg-success-muted"
                    : "hover:bg-muted"
                )}
              >
                <span className="tabular block text-xl leading-tight font-semibold">
                  {b.people.length}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {LABEL[b.id]}
                </span>
              </button>
            ))}
          </div>

          <ul className="mt-4 flex flex-wrap gap-1.5">
            {shown.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/employees/${e.id}`}
                  title={`${fullName(e)} — ${LABEL[statusOf(e)]}`}
                  className="block rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Initials person={e} size="sm" />
                  <span className="sr-only">
                    {fullName(e)}, {LABEL[statusOf(e)]}
                  </span>
                </Link>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Nobody in this group.
              </li>
            )}
          </ul>
        </>
      )}
    </Widget>
  )
}
