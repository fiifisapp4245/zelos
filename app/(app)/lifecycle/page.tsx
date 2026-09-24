"use client"

import * as React from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  StatCard,
  Th,
  ViewToggle,
  type ListView,
} from "@/components/common"
import { LifecycleBadge } from "@/components/common/status"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import { visibleEmployees } from "@/lib/selectors"
import { lifecycleTasks } from "@/lib/lifecycle-actions"
import { LifecycleWorklist } from "@/components/employees/lifecycle-worklist"
import {
  LIFECYCLE_LABEL,
  formatDate,
  formatDateTime,
  fullName,
} from "@/lib/format"
import type { LifecycleEvent, LifecycleState } from "@/lib/types"
import { cn } from "@/lib/utils"

type Tab = "decisions" | "history"

export default function LifecycleEventsPage() {
  const store = useStore()
  const { viewer, employees, lifecycleEvents } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  const [filter, setFilter] = React.useState<LifecycleState | "all">("all")
  const [view, setView] = React.useState<ListView>("table")

  // Decisions the current states have made due, nearest deadline first.
  const tasks = lifecycleTasks(scope, lifecycleEvents, store.leaveRequests)
  const overdue = tasks.filter((t) => t.daysLeft < 0).length

  const allEvents = lifecycleEvents
    .filter((e) => scopeIds.has(e.employeeId))
    .sort((a, b) => b.at.localeCompare(a.at))
  const events = allEvents.filter((e) => filter === "all" || e.to === filter)

  // Work waiting on someone opens first; history is the thing you go looking
  // for, so it never gets to push the worklist off the bottom of the page.
  const [tab, setTab] = React.useState<Tab>(
    tasks.length > 0 ? "decisions" : "history"
  )

  const counts = (Object.keys(LIFECYCLE_LABEL) as LifecycleState[]).map(
    (s) => ({
      state: s,
      count: scope.filter((e) => e.lifecycleState === s).length,
    })
  )

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "decisions", label: "Needs a decision", count: tasks.length },
    { id: "history", label: "History", count: allEvents.length },
  ]

  return (
    <PageShell
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Employee", href: "/employees" },
        { label: "Lifecycle events" },
      ]}
    >
      <PageHeader
        title="Lifecycle events"
        description="Every movement through the employee journey, from pre-hire to retirement. Decisions that have fallen due come first; the history behind them can never be edited or deleted."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pre-hire"
          value={counts.find((c) => c.state === "pre_hire")?.count ?? 0}
          hint="Records created, not yet started"
        />
        <StatCard
          label="Active & probation"
          value={
            (counts.find((c) => c.state === "active")?.count ?? 0) +
            (counts.find((c) => c.state === "probation")?.count ?? 0)
          }
          hint="Working now"
        />
        <StatCard
          label="Suspended or on notice"
          value={
            (counts.find((c) => c.state === "suspended")?.count ?? 0) +
            (counts.find((c) => c.state === "notice")?.count ?? 0)
          }
          hint="Needs attention"
        />
        <StatCard
          label="Awaiting a decision"
          value={tasks.length}
          hint={overdue > 0 ? `${overdue} already overdue` : "Nothing overdue"}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="gap-0"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs
            tabs={TABS.map((t) => ({
              value: t.id,
              label: t.label,
              count: t.count,
            }))}
          />

          <ViewToggle view={view} onChange={setView} />
        </div>

        <TabsContent value={tab} className="mt-0">
          {tab === "decisions" ? (
            <section className="rounded-xl border bg-card">
              <header className="border-b px-5 py-4">
                <h2 className="text-sm font-semibold">Needs a decision</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Lifecycle states carry obligations. These have fallen due
                  within the next 30 days — acting here writes the same audited
                  event as a manual status change.
                  {overdue > 0 && (
                    <strong className="ml-1 font-medium text-destructive">
                      {overdue} {overdue === 1 ? "is" : "are"} already overdue.
                    </strong>
                  )}
                </p>
              </header>
              <LifecycleWorklist tasks={tasks} view={view} />
            </section>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <FilterChip
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                >
                  All events
                </FilterChip>
                {(Object.keys(LIFECYCLE_LABEL) as LifecycleState[]).map((s) => (
                  <FilterChip
                    key={s}
                    active={filter === s}
                    onClick={() => setFilter(s)}
                  >
                    {LIFECYCLE_LABEL[s]}
                  </FilterChip>
                ))}
              </div>

              <section className="rounded-xl border bg-card">
                {events.length === 0 ? (
                  <EmptyState
                    icon={RefreshCw}
                    title="No events match this filter"
                    description="Try another state, or clear the filter to see the whole history."
                  />
                ) : view === "table" ? (
                  <HistoryTable events={events} />
                ) : (
                  <HistoryCards events={events} />
                )}
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}

function HistoryCards({ events }: { events: LifecycleEvent[] }) {
  const store = useStore()
  return (
    <ul className="divide-y">
      {events.map((e) => {
        const employee = store.employeeById(e.employeeId)
        return (
          <li key={e.id} className="flex gap-3.5 px-5 py-4">
            {employee && <Initials person={employee} size="md" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/employees/${e.employeeId}`}
                  className="text-sm font-medium hover:underline"
                >
                  {fullName(employee)}
                </Link>
                {e.from && (
                  <>
                    <LifecycleBadge state={e.from} />
                    <span className="text-muted-foreground/50">›</span>
                  </>
                )}
                <LifecycleBadge state={e.to} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                by {fullName(store.employeeById(e.actorId))} ·{" "}
                {formatDateTime(e.at)} · effective {formatDate(e.effectiveDate)}
              </p>
              {e.reason && <p className="mt-1.5 text-sm">{e.reason}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function HistoryTable({ events }: { events: LifecycleEvent[] }) {
  const store = useStore()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <Th className="pl-5">Employee</Th>
            <Th>Change</Th>
            <Th>Recorded by</Th>
            <Th>Effective</Th>
            <Th className="pr-5">Reason</Th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {events.map((e) => {
            const employee = store.employeeById(e.employeeId)
            return (
              <tr key={e.id} className="transition-colors hover:bg-muted/30">
                <td className="py-3 pr-3 pl-5">
                  <Link
                    href={`/employees/${e.employeeId}`}
                    className="flex min-w-0 items-center gap-2.5 hover:underline"
                  >
                    {employee && <Initials person={employee} size="sm" />}
                    <span className="truncate font-medium">
                      {fullName(employee)}
                    </span>
                  </Link>
                </td>
                <td className="py-3 pr-3">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {e.from && (
                      <>
                        <LifecycleBadge state={e.from} />
                        <span className="text-muted-foreground/50">›</span>
                      </>
                    )}
                    <LifecycleBadge state={e.to} />
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <span className="block whitespace-nowrap">
                    {fullName(store.employeeById(e.actorId))}
                  </span>
                  <span className="block text-xs whitespace-nowrap text-muted-foreground">
                    {formatDateTime(e.at)}
                  </span>
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  {formatDate(e.effectiveDate)}
                </td>
                <td className="max-w-[320px] py-3 pr-5 text-muted-foreground">
                  {e.reason || "—"}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary bg-success-muted font-medium text-primary"
          : "text-muted-foreground hover:border-ring/50 hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}
