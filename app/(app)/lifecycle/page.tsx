"use client"

import * as React from "react"
import Link from "next/link"
import { ListChecks, RefreshCw } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/common"
import { LifecycleBadge } from "@/components/common/status"
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
import type { LifecycleState } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function LifecycleEventsPage() {
  const store = useStore()
  const { viewer, employees, lifecycleEvents } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  const [filter, setFilter] = React.useState<LifecycleState | "all">("all")

  // Decisions the current states have made due, newest deadline first.
  const tasks = lifecycleTasks(scope, lifecycleEvents, store.leaveRequests)
  const overdue = tasks.filter((t) => t.daysLeft < 0).length

  const events = lifecycleEvents
    .filter((e) => scopeIds.has(e.employeeId))
    .filter((e) => filter === "all" || e.to === filter)
    .sort((a, b) => b.at.localeCompare(a.at))

  const counts = (Object.keys(LIFECYCLE_LABEL) as LifecycleState[]).map(
    (s) => ({
      state: s,
      count: scope.filter((e) => e.lifecycleState === s).length,
    })
  )

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
        description="Every movement through the employee journey, from pre-hire to retirement. Decisions that have fallen due sit at the top; the history below can never be edited or deleted."
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

      <Panel
        title="Needs a decision"
        description="Lifecycle states carry obligations. These are the ones that have fallen due in the next 30 days — acting here writes the same audited event as a manual status change."
        className="mb-6"
        bodyClassName="p-0"
        actions={
          tasks.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ListChecks className="size-3.5" />
              {tasks.length} open
            </span>
          )
        }
      >
        <LifecycleWorklist tasks={tasks} />
      </Panel>

      <h2 className="mb-3 text-sm font-semibold">History</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
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

      <Panel bodyClassName="p-0">
        {events.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="No events match this filter"
            description="Try another state, or clear the filter to see the whole history."
          />
        ) : (
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
                      {formatDateTime(e.at)} · effective{" "}
                      {formatDate(e.effectiveDate)}
                    </p>
                    {e.reason && <p className="mt-1.5 text-sm">{e.reason}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </PageShell>
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
