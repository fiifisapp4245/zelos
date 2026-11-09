"use client"

import * as React from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Circle,
  Lock,
  LogOut,
  PartyPopper,
  Plus,
  Undo2,
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
import { LifecycleBadge } from "@/components/common/status"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CloseDialog,
  ExitInterviewDialog,
  HandoverDialog,
  SettlementDialog,
  StartExitDialog,
} from "@/components/talent/offboarding-dialogs"
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
import {
  closeBlockers,
  exitProgress,
  exitSteps,
  settlementLines,
  type ExitStepKey,
} from "@/lib/talent/offboarding"
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
          active.map((c) => (
            <CaseCard
              key={c.id}
              c={c}
              onDialog={(kind) => setDialog({ kind, c })}
            />
          ))
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
      {dialog?.kind === "interview" && (
        <ExitInterviewDialog c={dialog.c} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "handover" && (
        <HandoverDialog c={dialog.c} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "settlement" && (
        <SettlementDialog c={dialog.c} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "close" && (
        <CloseDialog c={dialog.c} onClose={() => setDialog(null)} />
      )}
    </PageShell>
  )
}

function CaseCard({
  c,
  onDialog,
}: {
  c: OffboardingCase
  onDialog: (kind: "interview" | "handover" | "settlement" | "close") => void
}) {
  const store = useStore()
  const { viewer } = store
  const isHr = has(viewer, "hr_admin")
  const employee = store.employeeById(c.employeeId)
  const [newItem, setNewItem] = React.useState("")
  if (!employee) return null

  const steps = exitSteps(c)
  const progress = exitProgress(c)
  const blockers = closeBlockers(c)
  const lastDayIn = daysUntil(c.lastWorkingDay)
  const retirement = c.reason === "retirement"
  const canSeeMoney = isHr || has(viewer, "payroll")

  function setAsset(index: number, returned: boolean) {
    store.updateOffboarding(
      c.id,
      {
        clearance: {
          ...c.clearance,
          assets: c.clearance.assets.map((a, i) =>
            i === index ? { ...a, returned } : a
          ),
        },
      },
      `Marked ${c.clearance.assets[index].item} ${returned ? "returned" : "outstanding"}`
    )
  }

  function addAsset() {
    const item = newItem.trim()
    if (!item) return
    store.updateOffboarding(
      c.id,
      {
        clearance: {
          ...c.clearance,
          assets: [...c.clearance.assets, { item, returned: false }],
        },
      },
      `Added ${item} to the assets to return`
    )
    setNewItem("")
  }

  function act(key: ExitStepKey) {
    switch (key) {
      case "access":
        store.toggleClearance(c.id, "access")
        toast.success(
          c.clearance.access
            ? "Access marked as still open."
            : "System access marked revoked."
        )
        break
      case "handover":
        onDialog("handover")
        break
      case "exit_interview":
        onDialog("interview")
        break
      case "settlement":
        onDialog("settlement")
        break
      case "payroll":
        store.updateOffboarding(
          c.id,
          { sentToPayrollOn: TODAY_ISO },
          "Sent final settlement to payroll"
        )
        store.addNotification({
          title: `Final pay for ${fullName(employee)}`,
          body: `${c.id}: settlement of ${ghs(c.finalSettlement ?? 0)} is ready for the final run.`,
          kind: "approval",
          href: "/pay/payroll",
        })
        toast.success("Sent to payroll. They have been notified.")
        break
      case "assets":
        break
    }
  }

  const doneLabel: Partial<Record<ExitStepKey, string>> = {
    access: "Reopen",
    handover: "Change",
    exit_interview: "Edit",
    settlement: "Recalculate",
  }
  const todoLabel: Record<ExitStepKey, string> = {
    assets: "",
    access: "Mark revoked",
    handover: "Record handover",
    exit_interview: "Record interview",
    settlement: "Calculate",
    payroll: "Send to payroll",
  }

  return (
    <Panel bodyClassName="p-0">
      <div className="flex flex-wrap items-center gap-4 border-b px-5 py-4">
        <Initials person={employee} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <Link
              href={`/employees/${employee.id}`}
              className="font-medium hover:underline"
            >
              {fullName(employee)}
            </Link>
            <LifecycleBadge state={employee.lifecycleState} />
            <Pill tone={retirement ? "info" : "warning"}>
              {retirement && <PartyPopper className="size-3" />}
              {OFFBOARD_REASON_LABEL[c.reason]}
            </Pill>
            <span className="font-mono text-[11px] text-muted-foreground">
              {c.id}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {employee.jobTitle} · notice given {formatDate(c.noticeGivenOn)} ·
            last working day{" "}
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

        <div className="min-w-[160px]">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="tabular font-medium">
              {progress.done}/{progress.total}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Offboarding progress"
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

        {isHr && (
          <RowActions
            label={`Actions for ${fullName(employee)}`}
            actions={[
              {
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
        )}
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Clearance checklist
          </p>
          <ul className="space-y-1">
            {steps.map((s) => {
              const disabled =
                (s.key === "payroll" &&
                  (c.finalSettlement === null || s.done)) ||
                !isHr
              return (
                <li key={s.key}>
                  <div className="flex items-start gap-2.5 rounded-lg px-1 py-1.5 text-sm">
                    {s.done ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn(s.done && "text-muted-foreground")}>
                        {s.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.detail}
                      </p>
                    </div>
                    {s.key !== "assets" &&
                      isHr &&
                      !(s.key === "payroll" && s.done) && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={disabled}
                          title={
                            s.key === "payroll" && c.finalSettlement === null
                              ? "Calculate the settlement first"
                              : undefined
                          }
                          onClick={() => act(s.key)}
                        >
                          {s.done
                            ? (doneLabel[s.key] ?? "Done")
                            : todoLabel[s.key]}
                        </Button>
                      )}
                  </div>

                  {s.key === "assets" && (
                    <div className="mt-1 mb-2 ml-6.5 rounded-lg border bg-muted/20 p-3">
                      <ul className="space-y-1.5">
                        {c.clearance.assets.map((a, i) => (
                          <li key={`${a.item}-${i}`}>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={a.returned}
                                disabled={!isHr}
                                onChange={(e) => setAsset(i, e.target.checked)}
                                className="size-4 accent-[var(--primary)]"
                              />
                              <span
                                className={cn(
                                  a.returned &&
                                    "text-muted-foreground line-through"
                                )}
                              >
                                {a.item}
                              </span>
                              {a.tag && (
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {a.tag}
                                </span>
                              )}
                            </label>
                          </li>
                        ))}
                      </ul>
                      {isHr && (
                        <form
                          className="mt-3 flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault()
                            addAsset()
                          }}
                        >
                          <Input
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            placeholder="Add an item, e.g. Company credit card"
                            aria-label="Add an item to return"
                            className="h-8"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            disabled={!newItem.trim()}
                          >
                            Add
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Settlement
          </p>
          {canSeeMoney ? (
            <SettlementSummary c={c} />
          ) : (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0" />
              Settlement figures are visible to HR and Payroll only.
            </div>
          )}

          {isHr && (
            <div className="mt-5 border-t pt-4">
              <Button
                className="w-full"
                disabled={blockers.length > 0}
                onClick={() => onDialog("close")}
              >
                Complete offboarding
              </Button>
              {blockers.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Still to do: {blockers.join(", ").toLowerCase()}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}

function SettlementSummary({ c }: { c: OffboardingCase }) {
  const store = useStore()
  const employee = store.employeeById(c.employeeId)
  if (!employee) return null
  if (!c.settlement || c.finalSettlement === null)
    return (
      <p className="text-sm text-muted-foreground">
        Not yet calculated. Salary for days worked, accrued leave and any notice
        paid in lieu are added up for payroll.
      </p>
    )
  const { lines, total } = settlementLines(employee, c.settlement)
  return (
    <dl className="space-y-2 text-sm">
      {lines
        .filter((l) => l.amount !== 0)
        .map((l) => (
          <div key={l.label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {l.label}
              {l.days !== undefined && ` · ${l.days} d`}
            </dt>
            <dd className="tabular">{ghs(l.amount)}</dd>
          </div>
        ))}
      <div className="flex justify-between border-t pt-2 font-medium">
        <dt>Gross settlement</dt>
        <dd className="tabular">{ghs(total)}</dd>
      </div>
      <p className="text-xs text-muted-foreground">
        {c.sentToPayrollOn
          ? `With payroll since ${formatDate(c.sentToPayrollOn)}.`
          : "Not yet with payroll."}{" "}
        PAYE and SSNIT are applied in the final run.
      </p>
    </dl>
  )
}
