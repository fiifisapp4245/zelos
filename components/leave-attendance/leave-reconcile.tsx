"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { Panel } from "@/components/common"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WidgetSkeleton } from "@/components/home/skeletons"
import { MyLeaveSummary } from "./my-leave-summary"
import { WhosAway } from "./whos-away"
import { LeaveTimeline, TimelineLegend } from "./leave-timeline"
import { PendingRequests } from "./pending-requests"
import { ReconciliationPanel } from "./reconciliation-panel"
import { BalancesSnapshot } from "./balances-snapshot"
import { LeaveDetailSheet } from "./leave-detail-sheet"
import { useSchedules } from "@/components/schedules/use-schedules"
import { useAttendance } from "@/components/attendance/use-attendance"
import { reconcileItems } from "@/lib/leave/reconcile"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { addDays, datesBetween, startOfWeek } from "@/lib/time"
import { TODAY_ISO, formatDate } from "@/lib/format"
import type { LeaveRequest } from "@/lib/types"

/**
 * One period for the whole tab.
 *
 * Who is away, the timeline, the coverage and the reconciliation list
 * are all readings of the same window, so they take the same control.
 * Two period pickers on one screen only raises the question of which
 * one is in charge.
 */
type PeriodKey = "today" | "week" | "twoWeeks" | "month"

const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: "Today",
  week: "This week",
  twoWeeks: "Next 2 weeks",
  month: "This month",
}

/** How the "who is away" heading reads for each of them. */
const AWAY_LABEL: Record<PeriodKey, string> = {
  today: "Away today",
  week: "Away this week",
  twoWeeks: "Away over the next 2 weeks",
  month: "Away this month",
}

function rangeFor(key: PeriodKey) {
  if (key === "today") return { from: TODAY_ISO, to: TODAY_ISO }
  if (key === "month") {
    const first = `${TODAY_ISO.slice(0, 7)}-01`
    const last = new Date(
      Number(TODAY_ISO.slice(0, 4)),
      Number(TODAY_ISO.slice(5, 7)),
      0
    )
    return { from: first, to: last.toISOString().slice(0, 10) }
  }
  const from = startOfWeek(TODAY_ISO)
  return { from, to: addDays(from, key === "week" ? 6 : 13) }
}

/**
 * Leave, read against attendance.
 *
 * Nothing here decides a request or edits a balance: the Leave module
 * owns those, and every action from this page ends up there. What this
 * page owns is the disagreement between the two records, which is a
 * question neither module can answer alone.
 */
export function LeaveReconcile({ title }: { title?: string }) {
  return (
    <React.Suspense fallback={<WidgetSkeleton rows={4} />}>
      <Reconcile title={title} />
    </React.Suspense>
  )
}

function Reconcile({ title }: { title?: string }) {
  const store = useStore()
  const params = useSearchParams()
  const demo = params.get("demo")
  const { audience, scope, input, policy } = useSchedules()
  // The month, because reconciling is looking back over what happened.
  const [period, setPeriod] = React.useState<PeriodKey>("month")
  const [open, setOpen] = React.useState<LeaveRequest | null>(null)

  const { from, to } = rangeFor(period)
  const dates = datesBetween(from, to)
  const isHr = has(store.viewer, "hr_admin")

  // The register for the same window, so "no record" here means exactly
  // what it means on the register.
  const { records } = useAttendance({ from, to })

  // ?demo=empty starves the page, to see what a quiet month looks like.
  const leave = demo === "empty" ? [] : store.leaveRequests

  const items = reconcileItems({
    records: demo === "empty" ? [] : records,
    leave,
    events: store.clockEvents,
    dates,
    todayIso: TODAY_ISO,
  })

  const monthsToYearEnd = 12 - Number(TODAY_ISO.slice(5, 7))

  // An employee sees their own summary, not a team view of one person.
  const me = store.employeeById(store.session.id)
  if (audience === "employee" && me) return <MyLeaveSummary employee={me} />

  if (demo === "loading") {
    return (
      <div className="space-y-4">
        <WidgetSkeleton rows={3} />
        <WidgetSkeleton rows={5} />
        <WidgetSkeleton rows={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* The period governs everything below it. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="tabular text-sm text-muted-foreground">
          {period === "today"
            ? formatDate(from)
            : `${formatDate(from)} – ${formatDate(to)}`}
        </span>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="h-9 w-[180px]" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {PERIOD_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section aria-label="Who is away">
        <WhosAway
          scope={scope}
          leave={leave}
          from={from}
          to={to}
          label={AWAY_LABEL[period]}
          onOpen={setOpen}
        />
      </section>

      <section aria-label="Team leave timeline" className="space-y-3">
        <h2 className="text-[15px] font-semibold">{title ?? "Team leave"}</h2>

        <Panel bodyClassName="p-0">
          {/* The key comes before the grid it explains. */}
          <div className="border-b">
            <TimelineLegend warnPercent={policy.coverageWarnPercent} />
          </div>
          <LeaveTimeline
            scope={scope}
            dates={dates}
            leave={leave}
            input={input}
            coverWarnPercent={policy.coverageWarnPercent}
            onOpen={setOpen}
          />
        </Panel>
      </section>

      <section aria-label="Pending requests" className="space-y-3">
        <h2 className="text-[15px] font-semibold">Pending requests</h2>
        <PendingRequests scope={scope} leave={leave} />
      </section>

      <section aria-label="Reconciliation" className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold">Reconciliation</h2>
          <p className="text-sm text-muted-foreground">
            Days where the attendance record and the leave record disagree.
            Reconciling records who looked; it never alters either record.
          </p>
        </div>
        <ReconciliationPanel items={items} scope={scope} />
      </section>

      {isHr && (
        <section aria-label="Balances" className="space-y-3">
          <h2 className="text-[15px] font-semibold">Balances</h2>
          <BalancesSnapshot scope={scope} monthsToYearEnd={monthsToYearEnd} />
        </section>
      )}

      <LeaveDetailSheet request={open} onClose={() => setOpen(null)} />
    </div>
  )
}
