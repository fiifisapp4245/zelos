"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Circle, LogOut, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, Initials, Panel, Pill } from "@/components/common"
import { LifecycleBadge } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import { STEP_PANEL } from "@/components/talent/exit-steps"
import { CloseDialog } from "@/components/talent/offboarding-dialogs"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import {
  OFFBOARD_REASON_LABEL,
  TODAY_ISO,
  daysUntil,
  formatDate,
  fullName,
  relativeTime,
} from "@/lib/format"
import {
  closeBlockers,
  exitProgress,
  exitSteps,
  type ExitStepKey,
} from "@/lib/talent/offboarding"
import { cn } from "@/lib/utils"

const TITLE: Record<ExitStepKey | "close", { title: string; blurb: string }> = {
  assets: {
    title: "Company assets",
    blurb: "Everything issued to them comes back.",
  },
  access: {
    title: "System access",
    blurb: "Close their accounts so nothing is left open.",
  },
  handover: {
    title: "Handover",
    blurb: "Their work and relationships pass to someone.",
  },
  exit_interview: {
    title: "Exit interview",
    blurb: "Learn why they are leaving.",
  },
  settlement: {
    title: "Final settlement",
    blurb: "What they are owed on the way out.",
  },
  payroll: { title: "Send to payroll", blurb: "Payroll pays the final run." },
  close: {
    title: "Review and close",
    blurb: "Check everything, then end the record.",
  },
}

export default function OffboardingCasePage() {
  const { id } = useParams<{ id: string }>()
  const store = useStore()
  const c = store.offboarding.find((x) => x.id === id)
  const emp = c ? store.employeeById(c.employeeId) : undefined
  const isHr = has(store.viewer, "hr_admin")
  const crumbs = [
    { label: "Workspace", href: "/overview" },
    { label: "Offboarding", href: "/offboarding" },
    { label: c?.id ?? "Case" },
  ]

  const steps = c ? exitSteps(c) : []
  const firstOpen = steps.find((s) => !s.done)?.key ?? "close"
  const [selected, setSelected] = React.useState<ExitStepKey | "close" | null>(
    null
  )
  const [closing, setClosing] = React.useState(false)
  // Opens on the first unfinished step and stays there: finishing the last item
  // of a step should not whisk you away before you have looked at the result.
  const [landed] = React.useState<ExitStepKey | "close">(() => firstOpen)
  const current = selected ?? landed

  if (!c || !emp)
    return (
      <PageShell crumbs={crumbs}>
        <Panel>
          <EmptyState
            icon={LogOut}
            title="Case not found"
            description="It may have been removed, or you may not have access."
            action={
              <Button asChild variant="outline">
                <Link href="/offboarding">Back to offboarding</Link>
              </Button>
            }
          />
        </Panel>
      </PageShell>
    )

  const order: (ExitStepKey | "close")[] = [...steps.map((s) => s.key), "close"]
  const progress = exitProgress(c)
  const blockers = closeBlockers(c)
  const closed = !!c.closedOn
  const lastIn = daysUntil(c.lastWorkingDay)

  function next() {
    const i = order.indexOf(current)
    setSelected(order[Math.min(order.length - 1, i + 1)])
  }

  const Panel_ = current === "close" ? null : STEP_PANEL[current]

  return (
    <PageShell width="wide" crumbs={crumbs}>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Button
          variant="outline"
          size="icon-lg"
          asChild
          aria-label="Back to offboarding"
        >
          <Link href="/offboarding">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <Initials person={emp} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-[26px] leading-tight font-semibold tracking-tight">
            {fullName(emp)}
            <LifecycleBadge state={emp.lifecycleState} />
            <Pill tone="neutral">{OFFBOARD_REASON_LABEL[c.reason]}</Pill>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {emp.jobTitle} · {c.id} · notice given {formatDate(c.noticeGivenOn)}{" "}
            · last working day{" "}
            <span
              className={cn(
                lastIn !== null &&
                  lastIn >= 0 &&
                  lastIn <= 14 &&
                  "font-medium text-destructive"
              )}
            >
              {formatDate(c.lastWorkingDay)}
            </span>
            {lastIn !== null &&
              lastIn >= 0 &&
              ` (${relativeTime(c.lastWorkingDay)})`}
          </p>
        </div>
        {isHr && !closed && (
          <Button
            variant="outline"
            onClick={() => {
              store.changeLifecycle(
                emp.id,
                "active",
                "Exit withdrawn",
                TODAY_ISO
              )
              store.updateOffboarding(
                c.id,
                { closedOn: TODAY_ISO },
                "Withdrew an offboarding case"
              )
              toast.success(`${fullName(emp)} is back to active.`)
            }}
          >
            <Undo2 className="size-4" />
            Withdraw the exit
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
        <nav
          aria-label="Offboarding steps"
          className="lg:sticky lg:top-4 lg:self-start"
        >
          <div className="rounded-xl border bg-card p-3">
            <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">
              {progress.done} of {progress.total} done
            </p>
            <ol className="space-y-0.5">
              {order.map((key, i) => {
                const step = steps.find((s) => s.key === key)
                const done = step ? step.done : closed
                const active = key === current
                return (
                  <li key={key}>
                    <button
                      type="button"
                      aria-current={active ? "step" : undefined}
                      onClick={() => setSelected(key)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        active ? "bg-success-muted" : "hover:bg-muted"
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      ) : (
                        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block text-sm",
                            active && "font-medium"
                          )}
                        >
                          {i + 1}. {TITLE[key].title}
                        </span>
                        {step && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {step.detail}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        </nav>

        <Panel title={TITLE[current].title} description={TITLE[current].blurb}>
          {closed && (
            <p className="mb-4 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              This case is closed{c.closedOn && ` (${formatDate(c.closedOn)})`}.
              It is shown for reference only.
            </p>
          )}
          <fieldset disabled={closed} className="min-w-0">
            {Panel_ ? (
              <Panel_ c={c} onSaved={next} />
            ) : (
              <div className="space-y-5">
                <ul className="divide-y rounded-lg border text-sm">
                  {steps.map((s) => (
                    <li
                      key={s.key}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      {s.done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex-1">{TITLE[s.key].title}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.detail}
                      </span>
                      {!s.done && (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => setSelected(s.key)}
                        >
                          Go
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                {isHr && !closed && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      {blockers.length > 0
                        ? `Still to do: ${blockers.join(", ").toLowerCase()}.`
                        : "Everything is done. Closing moves the record to its end state."}
                    </p>
                    <Button
                      type="button"
                      disabled={blockers.length > 0}
                      onClick={() => setClosing(true)}
                    >
                      Complete offboarding
                    </Button>
                  </div>
                )}
              </div>
            )}
          </fieldset>
        </Panel>
      </div>

      {closing && <CloseDialog c={c} onClose={() => setClosing(false)} />}
    </PageShell>
  )
}
