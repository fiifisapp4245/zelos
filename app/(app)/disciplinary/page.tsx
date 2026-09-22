"use client"

import * as React from "react"
import Link from "next/link"
import { Gavel, Lock, Plus, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

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
import { useStore } from "@/lib/store"
import { canViewCase, has } from "@/lib/rbac"
import {
  CASE_STATE_LABEL,
  formatDate,
  fullName,
  relativeTime,
} from "@/lib/format"
import type { DisciplinaryCase } from "@/lib/types"

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

  const visible = cases.filter((c) => {
    const emp = employees.find((e) => e.id === c.employeeId)
    return emp ? canViewCase(viewer, c, emp) : false
  })
  const hidden = cases.length - visible.length

  const open = visible.filter(
    (c) => !["finalised", "dismissed"].includes(c.state)
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
        description="Who can read a case depends on its state, not just their role. Open cases stay narrow; finalised outcomes widen to the people they affect."
        actions={
          <Button
            size="lg"
            onClick={() =>
              toast("Opens a new case with a due-process checklist.")
            }
          >
            <Plus className="size-4" />
            Raise a case
          </Button>
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
        <StatCard
          label="Closed"
          value={
            visible.filter((c) => ["finalised", "dismissed"].includes(c.state))
              .length
          }
        />
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
        <Panel bodyClassName="p-0">
          <ul className="divide-y">
            {visible.map((c) => {
              const emp = store.employeeById(c.employeeId)
              const raiser = store.employeeById(c.raisedBy)
              return (
                <li key={c.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-3">
                    {emp && <Initials person={emp} size="md" />}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.title}</span>
                        <CaseBadge state={c.state} />
                        <Pill tone={SEVERITY_TONE[c.severity]}>
                          {c.severity === "gross" && (
                            <ShieldAlert className="size-3" />
                          )}
                          {c.severity} misconduct
                        </Pill>
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
                    {has(viewer, "hr_admin") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toast("Opens the case file and due-process timeline.")
                        }
                      >
                        Open case
                      </Button>
                    )}
                  </div>

                  <CaseProgress state={c.state} />
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </PageShell>
  )
}

function CaseProgress({ state }: { state: DisciplinaryCase["state"] }) {
  if (state === "dismissed") {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Dismissed — no further action, and the record reflects that.
      </p>
    )
  }
  const stages = STATE_ORDER.filter((s) => s !== "dismissed")
  const current = stages.indexOf(state)

  return (
    <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
      {stages.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground/40">›</span>}
          <span
            className={
              i < current
                ? "text-muted-foreground line-through"
                : i === current
                  ? "rounded-full bg-success-muted px-2 py-0.5 font-medium text-primary"
                  : "text-muted-foreground/60"
            }
          >
            {CASE_STATE_LABEL[s]}
          </span>
        </li>
      ))}
    </ol>
  )
}
