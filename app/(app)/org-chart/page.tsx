"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Network, Users } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
} from "@/components/common"
import { LifecycleBadge } from "@/components/common/status"
import { useStore } from "@/lib/store"
import { visibleEmployees } from "@/lib/selectors"
import { fullName } from "@/lib/format"
import type { Employee } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function OrgChartPage() {
  const store = useStore()
  const { viewer, employees } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  const [showDotted, setShowDotted] = React.useState(true)

  // Roots are people whose manager sits outside what this viewer can see.
  const roots = scope.filter((e) => !e.managerId || !scopeIds.has(e.managerId))

  const dottedLinks = scope
    .filter((e) => e.dottedLineManagerId && scopeIds.has(e.dottedLineManagerId))
    .map((e) => ({
      report: e,
      manager: store.employeeById(e.dottedLineManagerId)!,
    }))

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Employee", href: "/employees" },
        { label: "Org chart" },
      ]}
    >
      <PageHeader
        title="Org chart"
        description="Primary reporting lines, with matrix (dotted) lines shown alongside. Reflects only the people your role can see."
        actions={
          <button
            type="button"
            onClick={() => setShowDotted((v) => !v)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm transition-colors",
              showDotted
                ? "border-primary bg-success-muted text-primary"
                : "hover:bg-muted"
            )}
          >
            {showDotted ? "Hide" : "Show"} dotted lines
          </button>
        }
      />

      {roots.length === 0 ? (
        <Panel>
          <EmptyState icon={Network} title="Nothing to chart in your scope" />
        </Panel>
      ) : (
        <Panel bodyClassName="p-5 overflow-x-auto">
          <ul className="min-w-[640px] space-y-1">
            {roots.map((r) => (
              <OrgNode
                key={r.id}
                employee={r}
                all={scope}
                depth={0}
                showDotted={showDotted}
              />
            ))}
          </ul>
        </Panel>
      )}

      {showDotted && dottedLinks.length > 0 && (
        <Panel
          title="Matrix reporting"
          description="A dotted-line manager can approve leave and sees operational data, but never compensation."
          className="mt-5"
          bodyClassName="p-0"
        >
          <ul className="divide-y">
            {dottedLinks.map(({ report, manager }) => (
              <li
                key={report.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <Link
                  href={`/employees/${report.id}`}
                  className="flex min-w-0 items-center gap-2.5 hover:underline"
                >
                  <Initials person={report} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {fullName(report)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {report.jobTitle}
                    </span>
                  </span>
                </Link>
                <span className="text-xs text-muted-foreground">
                  also reports to
                </span>
                <Link
                  href={`/employees/${manager.id}`}
                  className="flex min-w-0 items-center gap-2.5 hover:underline"
                >
                  <Initials person={manager} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {fullName(manager)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {manager.jobTitle}
                    </span>
                  </span>
                </Link>
                <Pill tone="neutral" className="ml-auto">
                  Dotted line
                </Pill>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </PageShell>
  )
}

function OrgNode({
  employee,
  all,
  depth,
  showDotted,
}: {
  employee: Employee
  all: Employee[]
  depth: number
  showDotted: boolean
}) {
  const store = useStore()
  const reports = all.filter((e) => e.managerId === employee.id)
  const [open, setOpen] = React.useState(depth < 2)
  const dotted = store.employeeById(employee.dottedLineManagerId)

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg py-1 transition-colors hover:bg-muted/50"
        style={{ paddingLeft: depth * 28 }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={reports.length === 0}
          aria-label={open ? "Collapse" : "Expand"}
          className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground disabled:opacity-0"
        >
          <ChevronRight
            className={cn("size-4 transition-transform", open && "rotate-90")}
          />
        </button>

        <Link
          href={`/employees/${employee.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 py-1.5"
        >
          <Initials person={employee} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {fullName(employee)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {employee.jobTitle} · {employee.department}
            </span>
          </span>
        </Link>

        {showDotted && dotted && (
          <Pill tone="neutral" className="text-[10px]">
            ⋯ {fullName(dotted)}
          </Pill>
        )}
        {reports.length > 0 && (
          <span className="tabular flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {reports.length}
          </span>
        )}
        <LifecycleBadge state={employee.lifecycleState} />
      </div>

      {open && reports.length > 0 && (
        <ul className="space-y-1">
          {reports.map((r) => (
            <OrgNode
              key={r.id}
              employee={r}
              all={all}
              depth={depth + 1}
              showDotted={showDotted}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
