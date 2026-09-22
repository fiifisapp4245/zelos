"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Minus, Network, Plus } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { isOnStrength, visibleEmployees } from "@/lib/selectors"
import { fullName } from "@/lib/format"
import type { Employee } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Department accent, so a head's card reads as owning that area. */
const DEPT_TONE: Record<string, { pill: string; bar: string }> = {
  Engineering: { pill: "bg-info-muted text-info", bar: "bg-info" },
  Product: { pill: "bg-success-muted text-primary", bar: "bg-primary" },
  Finance: { pill: "bg-success-muted text-primary", bar: "bg-primary" },
  Marketing: {
    pill: "bg-warning-muted text-warning-foreground",
    bar: "bg-warning",
  },
  Operations: {
    pill: "bg-danger-muted text-destructive",
    bar: "bg-destructive",
  },
  People: { pill: "bg-info-muted text-info", bar: "bg-info" },
  Executive: {
    pill: "bg-neutral-muted text-muted-foreground",
    bar: "bg-muted-foreground",
  },
}

function toneFor(department: string) {
  return (
    DEPT_TONE[department] ?? {
      pill: "bg-neutral-muted text-muted-foreground",
      bar: "bg-muted-foreground",
    }
  )
}

export default function OrgChartPage() {
  const store = useStore()
  const { viewer, employees, departments } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  // Anyone below the first level starts collapsed, or a 25-person tree opens
  // several thousand pixels wide and the root scrolls out of view.
  const [collapsed, setCollapsed] = React.useState<string[]>(() => {
    const depth = new Map<string, number>()
    const walk = (id: string, d: number) => {
      depth.set(id, d)
      employees
        .filter((e) => e.managerId === id)
        .forEach((c) => walk(c.id, d + 1))
    }
    employees.filter((e) => !e.managerId).forEach((r) => walk(r.id, 0))
    return employees.filter((e) => (depth.get(e.id) ?? 0) >= 1).map((e) => e.id)
  })
  const [showDotted, setShowDotted] = React.useState(true)

  // Roots are people whose manager sits outside what this viewer can see.
  const roots = scope.filter((e) => !e.managerId || !scopeIds.has(e.managerId))
  const headIds = new Set(
    departments.filter((d) => !d.archived).map((d) => d.headId)
  )

  const dottedLinks = scope
    .filter((e) => e.dottedLineManagerId && scopeIds.has(e.dottedLineManagerId))
    .map((e) => ({
      report: e,
      manager: store.employeeById(e.dottedLineManagerId)!,
    }))

  function toggle(id: string) {
    setCollapsed((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id]
    )
  }

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Employee", href: "/employees" },
        { label: "Org chart" },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <Button
          variant="outline"
          size="icon-lg"
          asChild
          aria-label="Back to structure"
        >
          <Link href="/structure">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
            Organisation structure
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Primary reporting lines. Department heads show their headcount
            against establishment.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDotted((v) => !v)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm transition-colors",
              showDotted
                ? "border-primary bg-success-muted text-primary"
                : "bg-card hover:bg-muted"
            )}
          >
            {showDotted ? "Hide" : "Show"} dotted lines
          </button>
          {has(viewer, "hr_admin") && (
            <Button size="lg" asChild>
              <Link href="/structure">
                <Plus className="size-4" />
                Add department
              </Link>
            </Button>
          )}
        </div>
      </div>

      {roots.length === 0 ? (
        <Panel>
          <EmptyState icon={Network} title="Nothing to chart in your scope" />
        </Panel>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-chart-canvas p-8">
          <div className="flex min-w-max justify-center gap-10">
            {roots.map((r) => (
              <OrgNode
                key={r.id}
                employee={r}
                all={scope}
                headIds={headIds}
                collapsed={collapsed}
                onToggle={toggle}
                showDotted={showDotted}
              />
            ))}
          </div>
        </div>
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
  headIds,
  collapsed,
  onToggle,
  showDotted,
}: {
  employee: Employee
  all: Employee[]
  headIds: Set<string | null>
  collapsed: string[]
  onToggle: (id: string) => void
  showDotted: boolean
}) {
  const reports = all.filter((e) => e.managerId === employee.id)
  const isOpen = !collapsed.includes(employee.id)
  const hasReports = reports.length > 0

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        employee={employee}
        isHead={headIds.has(employee.id)}
        all={all}
        showDotted={showDotted}
      />

      {hasReports && (
        <>
          {/* Drop from the card, with the collapse control sitting on the line. */}
          <span className="h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => onToggle(employee.id)}
            aria-label={`${isOpen ? "Collapse" : "Expand"} ${fullName(employee)}'s reports`}
            aria-expanded={isOpen}
            className="grid size-6 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isOpen ? (
              <Minus className="size-3" />
            ) : (
              <Plus className="size-3" />
            )}
            <span className="sr-only">{reports.length} reports</span>
          </button>

          {isOpen && <span className="h-5 w-px bg-border" />}

          {isOpen && (
            <div className="flex items-start">
              {reports.map((r, i) => (
                <div key={r.id} className="relative px-4 pt-5">
                  {/* Rail segment: clipped at the first and last child so the
                      line spans only between them. */}
                  {reports.length > 1 && (
                    <span
                      className={cn(
                        "absolute top-0 h-px bg-border",
                        i === 0
                          ? "right-0 left-1/2"
                          : i === reports.length - 1
                            ? "right-1/2 left-0"
                            : "right-0 left-0"
                      )}
                    />
                  )}
                  <span className="absolute top-0 left-1/2 h-5 w-px bg-border" />
                  <OrgNode
                    employee={r}
                    all={all}
                    headIds={headIds}
                    collapsed={collapsed}
                    onToggle={onToggle}
                    showDotted={showDotted}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function NodeCard({
  employee,
  isHead,
  all,
  showDotted,
}: {
  employee: Employee
  isHead: boolean
  all: Employee[]
  showDotted: boolean
}) {
  const store = useStore()
  const tone = toneFor(employee.department)
  const dotted = store.employeeById(employee.dottedLineManagerId)

  // Establishment is the department's headcount plus its open requisitions.
  const inDept = all.filter(
    (e) => e.department === employee.department && isOnStrength(e)
  ).length
  const openings = store.requisitions
    .filter((r) => r.department === employee.department && r.status === "open")
    .reduce((n, r) => n + r.openings, 0)
  const establishment = inDept + openings

  return (
    <Link
      href={`/employees/${employee.id}`}
      className={cn(
        "block w-[230px] rounded-xl border bg-card p-3 transition-colors hover:border-ring/50",
        isHead && "w-[250px]"
      )}
    >
      <div className="flex items-center gap-3">
        <Initials person={employee} size="lg" className="rounded-lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{fullName(employee)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {employee.jobTitle}
          </p>
        </div>
      </div>

      {isHead && (
        <>
          <span
            className={cn(
              "mt-3 inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
              tone.pill
            )}
          >
            {employee.department}
          </span>

          <div className="mt-3 border-t pt-2.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Headcount</span>
              <span className="tabular font-semibold">
                {inDept}/{establishment}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", tone.bar)}
                style={{
                  width: `${establishment ? (inDept / establishment) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </>
      )}

      {showDotted && dotted && (
        <p className="mt-2 truncate text-[11px] text-muted-foreground">
          ⋯ also reports to {fullName(dotted)}
        </p>
      )}
    </Link>
  )
}
