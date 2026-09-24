"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarPlus, Sun } from "lucide-react"

import { EmptyState, Panel, Pill, StatCard } from "@/components/common"
import { Button } from "@/components/ui/button"
import { ReconciliationPanel } from "./reconciliation-panel"
import { LeaveDetailSheet } from "./leave-detail-sheet"
import { useAttendance } from "@/components/attendance/use-attendance"
import { reconcileItems } from "@/lib/leave/reconcile"
import { useStore } from "@/lib/store"
import { addDays, datesBetween, startOfWeek } from "@/lib/time"
import {
  LEAVE_TYPE_LABEL,
  TODAY_ISO,
  formatDate,
  relativeTime,
} from "@/lib/format"
import type { Employee, LeaveRequest } from "@/lib/types"

/**
 * An employee's own leave, read against their own attendance.
 *
 * Same reconciliation list as the team view, narrowed to them — if the
 * system thinks one of their days is unexplained, they should be the
 * first to know, not the last.
 */
export function MyLeaveSummary({ employee }: { employee: Employee }) {
  const store = useStore()
  const [open, setOpen] = React.useState<LeaveRequest | null>(null)

  const from = startOfWeek(TODAY_ISO)
  const to = addDays(from, 27)
  const { records } = useAttendance({ from, to, employeeId: employee.id })

  const balance = store.leaveBalances.find((b) => b.employeeId === employee.id)
  const mine = store.leaveRequests.filter((l) => l.employeeId === employee.id)
  const upcoming = mine
    .filter((l) => l.endDate >= TODAY_ISO && l.status !== "rejected")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  const items = reconcileItems({
    records,
    leave: mine,
    events: store.clockEvents,
    dates: datesBetween(from, to),
    todayIso: TODAY_ISO,
  })

  return (
    <div className="space-y-6">
      <section aria-label="Your balances">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(balance?.byType ?? []).slice(0, 4).map((t) => {
            const left =
              t.entitlement -
              t.taken -
              t.pending +
              (t.type === "annual" ? (balance?.carriedOver ?? 0) : 0)
            return (
              <StatCard
                key={t.type}
                label={`${LEAVE_TYPE_LABEL[t.type]} leave`}
                value={left}
                hint={`${t.taken} taken · ${t.pending} pending · ${t.entitlement} entitlement`}
              />
            )
          })}
        </div>
      </section>

      <section aria-label="Upcoming leave" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Upcoming leave</h2>
          <Button size="sm" className="h-9" asChild>
            <Link href="/leave">
              <CalendarPlus className="size-4" />
              Request leave
            </Link>
          </Button>
        </div>

        <Panel bodyClassName="p-0">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={Sun}
              title="No leave booked"
              description="Requests you make appear here once they are in."
            />
          ) : (
            <ul className="divide-y">
              {upcoming.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(l)}
                    className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {LEAVE_TYPE_LABEL[l.type]} leave
                        </span>
                        <Pill
                          tone={l.status === "approved" ? "success" : "warning"}
                        >
                          {l.status === "approved" ? "Approved" : "Pending"}
                        </Pill>
                      </span>
                      <span className="tabular mt-0.5 block text-xs text-muted-foreground">
                        {formatDate(l.startDate)} – {formatDate(l.endDate)} ·{" "}
                        {l.days} {l.days === 1 ? "day" : "days"} · submitted{" "}
                        {relativeTime(l.submittedAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section aria-label="Days to explain" className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold">Days to explain</h2>
          <p className="text-sm text-muted-foreground">
            Where your attendance record and your leave don&apos;t line up.
            Sorting one out means filing or amending leave, which happens in the
            Leave module.
          </p>
        </div>
        <ReconciliationPanel items={items} scope={[employee]} />
      </section>

      <LeaveDetailSheet request={open} onClose={() => setOpen(null)} />
    </div>
  )
}
