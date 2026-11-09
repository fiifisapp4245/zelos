"use client"

import * as React from "react"
import Link from "next/link"
import { Gavel, Lock, Plus, ShieldAlert } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { CaseBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import { CaseSheet } from "@/components/talent/case-sheet"
import { RaiseCaseDialog } from "@/components/talent/case-dialogs"
import { NativeSelect } from "@/components/talent/form"
import { useStore } from "@/lib/store"
import { canViewCase, has } from "@/lib/rbac"
import {
  CASE_STATE_LABEL,
  formatDate,
  fullName,
  relativeTime,
} from "@/lib/format"
import { SEVERITY_LABEL, caseSteps, isClosed } from "@/lib/talent/disciplinary"
import type { CaseState, DisciplinaryCase } from "@/lib/types"

const SEVERITY_TONE = {
  minor: "neutral",
  serious: "warning",
  gross: "danger",
} as const

const STATE_ORDER: DisciplinaryCase["state"][] = [
  "open",
  "investigation",
  "hearing",
  "finalised",
  "dismissed",
]

export default function DisciplinaryPage() {
  const store = useStore()
  const { viewer, cases, employees } = store
  const isHr = has(viewer, "hr_admin")
  const canRaise =
    isHr || has(viewer, "line_manager") || has(viewer, "head_of_department")

  const [openId, setOpenId] = React.useState<string | null>(null)
  const [raising, setRaising] = React.useState(false)
  const [filter, setFilter] = React.useState<CaseState | "all" | "active">(
    "all"
  )

  const visible = cases.filter((c) => {
    const emp = employees.find((e) => e.id === c.employeeId)
    return emp ? canViewCase(viewer, c, emp) : false
  })
  const hidden = cases.length - visible.length

  const open = visible.filter((c) => !isClosed(c))
  const shown = visible.filter((c) =>
    filter === "all"
      ? true
      : filter === "active"
        ? !isClosed(c)
        : c.state === filter
  )

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Compliance" },
        { label: "Disciplinary" },
      ]}
    >
      <PageHeader
        title="Disciplinary"
        description="Every case follows the same due process: the allegation is put in writing, investigated, heard, decided, and open to appeal. Who can read a case depends on its state, not just their role."
        actions={
          canRaise && (
            <Button size="lg" onClick={() => setRaising(true)}>
              <Plus className="size-4" />
              Raise a case
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open cases"
          value={open.length}
          hint="Not yet finalised"
        />
        <StatCard
          label="At hearing"
          value={visible.filter((c) => c.state === "hearing").length}
        />
        <StatCard
          label="Gross misconduct"
          value={visible.filter((c) => c.severity === "gross").length}
        />
        <StatCard label="Closed" value={visible.length - open.length} />
      </div>

      {hidden > 0 && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            <strong className="font-medium text-foreground">
              {hidden} case{hidden === 1 ? "" : "s"} withheld from your role.
            </strong>{" "}
            Cases under investigation are readable only by HR and whoever raised
            them. Finalised outcomes become visible to the employee and their
            line manager.
          </p>
        </div>
      )}

      {visible.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Gavel}
            title="No cases you can see"
            description="Either there are none, or the ones that exist are still at a stage your role cannot read."
          />
        </Panel>
      ) : (
        <Panel
          title="Cases"
          bodyClassName="p-0"
          actions={
            <NativeSelect
              aria-label="Filter by state"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="h-9 w-auto"
            >
              <option value="all">All cases</option>
              <option value="active">Open only</option>
              {STATE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {CASE_STATE_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          }
        >
          {shown.length === 0 ? (
            <EmptyState icon={Gavel} title="No cases in this state" />
          ) : (
            <ul className="divide-y">
              {shown.map((c) => {
                const emp = store.employeeById(c.employeeId)
                const raiser = store.employeeById(c.raisedBy)
                const nextStep = caseSteps(c).find(
                  (s) => s.stage === c.state && !s.done
                )
                const mine = c.raisedBy === viewer.employeeId
                return (
                  <li key={c.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start gap-3">
                      {emp && <Initials person={emp} size="md" />}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenId(c.id)}
                            className="text-left font-medium hover:underline"
                          >
                            {c.title}
                          </button>
                          <CaseBadge state={c.state} />
                          <Pill tone={SEVERITY_TONE[c.severity]}>
                            {c.severity === "gross" && (
                              <ShieldAlert className="size-3" />
                            )}
                            {SEVERITY_LABEL[c.severity]}
                          </Pill>
                          {mine && <Pill tone="info">You raised this</Pill>}
                          {c.appeal?.decision === "pending" && (
                            <Pill tone="warning">Appeal pending</Pill>
                          )}
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {c.id}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {emp && (
                            <Link
                              href={`/employees/${emp.id}`}
                              className="text-foreground hover:underline"
                            >
                              {fullName(emp)}
                            </Link>
                          )}{" "}
                          · raised by {fullName(raiser)}{" "}
                          {relativeTime(c.raisedOn)} ({formatDate(c.raisedOn)})
                        </p>
                        {isHr && nextStep && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Next: {nextStep.label.toLowerCase()}
                          </p>
                        )}
                        {c.outcome && (
                          <p className="mt-2 rounded-lg border-l-2 border-border bg-muted/50 px-3 py-2 text-sm">
                            <span className="text-muted-foreground">
                              Outcome:
                            </span>{" "}
                            {c.outcome}
                            {c.closedOn && (
                              <span className="text-muted-foreground">
                                {" "}
                                · closed {formatDate(c.closedOn)}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isHr ? "outline" : "ghost"}
                        onClick={() => setOpenId(c.id)}
                      >
                        {isHr ? "Open case file" : "View case"}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}

      <CaseSheet caseId={openId} onClose={() => setOpenId(null)} />
      {raising && <RaiseCaseDialog onClose={() => setRaising(false)} />}
    </PageShell>
  )
}
