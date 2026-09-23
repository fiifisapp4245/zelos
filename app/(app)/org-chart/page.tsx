"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  Minus,
  Network,
  Plus,
  Sparkles,
} from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, Initials } from "@/components/common"
import { CanvasSurface, useCanvas } from "@/components/common/canvas"
import { CanvasControls } from "@/components/common/canvas-controls"
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

  // On a canvas the whole tree can be open — zoom to fit handles the width,
  // which is exactly why collapsing everything by default is no longer needed.
  const [collapsed, setCollapsed] = React.useState<string[]>([])
  const [showDotted, setShowDotted] = React.useState(true)
  const [matrixOpen, setMatrixOpen] = React.useState(false)

  const canvas = useCanvas({ initialFitFloor: 0.6 })

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

  const withReports = new Set(
    scope
      .filter((e) => scope.some((r) => r.managerId === e.id))
      .map((e) => e.id)
  )
  const allCollapsed = collapsed.length >= withReports.size

  return (
    <PageShell
      width="canvas"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Employee", href: "/employees" },
        { label: "Org chart" },
      ]}
    >
      {roots.length === 0 ? (
        <div className="grid h-full place-items-center">
          <EmptyState icon={Network} title="Nothing to chart in your scope" />
        </div>
      ) : (
        <CanvasSurface controller={canvas}>
          <div className="flex min-w-max justify-center gap-10 p-16">
            {roots.map((r) => (
              <OrgNode
                key={r.id}
                employee={r}
                all={scope}
                headIds={headIds}
                collapsed={collapsed}
                onToggle={toggle}
                showDotted={showDotted}
                didPan={canvas.didPan}
              />
            ))}
          </div>
        </CanvasSurface>
      )}

      {/* Floating chrome. Everything sits over the canvas rather than
          stealing height from it. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border bg-card/95 p-2 pr-4 shadow-sm backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="Back to structure"
          >
            <Link href="/structure">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm leading-tight font-semibold">
              Organisation structure
            </h1>
            <p className="text-xs text-muted-foreground">
              {scope.length} people · {roots.length}{" "}
              {roots.length === 1 ? "root" : "roots"}
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed(allCollapsed ? [] : [...withReports])}
            className="rounded-lg border bg-card px-3 py-2 text-sm shadow-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
          <button
            type="button"
            onClick={() => setShowDotted((v) => !v)}
            aria-pressed={showDotted}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              showDotted
                ? "border-primary bg-success-muted text-primary"
                : "bg-card hover:bg-muted"
            )}
          >
            {showDotted ? "Hide" : "Show"} dotted lines
          </button>
          {has(viewer, "hr_admin") && (
            <Button size="lg" className="shadow-sm" asChild>
              <Link href="/structure">
                <Plus className="size-4" />
                Add department
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 flex flex-col items-start gap-3 p-4">
        {showDotted && dottedLinks.length > 0 && (
          <MatrixPanel
            links={dottedLinks}
            open={matrixOpen}
            onOpenChange={setMatrixOpen}
          />
        )}

        <CanvasControls
          controller={canvas}
          className="pointer-events-auto backdrop-blur"
        />
      </div>
    </PageShell>
  )
}

/**
 * Matrix reporting used to sit below the chart. On a canvas there is no
 * below, so it docks to the corner and stays out of the way until asked for.
 */
function MatrixPanel({
  links,
  open,
  onOpenChange,
}: {
  links: { report: Employee; manager: Employee }[]
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <section className="pointer-events-auto w-[320px] overflow-hidden rounded-xl border bg-card/95 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Sparkles className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Matrix reporting</span>
          <span className="block text-xs text-muted-foreground">
            {links.length} dotted {links.length === 1 ? "line" : "lines"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            A dotted-line manager can approve leave and see operational data,
            but never compensation.
          </p>
          <ul className="max-h-[260px] divide-y overflow-y-auto border-t">
            {links.map(({ report, manager }) => (
              <li key={report.id} className="px-4 py-3">
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
                <p className="mt-1.5 truncate pl-[34px] text-xs text-muted-foreground">
                  also reports to{" "}
                  <Link
                    href={`/employees/${manager.id}`}
                    className="text-foreground hover:underline"
                  >
                    {fullName(manager)}
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function OrgNode({
  employee,
  all,
  headIds,
  collapsed,
  onToggle,
  showDotted,
  didPan,
}: {
  employee: Employee
  all: Employee[]
  headIds: Set<string | null>
  collapsed: string[]
  onToggle: (id: string) => void
  showDotted: boolean
  didPan: React.RefObject<boolean>
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
        didPan={didPan}
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
            className="grid size-6 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                    didPan={didPan}
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
  didPan,
}: {
  employee: Employee
  isHead: boolean
  all: Employee[]
  showDotted: boolean
  didPan: React.RefObject<boolean>
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
      // A drag that happens to start on a card is a pan, not a click through.
      onClick={(e) => {
        if (didPan.current) e.preventDefault()
      }}
      draggable={false}
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
