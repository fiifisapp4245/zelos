"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ListChecks,
  LogOut,
  PartyPopper,
  Plus,
  Undo2,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  Restricted,
  StatCard,
} from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
import { StartExitDialog } from "@/components/talent/offboarding-dialogs"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { approachingRetirement, visibleEmployees } from "@/lib/selectors"
import {
  OFFBOARD_REASON_LABEL,
  RETIREMENT_AGE,
  TODAY_ISO,
  daysUntil,
  formatDate,
  fullName,
  ghs,
  relativeTime,
} from "@/lib/format"
import { exitProgress, exitSteps } from "@/lib/talent/offboarding"
import type { OffboardingCase, OffboardingReason } from "@/lib/types"
import { cn } from "@/lib/utils"

type Dialog =
  | {
      kind: "start"
      employeeId?: string
      reason?: OffboardingReason
      last?: string
    }
  | {
      kind: "interview" | "handover" | "settlement" | "close"
      c: OffboardingCase
    }
  | null

export default function OffboardingPage() {
  const store = useStore()
  const { viewer, employees, offboarding } = store
  const isHr = has(viewer, "hr_admin")
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))
  const [dialog, setDialog] = React.useState<Dialog>(null)

  const cases = offboarding.filter((c) => scopeIds.has(c.employeeId))
  const active = cases.filter((c) => c.state !== "closed")
  const closed = cases.filter((c) => c.state === "closed")
  const withCase = new Set(active.map((c) => c.employeeId))

  // On notice in the directory, but nobody has opened the paperwork.
  const noCase = scope.filter(
    (e) => e.lifecycleState === "notice" && !withCase.has(e.id)
  )
  const retiring = approachingRetirement(scope, 400).filter(
    (r) => !withCase.has(r.employee.id)
  )

  const outstanding = active.reduce(
    (sum, c) => sum + exitSteps(c).filter((s) => !s.done).length,
    0
  )
  const closingSoon = active.filter((c) => {
    const d = daysUntil(c.lastWorkingDay)
    return d !== null && d >= 0 && d <= 14
  }).length

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Talent" },
        { label: "Offboarding" },
      ]}
    >
      <PageHeader
        title="Offboarding"
        description="Separation and retirement. Every clearance item has to be done before the record moves to an end state and payroll stops."
        actions={
          isHr && (
            <Button size="lg" onClick={() => setDialog({ kind: "start" })}>
              <Plus className="size-4" />
              Start offboarding
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active cases"
          value={active.length}
          hint="Serving notice or clearing"
        />
        <StatCard
          label="Clearance items open"
          value={outstanding}
          hint={
            closingSoon > 0
              ? `${closingSoon} leave within 14 days`
              : "Across active cases"
          }
        />
        <StatCard
          label="Approaching retirement"
          value={
            retiring.length +
            active.filter((c) => c.reason === "retirement").length
          }
          hint={`Turning ${RETIREMENT_AGE} within 13 months`}
        />
        <StatCard label="Closed" value={closed.length} hint="Records ended" />
      </div>

      <div className="space-y-5">
        {noCase.length > 0 && isHr && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-muted/40 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1">
              <strong className="font-medium">
                {noCase.map((e) => fullName(e)).join(", ")}
              </strong>{" "}
              {noCase.length === 1 ? "is" : "are"} serving notice with no
              clearance checklist.
            </span>
            {noCase.slice(0, 1).map((e) => (
              <Button
                key={e.id}
                size="sm"
                variant="outline"
                onClick={() => setDialog({ kind: "start", employeeId: e.id })}
              >
                Open case for {e.firstName}
              </Button>
            ))}
          </div>
        )}

        {active.length === 0 ? (
          <Panel>
            <EmptyState
              icon={LogOut}
              title="No active offboarding cases"
              description="Start one when someone gives notice, a contract ends or retirement is agreed."
              action={
                isHr && (
                  <Button onClick={() => setDialog({ kind: "start" })}>
                    <Plus className="size-4" />
                    Start offboarding
                  </Button>
                )
              }
            />
          </Panel>
        ) : (
          <Panel
            title="In progress"
            description="Open a case to work through its checklist, one step at a time."
            bodyClassName="p-0"
          >
            <ul className="divide-y">
              {active.map((c) => (
                <CaseCard key={c.id} c={c} />
              ))}
            </ul>
          </Panel>
        )}

        {retiring.length > 0 && (
          <Panel
            title="Retirement horizon"
            description={`Statutory retirement age is ${RETIREMENT_AGE}. Opening the exit early gives time for handover and succession.`}
            bodyClassName="p-0"
          >
            <ul className="divide-y">
              {retiring.map((r) => (
                <li
                  key={r.employee.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <Initials person={r.employee} size="md" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/employees/${r.employee.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {fullName(r.employee)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {r.employee.jobTitle} · {r.employee.department} · age{" "}
                      {r.age}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Reaches {RETIREMENT_AGE}
                    </p>
                    <p className="tabular text-sm font-medium">
                      {formatDate(r.retireOn)}
                    </p>
                  </div>
                  <Pill
                    tone={
                      (daysUntil(r.retireOn) ?? 0) <= 180 ? "warning" : "info"
                    }
                  >
                    {relativeTime(r.retireOn)}
                  </Pill>
                  {isHr && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDialog({
                          kind: "start",
                          employeeId: r.employee.id,
                          reason: "retirement",
                          last: r.retireOn,
                        })
                      }
                    >
                      Start retirement exit
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {closed.length > 0 && (
          <Panel
            title="Closed"
            description="Finished exits. The record and the audit trail are kept."
            bodyClassName="p-0"
          >
            <ul className="divide-y">
              {closed.map((c) => {
                const e = store.employeeById(c.employeeId)
                if (!e) return null
                const withdrawn = ![
                  "resigned",
                  "terminated",
                  "retired",
                ].includes(e.lifecycleState)
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                  >
                    <Initials person={e} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <Link
                          href={`/employees/${e.id}`}
                          className="font-medium hover:underline"
                        >
                          {fullName(e)}
                        </Link>
                        <Pill tone="neutral">
                          {OFFBOARD_REASON_LABEL[c.reason]}
                        </Pill>
                        {withdrawn && <Pill tone="info">Exit withdrawn</Pill>}
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {c.id}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Left {formatDate(c.lastWorkingDay)}
                        {c.closedOn && ` · closed ${formatDate(c.closedOn)}`}
                      </p>
                    </div>
                    {isHr || has(viewer, "payroll") ? (
                      c.finalSettlement !== null && (
                        <span className="tabular text-sm">
                          {ghs(c.finalSettlement)}
                        </span>
                      )
                    ) : (
                      <Restricted>Settlement</Restricted>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}
      </div>

      {dialog?.kind === "start" && (
        <StartExitDialog
          onClose={() => setDialog(null)}
          employeeId={dialog.employeeId}
          reason={dialog.reason}
          lastWorkingDay={dialog.last}
        />
      )}
    </PageShell>
  )
}

function CaseCard({ c }: { c: OffboardingCase }) {
  const store = useStore()
  const router = useRouter()
  const isHr = has(store.viewer, "hr_admin")
  const employee = store.employeeById(c.employeeId)
  if (!employee) return null

  const progress = exitProgress(c)
  const nextStep = exitSteps(c).find((s) => !s.done)
  const lastDayIn = daysUntil(c.lastWorkingDay)
  const retirement = c.reason === "retirement"
  const href = `/offboarding/${c.id}`

  return (
    <li className="relative flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
      <Initials person={employee} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <Link
            href={href}
            className="font-medium after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {fullName(employee)}
          </Link>
          <Pill tone={retirement ? "info" : "warning"}>
            {retirement && <PartyPopper className="size-3" />}
            {OFFBOARD_REASON_LABEL[c.reason]}
          </Pill>
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {employee.jobTitle} · last day{" "}
          <span
            className={cn(
              lastDayIn !== null &&
                lastDayIn >= 0 &&
                lastDayIn <= 14 &&
                "font-medium text-destructive"
            )}
          >
            {formatDate(c.lastWorkingDay)}
          </span>
          {lastDayIn !== null &&
            lastDayIn >= 0 &&
            ` (${relativeTime(c.lastWorkingDay)})`}
        </p>
      </div>
      <div className="min-w-[200px]">
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">
            {nextStep
              ? `Next: ${nextStep.label.toLowerCase()}`
              : "Ready to close"}
          </span>
          <span className="tabular font-medium">
            {progress.done}/{progress.total}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Offboarding progress for ${fullName(employee)}`}
        >
          <div
            className={cn(
              "h-full rounded-full",
              progress.percent === 100 ? "bg-primary" : "bg-warning"
            )}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
      <div className="relative z-10">
        <RowActions
          label={`Actions for ${fullName(employee)}`}
          actions={[
            {
              label: "Open checklist",
              icon: ListChecks,
              onSelect: () => router.push(href),
            },
            {
              label: "View employee record",
              icon: UserRound,
              onSelect: () => router.push(`/employees/${employee.id}`),
            },
            isHr && {
              label: "Withdraw the exit",
              icon: Undo2,
              destructive: true,
              onSelect: () => {
                store.changeLifecycle(
                  employee.id,
                  "active",
                  "Exit withdrawn",
                  TODAY_ISO
                )
                store.updateOffboarding(
                  c.id,
                  { closedOn: TODAY_ISO },
                  "Withdrew an offboarding case"
                )
                toast.success(`${fullName(employee)} is back to active.`)
              },
            },
          ]}
        />
      </div>
    </li>
  )
}
